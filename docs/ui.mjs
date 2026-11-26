import {demoApi} from "./pages-demo.mjs";
export const state={data:null,route:'',draft:null,adminSlots:null,quote:null,checkout:null};
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=n=>(Number(n)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const label=value=>({
  CONFIRMADO:'Confirmado',CANCELADO:'Cancelado',EM_ATENDIMENTO:'Em atendimento',CONCLUIDO:'Concluído',
  NAO_COMPARECEU:'Não compareceu',OFERTADA:'Aguardando resposta',EFETIVADA:'Realocação confirmada',RECUSADA:'Recusada',
  EXPIRADA:'Expirada',INVALIDADA:'Encerrada',RECEBIDO:'Recebido',EM_PREPARACAO:'Em preparação',PRONTO_RETIRADA:'Pronto para retirada',
  SAIU_ENTREGA:'Saiu para entrega',SIMULADO:'Pagamento simulado',NAO_PAGO:'Pagamento presencial pendente',
  ABERTA:'Aberta',EM_ANALISE:'Em análise',RESPONDIDA:'Respondida',REMARCADO:'Remarcado',REALOCADO:'Realocado',
  REMARCACAO_SOLICITADA:'Remarcação solicitada',PENDENTE:'Pendente',PUBLICADA:'Publicada',REJEITADA:'Rejeitada'
}[value]??String(value??'').replaceAll('_',' ').toLowerCase());
const zone='America/Sao_Paulo';
export const date=(ms,format={day:'2-digit',month:'short',year:'numeric'})=>ms?new Intl.DateTimeFormat('pt-BR',{timeZone:zone,...format}).format(ms):'—';
export const clock=ms=>date(ms,{hour:'2-digit',minute:'2-digit'});
export const when=ms=>date(ms)+' · '+clock(ms);
export const dateKey=ms=>date(ms,{year:'numeric',month:'2-digit',day:'2-digit',localeMatcher:'best fit'}).split('/').reverse().join('-');
export const addDays=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export const publicItems=key=>state.data.catalog[key].filter(row=>row.active);
export const find=(key,id)=>state.data.catalog[key].find(row=>row.id===id);
export const status=s=>`<span class="status ${esc(String(s).toLowerCase())}">${esc(label(s))}</span>`;
export const img=(source,alt='',klass='',attrs='loading="lazy"')=>source
  ? `<img src="${esc(source)}" alt="${esc(alt)}" class="${klass}" ${attrs}>`
  : `<div class="image-empty ${klass}" aria-hidden="true">N</div>`;
const paths={
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m5 4h.01M12 14h.01M16 14h.01M8 17h.01"/>',
  bag:'<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.1 8.1 11 11m-11-3.2L19 5"/>',
  flow:'<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  book:'<path d="M12 6a7 7 0 0 0-5-2H3v15h4a7 7 0 0 1 5 2 7 7 0 0 1 5-2h4V4h-4a7 7 0 0 0-5 2zm0 0v15"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  home:'<path d="m3 11 9-8 9 8v9H3zM9 20v-6h6v6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  cross:'<path d="M6 6l12 12M18 6 6 18"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.5 4.5"/>',
  shield:'<path d="m12 3 8 3v6c0 5-4 7-8 9-4-2-8-4-8-9V6l8-3z"/><path d="m8 12 3 3 5-6"/>',
  grid:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>'
};
export const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??''}</svg>`;
export const link=(href,text,klass='button',glyph='')=>`<a class="${klass}" href="${esc(href)}">${glyph?icon(glyph):''}${esc(text)}</a>`;
export const button=(text,klass='button primary',attrs='')=>`<button class="${klass}" ${attrs}>${esc(text)}</button>`;
export const brand=() => `<a class="brand" href="/" aria-label="NORDEN, página inicial">${img('./assets/norden-emblem.svg','', 'brand-image','width="48" height="60"')}<span><span class="wordmark">NORDEN</span><span class="brand-sub">SALÃO MASCULINO</span></span></a>`;
export const empty=(title,body='',cta='')=>`<div class="empty"><h3>${esc(title)}</h3>${body?`<p>${esc(body)}</p>`:''}${cta}</div>`;
export const eyebrow=text=>`<p class="eyebrow">${esc(text)}</p>`;
export const pageHead=(title,desc='',actions='',over='')=>`<header class="page-head">${over?eyebrow(over):''}<div class="page-head-line"><div><h1>${esc(title)}</h1>${desc?`<p>${esc(desc)}</p>`:''}</div>${actions?`<div class="actions">${actions}</div>`:''}</div></header>`;
export const sectionHead=(title,actions='',desc='')=>`<header class="section-head"><div><h2>${esc(title)}</h2>${desc?`<p>${esc(desc)}</p>`:''}</div>${actions}</header>`;
export const banner=(text,klass='')=>`<p class="banner ${klass}">${esc(text)}</p>`;
export function field(title,name,value='',type='text',attrs='') {
  return `<label class="field"><span>${esc(title)}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
}
export const textarea=(title,name,value='',attrs='')=>`<label class="field"><span>${esc(title)}</span><textarea name="${esc(name)}" ${attrs}>${esc(value)}</textarea></label>`;
export function select(title,name,items,value='',attrs='') {
  return `<label class="field"><span>${esc(title)}</span><select name="${esc(name)}" ${attrs}>${items.map(([id,caption])=>`<option value="${esc(id)}" ${String(value)===String(id)?'selected':''}>${esc(caption)}</option>`).join('')}</select></label>`;
}
export const check=(title,name,value=false,attrs='')=>`<label class="check"><input type="checkbox" name="${esc(name)}" ${value?'checked':''} ${attrs}><span>${esc(title)}</span></label>`;
export const multi=(title,name,items,selected=[])=>`<fieldset class="choice-list"><legend>${esc(title)}</legend><div>${items.map(([id,title])=>`<label class="check"><input type="checkbox" name="${esc(name)}" value="${esc(id)}" ${selected.includes(id)?'checked':''}><span>${esc(title)}</span></label>`).join('')||'<p>Nenhuma opção disponível.</p>'}</div></fieldset>`;
export const form=(name,inner)=>`<form data-form="${name}" class="form">${inner}<p class="form-error" role="alert" hidden></p></form>`;
export const row=(title,description='',right='',href='')=>`<article class="line"><div class="line-main">${href?`<a class="line-title" href="${esc(href)}">${esc(title)}</a>`:`<h3>${esc(title)}</h3>`}${description?`<p>${esc(description)}</p>`:''}</div>${right?`<div class="line-end">${right}</div>`:''}</article>`;
export const titleOptions=(items,first='Selecione')=>[['',first],...items.map(x=>[x.id,x.name])];
export const hidden=(name,value)=>`<input type="hidden" name="${esc(name)}" value="${esc(value)}">`;
export const pair=(...content)=>`<div class="field-pair">${content.join('')}</div>`;
export const notice=text=>`<small class="hint">${esc(text)}</small>`;
export const dataOf=form=>Object.fromEntries(new FormData(form));
export const selected=(form,name)=>new FormData(form).getAll(name);
export const checked=(form,name)=>Boolean(form.elements.namedItem(name)?.checked);
export const q=(key,fallback='')=>new URL((location.origin+(location.hash.startsWith('#/')?location.hash.slice(1):'/'))).searchParams.get(key)??fallback;
export function guestCart() {
  try {
    const stored=JSON.parse(localStorage.getItem('norden-cart') ?? '{}');
    if(!stored||typeof stored!=='object'||Array.isArray(stored)) return {};
    return Object.fromEntries(Object.entries(stored).filter(([,quantity])=>Number.isInteger(quantity)&&quantity>=1&&quantity<=99));
  } catch { return {}; }
}
export function saveCart(value) {
  try { localStorage.setItem('norden-cart',JSON.stringify(value)); } catch { /* storage can be disabled */ }
}
export function cartCount() {
  return state.data.user?.role==='cliente' ? state.data.cart.items.reduce((sum,x)=>sum+x.quantity,0) :
    Object.values(guestCart()).reduce((sum,x)=>sum+Number(x),0);
}
export function lines(list,fn,fallback='') { return list.length ? list.map(fn).join('') : fallback; }
export async function api(path,body) { return demoApi(path,body); }
export const action=(name,body={})=>api('action/'+name,body);

export const loadingView=(message='Preparando sua experiência…')=>`<div class="norden-loading" role="status"><svg class="scissor-loader" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><g class="scissor-half first"><circle cx="28" cy="76" r="10"/><path d="M34 68 72 16 52 52"/></g><g class="scissor-half second"><circle cx="72" cy="76" r="10"/><path d="M66 68 28 16 48 52"/></g><circle cx="50" cy="50" r="3" fill="currentColor"/></svg><span class="wordmark">NORDEN</span><p>${esc(message)}</p><span class="loading-track" aria-hidden="true"></span></div>`;
