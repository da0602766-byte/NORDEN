import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

test('Pages exporta somente fixtures, suporta subpasta e bloqueia gravações',async t=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const output=mkdtempSync(join(tmpdir(),'norden-pages-'));
  t.after(()=>rmSync(output,{recursive:true,force:true}));
  const result=spawnSync(process.execPath,[join(root,'src/build-pages.mjs'),output],{encoding:'utf8'});
  assert.equal(result.status,0,result.error?.message||result.stderr);
  const html=readFileSync(join(output,'index.html'),'utf8');
  assert.match(html,/src="\.\/app.mjs"/);
  assert.match(html,/href="\.\/norden.css"/);
  const app=readFileSync(join(output,'app.mjs'),'utf8');
  assert.match(app,/pushState.*'#'\+safe/);
  assert.match(app,/a.dataset.demoRoute/);
  assert.doesNotMatch(app,/new URL\(location.href\)/);
  assert.equal(readdirSync(output).includes('data'),false);
  const guest=JSON.parse(readFileSync(join(output,'demo/boot-guest.json'),'utf8'));
  assert.equal(guest.user,null);
  assert.match(guest.catalog.products[0].image,/^\.\/assets\//);
  for(const profile of ['cliente','profissional','gestor']) {
    const data=JSON.parse(readFileSync(join(output,'demo/boot-'+profile+'.json'),'utf8'));
    assert.equal(data.user.role,profile);
    assert.match(data.user.email,/@norden\.example$/);
    assert.equal(Object.hasOwn(data.user,'password'),false);
  }
  const previous={document:globalThis.document,sessionStorage:globalThis.sessionStorage,fetch:globalThis.fetch};
  t.after(()=>{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
  globalThis.document={readyState:'loading',addEventListener(){}};
  globalThis.sessionStorage={getItem:()=> 'cliente'};
  globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(readFileSync(join(output,'demo',basename(new URL(url).pathname)),'utf8'))});
  const {demoApi}=await import(pathToFileURL(join(output,'pages-demo.mjs')).href);
  const boot=await demoApi('boot');
  assert.equal(boot.user.role,'cliente');
  assert.ok(boot.journey.length>0);
  const detail=await demoApi('reserva/demo-historico');
  assert.equal(detail.treatment.private_note,undefined);
  await assert.rejects(demoApi('action/checkout',{requestKey:'test'}),/Nenhum dado foi enviado ou salvo/);
  await assert.rejects(demoApi('action/login',{email:'real@example.com',password:'not-sent'}),/perfis de demonstração/);
  await assert.rejects(demoApi('reserva/demo-vaga'),/Registro indisponível/);
});
