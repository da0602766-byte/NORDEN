import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync,readFileSync,readdirSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addDays,dateTime,local,now,openDatabase,weekday } from '../src/core.mjs';
import { createServer } from '../src/server.mjs';
import { seed,demoAccounts } from '../src/seed.mjs';

const pass='Norden-fixture-2026';
const client='demo-cliente',other='demo-cliente-2',manager='demo-gestor',staff='demo-profissional';
const address={zip:'00000-000',street:'Rua Fictícia',number:'10',district:'Bairro Exemplo',city:'Cidade Exemplo',state:'SC'};
async function fixture(t, mail) {
  const folder=mkdtempSync(join(tmpdir(),'norden-test-'));
  const path=join(folder,'db.sqlite'),outbox=join(folder,'outbox');
  const db=process.env.NORDEN_TEST_POSTGRES==='1'?(await (await import('./postgres-fixture.mjs')).testPostgres()).db:openDatabase(path);
  await seed(db,pass);
  const server=createServer({db,outbox,...mail});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();rmSync(folder,{recursive:true,force:true});});
  const endpoint='http://127.0.0.1:'+server.address().port;
  const sessions={};
  async function request(route,body,account,extra={}) {
    const cookie=sessions[account];
    const response=await fetch(endpoint+route,body===undefined?{headers:cookie?{Cookie:cookie}:{}}:{
      method:'POST',headers:{'Content-Type':'application/json','X-Norden-Request':'1',...(cookie?{Cookie:cookie}:{}),...extra},body:JSON.stringify(body)
    });
    const type=response.headers.get('content-type');
    const data=type?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer());
    return {status:response.status,data,cookie:response.headers.get('set-cookie'),headers:response.headers};
  }
  const post=(command,body,account,extra)=>request('/api/action/'+command,body,account,extra);
  async function login(account) {
    if(sessions[account]) return;
    const mail=demoAccounts.find(a=>a[0]===account)[1];
    const r=await post('login',{email:mail,password:pass});
    assert.equal(r.status,200);
    assert.match(r.cookie,/HttpOnly; SameSite=Lax/);
    sessions[account]=r.cookie.split(';')[0];
  }
  const get=(endpoint,account)=>request('/api/'+endpoint,undefined,account);
  const act=async(command,body,account,code=200)=>{
    const r=await post(command,body,account);
    assert.equal(r.status,code,JSON.stringify(r.data));
    return r.data;
  };
  return {db,path,request,post,get,act,login,sessions,outbox};
}
function workingDay(offset=8) {
  let when=addDays(local(now()).date,offset);
  while(weekday(when)===0) when=addDays(when,1);
  return when;
}
const booking=(rest={})=>({date:workingDay(),clock:'10:00',serviceId:'corte',professionalId:'andre',price:8500,...rest});
const delivery=(rest={})=>({mode:'entrega',name:'Cliente de Teste',phone:'(00) 00000-0000',distance:4,address,...rest});
const pickup={mode:'retirada',name:'Cliente de Teste',phone:'(00) 00000-0000'};

test('páginas e arquivos servidos, catálogo público e política de origem',async t=>{
  const f=await fixture(t);
  for(const pathname of ['/','/login','/usuario','/usuario/cadastro','/gerencia','/servicos/corte','/app/jornada','/gestao/pedidos','/loja','/assets/hero.webp','/assets/norden-emblem.svg','/norden.css','/style.css','/app.mjs']) {
    const r=await f.request(pathname);assert.equal(r.status,200,pathname);
    assert.equal(r.headers.get('x-content-type-options'),'nosniff');
  }
  const pub=(await f.get('boot')).data;
  assert.equal(pub.user,null);assert.equal(pub.catalog.services.length,4);
  const entry=await f.get('boot?view=entry');
  assert.equal(entry.status,200);
  assert.equal(entry.data.entryOnly,true);
  assert.deepEqual(entry.data.catalog,{info:{}});
  await f.login(manager);
  const storefront=await f.get('boot?view=storefront',manager);
  assert.equal(storefront.status,200);
  assert.deepEqual(storefront.data.user,{role:'gestor'});
  assert.equal(storefront.data.catalog.products.some(product=>Object.hasOwn(product,'physical')),false);
  assert.equal(Object.hasOwn(storefront.data,'clients'),false);
  assert.equal(pub.catalog.professionals.some(p=>Object.hasOwn(p,'account_id')),false);
  assert.equal(pub.catalog.products.some(p=>Object.hasOwn(p,'reserved')),false);
  assert.equal((await f.post('recover',{email:'john@norden.example'},null,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await f.post('recover',{email:'john@norden.example'},null,{Origin:'https://portal.example'})).status,403);
  assert.equal((await f.post('recover',{email:'john@norden.example'},null,{'Content-Type':'text/plain'})).status,403);
  assert.equal((await f.request('/usuario/checkout')).headers.get('x-robots-tag'),'noindex');
});
test('portais validam o papel e só gestores alteram o preço publicado',async t=>{
  const f=await fixture(t);
  await f.act('login',{email:'cliente@norden.example',password:pass,area:'gerencia'},null,403);
  await f.act('login',{email:'gestor@norden.example',password:pass,area:'cliente'},null,403);
  await f.login(client);await f.login(manager);await f.login(staff);
  const edit={id:'pomada',price:8425,promo:7990};
  await f.act('productPrice',edit,client,403);
  await f.act('productPrice',edit,staff,403);
  await f.act('productPrice',{...edit,promo:9000},manager,400);
  await f.act('productPrice',edit,manager);
  const product=(await f.get('boot')).data.catalog.products.find(item=>item.id==='pomada');
  assert.equal(product.price,8425);
  assert.equal(product.promo,7990);
  const saved=(await f.get('boot',manager)).data.audits;
  assert.ok(saved.some(item=>item.action==='PRECO_PRODUTO_ATUALIZADO'&&item.target==='pomada'));
  const bridged=(await f.get('norden?__norden_path=boot')).data;
  assert.equal(bridged.catalog.products.find(item=>item.id==='pomada').price,8425);
});
test('cadastro cria só cliente, recuperação expira após uso e encerra sessões',async t=>{
  const f=await fixture(t);
  const email='teste@norden.example';
  const r=await f.post('register',{email,password:pass,confirm:pass,name:'Cliente de Teste',phone:'00000000000',role:'gestor'});
  assert.equal(r.status,200);
  f.sessions.test=r.cookie.split(';')[0];
  assert.equal((await f.get('boot','test')).data.user.role,'cliente');
  await f.act('invite',{email:'outro@norden.example',role:'gestor'},'test',403);
  const verification=readdirSync(f.outbox).map(x=>JSON.parse(readFileSync(join(f.outbox,x),'utf8'))).find(x=>x.purpose==='verificar');
  const getToken=rec=>new URL(rec.path,'http://localhost').searchParams.get('token');
  await f.act('verify',{token:getToken(verification)},'test');
  assert.equal((await f.get('boot','test')).data.user.verified,1);
  await f.act('recover',{email});
  const reset=readdirSync(f.outbox).map(x=>JSON.parse(readFileSync(join(f.outbox,x),'utf8'))).find(x=>x.purpose==='redefinir');
  const body={token:getToken(reset),password:'nova-credencial-teste',confirm:'nova-credencial-teste'};
  await f.act('reset',body);
  await f.act('reset',body,null,410);
  assert.equal((await f.get('boot','test')).data.user,null);
  assert.equal((await f.post('login',{email,password:body.password})).status,200);
});
test('recuperação indisponível é uniforme e cadastro continua sem SMTP',async t=>{
  const f=await fixture(t,{outbox:undefined,production:true});
  assert.equal((await f.get('boot?view=entry')).data.accountEmailEnabled,false);
  const responses=await Promise.all(['cliente@norden.example','desconhecido@norden.example'].map(email=>f.post('recover',{email})));
  assert.equal(responses[0].status,503);
  assert.equal(responses[1].status,503);
  assert.deepEqual(responses[0].data,responses[1].data);
  const result=await f.post('register',{email:'novo@norden.example',password:pass,confirm:pass,name:'Cliente Fictício',phone:'00000000000'});
  assert.equal(result.status,200);
  assert.match(result.cookie,/HttpOnly/);
});
test('falha de envio preserva o cadastro e o retorno neutro de recuperação',async t=>{
  const f=await fixture(t,{outbox:undefined,deliver:async()=>{throw new Error('Falha de teste');}});
  const result=await f.post('register',{email:'novo@norden.example',password:pass,confirm:pass,name:'Cliente Fictício',phone:'00000000000'});
  assert.equal(result.status,200);
  assert.equal(result.data.verificationFailed,true);
  f.sessions.registered=result.cookie.split(';')[0];
  await f.act('resend',{},'registered',503);
  const responses=await Promise.all(['novo@norden.example','desconhecido@norden.example'].map(email=>f.post('recover',{email})));
  assert.deepEqual(responses.map(({status,data})=>({status,data})),[
    {status:200,data:{ok:true}},{status:200,data:{ok:true}}
  ]);
});
test('autorização por registro, por papel e dados sensíveis cifrados',async t=>{
  const f=await fixture(t);
  await Promise.all([f.login(client),f.login(other),f.login(staff),f.login(manager)]);
  await f.act('safety',{consent:true,status:'sim',details:'substância fictícia'},client);
  assert.doesNotMatch((await f.db.get('SELECT payload FROM safety')).payload,/substância/);
  assert.equal((await f.get('reserva/demo-candidato',other)).status,404);
  assert.equal((await f.get('reserva/demo-historico',staff)).status,404);
  assert.equal((await f.get('reserva/demo-candidato',staff)).data.safety.details,'substância fictícia');
  assert.equal((await f.get('boot',manager)).data.clients.some(c=>Object.hasOwn(c,'safety')),false);
  assert.equal((await f.get('reserva/demo-historico',client)).data.treatment.private_note,undefined);
  assert.equal((await f.db.get("SELECT COUNT(*) n FROM audits WHERE action='ALERTA_CONSULTADO'")).n,1);
  await f.act('inventory',{},staff,403);
  await f.act('safety',{consent:false},client);
  assert.equal((await f.get('boot',client)).data.safety,null);
});
test('convite tem destinatário, papel e uso único',async t=>{
  const f=await fixture(t);await f.login(manager);
  const email='nova-gestao@norden.example';
  const invitation=await f.act('invite',{email,role:'gestor'},manager);
  const token=new URL(invitation.path,'http://localhost').searchParams.get('token');
  const profile={token,name:'Gestor Fictício',phone:'00000000000',password:pass,confirm:pass};
  await f.act('redeem',{...profile,email:'outro@norden.example'},null,400);
  assert.equal((await f.post('redeem',{...profile,email})).data.role,'gestor');
  await f.act('redeem',{...profile,email},null,410);
});
test('agenda calcula duração, intervalo, fuso, catálogos e reservas concorrentes',async t=>{
  const f=await fixture(t);
  await Promise.all([f.login(client),f.login(other),f.login(manager)]);
  const svc=await f.act('service',{name:'Estilo de teste',category:'Cabelo',description:'Serviço fictício',price:10000,duration:45,padding:15,active:true,professionals:['andre'],products:['pomada']},manager);
  const b=booking({serviceId:svc.id,price:10000,preferences:['pomada']});
  const url='disponibilidade?'+new URLSearchParams(b);
  assert.equal((await f.get(url,client)).data.duration,45);
  const attempts=await Promise.all([f.post('book',b,client),f.post('book',b,other)]);
  assert.deepEqual(attempts.map(x=>x.status).sort(),[200,409]);
  const ref=attempts.find(x=>x.status===200).data.id;
  const detail=(await f.get('reserva/'+ref,manager)).data.booking;
  assert.equal(detail.ends-detail.starts,3600000);
  assert.equal(new Date(dateTime(b.date,b.clock)).toISOString().slice(11,16),'13:00');
  assert.equal(detail.preferences[0].name,'Pomada Matte');
  assert.equal((await f.db.get('SELECT COUNT(*) n FROM orders')).n,0);
  const slots=(await f.get(url,other)).data.slots.map(x=>x.clock);
  assert.ok(!slots.includes('10:45'));assert.ok(slots.includes('11:00'));
});
test('bloqueio, preço alterado, inatividade e horários passados são revalidados',async t=>{
  const f=await fixture(t);await Promise.all([f.login(client),f.login(manager)]);
  const b=booking();
  await f.act('block',{professionalId:'andre',startDate:b.date,endDate:b.date,startClock:'10:00',endClock:'11:00',reason:'Folga fictícia'},manager);
  await f.act('book',b,client,409);
  await f.act('book',{...b,clock:'11:00',price:1},client,409);
  await f.act('book',{...b,clock:'11:00',duration:46,padding:0},client,409);
  await f.act('book',{...b,clock:'11:00',duration:45,padding:10},client,409);
  await f.act('book',{...b,date:addDays(local(now()).date,-2)},client,409);
  await f.db.run("UPDATE professionals SET active=0 WHERE id='andre'");
  await f.act('book',{...b,clock:'11:00'},client,409);
  await f.db.run("UPDATE professionals SET active=0");
  assert.deepEqual((await f.get('boot?view=storefront')).data.catalog.professionals,[]);
});
test('gestor configura equipe, serviço e expediente com pausa',async t=>{
  const f=await fixture(t);await f.login(manager);
  const data={name:'Profissional Fictício',specialty:'Cortes',description:'Conta de teste',services:['corte'],active:false};
  const {id}=await f.act('professional',data,manager);
  const date=workingDay(),day=weekday(date);
  const query='disponibilidade?'+new URLSearchParams({serviceId:'corte',professionalId:id,date});
  assert.equal((await f.get(query)).status,409);
  await f.act('professional',{...data,id,active:true},manager);
  assert.deepEqual((await f.get(query)).data.slots,[]);
  const hours=[{day,start:'09:00',end:'11:30'},{day,start:'13:00',end:'16:00'}];
  await f.act('hours',{professionalId:id,hours},manager);
  await f.act('hours',{professionalId:id,hours:[...hours,{day,start:'10:00',end:'12:00'}]},manager,400);
  const {slots,duration}=(await f.get(query)).data;
  assert.equal(duration,45);
  assert.ok(slots.some(slot=>slot.clock==='13:00'));
  assert.ok(slots.every(slot=>slot.clock<'11:00'||slot.clock>='13:00'));
});
test('Flow sugere encaixe de 45, exclui 90 e confirma troca com histórico',async t=>{
  const f=await fixture(t);await Promise.all([f.login(client),f.login(manager)]);
  await f.act('cancel',{id:'demo-vaga'},manager);
  const open=(await f.get('boot',manager)).data.flow.windows.find(w=>w.id==='demo-vaga');
  assert.deepEqual(open.candidates.map(b=>b.id),['demo-candidato']);
  const offer=await f.act('offer',{vacancyId:'demo-vaga',bookingId:'demo-candidato'},manager);
  const outcome=await f.act('answer',{id:offer.id,decision:'aceitar'},client);
  assert.equal(outcome.status,'EFETIVADA');
  const b=(await f.get('reserva/demo-candidato',client)).data;
  assert.equal(b.booking.starts,open.starts);
  assert.ok(b.history.some(event=>event.type==='REALOCADO'));
});
for(const outcome of ['recusa','expiração','ocupação']) test('Flow preserva reserva original em '+outcome,async t=>{
  const f=await fixture(t);await Promise.all([f.login(client),f.login(manager),f.login(other)]);
  await f.act('cancel',{id:'demo-vaga'},manager);
  const offer=await f.act('offer',{vacancyId:'demo-vaga',bookingId:'demo-candidato'},manager);
  const old=(await f.db.get("SELECT starts FROM bookings WHERE id='demo-candidato'")).starts;
  const proposal=(await f.db.get("SELECT starts FROM bookings WHERE id='demo-vaga'")).starts;
  if(outcome==='expiração') await f.db.run('UPDATE flow SET expiry=? WHERE id=?',now()-1,offer.id);
  if(outcome==='ocupação') await f.act('book',booking({date:local(proposal).date,clock:local(proposal).clock}),other);
  const result=await f.act('answer',{id:offer.id,decision:outcome==='recusa'?'recusar':'aceitar'},client);
  assert.equal(result.status,outcome==='recusa'?'RECUSADA':'EXPIRADA');
  assert.equal((await f.db.get("SELECT starts FROM bookings WHERE id='demo-candidato'")).starts,old);
});
test('cookies HTTPS, logout e expiração interrompem a sessão',async t=>{
  const f=await fixture(t,{secure:true});
  const body={email:'cliente@norden.example',password:pass};
  await f.act('login',{...body,password:'Senha incorreta'},null,401);
  const logged=await f.post('login',body);
  assert.equal(logged.status,200);
  assert.match(logged.cookie,/HttpOnly; SameSite=Lax; Max-Age=1209600; Secure/);
  f.sessions.session=logged.cookie.split(';')[0];
  const logout=await f.post('logout',{},'session');
  assert.match(logout.cookie,/Max-Age=0; Secure/);
  assert.equal((await f.get('boot','session')).data.user,null);
  const active=await f.post('login',body);
  f.sessions.session=active.cookie.split(';')[0];
  await f.db.run('UPDATE sessions SET expiry=?',now()-1);
  await f.act('cartItem',{productId:'pomada',delta:1},'session',401);
});
test('sessões não aceitam links de verificação ou recuperação vencidos',async t=>{
  const f=await fixture(t);
  const email='expirado@norden.example';
  await f.act('register',{email,password:pass,confirm:pass,name:'Cliente Fictício',phone:'00000000000'});
  await f.act('recover',{email});
  await f.db.run('UPDATE tokens SET expiry=?',now()-1);
  const issued=readdirSync(f.outbox).map(file=>JSON.parse(readFileSync(join(f.outbox,file),'utf8')));
  for(const [purpose,command] of [['verificar','verify'],['redefinir','reset']]) {
    const {path}=issued.find(item=>item.purpose===purpose);
    const token=new URL(path,'http://localhost').searchParams.get('token');
    await f.act(command,{token,password:pass,confirm:pass},null,410);
  }
});
test('atendimento concluído uma vez, Journey e Care congelados, notas restritas',async t=>{
  const f=await fixture(t);
  await Promise.all([f.login(client),f.login(other),f.login(manager),f.login(staff)]);
  const ref=(await f.act('book',booking({preferences:['pomada']}),client)).id;
  await f.act('start',{id:ref,acknowledged:true},staff);
  const procedure={id:ref,procedure:'Acabamento de teste',used:[{productId:'shampoo',amount:'1 mL'}],
    recommended:[{productId:'pente',detail:'Apoio para acabamento'}],summary:'Nota compartilhada',privateNote:'Nota interna',
    title:'Cuidado revisado',instructions:'Siga a finalização combinada.',templateId:'manual-corte',reviewed:true};
  await f.act('finalize',procedure,staff);
  await f.act('finalize',procedure,staff);
  await f.act('template',{serviceId:'corte',title:'Modelo novo',instructions:'Texto diferente.',active:true},manager);
  const info=(await f.get('reserva/'+ref,client)).data;
  assert.deepEqual(info.booking.preferences.map(p=>p.productId??p.id),['pomada']);
  assert.deepEqual(info.treatment.used.map(p=>p.productId),['shampoo']);
  assert.deepEqual(info.treatment.recommended.map(p=>p.productId),['pente']);
  assert.equal(info.treatment.private_note,undefined);
  assert.equal(info.treatment.manual.sections.instructions,procedure.instructions);
  assert.equal(info.history.filter(x=>x.type==='CONCLUIDO').length,1);
  assert.equal((await f.get('boot',other)).data.journey.some(x=>x.id===ref),false);
  assert.equal((await f.get('boot',client)).data.notifications.filter(x=>x.href==='/app/cuidados/'+ref).length,1);
});
test('fotos privadas exigem autorização e respeitam a propriedade da reserva',async t=>{
  const f=await fixture(t);await Promise.all([f.login(client),f.login(other),f.login(manager)]);
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8nJ4AAAAASUVORK5CYII=';
  const payload={id:'demo-historico',kind:'Depois',image,authorized:true};
  await f.act('photo',payload,manager,403);
  await f.act('profile',{name:'Cliente de Teste',phone:'00000000000',photoOk:true,moveOk:true},client);
  await f.act('photo',{...payload,image:'data:image/webp;base64,AA=='},manager,400);
  const p=await f.act('photo',payload,manager);
  assert.equal((await f.get('foto/'+p.id,manager)).status,200);
  assert.equal((await f.db.get("SELECT COUNT(*) n FROM audits WHERE action='FOTO_PRIVADA_CONSULTADA'")).n,1);
  assert.equal((await f.get('foto/'+p.id,client)).headers.get('content-type'),'image/png');
  assert.equal((await f.get('foto/'+p.id,other)).status,404);
  assert.equal((await f.get('foto/'+p.id)).status,401);
  assert.equal((await f.get('foto/inexistente')).status,401);
});
test('carrinho, entrega estimada, preço alterado e pedido idempotente',async t=>{
  const f=await fixture(t);await Promise.all([f.login(client),f.login(other),f.login(manager)]);
  await f.act('cartItem',{productId:'kit',quantity:1},client,409);
  await f.act('cartItem',{productId:'pomada',quantity:99},client,409);
  await f.act('cartItem',{productId:'pomada',delta:1},client);
  await f.act('quote',delivery({distance:13}),client,409);
  const q=await f.act('quote',delivery(),client);
  assert.equal(q.fee,1000);assert.equal(q.total,8900);
  const body={...delivery(),requestKey:'pedido-unico-entrega-1',quoteKey:q.key,total:1};
  await f.db.run("UPDATE products SET price=8200 WHERE id='pomada'");
  await f.act('checkout',body,client,409);
  body.quoteKey=(await f.act('quote',delivery(),client)).key;
  const result=await f.act('checkout',body,client);
  assert.equal((await f.act('checkout',body,client)).id,result.id);
  assert.equal((await f.get('pedido/'+result.id,other)).status,404);
  const order=(await f.get('pedido/'+result.id,client)).data;
  assert.equal(order.total,9200);assert.equal(order.financial,process.env.NORDEN_TEST_POSTGRES==='1'?'NAO_PAGO':'SIMULADO');
  assert.equal(order.quote.estimated,true);
  assert.equal((await f.db.get("SELECT reserved FROM products WHERE id='pomada'")).reserved,1);
  await f.act('orderState',{id:result.id,state:'EM_PREPARACAO'},manager);
  await f.act('orderState',{id:result.id,state:'SAIU_ENTREGA'},manager);
  await f.act('orderState',{id:result.id,state:'SAIU_ENTREGA'},manager);
  assert.deepEqual(Object.values(await f.db.get("SELECT physical,reserved FROM products WHERE id='pomada'")),[17,0]);
  await f.act('orderState',{id:result.id,state:'CONCLUIDO'},manager);
});
test('retomada da transferência não duplica unidades na sacola',async t=>{
  const f=await fixture(t);
  await f.login(client);
  await f.act('cartItem',{productId:'pomada',delta:1},client);
  const transfer={productId:'pomada',transferQuantity:3};
  const results=await Promise.all([f.act('cartItem',transfer,client),f.act('cartItem',transfer,client)]);
  for(const basket of results) assert.equal(basket.items.find(item=>item.id==='pomada').quantity,3);
  await f.act('cartItem',{productId:'pomada',delta:1},client);
  const replay=await f.act('cartItem',transfer,client);
  assert.equal(replay.items.find(item=>item.id==='pomada').quantity,4);
});
test('modo hospedado preserva pagamento presencial e o mesmo identificador no reenvio',async t=>{
  const f=await fixture(t,{production:true});
  await f.login(client);
  await f.act('cartItem',{productId:'pomada',delta:1},client);
  await f.act('quote',delivery({distance:'4e0'}),client,400);
  const quote=await f.act('quote',delivery({distance:'4,25'}),client);
  assert.equal(quote.fee,1063);
  assert.equal(quote.payment,'presencial');
  assert.equal((await f.get('boot',client)).data.catalog.info.payment,'presencial');
  const order={...delivery({distance:'4,25'}),quoteKey:quote.key,requestKey:'reenvio-ficticio-hospedado'};
  const results=await Promise.all([f.act('checkout',order,client),f.act('checkout',order,client)]);
  assert.equal(results[0].id,results[1].id);
  const detail=(await f.get('pedido/'+results[0].id,client)).data;
  assert.equal(detail.financial,'NAO_PAGO');
  assert.equal(detail.quote.estimated,true);
});
test('última unidade concorrente, retirada, cancelamento idempotente e baixa',async t=>{
  const f=await fixture(t);await Promise.all([f.login(client),f.login(other),f.login(manager)]);
  await f.db.run("UPDATE products SET physical=1 WHERE id='pente'");
  for(const actor of [client,other]) await f.act('cartItem',{productId:'pente',quantity:1},actor);
  const quoteA=await f.act('quote',pickup,client),quoteB=await f.act('quote',pickup,other);
  assert.equal(quoteA.fee,0);
  const results=await Promise.all([f.post('checkout',{...pickup,quoteKey:quoteA.key,requestKey:'retirada-concorrente-01'},client),
    f.post('checkout',{...pickup,quoteKey:quoteB.key,requestKey:'retirada-concorrente-02'},other)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const ref=results.find(r=>r.status===200).data.id;
  await f.act('orderState',{id:ref,state:'EM_PREPARACAO'},manager);
  await f.act('orderState',{id:ref,state:'SAIU_ENTREGA'},manager,409);
  await f.act('orderState',{id:ref,state:'CANCELADO',reason:'Teste de cancelamento'},manager);
  await f.act('orderState',{id:ref,state:'CANCELADO',reason:'Repetição'},manager);
  assert.deepEqual(Object.values(await f.db.get("SELECT physical,reserved FROM products WHERE id='pente'")),[1,0]);
  const next=await f.act('quote',pickup,results[0].status===200?other:client);
  const nextRef=(await f.act('checkout',{...pickup,quoteKey:next.key,requestKey:'retirada-concorrente-03'},results[0].status===200?other:client)).id;
  for(const state of ['EM_PREPARACAO','PRONTO_RETIRADA','CONCLUIDO','CONCLUIDO']) await f.act('orderState',{id:nextRef,state},manager);
  assert.deepEqual(Object.values(await f.db.get("SELECT physical,reserved FROM products WHERE id='pente'")),[0,0]);
});
test('endereços e solicitações de privacidade pertencem ao cliente',async t=>{
  const f=await fixture(t);await Promise.all([f.login(client),f.login(other),f.login(manager)]);
  const saved=await f.act('address',{...address,label:'Exemplo'},client);
  await f.act('address',{id:saved.id,remove:true},other,404);
  const p=await f.act('privacy',{kind:'exclusão',message:'Solicitação fictícia'},client);
  await f.act('privacyState',{id:p.id,state:'RESPONDIDA'},other,403);
  await f.act('privacyState',{id:p.id,state:'EM_ANALISE'},manager);
  assert.equal((await f.get('boot',client)).data.privacy[0].state,'EM_ANALISE');
  assert.equal((await f.get('boot',other)).data.privacy.length,0);
});

test('telas privadas renderizam as respostas autorizadas de cliente, profissional e gestão',async t=>{
  const f=await fixture(t);
  await Promise.all([f.login(client),f.login(manager),f.login(staff)]);
  await f.act('cartItem',{productId:'pomada',quantity:1},client);
  const ui=await import('../public/ui.mjs');
  const {clientPage}=await import('../public/client.mjs');
  const {adminPage}=await import('../public/admin.mjs');
  const previous=globalThis.location;
  t.after(()=>{if(previous) globalThis.location=previous;else delete globalThis.location;});
  for(const [actor,entry,render,paths] of [
    [client,'app',clientPage,['','perfil','agendamentos','agendamentos/demo-candidato','realocacoes','jornada','jornada/demo-historico',
      'cuidados','cuidados/demo-historico','notificacoes','carrinho','checkout','pedidos']],
    [staff,'gestao',adminPage,['','agenda','flow','clientes','atendimentos/demo-candidato','notificacoes']],
    [manager,'gestao',adminPage,['','agenda','flow','clientes','clientes/demo-cliente','atendimentos/demo-candidato','profissionais/andre',
      'servicos/corte','produtos/pomada','manuais/manual-corte','pedidos','estoque','conteudo','configuracoes','auditoria','notificacoes']]
  ]) {
    ui.state.data=(await f.get('boot',actor)).data;
    for(const target of paths) {
      const parts=[entry,...target.split('/').filter(Boolean)];
      globalThis.location={href:'http://localhost/'+parts.join('/')};
      const detail=parts[2]&&['atendimentos','agendamentos','jornada','cuidados'].includes(parts[1])?
        (await f.get('reserva/'+parts[2],actor)).data:undefined;
      const html=render(parts,detail);
      assert.ok(html.length>120,parts.join('/'));
      assert.doesNotMatch(html,/Página indisponível|Área indisponível para este perfil/);
      if(target==='jornada/demo-historico') {
        assert.match(html,/href="\/loja\/pomada"/);
        assert.doesNotMatch(html,/Registro interno fictício/);
      }
    }
  }
});

test('carrinho local inválido não impede a navegação pública nem o carrinho',async t=>{
  const f=await fixture(t);
  const ui=await import('../public/ui.mjs');
  const {header}=await import('../public/public.mjs');
  const {clientPage}=await import('../public/client.mjs');
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const previousData=ui.state.data;
  t.after(()=>{
    if(previous) Object.defineProperty(globalThis,'localStorage',previous);
    else delete globalThis.localStorage;
    ui.state.data=previousData;
  });
  ui.state.data=(await f.get('boot')).data;
  for(const stored of ['null','[]','42','"texto"','{invalido',
    '{"pomada":null,"oleo":-1,"shampoo":"2","pente":100}',
    '{"pomada":2,"oleo":false,"pente":1.5}']) {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>stored}});
    assert.doesNotThrow(()=>header());
    assert.doesNotThrow(()=>clientPage(['app','carrinho']));
    assert.equal(ui.cartCount(),stored.includes('"pomada":2')?2:0);
  }
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){throw new Error('Acesso bloqueado');}}});
  assert.doesNotThrow(()=>header());
  assert.doesNotThrow(()=>clientPage(['app','carrinho']));
});

test('Journey apresenta ficha e cartões sem expor notas internas ou alterar o histórico',async t=>{
  const f=await fixture(t);
  await Promise.all([f.login(client),f.login(other)]);
  const ui=await import('../public/ui.mjs');
  const {clientPage}=await import('../public/client.mjs');
  const {landing,publicPage}=await import('../public/public.mjs');
  const previousLocation=globalThis.location,previousData=ui.state.data;
  t.after(()=>{
    if(previousLocation) globalThis.location=previousLocation; else delete globalThis.location;
    ui.state.data=previousData;
  });
  globalThis.location={href:'http://localhost/app/jornada'};
  ui.state.data=(await f.get('boot',client)).data;
  const session=ui.state.data.journey.find(j=>j.id==='demo-historico');
  assert.equal(session.used[0].productId,'pomada');
  assert.equal(session.recommended[0].productId,'oleo');
  assert.equal(session.duration,60);
  assert.equal(session.return_on,'Em 3 a 4 semanas');
  assert.doesNotMatch(JSON.stringify(session),/private_note|Registro interno fictício/);
  const journey=clientPage(['app','jornada']);
  assert.match(journey,/Ficha do atendimento/);
  assert.match(journey,/Usados no atendimento/);
  assert.match(journey,/Para sua rotina em casa/);
  assert.match(journey,/mini-product-image/);
  assert.match(journey,/href="\/loja\/pomada"/);
  assert.match(journey,/href="\/app\/cuidados\/demo-historico"/);
  assert.doesNotMatch(journey,/undefined|Registro interno fictício/);
  const home=landing();
  assert.match(home,/Sua evolução/);
  assert.match(home,/class="hero-photo"/);
  globalThis.location={href:'http://localhost/loja'};
  const shop=publicPage(['loja']);
  assert.match(shop,/\/assets\/pomada.webp/);
  assert.match(shop,/data-form="addProduct"/);
  await f.db.run("UPDATE products SET active=0,name='Nome atualizado' WHERE id='pomada'");
  ui.state.data=(await f.get('boot',client)).data;
  globalThis.location={href:'http://localhost/app/jornada'};
  const archived=clientPage(['app','jornada']);
  assert.match(archived,/Pomada Matte/);
  assert.match(archived,/Fora do catálogo atual/);
  assert.doesNotMatch(archived,/Nome atualizado|href="\/loja\/pomada"/);
  assert.equal((await f.get('boot',other)).data.journey.length,0);
});
