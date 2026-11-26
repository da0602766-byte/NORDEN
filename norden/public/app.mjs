import {state,esc,api,action,brand,icon,link,button,form,empty,dataOf,selected,checked,find,guestCart,saveCart,
  cartCount,loadingView} from './ui.mjs';
import {header,footer,landing,publicPage,authView,accountHome} from './public.mjs';
import {clientPage,manualSections} from './client.mjs';
import {adminPage} from './admin.mjs';

const app=document.querySelector('#app');
const toast=document.querySelector('#toast');
let messageTimer,version=0;
const bookingKey='norden-booking';
const clientNav=[
  ['/app','Início','home'],['/app/agendamentos','Agenda','calendar'],['/app/jornada','Journey','clock'],
  ['/app/cuidados','Care','book'],['/app/realocacoes','Flow','flow'],['/loja','Loja','bag'],
  ['/app/pedidos','Pedidos','bag'],['/app/perfil','Perfil','user']
];
const staffNav=[
  ['/gestao','Visão geral','home'],['/gestao/agenda','Agenda','calendar'],['/gestao/flow','NORDEN Flow','flow'],
  ['/gestao/clientes','Clientes','user']
];
const adminNav=[
  ['/gestao/servicos','Serviços','scissors'],['/gestao/profissionais','Profissionais','user'],['/gestao/produtos','Produtos','bag'],
  ['/gestao/estoque','Estoque','grid'],['/gestao/manuais','Manuais Care','book'],['/gestao/pedidos','Pedidos','bag'],
  ['/gestao/conteudo','Conteúdo público','grid'],['/gestao/configuracoes','Configurações','menu'],['/gestao/auditoria','Auditoria','shield']
];
const onlyLocal=target=>typeof target==='string' && /^\/(?![\\/])/.test(target) ? target : '';
function popup(message,error=false) {
  clearTimeout(messageTimer);
  toast.innerHTML=`<div class="toast ${error?'error':''}">${icon(error?'cross':'check')}<span>${esc(message)}</span><button class="icon-button" type="button" data-command="dismissToast" aria-label="Fechar aviso">${icon('cross',17)}</button></div>`;
  messageTimer=setTimeout(()=>{toast.innerHTML='';},4500);
}
async function load() { state.data=await api('boot'); }
try {
  const d=JSON.parse(sessionStorage.getItem(bookingKey)??'null');
  if(d) state.draft={...d,slots:null,step:Math.min(d.step,4)};
} catch { /* session storage can be unavailable */ }
function saveDraft() {
  try {
    if(state.draft) {
      const {slots,lastError,...draft}=state.draft;
      sessionStorage.setItem(bookingKey,JSON.stringify(draft));
    } else sessionStorage.removeItem(bookingKey);
  } catch { /* session storage can be unavailable */ }
}
function revealSections() {
  if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries) if(entry.isIntersecting) {
      entry.target.classList.add('section-enter');
      observer.unobserve(entry.target);
    }
  },{threshold:.12});
  observerByPage?.disconnect();
  observerByPage=observer;
  app.querySelectorAll('main > .section-space > .wrap').forEach(node=>observer.observe(node));
}
let observerByPage;
function go(url,replace=false) {
  const safe=onlyLocal(url);
  if(!safe) return;
  history[replace?'replaceState':'pushState'](null,'',safe);
  draw(true);
}
function navLink([href,title,glyph],path) {
  const active=path===href||(!['/app','/gestao'].includes(href)&&path.startsWith(href+'/'));
  return `<a class="side-link ${active?'active':''}" href="${href}" ${active?'aria-current="page"':''}>${icon(glyph,19)}<span>${title}</span></a>`;
}
function workspace(body,path,admin) {
  const user=state.data.user;
  const notifications=state.data.notifications?.filter(n=>!n.read_at).length??0;
  const home=admin?'/gestao':'/app';
  const nav=admin?[...staffNav,...(user.role==='gestor'?adminNav:[])]:clientNav;
  return `<div class="workspace"><aside class="sidebar" id="area-nav">${brand()}<div class="side-caption">${admin?(user.role==='gestor'?'ADMINISTRAÇÃO':'ÁREA PROFISSIONAL'):'ÁREA DO CLIENTE'}</div>
    <nav aria-label="Navegação da área">${nav.map(item=>navLink(item,path)).join('')}</nav>
    <div class="side-foot">${link('/','Página inicial','side-link','home')}${form('logout',button('Sair','side-link'))}</div></aside>
    <div class="workspace-body"><header class="workspace-header"><div class="workspace-ident"><button type="button" class="icon-button area-menu" aria-label="Abrir menu da área" aria-expanded="false" data-command="sideMenu">${icon('menu')}</button>
    <a href="${home}" class="workspace-name">${admin?'Gestão NORDEN':'Minha área'}</a></div>
    <div class="workspace-actions"><span class="demo-label">Demonstração</span>
    <a href="${home+'/notificacoes'}" class="icon-button cart-icon" aria-label="Notificações, ${notifications} não lidas">${icon('bell')}${notifications?'<b>'+notifications+'</b>':''}</a>
    ${admin?'':`<a href="/app/carrinho" class="icon-button cart-icon" aria-label="Carrinho, ${cartCount()} ${cartCount()===1?'item':'itens'}">${icon('bag')}${cartCount()?'<b>'+cartCount()+'</b>':''}</a>`}
    <span class="user-initial" aria-label="${esc(user.name)}">${esc(user.name[0])}</span></div></header>
    <main class="workspace-content" id="conteudo" tabindex="-1">${body}</main>
    ${admin?'':`<nav class="mobile-tabs" aria-label="Acesso rápido">${[clientNav[0],clientNav[1],clientNav[2],clientNav[5],clientNav[7]].map(item=>navLink(item,path)).join('')}</nav>`}</div></div>`;
}
function publicLayout(body,wide=false) {
  return `${header()}<main id="conteudo" tabindex="-1" class="${wide?'':'wrap public-content'}">${body}</main>${footer()}`;
}
function gate(path,admin) {
  if(state.data.user) return empty('Esta área usa outro perfil','Saia da conta atual para entrar com o perfil correspondente.',
    `<div class="actions">${link(accountHome(),'Minha área','button outline')}${form('logout',button('Sair da conta'))}</div>`);
  return empty(admin?'Área da equipe NORDEN':'Entre na sua conta','Use seu acesso para abrir esta área.',
    `<div class="actions">${link('/login?voltar='+encodeURIComponent(path),'Entrar','button primary')}${admin?'':link('/cadastro?voltar='+encodeURIComponent(path),'Criar conta','button outline')}</div>`);
}
async function draw(routeChange=false) {
  if(!state.data) return;
  const stamp=++version,url=new URL(location.href),path=url.pathname.replace(/\/$/,'')||'/',parts=path.split('/').filter(Boolean);
  const previous=state.route;
  state.route=path;
  if(previous==='/app/checkout'&&path!==previous) { state.quote=null; state.checkout=null; }
  if(routeChange&&path==='/app/agendar'&&(url.searchParams.has('servico')||url.searchParams.has('profissional'))&&
    (state.draft?.serviceId!==(url.searchParams.get('servico')||state.draft?.serviceId)||state.draft?.professionalId!==(url.searchParams.get('profissional')||state.draft?.professionalId))) state.draft=null;
  const user=state.data.user, isAdmin=parts[0]==='gestao',isClient=parts[0]==='app';
  const allows=isAdmin?user&&user.role!=='cliente':user?.role==='cliente';
  let body,detail;
  try {
    if((isAdmin||isClient)&&allows&&parts[2]) {
      const kind=parts[1]==='pedidos'?'pedido':['atendimentos','agendamentos','cuidados','jornada'].includes(parts[1])?'reserva':'';
      if(kind) {
        if(routeChange) {
          app.setAttribute('aria-busy','true');
          app.innerHTML=(isAdmin||isClient)?workspace(loadingView('Abrindo sua ficha…'),path,isAdmin):loadingView();
        }
        try { detail=await api(kind+'/'+encodeURIComponent(parts[2])); }
        catch(error) {
          if(error.status!==404&&error.status!==403) throw error;
        }
      }
    }
    if(stamp!==version) return;
    if(path==='/') body=publicLayout(landing(),true);
    else if(['/login','/cadastro','/recuperar-senha','/conta/redefinir','/conta/verificar','/conta/convite'].includes(path)) body=publicLayout(authView(path),true);
    else if(isAdmin) body=allows?workspace(adminPage(parts,detail),path,true):publicLayout(gate(path+url.search,true));
    else if(isClient) body=allows?workspace(clientPage(parts,detail),path,false):
      ['agendar','carrinho'].includes(parts[1])?publicLayout(clientPage(parts,detail)):publicLayout(gate(path+url.search,false));
    else body=publicLayout(publicPage(parts));
    app.innerHTML=body;
    revealSections();
    app.removeAttribute('aria-busy');
    const title=app.querySelector('h1')?.textContent.trim();
    document.title=path==='/'?'NORDEN — Salão Inteligente Masculino':(title?title+' | ':'')+'NORDEN';
    if(routeChange) {
      if(url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView();
      else {
        window.scrollTo(0,0);
        app.querySelector('main')?.focus({preventScroll:true});
      }
    }
  } catch(error) {
    if(stamp!==version) return;
    app.removeAttribute('aria-busy');
    if(error.status===401) { await load(); go('/login?voltar='+encodeURIComponent(path),true); return; }
    app.innerHTML=publicLayout(empty('Não foi possível abrir a página',error.message,button('Tentar novamente','button primary','data-command="retry"')));
  }
}
const parseAddress=fields=>Object.fromEntries(['zip','street','number','extra','district','city','state'].map(key=>[key,fields[key]??'']));
const checkedFields=(form,fields)=>Object.fromEntries(fields.map(key=>[key,checked(form,key)]));
const selectedFields=(form,fields)=>Object.fromEntries(fields.map(key=>[key,selected(form,key)]));
function blankError(form,error) {
  const target=form.querySelector('.form-error');
  target.hidden=false;
  target.textContent=error.message||'Ocorreu uma falha. Tente novamente.';
  target.setAttribute('tabindex','-1');
  target.focus({preventScroll:true});
}
async function refresh(message) { await load(); await draw(); if(message) popup(message); }
async function slots(date,keep=false) {
  const d=state.draft;
  if(!d) return;
  if(!date) { d.slots=null; await draw(); return; }
  const key=[d.serviceId,d.professionalId,date].join('/');
  state.slotRequest=key;
  const result=await api('disponibilidade?'+new URLSearchParams({serviceId:d.serviceId,professionalId:d.professionalId,date}));
  if(state.slotRequest!==key||state.route!=='/app/agendar') return;
  Object.assign(d,{date,price:result.price,slots:result.slots,lastError:''});
  if(!keep||!result.slots.some(s=>s.clock===d.clock)) d.clock='';
  saveDraft();
  await draw();
}
async function booking(form,fields) {
  const d=state.draft;
  d.lastError='';
  if(d.step===1&&d.serviceId!==fields.serviceId) {
    d.serviceId=fields.serviceId;
    if(!state.data.catalog.compatibility.some(c=>c.service_id===d.serviceId&&c.professional_id===d.professionalId)) d.professionalId='';
    d.preferences=[];d.slots=null;d.clock='';
  }
  if(d.step===2&&d.professionalId!==fields.professionalId) {
    d.professionalId=fields.professionalId;d.clock='';d.slots=null;
  }
  if(d.step===3) d.preferences=selected(form,'preferences');
  if(d.step===4) { d.date=fields.date;d.clock=fields.clock; }
  if(d.step<5) {
    d.step++;
    saveDraft();
    if(d.step===4) {
      await draw();
      await slots(d.date,true);
    } else await draw();
    return;
  }
  if(state.data.user?.role!=='cliente') {
    saveDraft();
    go('/login?voltar=%2Fapp%2Fagendar');
    return;
  }
  try {
    const result=await action('book',d);
    state.draft=null;saveDraft();
    await load();
    go('/app/agendamentos/'+result.id);
    popup('Agendamento confirmado.');
  } catch(error) {
    if(error.status!==409) throw error;
    await load();
    if(!find('services',d.serviceId)||!find('professionals',d.professionalId)) {
      state.draft=null;
      saveDraft();
      await draw();
      popup(error.message,true);
      return;
    }
    d.step=4;
    d.clock='';
    try { await slots(d.date); } catch { d.slots=null; }
    d.lastError=error.message;
    await draw();
    popup(error.message,true);
  }
}
function updateGuest(fields,delta) {
  const cart=guestCart(),p=find('products',fields.productId);
  const quantity=delta?(cart[fields.productId]??0)+Number(fields.quantity):Number(fields.quantity);
  if(quantity&&(!p?.active||!Number.isInteger(quantity)||quantity<1||quantity>Math.min(99,p.available))) throw new Error('Quantidade indisponível em estoque.');
  if(quantity) cart[fields.productId]=quantity;else delete cart[fields.productId];
  saveCart(cart);
}
async function importGuest() {
  if(state.data.user?.role!=='cliente') return;
  const guest=guestCart();
  for(const [productId,delta] of Object.entries(guest)) {
    try { await action('cartItem',{productId,delta});delete guest[productId]; }
    catch { popup('Um item do carrinho local não estava disponível para a conta.',true); }
  }
  saveCart(guest);
  await load();
}
const direct={
  requestMove:['requestMove','Solicitação enviada.'],cancelBooking:['cancel','Agendamento cancelado.'],noShow:['noShow','Falta registrada.'],
  block:['block','Bloqueio criado.'],unblock:['block','Bloqueio removido.'],offer:['offer','Oferta enviada.'],
  privacy:['privacy','Solicitação registrada.'],privacyState:['privacyState','Solicitação atualizada.'],readNotifications:['readNotifications',''],
  addressRemove:['address','Endereço removido.'],resend:['resend','Link registrado na caixa de saída local.'],
  orderState:['orderState','Pedido atualizado.'],inventory:['inventory','Movimento de estoque registrado.'],
  photoRemove:['photo','Foto excluída.'],moderate:['moderate','Moderação salva.']
};
function readFile(file) {
  if(!file||file.size===0) throw new Error('Escolha uma imagem.');
  if(file.size>2*1024*1024) throw new Error('Use uma imagem de até 2 MB.');
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Não foi possível abrir a imagem.'));
    reader.readAsDataURL(file);
  });
}
function productInput(form,kind) {
  return Array.from(form.querySelectorAll('[data-care-group="'+kind+'"] [data-care-rows] > .care-item')).map(row=>{
    const value=suffix=>row.querySelector('[name="'+kind+suffix+'"]')?.value??'';
    return {productId:value('Product'),name:value('Name'),amount:value('Amount'),detail:value('Detail')};
  }).filter(p=>p.productId||p.name||p.amount||p.detail);
}
async function dispatch(name,form,fields,phase) {
  if(name==='urlFilter'||name==='shopFilter') {
    const params=new URLSearchParams(Object.entries(fields).filter(([,value])=>value));
    go(state.route+(params.size?'?'+params:''));
    return;
  }
  if(name==='login'||name==='register'||name==='redeem') {
    const result=await action(name,fields);
    await load();
    await importGuest();
    const target=onlyLocal(fields.target);
    if(target==='/app/agendar'&&state.draft?.step===4) {
      state.draft.slots=null;
      await draw();
    }
    go(!target||((result.role&&result.role!=='cliente')&&target.startsWith('/app'))?accountHome():target,true);
    if(name==='register') popup('Conta de demonstração criada.');
    return;
  }
  if(name==='logout') { await action('logout'); await load(); go('/',true);popup('Sessão encerrada.');return; }
  if(name==='recover') {
    await action('recover',fields);
    popup('Se a conta existir, o link ficará na caixa de saída local.');
    form.reset();
    return;
  }
  if(name==='reset'||name==='verify') {
    await action(name,fields);
    await load();
    go(name==='reset'?'/login':accountHome(),true);
    popup(name==='reset'?'Senha atualizada.':'E-mail confirmado.');
    return;
  }
  if(name==='wizard') { await booking(form,fields); return; }
  if(name==='cartItem'||name==='addProduct') {
    const auth=state.data.user?.role==='cliente',delta=name==='addProduct';
    if(auth) { await action('cartItem',{productId:fields.productId,[delta?'delta':'quantity']:fields.quantity}); await load(); }
    else updateGuest(fields,delta);
    if(delta) go('/app/carrinho'); else await draw();
    popup(delta?'Produto adicionado ao carrinho.':'Carrinho atualizado.');
    return;
  }
  if(name==='profile'||name==='safety'||name==='withdrawSafety') {
    const target=name==='withdrawSafety'?'safety':name;
    await action(target,{...fields,...checkedFields(form,name==='profile'?['moveOk','photoOk']:['consent'])});
    await refresh(target==='safety'?'Preferências de privacidade salvas.':'Perfil atualizado.');
    return;
  }
  if(name==='address') { await action(name,{...fields,...parseAddress(fields)}); await refresh('Endereço salvo.'); return; }
  if(name==='quote') {
    state.checkout={...fields,address:parseAddress(fields)};
    state.quote=null;
    try { state.quote=await action('quote',state.checkout); }
    catch(error) { await draw();popup(error.message,true);return; }
    state.requestKey=globalThis.crypto?.randomUUID?.()??(String(Date.now())+Math.random().toString(36).slice(2));
    await draw();
    popup('Valores calculados. Revise o total.');
    document.querySelector('.quote-pane form button')?.focus({preventScroll:true});
    return;
  }
  if(name==='checkout') {
    try {
      const result=await action(name,{...state.checkout,quoteKey:state.quote?.key,requestKey:state.requestKey});
      await load();
      go('/app/pedidos/'+result.id);
      popup('Pedido registrado.');
    } catch(error) {
      if(error.status!==409) throw error;
      state.quote=null;
      await refresh();
      popup(error.message,true);
    }
    return;
  }
  if(name==='flowAnswer') {
    const response=await action('answer',{id:fields.id,decision:phase});
    await refresh({EFETIVADA:'Novo horário confirmado.',RECUSADA:'Oferta recusada. Horário original preservado.',
      EXPIRADA:'Oferta expirada. Horário original preservado.',INVALIDADA:'Esta oferta já está encerrada.'}[response.status]);
    return;
  }
  if(name==='manualBook'||name==='availabilityAdmin') {
    if(phase!=='confirmar') {
      const availability=await api('disponibilidade?'+new URLSearchParams({serviceId:fields.serviceId,professionalId:fields.professionalId,date:fields.date}));
      state.adminSlots={...availability,type:name==='manualBook'?'manual':'consulta',fields};
      await draw();
    } else {
      const result=await action(name,fields);
      state.adminSlots=null;
      await load();
      go('/gestao/atendimentos/'+result.id);
      popup('Agendamento registrado.');
    }
    return;
  }
  if(name==='start'||name==='manualMove'||name==='review') {
    await action(name,{...fields,...checkedFields(form,['approved','acknowledged','publishOk'])});
    await refresh(name==='review'?'Avaliação registrada.':name==='start'?'Atendimento iniciado.':'Horário atualizado.');
    return;
  }
  if(name==='treatment') {
    await action(phase||'draft',{...fields,used:productInput(form,'used'),recommended:productInput(form,'recommended'),...checkedFields(form,['noneUsed','reviewed'])});
    await refresh(phase==='finalize'?'Atendimento concluído e manual publicado.':phase==='correct'?'Correção publicada.':'Rascunho salvo.');
    return;
  }
  if(name==='photo') {
    const image=await readFile(new FormData(form).get('image'));
    await action(name,{...fields,image,authorized:checked(form,'authorized')});
    await refresh('Foto privada anexada.');
    return;
  }
  if(['service','professional','product','template','gallery'].includes(name)) {
    const result=await action(name,{...fields,...checkedFields(form,['active','authorized']),...selectedFields(form,['professionals','services','products'])});
    await load();
    const map={service:'servicos',professional:'profissionais',product:'produtos',template:'manuais'};
    if(map[name]) go('/gestao/'+map[name]+'/'+result.id,true); else await draw();
    popup('Alterações salvas.');
    return;
  }
  if(name==='hours') {
    const hours=[];
    for(let day=0;day<7;day++) for(let index=0;index<3;index++) {
      const start=fields['start-'+day+'-'+index],end=fields['end-'+day+'-'+index];
      if(start||end) hours.push({day,start,end});
    }
    await action(name,{professionalId:fields.professionalId,hours});await refresh('Expediente atualizado.');return;
  }
  if(name==='settings') {
    const faq=fields.faq.split('\n').filter(line=>line.trim()).map(line=>line.split('|').map(value=>value.trim()));
    await action(name,{...fields,faq,reviews:checked(form,'reviews')});await refresh('Configurações atualizadas.');return;
  }
  if(name==='invite') {
    const result=await action(name,fields);
    const url=location.origin+result.path;
    form.querySelector('[data-invite-result]').innerHTML=`<p>Convite gerado. Compartilhe com o destinatário indicado.</p><input class="invite-link" readonly aria-label="Link de convite" value="${esc(url)}">`;
    popup('Convite gerado.');
    return;
  }
  if(direct[name]) {
    const [target,message]=direct[name];
    await action(target,fields);await refresh(message);return;
  }
  throw new Error('Ação indisponível.');
}
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||!form.dataset.form) return;
  event.preventDefault();
  if(form.dataset.pending) return;
  const submitter=event.submitter;
  const fields=dataOf(form),phase=submitter?.value;
  const error=form.querySelector('.form-error');
  error.hidden=true;
  form.dataset.pending='1';
  form.setAttribute('aria-busy','true');
  if(submitter) submitter.disabled=true;
  try { await dispatch(form.dataset.form,form,fields,phase); }
  catch(error) {
    if(error.status===401&&state.data.user&&form.dataset.form!=='login') { await load();go('/login?voltar='+encodeURIComponent(location.pathname));popup('Sessão expirada. Entre novamente.',true); }
    else if(form.isConnected) blankError(form,error);
    else popup(error.message,true);
  } finally {
    delete form.dataset.pending;
    form.removeAttribute('aria-busy');
    if(submitter) submitter.disabled=false;
  }
});
document.addEventListener('click',async event=>{
  const confirmation=event.target.closest('[data-confirm]');
  if(confirmation&&!window.confirm(confirmation.dataset.confirm)) { event.preventDefault();return; }
  const command=event.target.closest('[data-command]');
  if(command) {
    event.preventDefault();
    const form=command.closest('form');
    try {
      switch(command.dataset.command) {
        case 'dismissToast': toast.innerHTML=''; break;
        case 'menu': {
          const open=document.querySelector('.nav-bar').classList.toggle('open');
          command.setAttribute('aria-expanded',String(open));break;
        }
        case 'sideMenu': {
          const open=document.querySelector('.workspace').classList.toggle('side-open');
          command.setAttribute('aria-expanded',String(open));break;
        }
        case 'retry': await init();break;
        case 'previousStep': state.draft.step--;saveDraft();await draw();break;
        case 'slots': await slots(form.elements.date.value);break;
        case 'manualPreview': {
          const fields=dataOf(form);
          form.querySelector('[data-manual-preview]').innerHTML=manualSections({title:fields.title,sections:fields});break;
        }
        case 'addCare': {
          const group=command.closest('[data-care-group]');
          const rows=group.querySelector('[data-care-rows]');
          rows.append(group.querySelector('template').content.cloneNode(true));
          rows.lastElementChild.querySelector('select')?.focus();break;
        }
        case 'removeCare': command.closest('.care-item').remove();break;
      }
    } catch(error) { if(form) blankError(form,error);else popup(error.message,true); }
    return;
  }
  const a=event.target.closest('a[href]');
  if(!a||a.target||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.hasAttribute('download')) return;
  const href=a.getAttribute('href');
  if(!onlyLocal(href)) return;
  event.preventDefault();
  if(a.dataset.notification) {
    try { await action('readNotifications',{id:a.dataset.notification}); await load(); } catch { /* destination still opens */ }
  }
  go(href);
});
document.addEventListener('change',async event=>{
  const input=event.target,form=input.closest('form');
  if(!form) return;
  if(input.dataset.watch==='bookDate') {
    state.draft.date=input.value;state.draft.clock='';state.draft.slots=null;saveDraft();
    try { await slots(input.value); } catch(error) { blankError(form,error); }
  }
  if(input.dataset.watch==='checkout') {
    const fields=dataOf(form);
    state.checkout={...fields,address:parseAddress(fields)};state.quote=null;await draw();
  }
});
document.addEventListener('input',event=>{
  const form=event.target.closest('form');
  if(form?.dataset.form==='quote'&&state.quote) {
    state.quote=null;
    const pane=document.querySelector('.quote-pane');
    pane.querySelector('form')?.remove();
    if(!pane.querySelector('.quote-stale')) pane.insertAdjacentHTML('beforeend','<p class="hint quote-stale">Dados alterados. Calcule novamente para confirmar.</p>');
  }
});
window.addEventListener('popstate',()=>draw(true));
async function init() {
  app.setAttribute('aria-busy','true');
  app.innerHTML=loadingView();
  try { await load(); await draw(true); }
  catch(error) {
    app.removeAttribute('aria-busy');
    app.innerHTML=`<main class="wrap public-content">${empty('NORDEN indisponível','Verifique a conexão com a instância e tente novamente.',button('Tentar novamente','button primary','data-command="retry"'))}</main>`;
  }
}
init();
