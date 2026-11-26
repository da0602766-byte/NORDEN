import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { addDays,dateTime,encode,local,minute,now,openDatabase,password,token,weekday } from './core.mjs';

export const demoAccounts=[
  ['demo-cliente','cliente@norden.example','cliente','Lucas Martins'],
  ['demo-gestor','gestor@norden.example','gestor','Rafael Almeida'],
  ['demo-profissional','profissional@norden.example','profissional','André Ferraz'],
  ['demo-cliente-2','cliente2@norden.example','cliente','Mateus Castro']
];
export async function seed(db,key) {
  if(await db.get('SELECT 1 FROM accounts WHERE id=?','demo-gestor')) return false;
  const secret=await password(key);
  return await db.tx(async ()=>{
    if(await db.get('SELECT 1 FROM accounts WHERE id=?','demo-gestor')) return false;
    for(const [id,email,role,name] of demoAccounts) await db.run('INSERT INTO accounts(id,email,password,role,name,phone,verified,created) VALUES(?,?,?,?,?,?,1,?)',
      id,email,secret,role,name,'(00) 00000-0000',now());
    const pros=[
      ['rafael',null,'Rafael Almeida','Cortes clássicos e barba','Une técnica de tesoura e visagismo para criar formas precisas e fáceis de manter.','/assets/rafael.webp'],
      ['andre','demo-profissional','André Ferraz','Fade e acabamento','Trabalha transições suaves, textura e cortes contemporâneos pensados para a rotina.','/assets/andre.webp']
    ];
    for(const row of pros) await db.run('INSERT INTO professionals(id,account_id,name,specialty,description,image) VALUES(?,?,?,?,?,?)',...row);
    const services=[
      ['corte','Corte masculino','Cabelo','Corte personalizado em tesoura ou máquina, com acabamento e orientação de finalização.','Consulte as opções de acabamento com o profissional.',8500,45,0],
      ['barba','Barba clássica','Barba','Desenho sob medida, toalha quente e finalização para valorizar os contornos.','Informe sensibilidades antes de iniciar.',6500,30,0],
      ['ritual','Corte & barba','Combos','Corte e barba em uma sessão, com acabamento coordenado e revisão das preferências.','Reserve a duração completa para os dois serviços.',13500,60,0],
      ['tratamento','Tratamento capilar','Cabelo','Sessão de lavagem, cuidado cosmético e finalização de acordo com o cabelo.','Converse sobre os produtos utilizados antes da aplicação.',15500,90,0]
    ];
    for(const row of services) {
      await db.run('INSERT INTO services(id,name,category,description,instructions,price,duration,padding) VALUES(?,?,?,?,?,?,?,?)',...row);
      for(const [professional] of pros) await db.run('INSERT INTO professional_services VALUES(?,?)',professional,row[0]);
      await db.run('INSERT INTO templates VALUES(?,?,?,1,?,1,?)','manual-'+row[0],row[0],'Cuidados após '+row[1].toLowerCase(),
        encode({instructions:'Siga a orientação de finalização demonstrada durante a sessão.',
          first:'Comece com pouca quantidade de produto e ajuste a aplicação conforme o acabamento desejado.',
          avoid:'Evite aplicar produtos que tenham provocado desconforto anteriormente.',
          maintenance:'Combine com seu profissional o melhor intervalo para a próxima sessão.'}),now());
    }
    for(const [professional] of pros) for(let weekday=1;weekday<7;weekday++) {
      await db.run('INSERT INTO hours VALUES(?,?,?,?)',professional,weekday,'09:00','12:00');
      await db.run('INSERT INTO hours VALUES(?,?,?,?)',professional,weekday,'13:00','19:00');
    }
    const goods=[
      ['pomada','ND-101','Pomada Matte','Cabelo','Fixação flexível e acabamento opaco para valorizar a textura.','90 g',7900,null,18],
      ['oleo','ND-102','Óleo para Barba','Barba','Finalização com toque leve e aroma amadeirado de referência.','30 mL',6900,null,13],
      ['shampoo','ND-103','Shampoo Diário','Cabelo','Limpeza para incluir em uma rotina simples de cuidado.','250 mL',8900,7900,12],
      ['limpeza','ND-104','Gel de Limpeza','Pele','Gel facial para remoção de resíduos na rotina diária.','100 mL',7200,null,8],
      ['pente','ND-105','Pente de Acabamento','Acessórios','Dentes finos e formato compacto para alinhar a finalização.','1 un.',3900,null,3],
      ['kit','ND-106','Kit Essencial','Acessórios','Seleção demonstrativa de cuidados para presentear.','1 kit',16900,null,0]
    ];
    for(const [key,sku,name,cat,desc,size,price,promo,stock] of goods) {
      await db.run('INSERT INTO products(id,sku,name,category,brand,description,usage,warnings,size,image,price,promo,physical) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
        key,sku,name,cat,'NORDEN',desc,'Consulte o rótulo do fabricante e a orientação do profissional.',
        'Produto ilustrativo. Confira os ingredientes do item real antes de usar.',size,'/assets/'+key+'.webp',price,promo,stock);
    }
    for(const [s,p] of [['corte','pomada'],['corte','shampoo'],['barba','oleo'],['barba','pente'],['ritual','pomada'],['ritual','oleo'],['tratamento','shampoo']])
      await db.run('INSERT INTO service_products VALUES(?,?)',s,p);
    await db.run("INSERT INTO gallery VALUES('textura','Textura & acabamento','/assets/atelier.webp',1,1)");
    await db.run("INSERT INTO gallery VALUES('perfil','Precisão no corte','/assets/hero.webp',1,1)");
    const today=local(now()).date;
    let next=addDays(today,1);
    while(weekday(next)===0) next=addDays(next,1);
    let later=addDays(next,1);
    while(weekday(later)===0) later=addDays(later,1);
    const rows=[
      ['demo-vaga','demo-cliente-2','andre','ritual',next,'10:00','CONFIRMADO'],
      ['demo-candidato','demo-cliente','andre','corte',later,'11:00','CONFIRMADO'],
      ['demo-longo','demo-cliente-2','andre','tratamento',later,'14:00','CONFIRMADO'],
      ['demo-historico','demo-cliente','rafael','ritual',addDays(today,-12),'15:00','CONCLUIDO']
    ];
    for(const [id,client,prof,service,date,clock,status] of rows) {
      const item=services.find(v=>v[0]===service);
      const person=pros.find(v=>v[0]===prof)[2];
      const begin=dateTime(date,clock);
      const length=item[6];
      await db.run(`INSERT INTO bookings(id,client_id,professional_id,service_id,service_name,professional_name,starts,ends,duration,padding,price,status,created,started,finished)
        VALUES(?,?,?,?,?,?,?,?,?,0,?,?,?,?,?)`,id,client,prof,service,item[1],person,begin,begin+length*minute,length,item[5],status,now(),
        status==='CONCLUIDO'?begin:null,status==='CONCLUIDO'?begin+length*minute:null);
      await db.run('INSERT INTO booking_events VALUES(?,?,?,?,?,?)','event-'+id,id,'demo-gestor',status,now(),'{}');
    }
    const manual=await db.get("SELECT sections FROM templates WHERE id='manual-ritual'");
    await db.run('INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?)','demo-historico','Corte & barba',
      encode([{productId:'pomada',name:'Pomada Matte',amount:'Pequena porção',detail:'Usada na finalização.'}]),
      encode([{productId:'oleo',name:'Óleo para Barba',detail:'Sugestão para manter o acabamento.'}]),
      'Laterais com transição suave e barba alinhada.','Registro interno fictício.','Em 3 a 4 semanas',
      encode({title:'Mantenha o acabamento',sections:JSON.parse(manual.sections),templateId:'manual-ritual',version:1,reviewed:true}),
      'demo-gestor',now());
    await db.run("INSERT INTO notifications VALUES('demo-boas-vindas','demo-cliente','Seu histórico está no NORDEN Journey','/app/jornada/demo-historico',?,NULL,'demo:journey')",now());
    return true;
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.env.NODE_ENV==='production') throw new Error('A carga fictícia é exclusiva de demonstração.');
  const db=openDatabase(resolve(process.env.NORDEN_DATA || 'data','norden.sqlite'),{secret:process.env.NORDEN_SAFETY_KEY});
  try {
    const key=process.env.NORDEN_DEMO_PASSWORD || token().slice(0,18);
    if(await seed(db,key)) {
      console.log('Contas fictícias criadas. Senha desta instância: '+key);
      for(const [,email,role] of demoAccounts) console.log(role+' '+email);
    } else console.log('Esta base já possui contas de demonstração.');
  } finally { db.close(); }
}
