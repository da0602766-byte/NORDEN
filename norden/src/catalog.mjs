import { array,audit,encode,fail,id,integer,now,parse,selection,str } from './core.mjs';
import { manager } from './identity.mjs';

const safeImage = value => {
  const path=str(value,'imagem',400);
  if (path && !/^\/assets\/[\w.-]+$/.test(path) && !/^https:\/\/[\w.-]+(?::\d+)?\/[^\s"'<>]+$/.test(path)) fail('Use uma imagem HTTPS ou um arquivo de /assets.');
  return path;
};
function links(db,table,owner,key,ids,foreign,registry) {
  const values=[...new Set(array(ids))];
  for (const value of values) if (typeof value!=='string'||!db.get('SELECT 1 FROM '+registry+' WHERE id=?',value)) fail('Confira os vínculos selecionados.');
  db.run('DELETE FROM '+table+' WHERE '+owner+'=?',key);
  for (const value of values) db.run('INSERT INTO '+table+' ('+owner+','+foreign+') VALUES(?,?)',key,value);
}
function existing(db,table,value) {
  const key=str(value,'identificador',80);
  if (key && !db.get('SELECT 1 FROM '+table+' WHERE id=?',key)) fail('Registro indisponível.',404);
  return key || id();
}
function upsert(db,table,value) {
  const keys=Object.keys(value);
  db.run('INSERT INTO '+table+'('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+') ON CONFLICT(id) DO UPDATE SET '+
    keys.slice(1).map(key=>key+'=excluded.'+key).join(','),...Object.values(value));
}
export const sections = body => ({
  instructions:str(body.instructions,'orientações',2500,1), first:str(body.first,'primeiras horas',1600),
  avoid:str(body.avoid,'o que evitar',1600), maintenance:str(body.maintenance,'manutenção',1600)
});
export function publicCatalog(db,full=false) {
  const services=db.all('SELECT * FROM services '+(full?'':'WHERE active=1')+' ORDER BY rowid');
  const professionals=db.all('SELECT * FROM professionals '+(full?'':'WHERE active=1')+' ORDER BY rowid');
  const products=db.all('SELECT * FROM products '+(full?'':'WHERE active=1')+' ORDER BY rowid').map(row=>{
    const {physical,reserved,threshold,...safe}=row;
    return full ? {...row,available:physical-reserved} : {...safe,available:physical-reserved};
  });
  const {headline,introduction,address,contact,hoursText,faq,pickup,cancellationHours,leadMinutes,bookingDays,payment,deliveryMax,reviews}=db.settings();
  return {
    services,professionals:professionals.map(({account_id,...p})=>full ? {...p,account_id} : p),products,
    compatibility:db.all(`SELECT ps.* FROM professional_services ps JOIN services s ON s.id=ps.service_id JOIN professionals p ON p.id=ps.professional_id ${full?'':'WHERE s.active=1 AND p.active=1'}`),
    serviceProducts:db.all(`SELECT sp.* FROM service_products sp JOIN services s ON s.id=sp.service_id JOIN products p ON p.id=sp.product_id ${full?'':'WHERE s.active=1 AND p.active=1'}`),
    gallery:db.all('SELECT * FROM gallery '+(full?'':'WHERE authorized=1 AND active=1')+' ORDER BY rowid'),
    reviews:reviews ? db.all(`SELECT r.rating,r.comment,b.service_name FROM reviews r JOIN bookings b ON b.id=r.booking_id WHERE r.publish_ok=1 AND r.moderation='PUBLICADA' ORDER BY r.updated DESC LIMIT 12`) : [],
    info:{headline,introduction,address,contact,hoursText,faq,pickup,cancellationHours,leadMinutes,bookingDays,payment,deliveryMax,reviews}
  };
}
export const catalogActions = {
  service(db,body,user) {
    manager(user);
    const key=existing(db,'services',body.id);
    return db.tx(()=>{
      upsert(db,'services',{id:key,name:str(body.name,'nome',90,2),category:str(body.category,'categoria',60,2),
        description:str(body.description,'descrição',1000,3),instructions:str(body.instructions,'orientações',1200),
        price:integer(body.price,'preço'),duration:integer(body.duration,'duração',15,480),
        padding:integer(body.padding,'intervalo',0,120),active:Number(body.active===true)});
      links(db,'professional_services','service_id',key,body.professionals,'professional_id','professionals');
      links(db,'service_products','service_id',key,body.products,'product_id','products');
      audit(db,user.id,'SERVICO_SALVO','servico',key);
      return {id:key};
    });
  },
  professional(db,body,user) {
    manager(user);
    const key=existing(db,'professionals',body.id);
    return db.tx(()=>{
      upsert(db,'professionals',{id:key,name:str(body.name,'nome',90,2),specialty:str(body.specialty,'especialidades',140,2),
        description:str(body.description,'apresentação',800,3),image:safeImage(body.image),active:Number(body.active===true)});
      links(db,'professional_services','professional_id',key,body.services,'service_id','services');
      audit(db,user.id,'PROFISSIONAL_SALVO','profissional',key);
      return {id:key};
    });
  },
  product(db,body,user) {
    manager(user);
    const key=existing(db,'products',body.id);
    const sku=str(body.sku,'SKU',60,2).toUpperCase();
    const duplicate=db.get('SELECT id FROM products WHERE sku=? AND id<>?',sku,key);
    if (duplicate) fail('Já existe um produto com este SKU.',409);
    const price=integer(body.price,'preço');
    return db.tx(()=>{
      upsert(db,'products',{id:key,sku,name:str(body.name,'nome',90,2),category:str(body.category,'categoria',60,2),
        brand:str(body.brand,'marca',80,2),description:str(body.description,'descrição',1400,3),
        ingredients:str(body.ingredients,'ingredientes',1200),usage:str(body.usage,'modo de uso',1200),
        warnings:str(body.warnings,'alertas',1000),size:str(body.size,'tamanho',35),image:safeImage(body.image),
        price,promo:body.promo===''||body.promo==null ? null : integer(body.promo,'preço promocional',0,price),
        threshold:integer(body.threshold,'limite de estoque',0,99999),active:Number(body.active===true)});
      links(db,'service_products','product_id',key,body.services,'service_id','services');
      audit(db,user.id,'PRODUTO_SALVO','produto',key);
      return {id:key};
    });
  },
  hours(db,body,user) {
    manager(user);
    const key=str(body.professionalId,'profissional',80,1);
    if (!db.get('SELECT 1 FROM professionals WHERE id=?',key)) fail('Profissional indisponível.',404);
    const values=array(body.hours,21).map(item=>{
      const day=integer(item.day,'dia',0,6);
      const clock=/^([01]\d|2[0-3]):[0-5]\d$/;
      if (!clock.test(item.start)||!clock.test(item.end)||item.start>=item.end) fail('Confira início e fim do expediente.');
      return {day,start:item.start,end:item.end};
    }).sort((a,b)=>a.day-b.day||a.start.localeCompare(b.start));
    for (let i=1;i<values.length;i++) if (values[i-1].day===values[i].day && values[i-1].end>values[i].start) fail('Há horários de expediente sobrepostos.');
    return db.tx(()=>{
      db.run('DELETE FROM hours WHERE professional_id=?',key);
      for (const item of values) db.run('INSERT INTO hours VALUES(?,?,?,?)',key,item.day,item.start,item.end);
      audit(db,user.id,'EXPEDIENTE_ATUALIZADO','profissional',key);
      return {ok:true};
    });
  },
  template(db,body,user) {
    manager(user);
    const serviceId=str(body.serviceId,'serviço',80,1);
    if (!db.get('SELECT 1 FROM services WHERE id=?',serviceId)) fail('Serviço indisponível.',404);
    return db.tx(()=>{
      const version=db.get('SELECT COALESCE(MAX(version),0)+1 AS n FROM templates WHERE service_id=?',serviceId).n;
      const key=id();
      if (body.active===true) db.run('UPDATE templates SET active=0 WHERE service_id=?',serviceId);
      db.run('INSERT INTO templates VALUES(?,?,?,?,?,?,?)',key,serviceId,str(body.title,'título',110,2),version,encode(sections(body)),Number(body.active===true),now());
      audit(db,user.id,'MODELO_PUBLICADO','manual',key);
      return {id:key,version};
    });
  },
  gallery(db,body,user) {
    manager(user);
    const key=existing(db,'gallery',body.id);
    const image=safeImage(body.image);
    if (!image) fail('Informe a imagem.');
    upsert(db,'gallery',{id:key,title:str(body.title,'título',120,2),image,authorized:Number(body.authorized===true),active:Number(body.active===true)});
    audit(db,user.id,'GALERIA_ATUALIZADA','galeria',key);
    return {id:key};
  },
  settings(db,body,user) {
    manager(user);
    const settings=db.settings();
    const texts={headline:120,introduction:300,address:300,contact:180,hoursText:200,pickup:500};
    const ranges={cancellationHours:[0,168],leadMinutes:[0,1440],bookingDays:[1,180],flowDays:[1,45],offerHours:[1,72],
      deliveryRate:[0,100000],deliveryMax:[1,300],deliveryBase:[0,100000],deliveryMinimum:[0,100000]};
    for(const [key,max] of Object.entries(texts)) settings[key]=str(body[key],key,max,['headline','introduction'].includes(key)?2:0);
    for(const [key,[min,max]] of Object.entries(ranges)) settings[key]=integer(body[key],key,min,max);
    settings.payment=selection(body.payment,['simulado','presencial'],'pagamento');
    settings.reviews=body.reviews===true;
    settings.faq=array(body.faq,15).map(value=>[str(value[0],'pergunta',130,2),str(value[1],'resposta',500,2)]);
    return db.tx(()=>{
      db.run('UPDATE settings SET value=? WHERE id=1',encode(settings));
      audit(db,user.id,'CONFIGURACOES_SALVAS','configuracao','salao');
      return {ok:true};
    });
  }
};
