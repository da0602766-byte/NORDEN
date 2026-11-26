import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { array,audit,day,email,encode,fail,hash,id,integer,minute,now,parse,password,selection,str,token } from './core.mjs';

export const client = user => {
  if (user?.role !== 'cliente') fail('Acesse sua conta de cliente.',user ? 403 : 401);
};
export const manager = user => {
  if (user?.role !== 'gestor') fail('Acesso reservado à gestão.',user ? 403 : 401);
};
export const staff = user => {
  if (!['gestor','profissional'].includes(user?.role)) fail('Acesso reservado à equipe.',user ? 403 : 401);
};
export function identity(row) {
  if (!row) return null;
  const {id,name,email,phone,birth,preference,move_ok,photo_ok,verified,role} = row;
  return {id,name,email,phone,birth,preference,move_ok,photo_ok,verified,role,professionalId:row.professional_id};
}
export async function session(db,raw) {
  if (!raw) return null;
  return await db.get(`SELECT a.*,p.id AS professional_id FROM sessions s JOIN accounts a ON a.id=s.account_id
    LEFT JOIN professionals p ON p.account_id=a.id AND p.active=1
    WHERE s.digest=? AND s.expiry>? AND a.active=1`,hash(raw),now());
}
export async function startSession(db,user) {
  const raw = token();
  await db.run('DELETE FROM sessions WHERE expiry<=?',now());
  await db.run('INSERT INTO sessions VALUES(?,?,?)',hash(raw),user.id,now()+14*day);
  return raw;
}
async function issue(db,purpose,target,payload = {},duration = 30*minute) {
  const raw = token();
  await db.run('INSERT INTO tokens VALUES(?,?,?,?,?,NULL)',hash(raw),purpose,target,encode(payload),now()+duration);
  return raw;
}
async function consume(db,purpose,raw) {
  const key = hash(str(raw,'código',128,20));
  const row = await db.get('SELECT * FROM tokens WHERE digest=? AND purpose=? AND expiry>? AND used IS NULL',key,purpose,now());
  if (!row) fail('Este link expirou ou já foi usado.',410);
  await db.run('UPDATE tokens SET used=? WHERE digest=?',now(),key);
  return row;
}
async function deliver(context,email,purpose,raw) {
  const message={email,purpose,path:'/conta/'+purpose+'?token='+raw};
  if(context.deliver) {
    try { await context.deliver(message); }
    catch(error) { console.error('Falha no envio de e-mail NORDEN',error.code??error.name); }
    return;
  }
  if (!context.outbox) return;
  mkdirSync(context.outbox,{recursive:true,mode:0o700});
  writeFileSync(join(context.outbox,String(now())+'-'+id()+'.json'),encode(message),{mode:0o600});
}
function credentials(body) {
  if (body.password !== body.confirm) fail('As senhas não coincidem.');
  return {
    email:email(body.email), name:str(body.name,'nome completo',100,3),
    phone:str(body.phone,'telefone',24,8)
  };
}
async function createAccount(db,profile,key,role) {
  if (await db.get('SELECT 1 FROM accounts WHERE email=?',profile.email)) fail('Este e-mail já está cadastrado.',409);
  const account = id();
  await db.run('INSERT INTO accounts(id,email,password,role,name,phone,created) VALUES(?,?,?,?,?,?,?)',account,profile.email,key,role,profile.name,profile.phone,now());
  await audit(db,account,'CONTA_CRIADA','conta',account);
  return await db.get('SELECT * FROM accounts WHERE id=?',account);
}
const dummy = '000000000000000000000000000000000000000000000000:'+'0'.repeat(128);
export const identityActions = {
  async register(db,body,_user,ctx) {
    const profile = credentials(body);
    const key = await password(body.password);
    const result = await db.tx(async () => {
      const account = await createAccount(db,profile,key,'cliente');
      return {session:await startSession(db,account), verification:ctx.deliver||ctx.outbox?await issue(db,'verificar',account.id,{},day):null};
    });
    if(result.verification) await deliver(ctx,profile.email,'verificar',result.verification);
    return {cookie:result.session,data:{ok:true}};
  },
  async login(db,body) {
    const account = await db.get('SELECT * FROM accounts WHERE email=? AND active=1',email(body.email));
    const valid = await password(body.password,account?.password || dummy);
    if (!valid || !account) fail('E-mail ou senha incorretos.',401);
    if(body.area==='gerencia'&&account.role==='cliente') fail('Use a área do cliente para entrar com esta conta.',403);
    if(body.area==='cliente'&&account.role!=='cliente') fail('Use a área de gerência para entrar com esta conta.',403);
    return {cookie:await startSession(db,account),data:{role:account.role}};
  },
  async logout(db,_body,_user,ctx) {
    if (ctx.raw) await db.run('DELETE FROM sessions WHERE digest=?',hash(ctx.raw));
    return {cookie:'',data:{ok:true}};
  },
  async recover(db,body,_user,ctx) {
    if(!ctx.deliver&&!ctx.outbox) fail('A recuperação por e-mail ainda não está configurada.',503);
    const target = email(body.email);
    const account = await db.get('SELECT id FROM accounts WHERE email=? AND active=1',target);
    if (account) {
      const raw=await db.tx(async ()=>{
        await db.run("UPDATE tokens SET used=? WHERE target=? AND purpose='redefinir' AND used IS NULL",now(),account.id);
        return await issue(db,'redefinir',account.id);
      });
      await deliver(ctx,target,'redefinir',raw);
    }
    return {ok:true};
  },
  async reset(db,body) {
    if (body.password !== body.confirm) fail('As senhas não coincidem.');
    const key = await password(body.password);
    return await db.tx(async () => {
      const row=await consume(db,'redefinir',body.token);
      await db.run('UPDATE accounts SET password=? WHERE id=?',key,row.target);
      await db.run('DELETE FROM sessions WHERE account_id=?',row.target);
      await audit(db,row.target,'SENHA_REDEFINIDA','conta',row.target);
      return {cookie:'',data:{ok:true}};
    });
  },
  async resend(db,_body,user,ctx) {
    if (!user) fail('Entre novamente.',401);
    if(!ctx.deliver&&!ctx.outbox) fail('O envio de e-mail ainda não está configurado.',503);
    if (!user.verified) {
      const raw = await db.tx(async ()=>{
        await db.run("UPDATE tokens SET used=? WHERE target=? AND purpose='verificar' AND used IS NULL",now(),user.id);
        return await issue(db,'verificar',user.id,{},day);
      });
      await deliver(ctx,user.email,'verificar',raw);
    }
    return {ok:true};
  },
  async verify(db,body) {
    return await db.tx(async () => {
      const row=await consume(db,'verificar',body.token);
      await db.run('UPDATE accounts SET verified=1 WHERE id=?',row.target);
      return {ok:true};
    });
  },
  async invite(db,body,user) {
    manager(user);
    const target=email(body.email);
    const role=selection(body.role,['profissional','gestor'],'papel');
    const professionalId=role==='profissional' ? str(body.professionalId,'profissional',80,1) : '';
    if (role==='profissional' && !await db.get('SELECT 1 FROM professionals WHERE id=? AND account_id IS NULL',professionalId)) fail('Escolha um profissional sem conta vinculada.');
    if (await db.get('SELECT 1 FROM accounts WHERE email=?',target)) fail('Este e-mail já está cadastrado.',409);
    return await db.tx(async ()=>{
      await db.run("UPDATE tokens SET used=? WHERE target=? AND purpose='convite' AND used IS NULL",now(),target);
      const raw=await issue(db,'convite',target,{role,professionalId},2*day);
      await audit(db,user.id,'CONVITE_GERADO','conta',professionalId || 'gestao');
      return {path:'/conta/convite?token='+raw};
    });
  },
  async redeem(db,body) {
    const profile=credentials(body);
    const key=await password(body.password);
    return await db.tx(async ()=>{
      const row=await consume(db,'convite',body.token);
      if (profile.email!==row.target) fail('Use o mesmo e-mail do convite.');
      const payload=parse(row.payload);
      const account=await createAccount(db,profile,key,payload.role);
      if (payload.professionalId) {
        const updated=await db.run('UPDATE professionals SET account_id=? WHERE id=? AND account_id IS NULL',account.id,payload.professionalId);
        if (!updated.changes) fail('Conta profissional já vinculada.',409);
      }
      return {cookie:await startSession(db,account),data:{role:payload.role}};
    });
  },
  async profile(db,body,user) {
    client(user);
    const name=str(body.name,'nome',100,3);
    const phone=str(body.phone,'telefone',24,8);
    const birth=str(body.birth,'nascimento',10);
    if (birth && (!/^\d{4}-\d\d-\d\d$/.test(birth)||!Number.isFinite(Date.parse(birth))||new Date(birth).toISOString().slice(0,10)!==birth||birth>new Date().toISOString().slice(0,10))) fail('Confira a data de nascimento.');
    return await db.tx(async ()=>{
      await db.run('UPDATE accounts SET name=?,phone=?,birth=?,preference=?,move_ok=?,photo_ok=? WHERE id=?',
        name,phone,birth,str(body.preference,'preferências',900),Number(body.moveOk===true),Number(body.photoOk===true),user.id);
      if (Boolean(user.photo_ok)!==(body.photoOk===true)) await db.run('INSERT INTO consent_events VALUES(?,?,?,?,?,?)',id(),user.id,'FOTOS_PRIVADAS','demo-1',Number(body.photoOk===true),now());
      await audit(db,user.id,'PERFIL_ATUALIZADO','conta',user.id);
      return {ok:true};
    });
  },
  async safety(db,body,user) {
    client(user);
    return await db.tx(async ()=>{
      if (body.consent!==true) {
        await db.run('DELETE FROM safety WHERE account_id=?',user.id);
        await db.run('INSERT INTO consent_events VALUES(?,?,?,?,?,?)',id(),user.id,'DADOS_SENSIVEIS','demo-1',0,now());
      } else {
        const status=selection(body.status,['sim','não','não sei','informar ao profissional'],'alergias');
        const details=status==='sim' ? str(body.details,'substâncias conhecidas',420) : '';
        const care=str(body.care,'cuidados',420);
        await db.run('INSERT INTO safety VALUES(?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET payload=excluded.payload,version=excluded.version,consent_at=excluded.consent_at',
          user.id,db.encrypt({status,details,care}),'demo-1',now());
        await db.run('INSERT INTO consent_events VALUES(?,?,?,?,?,?)',id(),user.id,'DADOS_SENSIVEIS','demo-1',1,now());
      }
      await audit(db,user.id,'CONSENTIMENTO_ATUALIZADO','privacidade',user.id);
      return {ok:true};
    });
  },
  async privacy(db,body,user) {
    client(user);
    const kind=selection(body.kind,['acesso','correção','exclusão'],'solicitação');
    const ref=id();
    await db.tx(async ()=>{
      await db.run('INSERT INTO privacy_requests(id,client_id,kind,message,created) VALUES(?,?,?,?,?)',ref,user.id,kind,str(body.message,'mensagem',420),now());
      await audit(db,user.id,'SOLICITACAO_PRIVACIDADE','privacidade',ref);
    });
    return {id:ref};
  },
  async privacyState(db,body,user) {
    manager(user);
    const state=selection(body.state,['ABERTA','EM_ANALISE','RESPONDIDA'],'estado');
    const updated=await db.run('UPDATE privacy_requests SET state=? WHERE id=?',state,body.id ?? '');
    if (!updated.changes) fail('Solicitação indisponível.',404);
    await audit(db,user.id,'PRIVACIDADE_ATUALIZADA','privacidade',body.id);
    return {ok:true};
  },
  async readNotifications(db,body,user) {
    if (!user) fail('Sessão expirada. Entre novamente.',401);
    if (body.id) await db.run('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE account_id=? AND id=?',now(),user.id,body.id);
    else await db.run('UPDATE notifications SET read_at=? WHERE account_id=? AND read_at IS NULL',now(),user.id);
    return {ok:true};
  }
};
export async function ownSafety(db,user) {
  client(user);
  const info=await db.get('SELECT payload,consent_at,version FROM safety WHERE account_id=?',user.id);
  return info ? {...db.decrypt(info.payload),consentAt:info.consent_at,version:info.version} : null;
}
