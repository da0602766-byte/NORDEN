import {cpSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {openDatabase} from './core.mjs';
import {createServer} from './server.mjs';
import {seed,demoAccounts} from './seed.mjs';

// Only synthetic, in-memory data is exported. Never open the local data/ database.
const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.argv[2]?resolve(process.argv[2]):fileURLToPath(new URL('../dist/pages-legacy/',import.meta.url));
const db=openDatabase(':memory:');
const secret=randomBytes(24).toString('hex');
await seed(db,secret);
const server=createServer({db});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin='http://127.0.0.1:'+server.address().port;
mkdirSync(join(output,'demo'),{recursive:true});
const clean=value=>JSON.stringify(value,null,2).replaceAll('/assets/','./assets/');
try {
  for(const role of ['guest','cliente','profissional','gestor']) {
    let cookie='';
    if(role!=='guest') {
      const account=demoAccounts.find(account=>account[2]===role);
      const response=await fetch(origin+'/api/action/login',{method:'POST',headers:{'Content-Type':'application/json','X-Norden-Request':'1'},body:JSON.stringify({email:account[1],password:secret})});
      if(!response.ok) throw new Error('Falha no perfil de demonstração: '+role);
      cookie=response.headers.get('set-cookie').split(';')[0];
    }
    const headers=cookie?{Cookie:cookie}:{};
    const response=await fetch(origin+'/api/boot',{headers});
    if(!response.ok) throw new Error('Falha na exportação: '+role);
    const boot=await response.json();
    writeFileSync(join(output,'demo','boot-'+role+'.json'),clean(boot));
    const details={};
    for(const booking of boot.bookings??[]) {
      const response=await fetch(origin+'/api/reserva/'+booking.id,{headers});
      if(!response.ok) throw new Error('Falha ao exportar ficha fictícia.');
      details['reserva/'+booking.id]=await response.json();
    }
    writeFileSync(join(output,'demo','details-'+role+'.json'),clean(details));
  }
} finally {
  await new Promise(resolve=>server.close(resolve));
  db.close();
}
cpSync(join(root,'public'),output,{recursive:true});
const virtualLocation="(location.origin+(location.hash.startsWith('#/')?location.hash.slice(1):'/'))";
for(const name of readdirSync(output).filter(name=>name.endsWith('.mjs'))) {
  if(name==='pages-demo.mjs') continue;
  const file=join(output,name);
  let code=readFileSync(file,'utf8').replaceAll('location.href',virtualLocation)
    .replaceAll('location.pathname',"new URL("+virtualLocation+").pathname")
    .replaceAll("'/assets/","'./assets/").replaceAll('"/assets/','"./assets/');
  if(name==='ui.mjs') {
    const start=code.indexOf('export async function api(');
    const end=code.indexOf('export const action=',start);
    if(start<0||end<0) throw new Error('API da interface mudou; revise a exportação Pages.');
    code='import {demoApi} from '+JSON.stringify('./pages-demo.mjs')+';\n'+code.slice(0,start)+
      'export async function api(path,body) { return demoApi(path,body); }\n'+code.slice(end);
  }
  if(name==='app.mjs') {
    code=code.replace("(null,'',safe)","(null,'','#'+safe)")
      .replace("const href=a.getAttribute('href');","const href=a.dataset.demoRoute||a.getAttribute('href');")
      .replace("window.addEventListener('popstate',()=>draw(true));","window.addEventListener('popstate',()=>draw(true));\nwindow.addEventListener('hashchange',()=>draw(true));");
  }
  writeFileSync(file,code);
}
let html=readFileSync(join(output,'index.html'),'utf8').replaceAll('href="/','href="./').replaceAll('src="/','src="./');
html=html.replace('<body>','<body class="pages-preview">');
writeFileSync(join(output,'index.html'),html);
writeFileSync(join(output,'.nojekyll'),'');
console.log(`Prévia legada gerada em ${output} com dados exclusivamente fictícios.`);
