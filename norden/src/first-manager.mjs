import {openPostgres} from './postgres.mjs';
import {day,email,hash,now,token,encode} from './core.mjs';

const db=openPostgres(process.env.DATABASE_URL,process.env.NORDEN_SAFETY_KEY);
try {
  const address=email(process.argv[2]);
  const origin=new URL(process.env.NORDEN_SITE_URL);
  if(origin.protocol!=='https:') throw new Error('Configure NORDEN_SITE_URL com HTTPS.');
  await db.init();
  const invite=await db.tx(async()=>{
    if(await db.get("SELECT 1 FROM accounts WHERE role='gestor' AND active=1 LIMIT 1")) throw new Error('Já existe um gestor. Gere novos convites pela área de gerência.');
    if(await db.get('SELECT 1 FROM accounts WHERE email=?',address)) throw new Error('Este e-mail já tem uma conta no NORDEN.');
    const raw=token();
    await db.run("UPDATE tokens SET used=? WHERE purpose='convite' AND used IS NULL AND payload=?",now(),encode({role:'gestor',first:true}));
    await db.run('INSERT INTO tokens VALUES(?,?,?,?,?,NULL)',hash(raw),'convite',address,encode({role:'gestor',first:true}),now()+day);
    return new URL('/conta/convite?token='+raw,origin);
  });
  process.stdout.write(invite.href+'\n');
} finally { await db.close(); }
