// Used only by the GitHub Pages export; the local app keeps its real API.
const roles=['guest','cliente','profissional','gestor'];
let role='guest';
try {role=sessionStorage.getItem('norden-pages-role')||'guest';} catch {}
if(!roles.includes(role)) role='guest';
const cache=new Map();
async function snapshot(name) {
  if(!cache.has(name)) {
    const response=await fetch(new URL('./demo/'+name+'.json',import.meta.url));
    if(!response.ok) throw new Error('Não foi possível carregar a demonstração. Atualize a página.');
    cache.set(name,await response.json());
  }
  return structuredClone(cache.get(name));
}
export async function demoApi(path,body) {
  if(body!==undefined) {
    if(path==='action/logout') {selectRole('guest');return {ok:true};}
    throw new Error('Prévia do GitHub Pages: esta ação precisa do servidor NORDEN. Use os perfis de demonstração no topo para explorar as telas. Nenhum dado foi enviado ou salvo.');
  }
  if(path==='boot'||path==='boot?view=entry') return snapshot('boot-'+role);
  if(path.startsWith('disponibilidade?')) throw new Error('A consulta de horários em tempo real está disponível na versão com servidor. Esta prévia não recebe agendamentos.');
  const details=await snapshot('details-'+role);
  if(Object.hasOwn(details,path)) return details[path];
  throw Object.assign(new Error('Registro indisponível nesta demonstração.'),{status:404});
}
function selectRole(value) {
  try {sessionStorage.setItem('norden-pages-role',value);} catch {alert('Permita armazenamento da sessão para alternar o perfil de demonstração.');return;}
  location.hash=value==='guest'?'#/':value==='cliente'?'#/app/jornada':'#/gestao';
  location.reload();
}
function mount() {
  const bar=document.createElement('aside');
  bar.className='pages-demo-bar';
  bar.setAttribute('aria-label','Prévia de demonstração');
  bar.innerHTML='<div><strong>DEMONSTRAÇÃO · GITHUB PAGES</strong><span>Dados fictícios · ações de gravação indisponíveis</span></div><nav aria-label="Explorar perfis">'+
    roles.map((value,i)=>'<button type="button" data-preview-role="'+value+'" aria-pressed="'+(role===value)+'">'+['Visitante','Cliente','Cabeleireiro','Gestor'][i]+'</button>').join('')+'</nav>';
  bar.addEventListener('click',event=>{const button=event.target.closest('[data-preview-role]');if(button) selectRole(button.dataset.previewRole);});
  document.body.prepend(bar);
  const patchLinks=()=>{
    for(const link of document.querySelectorAll('#app a[href^="/"]')) {
      const target=link.getAttribute('href');
      if(target.startsWith('//')) continue;
      link.dataset.demoRoute=target;
      link.href=new URL('./index.html#'+target,import.meta.url).href;
    }
  };
  new MutationObserver(patchLinks).observe(document.querySelector('#app'),{childList:true,subtree:true});
  patchLinks();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
