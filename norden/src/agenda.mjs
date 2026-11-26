import { addDays,array,audit,dateTime,day,encode,fail,id,integer,local,minute,notify,notifyManagers,now,parse,selection,str,weekday } from './core.mjs';
import { client,manager,staff } from './identity.mjs';

const occupied = "'CONFIRMADO','EM_ATENDIMENTO'";
export function bookingFor(db,bookingId,user) {
  if (!user) fail('Acesse sua conta.',401);
  const booking=db.get(`SELECT b.*,a.name AS client_name FROM bookings b JOIN accounts a ON a.id=b.client_id WHERE b.id=?`,bookingId ?? '');
  const allowed=booking && (user.role==='gestor' || (user.role==='cliente'&&booking.client_id===user.id) ||
    (user.role==='profissional'&&booking.professional_id===user.professional_id));
  if (!allowed) fail('Agendamento indisponível.',404);
  return {...booking,preferences:parse(booking.preferences)};
}
function selectionFor(db,serviceId,profId) {
  const item=db.get(`SELECT s.*,p.name AS professional_name FROM services s JOIN professional_services ps ON ps.service_id=s.id
    JOIN professionals p ON p.id=ps.professional_id WHERE s.id=? AND p.id=? AND s.active=1 AND p.active=1`,serviceId ?? '',profId ?? '');
  if (!item) fail('Serviço ou profissional indisponível.',409);
  return item;
}
function validTime(db,{professionalId,clientId,starts,ends,ignore='',settings}) {
  const t=now();
  const {date}=local(starts);
  if (starts<t+settings.leadMinutes*minute || date>addDays(local(t).date,settings.bookingDays)) return false;
  const working=db.all('SELECT starts,ends FROM hours WHERE professional_id=? AND day=?',professionalId,weekday(date));
  if (!working.some(row=>dateTime(date,row.starts)<=starts && dateTime(date,row.ends)>=ends)) return false;
  if (db.get('SELECT 1 FROM blocks WHERE professional_id=? AND starts<? AND ends>?',professionalId,ends,starts)) return false;
  const overlaps=db.get(`SELECT 1 FROM bookings WHERE (professional_id=? OR client_id=?) AND id<>?
    AND status IN (${occupied}) AND starts<? AND ends>?`,professionalId,clientId ?? '',ignore,ends,starts);
  return !overlaps;
}
export function availability(db,query,user) {
  const {serviceId,professionalId,date}=query;
  dateTime(date);
  const service=selectionFor(db,serviceId,professionalId);
  const working=db.all('SELECT starts,ends FROM hours WHERE professional_id=? AND day=? ORDER BY starts',professionalId,weekday(date));
  const settings=db.settings();
  const length=(service.duration+service.padding)*minute;
  const options=[];
  for (const row of working) {
    const end=dateTime(date,row.ends);
    for(let starts=dateTime(date,row.starts);starts+length<=end;starts+=15*minute) {
      if(validTime(db,{professionalId,clientId:user?.role==='cliente'?user.id:'',starts,ends:starts+length,settings})) options.push({starts,clock:local(starts).clock});
    }
  }
  return {slots:options,duration:service.duration,padding:service.padding,price:service.price};
}
const event=(db,booking,actor,type,info={}) => db.run('INSERT INTO booking_events VALUES(?,?,?,?,?,?)',id(),booking,actor,type,now(),encode(info));
export function history(db,booking) {
  return db.all('SELECT type,at,info FROM booking_events WHERE booking_id=? ORDER BY at,rowid',booking.id).map(row=>({...row,info:parse(row.info)}));
}
function notifyBooking(db,booking,title,key) {
  notify(db,booking.client_id,title,'/app/agendamentos/'+booking.id,key+':'+booking.id);
}
function professionalUser(db,professional) {
  return db.get('SELECT account_id FROM professionals WHERE id=?',professional)?.account_id;
}
function invalidate(db,bookingId,reason) {
  const rows=db.all(`SELECT f.id,b.client_id FROM flow f JOIN bookings b ON b.id=f.booking_id
    WHERE f.status='OFERTADA' AND (f.booking_id=? OR f.vacancy_id=?)`,bookingId,bookingId);
  for(const row of rows) {
    db.run("UPDATE flow SET status='INVALIDADA' WHERE id=?",row.id);
    notify(db,row.client_id,reason,'/app/realocacoes','flow:invalid:'+row.id);
  }
}
function createBooking(db,body,user,manual) {
  if (manual) staff(user); else client(user);
  const clientId=manual ? str(body.clientId,'cliente',80,1) : user.id;
  const professionalId=str(body.professionalId,'profissional',80,1);
  if (manual && user.role==='profissional') {
    if (user.professional_id!==professionalId) fail('Use sua própria agenda.',403);
    if (!db.get('SELECT 1 FROM bookings WHERE client_id=? AND professional_id=?',clientId,professionalId)) fail('Cliente indisponível.',404);
  }
  if (!db.get("SELECT 1 FROM accounts WHERE id=? AND role='cliente' AND active=1",clientId)) fail('Cliente indisponível.',404);
  const ref=id();
  return db.tx(()=>{
    const item=selectionFor(db,body.serviceId,professionalId);
    if (integer(body.price,'preço')!==item.price) fail('O valor do serviço mudou. Confira o novo preço.',409);
    const starts=dateTime(body.date,body.clock);
    const ends=starts+(item.duration+item.padding)*minute;
    if (!validTime(db,{professionalId,clientId,starts,ends,settings:db.settings()})) fail('Este horário acabou de ficar indisponível. Escolha outro.',409);
    const preferences=[...new Set(array(body.preferences,15))].map(uid=>{
      const row=db.get(`SELECT p.id,p.name FROM products p JOIN service_products sp ON sp.product_id=p.id
        WHERE sp.service_id=? AND p.id=? AND p.active=1`,item.id,uid);
      if (!row) fail('Uma preferência não está mais disponível.',409);
      return row;
    });
    db.run(`INSERT INTO bookings(id,client_id,professional_id,service_id,service_name,professional_name,starts,ends,duration,padding,
      price,status,preferences,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,'CONFIRMADO',?,?)`,ref,clientId,professionalId,item.id,item.name,item.professional_name,
      starts,ends,item.duration,item.padding,item.price,encode(preferences),now());
    event(db,ref,user.id,'CONFIRMADO');
    audit(db,user.id,'RESERVA_CRIADA','reserva',ref);
    notifyBooking(db,{id:ref,client_id:clientId},'Agendamento confirmado','confirmed');
    notify(db,professionalUser(db,professionalId),'Novo agendamento','/gestao/atendimentos/'+ref,'booking:new:'+ref);
    return {id:ref};
  });
}
function futureOpenings(db) {
  return db.all("SELECT * FROM bookings WHERE status='CANCELADO' AND starts>? AND starts<=? ORDER BY starts",
    now(),now()+db.settings().flowDays*day);
}
function candidates(db,vacancy) {
  const settings=db.settings();
  if (!vacancy || vacancy.status!=='CANCELADO' || vacancy.starts>now()+settings.flowDays*day) return [];
  const potential=db.all(`SELECT b.*,a.name AS client_name FROM bookings b
    JOIN accounts a ON a.id=b.client_id JOIN professionals p ON p.id=b.professional_id
    JOIN professional_services ps ON ps.professional_id=b.professional_id AND ps.service_id=b.service_id
    JOIN services s ON s.id=b.service_id
    WHERE b.professional_id=? AND b.status='CONFIRMADO' AND b.id<>? AND b.starts>? AND b.starts<=?
    AND a.move_ok=1 AND a.active=1 AND p.active=1 AND s.active=1 AND (b.ends-b.starts)<=?
    AND NOT EXISTS(SELECT 1 FROM flow f WHERE f.vacancy_id=? AND f.booking_id=b.id)
    ORDER BY b.duration+b.padding DESC,b.starts,b.id`,
    vacancy.professional_id,vacancy.id,vacancy.starts,now()+settings.flowDays*day,vacancy.ends-vacancy.starts,vacancy.id);
  return potential.filter(b=>validTime(db,{professionalId:b.professional_id,clientId:b.client_id,starts:vacancy.starts,
    ends:vacancy.starts+(b.ends-b.starts),ignore:b.id,settings}));
}
function expire(db) {
  const expired=db.all(`SELECT f.id,b.client_id FROM flow f JOIN bookings b ON b.id=f.booking_id WHERE f.status='OFERTADA' AND f.expiry<=?`,now());
  for (const row of expired) {
    db.run("UPDATE flow SET status='EXPIRADA' WHERE id=? AND status='OFERTADA'",row.id);
    notify(db,row.client_id,'Oferta expirada. Sua reserva original continua válida.','/app/realocacoes','flow:expire:'+row.id);
    notifyManagers(db,'Prazo de realocação encerrado','/gestao/flow','flow:expire:staff:'+row.id);
  }
}
export function flowView(db,user) {
  db.tx(()=>expire(db));
  if(user.role==='cliente') return {
    offers:db.all(`SELECT f.*,b.service_name,b.professional_name FROM flow f JOIN bookings b ON b.id=f.booking_id
      WHERE b.client_id=? ORDER BY f.created DESC LIMIT 150`,user.id)
  };
  staff(user);
  const mine=user.role==='profissional' ? user.professional_id || '-' : '';
  return {windows:futureOpenings(db).filter(window=>!mine || mine===window.professional_id).map(window=>({
    id:window.id,starts:window.starts,ends:window.ends,professional:window.professional_name,
    candidates:candidates(db,window).map(({id,client_name,service_name,starts,duration,padding})=>({id,client_name,service_name,starts,duration,padding,
      reason:'Mesmo profissional, antecipação compatível e preferência habilitada.'}))
  })),offers:db.all(`SELECT f.*,b.service_name,b.professional_name,a.name AS client_name FROM flow f JOIN bookings b ON b.id=f.booking_id
    JOIN accounts a ON a.id=b.client_id WHERE (?='' OR b.professional_id=?) ORDER BY f.created DESC LIMIT 200`,mine,mine)};
}
export const agendaActions = {
  book:(db,body,user)=>createBooking(db,body,user,false),
  manualBook:(db,body,user)=>createBooking(db,body,user,true),
  cancel(db,body,user) {
    return db.tx(()=>{
      const booking=bookingFor(db,body.id,user);
      if (booking.status==='CANCELADO') return {id:booking.id};
      if (booking.status!=='CONFIRMADO') fail('Esta reserva não pode ser cancelada.',409);
      if (user.role==='cliente' && (booking.starts<=now() || booking.starts-now()<db.settings().cancellationHours*60*minute)) fail('O prazo de cancelamento online terminou. Consulte a equipe.',409);
      db.run("UPDATE bookings SET status='CANCELADO',reason=? WHERE id=?",str(body.reason,'motivo',300),booking.id);
      event(db,booking.id,user.id,'CANCELADO');
      invalidate(db,booking.id,'Oferta encerrada após alteração de agenda.');
      notifyBooking(db,booking,'Agendamento cancelado','cancel');
      notifyManagers(db,'Cancelamento na agenda','/gestao/agenda?status=CANCELADO','cancel:'+booking.id);
      if (candidates(db,{...booking,status:'CANCELADO'}).length) notifyManagers(db,'O NORDEN Flow encontrou um encaixe','/gestao/flow','opening:'+booking.id);
      audit(db,user.id,'RESERVA_CANCELADA','reserva',booking.id);
      return {id:booking.id};
    });
  },
  requestMove(db,body,user) {
    client(user);
    return db.tx(()=>{
      const booking=bookingFor(db,body.id,user);
      if(booking.status!=='CONFIRMADO'||booking.starts<=now()) fail('Agendamento indisponível.',409);
      event(db,booking.id,user.id,'REMARCACAO_SOLICITADA',{note:str(body.reason,'preferência de horário',250)});
      notifyManagers(db,'Cliente solicitou remarcação','/gestao/atendimentos/'+booking.id,'move:request:'+booking.id);
      audit(db,user.id,'REMARCACAO_SOLICITADA','reserva',booking.id);
      return {ok:true};
    });
  },
  manualMove(db,body,user) {
    staff(user);
    return db.tx(()=>{
      const b=bookingFor(db,body.id,user);
      if(b.status!=='CONFIRMADO'||body.approved!==true) fail('Confirme o acordo com o cliente.');
      selectionFor(db,b.service_id,b.professional_id);
      const starts=dateTime(body.date,body.clock);
      const ends=starts+b.ends-b.starts;
      if(starts===b.starts||!validTime(db,{professionalId:b.professional_id,clientId:b.client_id,starts,ends,ignore:b.id,settings:db.settings()})) fail('Escolha outro horário disponível.',409);
      db.run('UPDATE bookings SET starts=?,ends=? WHERE id=?',starts,ends,b.id);
      event(db,b.id,user.id,'REMARCADO',{from:b.starts,to:starts});
      invalidate(db,b.id,'Oferta encerrada após remarcação.');
      notifyBooking(db,b,'Seu agendamento foi remarcado','move:'+starts);
      audit(db,user.id,'RESERVA_REMARCADA','reserva',b.id);
      return {id:b.id};
    });
  },
  noShow(db,body,user) {
    staff(user);
    return db.tx(()=>{
      const b=bookingFor(db,body.id,user);
      if(b.status!=='CONFIRMADO'||b.starts>now()) fail('A falta só pode ser registrada após o horário.',409);
      db.run("UPDATE bookings SET status='NAO_COMPARECEU' WHERE id=?",b.id);
      event(db,b.id,user.id,'NAO_COMPARECEU');
      invalidate(db,b.id,'Oferta encerrada após alteração de agenda.');
      audit(db,user.id,'FALTA_REGISTRADA','reserva',b.id);
      return {ok:true};
    });
  },
  block(db,body,user) {
    manager(user);
    const professionalId=str(body.professionalId,'profissional',80,1);
    return db.tx(()=>{
      if (body.remove) {
        const change=db.run('DELETE FROM blocks WHERE id=?',body.remove);
        if (!change.changes) fail('Bloqueio indisponível.',404);
        audit(db,user.id,'BLOQUEIO_REMOVIDO','agenda',body.remove);
        return {ok:true};
      }
      if(!db.get('SELECT 1 FROM professionals WHERE id=?',professionalId)) fail('Profissional indisponível.',404);
      const starts=dateTime(body.startDate,body.startClock),ends=dateTime(body.endDate,body.endClock);
      if(ends<=starts || ends<=now()) fail('Informe um intervalo válido.');
      if(db.get(`SELECT 1 FROM bookings WHERE professional_id=? AND status IN (${occupied}) AND starts<? AND ends>?`,professionalId,ends,starts)) fail('Há reservas no intervalo. Trate-as antes de bloquear.',409);
      const ref=id();
      db.run('INSERT INTO blocks VALUES(?,?,?,?,?)',ref,professionalId,starts,ends,str(body.reason,'motivo',180,2));
      audit(db,user.id,'BLOQUEIO_CRIADO','agenda',ref);
      return {id:ref};
    });
  },
  offer(db,body,user) {
    manager(user);
    return db.tx(()=>{
      expire(db);
      const vacancy=db.get('SELECT * FROM bookings WHERE id=?',body.vacancyId ?? '');
      const b=candidates(db,vacancy).find(candidate=>candidate.id===body.bookingId);
      if(!b) fail('Esta sugestão não está mais disponível.',409);
      const expiry=Math.min(now()+db.settings().offerHours*60*minute,vacancy.starts-db.settings().leadMinutes*minute);
      if(expiry<=now()) fail('A janela está próxima demais.',409);
      const ref=id();
      db.run("INSERT INTO flow VALUES(?,?,?,?,?,?,?,'OFERTADA',?)",ref,vacancy.id,b.id,b.starts,vacancy.starts,expiry,user.id,now());
      notify(db,b.client_id,'Novo horário disponível para seu atendimento','/app/realocacoes','flow:'+ref);
      audit(db,user.id,'OFERTA_ENVIADA','flow',ref);
      return {id:ref};
    });
  },
  answer(db,body,user) {
    client(user);
    const decision=selection(body.decision,['aceitar','recusar'],'resposta');
    return db.tx(()=>{
      expire(db);
      const flow=db.get('SELECT f.* FROM flow f JOIN bookings b ON b.id=f.booking_id WHERE f.id=? AND b.client_id=?',body.id ?? '',user.id);
      if(!flow) fail('Oferta indisponível.',404);
      if(flow.status!=='OFERTADA') return {status:flow.status};
      const b=bookingFor(db,flow.booking_id,user);
      const ends=flow.proposed+b.ends-b.starts;
      let status;
      if(decision==='recusar') status='RECUSADA';
      else {
        const compatible=db.get(`SELECT 1 FROM professional_services ps JOIN professionals p ON p.id=ps.professional_id
          JOIN services s ON s.id=ps.service_id WHERE p.id=? AND s.id=? AND p.active=1 AND s.active=1`,b.professional_id,b.service_id);
        const vacancy=db.get('SELECT status,starts,ends FROM bookings WHERE id=?',flow.vacancy_id);
        if(!db.get('SELECT move_ok FROM accounts WHERE id=?',user.id)?.move_ok || !compatible || b.status!=='CONFIRMADO' || b.starts!==flow.original || vacancy?.status!=='CANCELADO' || vacancy.starts!==flow.proposed || ends>vacancy.ends ||
          !validTime(db,{professionalId:b.professional_id,clientId:b.client_id,starts:flow.proposed,ends,ignore:b.id,settings:db.settings()})) status='EXPIRADA';
        else {
          db.run('UPDATE bookings SET starts=?,ends=? WHERE id=?',flow.proposed,ends,b.id);
          event(db,b.id,user.id,'REALOCADO',{from:b.starts,to:flow.proposed});
          status='EFETIVADA';
        }
      }
      db.run('UPDATE flow SET status=? WHERE id=?',status,flow.id);
      if(status==='EFETIVADA') {
        const competing=db.all(`SELECT f.id,b.client_id FROM flow f JOIN bookings b ON b.id=f.booking_id
          WHERE f.status='OFERTADA' AND (f.booking_id=? OR (b.professional_id=? AND f.proposed<? AND f.proposed+b.ends-b.starts>?))`,
          b.id,b.professional_id,ends,flow.proposed);
        for(const row of competing) {
          db.run("UPDATE flow SET status='INVALIDADA' WHERE id=?",row.id);
          notify(db,row.client_id,'Oferta encerrada. Consulte sua agenda atual.','/app/realocacoes','flow:invalid:'+row.id);
        }
      }
      const message={EFETIVADA:'Novo horário confirmado',RECUSADA:'Oferta recusada. Horário atual preservado.',EXPIRADA:'Horário indisponível. Reserva original preservada.'}[status];
      notify(db,user.id,message,'/app/agendamentos/'+b.id,'flow:result:'+flow.id);
      notifyManagers(db,'Realocação: '+message,'/gestao/flow','flow:staff:'+flow.id);
      audit(db,user.id,status,'flow',flow.id);
      return {status};
    });
  }
};
export function listBookings(db,user) {
  const scope=user.role==='gestor'?'1=1':user.role==='cliente'?'b.client_id=?':'b.professional_id=?';
  const values=user.role==='gestor'?[]:[user.role==='cliente'?user.id:user.professional_id || '-'];
  return db.all(`SELECT b.*,a.name AS client_name FROM bookings b JOIN accounts a ON a.id=b.client_id
    WHERE ${scope} ORDER BY b.starts DESC LIMIT 500`,...values).map(row=>({...row,preferences:parse(row.preferences)}));
}
