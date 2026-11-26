import { array,audit,encode,fail,id,integer,notify,now,parse,selection,str } from './core.mjs';
import { bookingFor,history } from './agenda.mjs';
import { sections } from './catalog.mjs';
import { client,manager,staff } from './identity.mjs';

export async function displayAppointment(db,booking) {
  const row=await db.get('SELECT * FROM appointments WHERE booking_id=?',booking);
  if(!row) return null;
  return {...row,used:parse(row.used),recommended:parse(row.recommended),manual:parse(row.manual)};
}
export async function bookingDetails(db,ref,user) {
  const booking=await bookingFor(db,ref,user);
  const treatment=await displayAppointment(db,ref);
  const review=await db.get('SELECT * FROM reviews WHERE booking_id=?',ref);
  const media=await db.all('SELECT id,kind FROM appointment_media WHERE booking_id=? ORDER BY rowid',ref);
  const result={booking,history:await history(db,booking),media,review};
  if(user.role==='cliente') {
    if(booking.status==='CONCLUIDO'&&treatment) {
      const {private_note,...shared}=treatment;
      result.treatment=shared;
    }
    return result;
  }
  staff(user);
  const profile=await db.get('SELECT preference,photo_ok FROM accounts WHERE id=?',booking.client_id);
  const safety=await db.get('SELECT payload FROM safety WHERE account_id=?',booking.client_id);
  if(safety) await audit(db,user.id,'ALERTA_CONSULTADO','reserva',ref);
  const template=await db.get('SELECT * FROM templates WHERE service_id=? AND active=1 ORDER BY version DESC LIMIT 1',booking.service_id);
  return {...result,treatment,profile,safety:safety?db.decrypt(safety.payload):null,template:template?{...template,sections:parse(template.sections)}:null};
}
async function productLines(db,input,used,previous) {
  const products=[];
  for(const item of array(input,20)) {
    const key=str(item.productId,'produto',80);
    const row=key?await db.get('SELECT id,name,active FROM products WHERE id=?',key):null;
    const old=previous.find(entry=>entry.productId===key && key);
    if(key && (!row || !row.active) && !old) fail('Um dos produtos está indisponível.',409);
    if(!used&&!key) fail('Selecione um produto do catálogo para recomendar.');
    const detail=str(item.detail,used?'observação':'justificativa',350,!used?2:0);
    const name=old?.name || row?.name || str(item.name,'produto utilizado',100,2);
    products.push({productId:key,name,detail,amount:used?str(item.amount,'quantidade e unidade',50):''});
  }
  return products;
}
async function persist(db,body,user,type) {
  staff(user);
  return await db.tx(async ()=>{
    const b=await bookingFor(db,body.id,user);
    const old=await displayAppointment(db,b.id);
    if(b.status==='CONCLUIDO'&&type==='finalize') return {id:b.id};
    if(type==='correct') {
      manager(user);
      if(b.status!=='CONCLUIDO'||!old) fail('Atendimento indisponível para correção.',409);
    } else if(b.status!=='EM_ATENDIMENTO') fail('Inicie o atendimento antes de salvar.',409);
    const finishing=type!=='draft';
    const used=await productLines(db,body.used,true,old?.used ?? []);
    const recommended=await productLines(db,body.recommended,false,old?.recommended ?? []);
    if(finishing&&(used.length===0)===(body.noneUsed!==true)) fail('Informe os produtos utilizados ou marque que nenhum foi utilizado.');
    if(finishing&&body.reviewed!==true) fail('Revise e confirme o manual antes de publicar.');
    const title=str(body.title,'título do manual',110,finishing?2:0);
    const content=finishing ? sections(body) : {
      instructions:str(body.instructions,'orientações',2500),first:str(body.first,'primeiras horas',1600),
      avoid:str(body.avoid,'o que evitar',1600),maintenance:str(body.maintenance,'manutenção',1600)
    };
    const templateId=str(body.templateId,'modelo',80);
    const template=templateId?await db.get('SELECT id,version FROM templates WHERE id=? AND service_id=?',templateId,b.service_id):null;
    if(templateId&&!template) fail('Modelo indisponível.',409);
    const manual={title,sections:content,templateId:template?.id || null,version:template?.version || null,reviewed:finishing};
    const values=[b.id,str(body.procedure,'procedimento realizado',150,finishing?2:0),encode(used),encode(recommended),
      str(body.summary,'observações compartilhadas',1300),str(body.privateNote,'notas internas',1600),
      str(body.returnOn,'retorno',80),encode(manual),user.id,now()];
    if(type==='correct') {
      const reason=str(body.reason,'motivo da correção',300,3);
      await db.run('INSERT INTO appointment_revisions VALUES(?,?,?,?,?)',id(),b.id,encode({appointment:old,reason}),user.id,now());
    }
    await db.run(`INSERT INTO appointments VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET
      procedure=excluded.procedure,used=excluded.used,recommended=excluded.recommended,summary=excluded.summary,
      private_note=excluded.private_note,return_on=excluded.return_on,manual=excluded.manual,author=excluded.author,updated=excluded.updated`,...values);
    if(type==='finalize') {
      await db.run("UPDATE bookings SET status='CONCLUIDO',finished=? WHERE id=?",now(),b.id);
      await db.run('INSERT INTO booking_events VALUES(?,?,?,?,?,?)',id(),b.id,user.id,'CONCLUIDO',now(),'{}');
      await notify(db,b.client_id,'Seu atendimento está no NORDEN Journey','/app/jornada/'+b.id,'care:completed:'+b.id);
      await notify(db,b.client_id,'Seu manual de cuidados está disponível','/app/cuidados/'+b.id,'care:manual:'+b.id);
    }
    if(type==='correct') await notify(db,b.client_id,'Orientações do seu atendimento atualizadas','/app/cuidados/'+b.id,'care:corrected:'+id());
    await audit(db,user.id,{draft:'RASCUNHO_ATUALIZADO',finalize:'ATENDIMENTO_CONCLUIDO',correct:'ATENDIMENTO_CORRIGIDO'}[type],'reserva',b.id);
    return {id:b.id};
  });
}
export async function readMedia(db,key,user) {
  const media=await db.get('SELECT * FROM appointment_media WHERE id=?',key ?? '');
  if(!media) fail('Imagem indisponível.',404);
  const b=await bookingFor(db,media.booking_id,user);
  if(user.role==='cliente' && b.status!=='CONCLUIDO') fail('Imagem indisponível.',404);
  return media;
}
function mediaContent(value) {
  if(typeof value!=='string'||value.length>2_800_000) fail('Use uma foto de até 2 MB.');
  const match=/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\r\n]+)$/i.exec(value);
  if(!match) fail('Envie uma imagem JPEG, PNG ou WebP.');
  const content=Buffer.from(match[2],'base64');
  const verified={
    'image/jpeg':content[0]===255 && content[1]===216 && content[2]===255,
    'image/png':content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'image/webp':content.toString('ascii',0,4)==='RIFF'&&content.toString('ascii',8,12)==='WEBP'
  }[match[1]];
  if(!verified||content.length>2*1024*1024) fail('Imagem inválida ou acima do limite.');
  return {content,mime:match[1]};
}
export const careActions = {
  async start(db,body,user) {
    staff(user);
    return await db.tx(async ()=>{
      const b=await bookingFor(db,body.id,user);
      if(b.status==='EM_ATENDIMENTO') return {id:b.id};
      if(b.status!=='CONFIRMADO') fail('Este agendamento não permite iniciar atendimento.',409);
      if(body.acknowledged!==true) fail('Confirme a revisão das preferências e dos alertas.');
      await db.run("UPDATE bookings SET status='EM_ATENDIMENTO',started=? WHERE id=?",now(),b.id);
      await db.run('INSERT INTO booking_events VALUES(?,?,?,?,?,?)',id(),b.id,user.id,'EM_ATENDIMENTO',now(),'{}');
      await audit(db,user.id,'ATENDIMENTO_INICIADO','reserva',b.id);
      return {id:b.id};
    });
  },
  draft:async (db,body,user)=>await persist(db,body,user,'draft'),
  finalize:async (db,body,user)=>await persist(db,body,user,'finalize'),
  correct:async (db,body,user)=>await persist(db,body,user,'correct'),
  async photo(db,body,user) {
    staff(user);
    return await db.tx(async ()=>{
      const b=await bookingFor(db,body.id,user);
      if(!await db.get('SELECT 1 FROM appointments WHERE booking_id=?',b.id)) fail('Salve o atendimento primeiro.');
      if(body.remove) {
        const result=await db.run('DELETE FROM appointment_media WHERE booking_id=? AND id=?',b.id,body.remove);
        if(!result.changes) fail('Imagem indisponível.',404);
        await audit(db,user.id,'FOTO_EXCLUIDA','reserva',b.id);
        return {ok:true};
      }
      if(!['EM_ATENDIMENTO','CONCLUIDO'].includes(b.status)) fail('Atendimento indisponível.',409);
      if(!(await db.get('SELECT photo_ok FROM accounts WHERE id=?',b.client_id))?.photo_ok || body.authorized!==true) fail('É necessária autorização específica do cliente.',403);
      if((await db.get('SELECT COUNT(*) n FROM appointment_media WHERE booking_id=?',b.id)).n>=6) fail('Limite de seis imagens por atendimento.');
      const {content,mime}=mediaContent(body.image);
      const key=id();
      await db.run('INSERT INTO appointment_media VALUES(?,?,?,?,?)',key,b.id,selection(body.kind,['Antes','Depois'],'tipo da foto'),mime,content);
      await audit(db,user.id,'FOTO_PRIVADA_ADICIONADA','reserva',b.id);
      return {id:key};
    });
  },
  async review(db,body,user) {
    client(user);
    return await db.tx(async ()=>{
      const b=await bookingFor(db,body.id,user);
      if(!(await db.settings()).reviews || b.status!=='CONCLUIDO') fail('Avaliação indisponível.',409);
      await db.run(`INSERT INTO reviews VALUES(?,?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET rating=excluded.rating,
        comment=excluded.comment,publish_ok=excluded.publish_ok,moderation=excluded.moderation,updated=excluded.updated`,b.id,
        integer(body.rating,'nota',1,5),str(body.comment,'comentário',700),
        Number(body.publishOk===true),body.publishOk===true?'PENDENTE':'PRIVADA',now());
      return {ok:true};
    });
  },
  async moderate(db,body,user) {
    manager(user);
    const status=selection(body.status,['PUBLICADA','REJEITADA'],'moderação');
    const result=await db.run('UPDATE reviews SET moderation=? WHERE booking_id=? AND publish_ok=1',status,body.id ?? '');
    if(!result.changes) fail('Avaliação indisponível.',404);
    await audit(db,user.id,'AVALIACAO_MODERADA','reserva',body.id);
    return {ok:true};
  }
};
export async function journey(db,user) {
  client(user);
  return (await db.all(`SELECT b.id,b.service_id,b.professional_id,b.service_name,b.professional_name,b.duration,b.finished,b.starts,a.procedure,a.summary,a.used,a.recommended,a.return_on
    FROM bookings b JOIN appointments a ON a.booking_id=b.id
    WHERE b.status='CONCLUIDO' AND b.client_id=? ORDER BY b.finished DESC LIMIT 300`,user.id))
    .map(({used,recommended,...entry})=>({...entry,used:parse(used),recommended:parse(recommended)}));
}
