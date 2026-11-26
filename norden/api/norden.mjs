import {createHandler} from '../src/server.mjs';
import {openPostgres} from '../src/postgres.mjs';
import {mailDelivery} from '../src/mail.mjs';

let handler;
export default async function norden(req,res) {
  if(!process.env.DATABASE_URL || !process.env.NORDEN_SAFETY_KEY) {
    res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    return res.end(JSON.stringify({error:'O banco de dados do NORDEN ainda não está configurado.'}));
  }
  if(!handler) handler=createHandler({db:openPostgres(process.env.DATABASE_URL,process.env.NORDEN_SAFETY_KEY),
    secure:true,production:true,deliver:mailDelivery(process.env)});
  return handler(req,res);
}
