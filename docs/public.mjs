import {state,esc,brand,icon,img,link,button,eyebrow,form,field,hidden,pageHead,sectionHead,empty,row,notice,
  publicItems,find,money,cartCount,lines,select,q,banner} from './ui.mjs';
export const accountHome=()=>state.data.user?.role==='cliente'?'/app':state.data.user?'/gestao':'/login';
export function header() {
  return `<header class="site-header"><div class="wrap nav-bar">
    ${brand()}<button type="button" class="icon-button mobile-menu" data-command="menu" aria-label="Abrir navegação" aria-expanded="false">${icon('menu')}</button>
    <nav class="public-nav" aria-label="Navegação principal">
      ${link('/servicos','Serviços','nav-link')}${link('/#experiencia','Experiência','nav-link')}${link('/profissionais','Profissionais','nav-link')}${link('/loja','Loja','nav-link')}
    </nav><div class="nav-actions">
      ${link(accountHome(),state.data.user?'Minha área':'Entrar','nav-link account-link','user')}
      <a href="/app/carrinho" class="icon-button cart-icon" aria-label="Carrinho, ${cartCount()} ${cartCount()===1?'item':'itens'}">${icon('bag')}${cartCount()?'<b>'+cartCount()+'</b>':''}</a>
      ${link('/app/agendar','Agendar horário','button primary nav-cta','calendar')}
    </div></div></header>`;
}
export function footer() {
  const info=state.data.catalog.info;
  return `<footer class="site-footer"><div class="wrap footer-inner">
    <div>${brand()}<p>Salão inteligente masculino.</p></div>
    <nav aria-label="Informações do NORDEN">${link('/servicos','Serviços','nav-link')}${link('/loja','Loja','nav-link')}${link('/galeria','Galeria','nav-link')}${link('/contato','Contato','nav-link')}</nav>
    <nav aria-label="Políticas">${link('/privacidade','Privacidade','nav-link')}${link('/termos','Termos','nav-link')}</nav>
    <div class="footer-meta"><span>NORDEN</span><span>Ambiente de demonstração · catálogo e imagens ilustrativos</span>${info.address?`<span>${esc(info.address)}</span>`:''}</div>
  </div></footer>`;
}
const publicList=key=>publicItems(key);
const serviceItem=(item,compact=false)=>`<article class="service-item">
  <div class="service-mark">${icon(item.category==='Barba'?'scissors':item.category==='Combos'?'grid':'scissors',25)}</div>
  <div class="service-copy"><a href="/servicos/${esc(item.id)}"><h3>${esc(item.name)}</h3></a><p>${esc(item.description)}</p></div>
  <div class="service-spec"><span>${icon('clock',17)} ${item.duration} min</span><strong>${money(item.price)}</strong></div>
  ${compact?link('/app/agendar?servico='+item.id,'Agendar','text-button'):link('/servicos/'+item.id,'Ver detalhes','text-button')}
</article>`;
const productCard=item=>`<article class="product-card"><a class="product-image" href="/loja/${esc(item.id)}" aria-label="Conhecer ${esc(item.name)}">
  ${img(item.image||'./assets/kit.webp',item.name,'','loading="lazy" width="600" height="600"')}<span class="product-image-hint">Conhecer produto</span>${!item.available?'<span class="status image-badge">Esgotado</span>':item.promo!==null?'<span class="status image-badge">Oferta</span>':''}</a>
  <div class="product-card-body"><span class="eyebrow">${esc(item.category)}</span><a href="/loja/${esc(item.id)}" class="product-name">${esc(item.name)}</a><p class="product-description">${esc(item.description)}</p>
  <div class="product-meta"><strong>${money(item.promo??item.price)}</strong><span>${esc(item.size)}</span></div><div class="product-card-actions">${link('/loja/'+item.id,'Detalhes','button outline')}${item.available?form('addProduct',hidden('productId',item.id)+hidden('quantity',1)+button('Adicionar','button primary',`aria-label="Adicionar ${esc(item.name)} ao carrinho"`)):'<span class="hint">Avise a equipe sobre seu interesse.</span>'}</div></div></article>`;
const professionalCard=p=>`<article class="pro-card">${img(p.image,'Retrato ilustrativo de '+p.name)}<div>
  <p class="eyebrow">${esc(p.specialty)}</p><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>
  ${link('/app/agendar?profissional='+p.id,'Consultar horários','text-button')}</div></article>`;
const journeySteps=[
  ['calendar','Antes','Escolha o serviço, o profissional e o melhor horário. Registre suas preferências com antecedência.'],
  ['scissors','Durante','Seu profissional consulta a ficha e registra o procedimento e os produtos aplicados.'],
  ['book','Depois','Reveja o atendimento no Journey, consulte seu manual Care e encontre na Store os produtos recomendados.']
];
const moduleItems=[
  ['flow','Flow','Receba ofertas de horários liberados e confirme a troca pela sua conta.'],
  ['clock','Journey','Consulte os serviços realizados e os produtos usados em cada atendimento.'],
  ['book','Care','Leve para casa as orientações revisadas pelo profissional.'],
  ['bag','Store','Compre produtos para sua rotina com retirada ou entrega.']
];
export function landing() {
  const info=state.data.catalog.info;
  const title=info.headline==='Estilo de verdade.\nCuidado em cada detalhe.'?'Seu estilo.\nSua evolução.':info.headline;
  const [first,...rest]=title.split('\n');
  const services=publicList('services'),pros=publicList('professionals'),goods=publicList('products');
  return `<section class="norden-hero"><div class="wrap norden-hero-grid"><div class="norden-hero-copy">
    <span class="experience-tag">MEN'S CARE & INTELLIGENT EXPERIENCE</span>
    <h1>${esc(first)}<em>${esc(rest.join(' '))}</em></h1>
    <p>Mais que um salão masculino. Uma experiência inteligente que conecta seu estilo, seu histórico e os cuidados que continuam em casa.</p>
    <div class="actions">${link('/app/agendar','Agendar experiência','button primary','calendar')}${link('/loja','Explorar Store','button outline','bag')}</div>
    <div class="hero-path"><span>Agende</span><i></i><span>Viva a experiência</span><i></i><span>Evolua</span></div>
    </div><div class="hero-editorial">${img('./assets/hero.webp','Profissional realizando um corte masculino com precisão.','hero-photo','fetchpriority="high" width="800" height="900"')}
    <div class="editorial-caption"><span>PRECISÃO EM CADA DETALHE</span><strong>O seu próximo capítulo.</strong><small>Imagens ilustrativas · experiência NORDEN</small></div>
    <div class="connected-card">${icon('check',20)}<div><strong>Seu cuidado, conectado.</strong><span>Agenda · Journey · Care · Store</span></div></div></div></div></section>
    <section class="ecosystem section-space" id="experiencia"><div class="wrap"><div class="editorial-head"><div>${eyebrow('ANTES · DURANTE · DEPOIS')}<h2>O ecossistema inteligente NORDEN.</h2><p>Um atendimento que não termina quando você sai da cadeira.</p></div></div>
    <div class="module-grid">${moduleItems.map(([glyph,title,desc],i)=>`<a class="ecosystem-card" href="${['/app/realocacoes','/app/jornada','/app/cuidados','/loja'][i]}"><div class="module-icon">${icon(glyph,25)}</div><span class="eyebrow">NORDEN ${title}</span><h3>${['Agenda viva','Sua linha do tempo','Seu manual de cuidados','Sua rotina em casa'][i]}</h3><p>${desc}</p><span class="module-action">Conhecer ${title}</span></a>`).join('')}</div></div></section>
    <section class="section-space" id="servicos"><div class="wrap"><div class="editorial-head"><div>${eyebrow('MENU DE SERVIÇOS')}<h2>Precisão e ritual.</h2></div>${link('/servicos','Todos os serviços','text-button')}</div><div class="service-list">${lines(services,item=>serviceItem(item,true),empty('Catálogo em preparação'))}</div></div></section>
    <section class="experience section-space"><div class="wrap experience-layout">${img('./assets/atelier.webp','Acabamento de corte no salão, com atenção aos detalhes.','editorial-image')}
    <div>${eyebrow('A EXPERIÊNCIA NORDEN')}<h2>O cuidado continua.<br><em>O estilo evolui.</em></h2><div class="experience-steps">${journeySteps.map(([glyph,title,description])=>`<div>${icon(glyph)}<div><h3>${title}</h3><p>${description}</p></div></div>`).join('')}</div>${link('/app/jornada','Conhecer minha jornada','button outline','clock')}</div></div></section>
    ${pros.length?`<section class="section-space"><div class="wrap"><div class="editorial-head"><div>${eyebrow('PROFISSIONAIS')}<h2>Técnica, identidade e conexão.</h2></div>${link('/profissionais','Conhecer a equipe','text-button')}</div><div class="pro-grid">${pros.slice(0,2).map(professionalCard).join('')}</div></div></section>`:''}
    <section class="store-band section-space"><div class="wrap"><div class="editorial-head"><div>${eyebrow('NORDEN STORE')}<h2>O seu ritual, em casa.</h2><p>Produtos para cabelo, barba e pele. Escolha, conheça e leve com você.</p></div>${link('/loja','Explorar a loja','button outline','bag')}</div><div class="product-grid">${goods.slice(0,3).map(productCard).join('')}</div></div></section>
    ${reviews()}<section class="section-space contact-band"><div class="wrap contact-layout"><div>${eyebrow('SEU PRÓXIMO ENCONTRO')}<h2>Seu estilo merece esse cuidado.</h2>${contactInfo(info)}${link('/app/agendar','Agendar experiência','button primary','calendar')}</div><div>${faq(info)}</div></div></section>`;
}

function faq(info) {
  if(!info.faq.length) return '';
  return `<div class="faqs"><h3>Perguntas frequentes</h3>${info.faq.map(([question,answer])=>`<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join('')}</div>`;
}
const galleryItem=item=>`<figure>${img(item.image,item.title)}<figcaption>${esc(item.title)}</figcaption></figure>`;
function reviews() {
  return state.data.catalog.reviews.length?`<section class="section-space light-block"><div class="wrap"><h2>Avaliações</h2>
    ${state.data.catalog.reviews.map(r=>row(r.service_name,r.comment,`<span>${r.rating}/5</span>`)).join('')}</div></section>`:'';
}
function contactInfo(info) {
  return `<address class="contact-details">${[info.address,info.contact,info.hoursText].filter(Boolean).map(line=>`<p>${esc(line)}</p>`).join('')||
    '<p>Endereço, contato e horário de funcionamento ainda aguardam confirmação do salão.</p>'}</address>`;
}
function servicesView(ref) {
  if(!ref) return `${pageHead('Serviços','Veja as opções, a duração de cada atendimento e o valor ilustrativo.',link('/app/agendar','Agendar horário','button primary','calendar'))}
    <div class="service-list">${lines(publicList('services'),item=>serviceItem(item),empty('Nenhum serviço disponível'))}</div>`;
  const item=find('services',ref);
  if(!item?.active) return empty('Serviço indisponível','',link('/servicos','Voltar aos serviços','button'));
  const ids=state.data.catalog.compatibility.filter(r=>r.service_id===ref).map(r=>r.professional_id);
  const products=state.data.catalog.serviceProducts.filter(r=>r.service_id===ref).map(r=>find('products',r.product_id)).filter(p=>p?.active);
  return `${link('/servicos','Todos os serviços','text-button')}${pageHead(item.name,item.description,link('/app/agendar?servico='+ref,'Agendar este serviço','button primary','calendar'),item.category)}
    <div class="split">
      <section class="panel"><h2>Detalhes do serviço</h2>${row('Preço ilustrativo','',money(item.price))}${row('Duração','',item.duration+' min')}${item.padding?row('Intervalo técnico','',item.padding+' min'):''}
      ${item.instructions?`<p>${esc(item.instructions)}</p>`:''}</section>
      <section class="panel"><h2>Profissionais habilitados</h2>${lines(publicList('professionals').filter(p=>ids.includes(p.id)),p=>row(p.name,p.specialty,'','/app/agendar?servico='+ref+'&profissional='+p.id),empty('Sem profissionais disponíveis'))}</section>
    </div>${products.length?`<section class="section-gap"><h2>Produtos elegíveis para preferência</h2><div class="product-grid">${products.map(productCard).join('')}</div></section>`:''}`;
}
function shop(ref) {
  if(ref) {
    const p=find('products',ref);
    if(!p?.active) return empty('Produto indisponível','O item pode continuar no histórico dos seus atendimentos ou pedidos.',link('/loja','Voltar à loja','button'));
    const related=state.data.catalog.serviceProducts.filter(r=>r.product_id===ref).map(r=>find('services',r.service_id)).filter(s=>s?.active);
    return `${link('/loja','Voltar à loja','text-button')}<div class="product-detail">
      <div class="product-image">${img(p.image,p.name)}</div><section><p class="eyebrow">${esc(p.brand)} · ${esc(p.category)}</p><h1>${esc(p.name)}</h1>
      <p>${esc(p.description)}</p><div class="price-block"><strong>${money(p.promo??p.price)}</strong>${p.promo!==null?`<del>${money(p.price)}</del>`:''}</div>
      <p>${esc(p.size)} · SKU ${esc(p.sku)} · ${p.available?'Disponível':'Esgotado'}</p>
      ${p.available?form('addProduct',hidden('productId',ref)+pairQuantity(p.available)+button('Adicionar ao carrinho')):banner('Este produto está sem estoque.')}
      <div class="detail-specs">${[ ['Modo de uso',p.usage],['Ingredientes',p.ingredients],['Alertas',p.warnings]].filter(([,v])=>v).map(([t,v])=>`<h3>${t}</h3><p>${esc(v)}</p>`).join('')}
      ${related.length?`<h3>Serviços compatíveis</h3><div class="actions">${related.map(s=>link('/servicos/'+s.id,s.name,'text-button')).join('')}</div>`:''}</div>
      </section></div>`;
  }
  let products=publicList('products');
  const categories=[...new Set(products.map(p=>p.category))];
  const search=q('q').trim().toLocaleLowerCase('pt-BR'),cat=q('categoria'),available=q('estoque'),sort=q('ordem'),page=Math.max(1,Number(q('p','1'))||1);
  products=products.filter(p=>(!search||(p.name+' '+p.brand+' '+p.sku+' '+p.description).toLocaleLowerCase('pt-BR').includes(search))&&
    (!cat||p.category===cat)&&(!available||(available==='disponivel'?p.available>0:p.available===0)));
  if(sort==='menor'||sort==='maior') products.sort((a,b)=>((a.promo??a.price)-(b.promo??b.price))*(sort==='menor'?1:-1));
  if(sort==='nome') products.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  const count=products.length,max=Math.max(1,Math.ceil(count/9)),current=Math.min(page,max);
  const pageHref=p=>'/loja?'+new URLSearchParams({q:q('q'),categoria:cat,estoque:available,ordem:sort,p});
  return `${pageHead('NORDEN Store','Produtos para a sua rotina de cabelo, barba e pele.',link('/app/carrinho','Carrinho'+(cartCount()?' ('+cartCount()+')':''),'button outline','bag'))}
    ${form('shopFilter',`<div class="filters">${field('Buscar produto','q',q('q'),'search','placeholder="Nome, marca ou SKU"')}
    ${select('Categoria','categoria',[['','Todas'],...categories.map(c=>[c,c])],cat)}${select('Estoque','estoque',[['','Todos'],['disponivel','Disponíveis'],['esgotado','Esgotados']],available)}
    ${select('Ordenar','ordem',[['','Destaques'],['menor','Menor preço'],['maior','Maior preço'],['nome','Nome']],sort)}${button('Aplicar filtros','button outline')}</div>`)}
    <p class="results-count">${count} ${count===1?'produto':'produtos'}</p><div class="product-grid">${lines(products.slice((current-1)*9,current*9),productCard,empty('Nenhum produto encontrado','Experimente outros termos ou filtros.'))}</div>
    ${max>1?`<nav class="actions pagination" aria-label="Paginação">${current>1?link(pageHref(current-1),'Anterior','button outline'):''}<span>Página ${current} de ${max}</span>${current<max?link(pageHref(current+1),'Próxima','button outline'):''}</nav>`:''}`;
}
const pairQuantity=available=>field('Quantidade','quantity',1,'number','min="1" max="'+Math.min(available,99)+'" required');
export function authView(path) {
  const token=q('token'),target=q('voltar');
  const isRegister=path==='/cadastro',invite=path==='/conta/convite';
  const reset=path==='/conta/redefinir',recover=path==='/recuperar-senha',verify=path==='/conta/verificar';
  let title='Bem-vindo ao NORDEN.',sub='Acesse seus agendamentos, cuidados e pedidos.',code='login',fields='';
  const mail=field('E-mail','email','','email','autocomplete="email" required maxlength="240"');
  const secret=field(reset?'Nova senha':'Senha','password','','password',`autocomplete="${isRegister||invite||reset?'new-password':'current-password'}" ${isRegister||invite||reset?'minlength="10"':''} required maxlength="128"`);
  const confirm=field('Confirme a senha','confirm','','password','autocomplete="new-password" minlength="10" required maxlength="128"');
  if(isRegister||invite) {
    title=invite?'Ativar seu convite':'Crie sua conta.';
    sub=invite?'Use o e-mail indicado no convite administrativo.':'Use dados fictícios para experimentar a plataforma.';
    code=invite?'redeem':'register';
    fields=field('Nome completo','name','','text','autocomplete="name" required maxlength="100"')+mail+
      field('Telefone','phone','','tel','autocomplete="tel" required maxlength="24"')+secret+confirm;
  } else if(recover) {
    title='Recuperação de senha';sub='Na demonstração, o link é registrado na caixa de saída local da instância.';
    code='recover';fields=mail;
  } else if(reset) {
    title='Defina uma nova senha';sub='O link de recuperação só pode ser usado uma vez.';code='reset';fields=secret+confirm;
  } else if(verify) {
    title='Confirme seu e-mail';sub='Use o link de verificação da caixa de saída local.';code='verify';
  } else fields=mail+secret;
  const cta={login:'Entrar',register:'Criar conta',recover:'Solicitar recuperação',reset:'Salvar nova senha',verify:'Confirmar e-mail',redeem:'Ativar conta'}[code];
  return `<div class="auth-layout"><aside class="auth-image">${img('./assets/norden-original.png','Logotipo oficial do NORDEN','', 'fetchpriority="high"')}</aside>
    <div class="auth-body">${eyebrow('CONTA NORDEN')}<h1>${title}</h1><p>${sub}</p>
    ${form(code,hidden('target',target)+hidden('token',token)+fields+button(cta))}
    <div class="actions auth-links">${code==='login'?link('/recuperar-senha','Esqueci minha senha','text-button')+link('/cadastro'+(target?'?voltar='+encodeURIComponent(target):''),'Criar conta','text-button'):
      link('/login'+(target?'?voltar='+encodeURIComponent(target):''),'Ir para login','text-button')}</div>
    ${isRegister?notice('Consulte a política de privacidade para saber como os dados são usados.')+link('/privacidade','Política de privacidade','text-button'):''}
    </div></div>`;
}
export function publicPage(parts) {
  const [page,ref]=parts;
  if(page==='servicos') return servicesView(ref);
  if(page==='loja') return shop(ref);
  if(page==='profissionais') return `${pageHead('Profissionais','Equipe e imagens fictícias para demonstração. Consulte os horários por profissional.')}
    <div class="pro-grid">${lines(publicList('professionals'),professionalCard,empty('Equipe em preparação'))}</div>`;
  if(page==='galeria') return `${pageHead('Galeria','Imagens ilustrativas de cortes e acabamentos.')}
    <div class="gallery-grid">${lines(state.data.catalog.gallery.filter(x=>x.authorized&&x.active),galleryItem,empty('Sem imagens disponíveis'))}</div>`;
  if(page==='contato') return `${pageHead('Contato','Informações do salão e perguntas frequentes.')}
    <div class="split"><div class="panel">${contactInfo(state.data.catalog.info)}${link('/app/agendar','Agendar horário','button primary')}</div><div class="panel">${faq(state.data.catalog.info)}</div></div>`;
  if(page==='privacidade') return `${pageHead('Privacidade','Regras do ambiente de demonstração.')}<div class="text-content">
    <h2>Finalidade e acesso</h2><p>A conta registra perfil, reservas, atendimentos e pedidos fictícios. Alertas de alergia são opcionais, ficam em um registro protegido e são acessíveis ao cliente e à equipe autorizada no atendimento.</p>
    <h2>Consentimento e solicitações</h2><p>O perfil permite retirar o consentimento dos alertas, alterar preferências e solicitar acesso, correção ou exclusão. A gestão acompanha a solicitação na área administrativa.</p>
    <h2>Retenção</h2><p>Os prazos e a base legal para uma operação comercial dependem de definição antes da entrada em produção. Nesta instância, utilize dados fictícios.</p>
    ${link('/app/perfil','Gerenciar minha privacidade','button outline')}</div>`;
  if(page==='termos') return `${pageHead('Termos da demonstração','Condições para experimentar o NORDEN.')}<div class="text-content">
    <p>Serviços, disponibilidade, profissionais, imagens, preços e produtos são ilustrativos. Os agendamentos ocorrem apenas na instância de demonstração.</p>
    <p>O checkout usa pagamento simulado ou presencial de referência, sem cobrança. Na entrega, a distância é informada para simular o cálculo, sem validação por mapas.</p>
    <p>O prazo configurado de cancelamento é confirmado no agendamento. Consulte as orientações registradas no seu atendimento.</p></div>`;
  return empty('Página indisponível','Confira o endereço ou retorne ao início.',link('/','Voltar ao início','button primary'));
}
