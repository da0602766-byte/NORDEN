import http from 'node:http';
import { mkdirSync,readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { fail,local,now,openDatabase,parse } from './core.mjs';
import { identity,identityActions,ownSafety,session,staff } from './identity.mjs';
import { catalogActions,publicCatalog } from './catalog.mjs';
import { agendaActions,availability,flowView,listBookings } from './agenda.mjs';
import { bookingDetails,careActions,journey,readMedia } from './care.mjs';
import { addresses,cart,orderDetails,orders,storeActions } from './store.mjs';

const actions=Object.freeze(Object.assign(Object.create(null),identityActions,catalogActions,agendaActions,careActions,storeActions));
const publicRoot=fileURLToPath(new URL('../public',import.meta.url));
const mimes={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const secureHeaders={
  'Content-Security-Policy':"default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};
function reply(response,body,status=200,type='application/json; charset=utf-8',extra={}) {
  response.writeHead(status,{...secureHeaders,'Content-Type':type,'Cache-Control':'no-store',...extra});
  response.end(type.startsWith('application/json')?JSON.stringify(body):body);
}
function cookie(header) {
  return /(?:^|;\s*)norden=([a-z0-9_-]{40,100})(?:;|$)/i.exec(header ?? '')?.[1] || '';
}
function setSession(raw,secure) {
  return 'norden='+raw+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+(raw?'1209600':'0')+(secure?'; Secure':'');
}
async function bodyOf(request,max=40_000) {
  const chunks=[];
  let size=0;
  for await(const chunk of request) {
    size+=chunk.length;
    if(size>max) fail('Arquivo ou formulário acima do limite.',413);
    chunks.push(chunk);
  }
  try {
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(!body||Array.isArray(body)||typeof body!=='object') throw new Error();
    return body;
  } catch {
    fail('Formulário inválido.');
  }
}
function boot(db,user) {
  const data={user:identity(user),catalog:publicCatalog(db),today:local(now()).date};
  if(!user) return data;
  data.bookings=listBookings(db,user);
  data.flow=flowView(db,user);
  data.notifications=db.all('SELECT id,title,href,created,read_at FROM notifications WHERE account_id=? ORDER BY created DESC,rowid DESC LIMIT 150',user.id);
  if(user.role==='cliente') return {...data,journey:journey(db,user),cart:cart(db,user),orders:orders(db,user),addresses:addresses(db,user),
    safety:ownSafety(db,user),privacy:db.all('SELECT id,kind,state,created FROM privacy_requests WHERE client_id=? ORDER BY created DESC',user.id)};
  staff(user);
  const pId=user.professional_id || '-';
  if(user.role==='profissional') return {...data,clients:db.all(`SELECT DISTINCT a.id,a.name,a.phone
    FROM accounts a JOIN bookings b ON b.client_id=a.id WHERE b.professional_id=? AND a.active=1 ORDER BY a.name LIMIT 500`,pId)};
  return {...data,catalog:publicCatalog(db,true),orders:orders(db,user),settings:db.settings(),
    clients:db.all("SELECT id,name,email,phone,preference FROM accounts WHERE role='cliente' AND active=1 ORDER BY name LIMIT 500"),
    hours:db.all('SELECT * FROM hours ORDER BY day,starts'),
    blocks:db.all('SELECT * FROM blocks WHERE ends>? ORDER BY starts LIMIT 300',now()),
    movements:db.all('SELECT m.*,p.name AS product_name,a.name AS actor_name FROM movements m JOIN products p ON p.id=m.product_id LEFT JOIN accounts a ON a.id=m.actor ORDER BY m.at DESC,m.rowid DESC LIMIT 300'),
    templates:db.all('SELECT * FROM templates ORDER BY updated DESC,rowid DESC LIMIT 250').map(row=>({...row,sections:parse(row.sections)})),
    audits:db.all('SELECT g.*,a.name AS actor_name FROM audits g LEFT JOIN accounts a ON a.id=g.actor ORDER BY g.at DESC,g.rowid DESC LIMIT 300'),
    privacy:db.all('SELECT p.*,a.name AS client_name FROM privacy_requests p JOIN accounts a ON a.id=p.client_id ORDER BY p.created DESC LIMIT 250'),
    reviews:db.all("SELECT r.*,b.service_name FROM reviews r JOIN bookings b ON b.id=r.booking_id WHERE r.publish_ok=1 ORDER BY r.updated DESC LIMIT 150")
  };
}
export function createServer({db,secure=false,outbox}={}) {
  const attempts=new Map();
  return http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');
      const path=url.pathname;
      const raw=cookie(req.headers.cookie);
      const user=path.startsWith('/api/')?session(db,raw):null;
      if(req.method==='POST' && path.startsWith('/api/action/')) {
        if(!req.headers['x-norden-request'] || !(req.headers['content-type']??'').startsWith('application/json') ||
          ![undefined,'same-origin','none'].includes(req.headers['sec-fetch-site'])) fail('Origem da solicitação inválida.',403);
        const name=path.slice('/api/action/'.length);
        if(!Object.hasOwn(actions,name)) fail('Ação indisponível.',404);
        if(['login','register','recover','reset','redeem','resend'].includes(name)) {
          const key=(req.socket.remoteAddress ?? '')+':'+name;
          const time=now();
          if(attempts.size>1000) for(const [k,v] of attempts) if(v.expiry<=time) attempts.delete(k);
          const previous=attempts.get(key);
          const bucket=previous?.expiry>time?previous:{count:0,expiry:time+15*60_000};
          if(++bucket.count>18) fail('Muitas tentativas. Aguarde alguns minutos.',429);
          attempts.set(key,bucket);
        }
        const data=await bodyOf(req,name==='photo'?2_810_000:40_000);
        const result=await actions[name](db,data,user,{raw,outbox});
        if (Object.hasOwn(result,'cookie')) return reply(res,result.data,200,undefined,{'Set-Cookie':setSession(result.cookie,secure)});
        return reply(res,result);
      }
      if(req.method==='GET' && path.startsWith('/api/')) {
        if(path==='/api/boot') return reply(res,boot(db,user));
        if(path==='/api/disponibilidade') return reply(res,availability(db,Object.fromEntries(url.searchParams),user));
        const [, , resource, ref, extra]=path.split('/');
        if(!ref||extra) fail('Registro indisponível.',404);
        if(resource==='reserva') return reply(res,bookingDetails(db,ref,user));
        if(resource==='pedido') return reply(res,orderDetails(db,ref,user));
        if(resource==='foto') {
          const media=readMedia(db,ref,user);
          return reply(res,Buffer.from(media.content),200,media.mime);
        }
        fail('Recurso indisponível.',404);
      }
      if(!['GET','HEAD'].includes(req.method)) fail('Método indisponível.',405);
      const file=path==='/'?'index.html':path.slice(1);
      if(/^(assets\/[\w.-]+|[\w.-]+\.(mjs|css|html))$/.test(file)) {
        const ext=file.slice(file.lastIndexOf('.'));
        if(mimes[ext]) {
          try {
            const content=readFileSync(resolve(publicRoot,file));
            return reply(res,req.method==='HEAD'?null:content,200,mimes[ext],file.startsWith('assets/')?{'Cache-Control':'public, max-age=300'}:{});
          } catch (error) {
            if(error.code!=='ENOENT') throw error;
            fail('Arquivo indisponível.',404);
          }
        }
      }
      return reply(res,req.method==='HEAD'?null:readFileSync(resolve(publicRoot,'index.html')),200,mimes['.html']);
    } catch (error) {
      if(res.headersSent) return res.end();
      const conflict=error.message.includes('Agenda indisponível');
      const status=error.status || (conflict?409:500);
      if(status===500) console.error('Erro interno NORDEN',error.code || error.name);
      reply(res,{error:status===500?'Ocorreu uma falha interna. Tente novamente.':error.message},status);
    }
  });
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.env.NODE_ENV==='production') throw new Error('Esta entrega está configurada para avaliação e homologação isoladas.');
  const folder=resolve(process.env.NORDEN_DATA || 'data');
  mkdirSync(folder,{recursive:true,mode:0o700});
  const db=openDatabase(resolve(folder,'norden.sqlite'),{secret:process.env.NORDEN_SAFETY_KEY});
  const host=process.env.HOST || '127.0.0.1';
  const port=Number(process.env.PORT || 4173);
  const server=createServer({db,secure:process.env.NORDEN_SECURE_COOKIE==='1',outbox:resolve(folder,'outbox')});
  server.listen(port,host,()=>console.log('NORDEN disponível em http://'+host+':'+port));
}
