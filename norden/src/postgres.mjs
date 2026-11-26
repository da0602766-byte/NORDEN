import {AsyncLocalStorage} from 'node:async_hooks';
import pg from 'pg';
import {defaultSettings,encryption,encode,hash,now,parse} from './core.mjs';

const hostedSettings={...defaultSettings,payment:'presencial',pickup:'Retire o pedido no salão após receber a confirmação.'};

// All SQL is defined by the application. Values always travel as parameters.
function placeholders(query) {
  let next=0;
  return query.replace(/'(?:[^']|'')*'|\?/g,part=>part==='?'?'$'+ ++next:part);
}

export function postgresDatabase(pool,secret) {
  if(!secret || secret.length<32) throw new Error('Configure NORDEN_SAFETY_KEY com pelo menos 32 caracteres.');
  const active=new AsyncLocalStorage();
  const query=async (statement,...params)=>{
    const connection=active.getStore();
    if(connection) return connection.query(placeholders(statement),params);
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL search_path TO norden, extensions, pg_catalog');
      const result=await client.query(placeholders(statement),params);
      await client.query('COMMIT');
      return result;
    } catch(error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  };
  return {
    ...encryption(secret),
    get:async (...args)=>(await query(...args)).rows[0],
    all:async (...args)=>(await query(...args)).rows,
    run:async (...args)=>({changes:(await query(...args)).rowCount}),
    async tx(callback) {
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL search_path TO norden, extensions, pg_catalog');
        // Preserve the SQLite application's single writer for related catalog, order and agenda changes.
        await client.query('SELECT pg_advisory_xact_lock(213006, 1)');
        const result=await active.run(client,callback);
        await client.query('COMMIT');
        return result;
      } catch(error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    async settings() {
      const row=(await query('SELECT value FROM settings WHERE id=1')).rows[0];
      return {...hostedSettings,...parse(row?.value??'{}')};
    },
    async init() {
      await query('INSERT INTO settings VALUES(1,?) ON CONFLICT(id) DO NOTHING',encode(hostedSettings));
    },
    async authAttempt(key) {
      const time=now();
      const result=await query(`INSERT INTO auth_limits(key,attempts,expires) VALUES(?,1,?)
        ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_limits.expires<=? THEN 1 ELSE LEAST(auth_limits.attempts+1,19) END,
        expires=CASE WHEN auth_limits.expires<=? THEN excluded.expires ELSE auth_limits.expires END RETURNING attempts`,
      hash(key),time+15*60_000,time,time);
      if(Math.random()<0.02) await query('DELETE FROM auth_limits WHERE expires<=?',time);
      return result.rows[0].attempts;
    },
    close:()=>pool.end()
  };
}

export function openPostgres(connectionString,secret) {
  const url=new URL(connectionString);
  const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  url.searchParams.delete('sslmode');
  const pool=new pg.Pool({connectionString:url.href,max:4,connectionTimeoutMillis:5000,idleTimeoutMillis:15000,
    application_name:'norden', ssl:local?false:{rejectUnauthorized:true},
    types:{getTypeParser:(oid,format)=>oid===20&&format!=='binary'?Number:pg.types.getTypeParser(oid,format)}});
  pool.on('error',error=>console.error('Conexão PostgreSQL encerrada',error.code??error.name));
  return postgresDatabase(pool,secret);
}
