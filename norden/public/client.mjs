import {state,esc,icon,img,link,button,eyebrow,form,field,hidden,textarea,select,check,multi,pair,pageHead,sectionHead,empty,row,notice,
  publicItems,find,money,date,clock,when,status,lines,q,banner,titleOptions,guestCart,addDays,dateKey,label} from './ui.mjs';

const data=()=>state.data;
const bookingHref=id=>'/app/agendamentos/'+id;
const careHref=id=>'/app/cuidados/'+id;
const journeyHref=id=>'/app/jornada/'+id;
const orderHref=id=>'/app/pedidos/'+id;
const activeBookings=()=>data().bookings.filter(b=>['CONFIRMADO','EM_ATENDIMENTO'].includes(b.status)&&b.starts>=Date.now()).sort((a,b)=>a.starts-b.starts);
const bookLine=(b,href=bookingHref(b.id))=>row(b.service_name,when(b.starts)+' · '+b.professional_name,status(b.status),href);
const orderLine=o=>row('Pedido '+o.id.slice(0,8).toUpperCase(),date(o.created)+' · '+(o.mode==='entrega'?'Entrega':'Retirada')+' · '+money(o.total),status(o.status),orderHref(o.id));
const relationLine=j=>row(j.procedure,when(j.finished)+' · '+j.professional_name,link(careHref(j.id),'Manual','text-button'),journeyHref(j.id));
export function clientHome() {
  const { user,journey,orders,flow,notifications}=data();
  const upcoming=activeBookings()[0],last=journey[0],offers=flow.offers.filter(o=>o.status==='OFERTADA');
  return `${pageHead('Olá, '+user.name.split(' ')[0]+'.','Sua agenda, seus cuidados e seus pedidos em um só lugar.',link('/app/agendar','Agendar horário','button primary','calendar'),'MINHA ÁREA')}
    <div class="app-spotlight"><div>${eyebrow('PRÓXIMO ATENDIMENTO')}<h2>${upcoming?esc(upcoming.service_name):'Seu próximo horário.'}</h2>
    <p>${upcoming?esc(when(upcoming.starts)+' · '+upcoming.professional_name):'Escolha um serviço e consulte a disponibilidade.'}</p>
    ${link(upcoming?bookingHref(upcoming.id):'/app/agendar',upcoming?'Ver agendamento':'Consultar horários','button primary','calendar')}</div>${icon('scissors',92)}</div>
    <div class="quick-actions">
      ${link('/app/agendamentos','Agendamentos','utility','calendar')}${link('/app/realocacoes','NORDEN Flow'+(offers.length?' ('+offers.length+')':''),'utility','flow')}${link('/app/jornada','NORDEN Journey','utility','clock')}
      ${link('/app/cuidados','NORDEN Care','utility','book')}${link('/loja','NORDEN Store','utility','bag')}${link('/app/notificacoes','Notificações'+(notifications.some(n=>!n.read_at)?' •':''),'utility','bell')}
    </div><div class="split section-gap"><section class="panel">${sectionHead('Último atendimento',link('/app/jornada','Ver jornada','text-button'))}
    ${last?relationLine(last):empty('Seu histórico está vazio','O procedimento concluído e o manual aparecem aqui.')}</section>
    <section class="panel">${sectionHead('Pedidos recentes',link('/app/pedidos','Ver pedidos','text-button'))}
    ${lines(orders.slice(0,3),orderLine,empty('Nenhum pedido','Conheça os produtos na NORDEN Store.',link('/loja','Abrir loja','text-button')))}</section></div>`;
}
export function bookingWizard() {
  const services=publicItems('services'), allPros=publicItems('professionals');
  if(!services.length||!allPros.length||!data().catalog.compatibility.some(link=>
    services.some(s=>s.id===link.service_id)&&allPros.some(p=>p.id===link.professional_id))) {
    return pageHead('Agendar horário')+empty('Agenda online indisponível','Ainda não há serviços com equipe disponível. Consulte os serviços ou entre em contato com o salão.',link('/servicos','Ver serviços','button outline'));
  }
  if(!state.draft) {
    const queryService=q('servico'),queryPro=q('profissional');
    state.draft={step:1,serviceId:services.some(s=>s.id===queryService)?queryService:'',professionalId:allPros.some(p=>p.id===queryPro)?queryPro:'',
      preferences:[],date:addDays(data().today,1),clock:'',slots:null,price:null,lastError:''};
  }
  const d=state.draft,service=find('services',d.serviceId),prof=find('professionals',d.professionalId);
  if(d.step>1&&!service?.active) d.step=1;
  const pros=allPros.filter(p=>data().catalog.compatibility.some(c=>c.service_id===d.serviceId&&c.professional_id===p.id));
  if(d.step>2&&!pros.some(p=>p.id===d.professionalId)) d.step=2;
  const products=data().catalog.serviceProducts.filter(c=>c.service_id===d.serviceId).map(c=>find('products',c.product_id)).filter(p=>p?.active);
  const labels=['Serviço','Equipe','Produtos','Horário','Revisão'];
  let view='';
  if(d.step===1) view=`<h2>Qual serviço vamos agendar?</h2><div class="option-list">
    ${services.map(s=>`<label class="option"><input type="radio" name="serviceId" value="${esc(s.id)}" ${s.id===d.serviceId?'checked':''} required><div><strong>${esc(s.name)}</strong><span>${esc(s.description)}</span></div><span>${s.duration} min <b>${money(s.price)}</b></span></label>`).join('')||empty('Nenhum serviço disponível')}</div>`;
  if(d.step===2) view=`<h2>Escolha o profissional.</h2><div class="option-list">
    ${pros.map(p=>`<label class="option"><input type="radio" name="professionalId" value="${esc(p.id)}" ${d.professionalId===p.id?'checked':''} required>
    ${p.image?img(p.image,'','avatar'):''}<div><strong>${esc(p.name)}</strong><span>${esc(p.specialty)}</span></div></label>`).join('')||empty('Equipe indisponível para este serviço','Escolha outro serviço.')}</div>`;
  if(d.step===3) view=`<h2>Preferência de produtos</h2><p>Esta etapa é opcional. A equipe revisará as escolhas durante o atendimento.</p>
    ${products.length?multi('Produtos compatíveis','preferences',products.map(p=>[p.id,p.name+' · '+money(p.promo??p.price)+' na loja']),d.preferences):empty('Sem produtos opcionais')}`;
  if(d.step===4) view=`<h2>Escolha a data e o horário.</h2><div class="date-pick">
    ${field('Data','date',d.date,'date','required min="'+data().today+'" max="'+addDays(data().today,data().catalog.info.bookingDays)+'" data-watch="bookDate"')}
    ${button('Consultar horários','button outline','type="button" data-command="slots"')}</div>
    <div aria-live="polite">${d.slots===null&&!d.lastError?'<p class="hint">Consulte a disponibilidade para a data selecionada.</p>':d.slots?.length?
      `<fieldset class="choice-list"><legend>Horários disponíveis · Brasília</legend><div class="slot-grid">${d.slots.map(s=>`<label class="slot"><input type="radio" required name="clock" value="${s.clock}" ${d.clock===s.clock?'checked':''}><span>${s.clock}</span></label>`).join('')}</div></fieldset>`:
      d.lastError?'':empty('Sem horários nesta data','Tente outra data ou outro profissional.')}</div>`;
  if(d.step===5) view=`<h2>Revise seu agendamento.</h2>${row('Serviço',service.name,money(d.price??service.price))}${row('Profissional',prof.name)}
    ${row('Horário',d.date.split('-').reverse().join('/')+' · '+d.clock,(d.duration??service.duration)+' min')}${row('Preferências',products.filter(p=>d.preferences.includes(p.id)).map(p=>p.name).join(', ')||'Sem preferência')}
    ${banner(data().catalog.info.cancellationHours?'Cancelamento online até '+data().catalog.info.cancellationHours+' h antes.':'Cancelamento online disponível até o início da reserva.')}
    ${data().user?.role==='cliente'?check('Revisei o horário e o prazo de cancelamento.','review',false,'required'):banner('Entre ou crie uma conta para confirmar. Suas escolhas serão preservadas.')}`;
  const items=[null,services.length,pros.length,true,d.slots?.length,true];
  return `${pageHead('Agendar horário','Escolha o atendimento e consulte a agenda em tempo real.','','AGENDA NORDEN')}
    <div class="booking-layout"><div><ol class="stepper">${labels.map((x,i)=>`<li class="${i+1===d.step?'current':i+1<d.step?'done':''}" ${i+1===d.step?'aria-current="step"':''}><span>${i+1<d.step?icon('check',14):i+1}</span>${x}</li>`).join('')}</ol>
    ${form('wizard',`<div class="panel wizard-panel">${view}${d.lastError?banner(d.lastError,'error'):''}
      <div class="actions wizard-actions">${d.step>1?button('Voltar','button outline','type="button" data-command="previousStep"'):''}
      ${items[d.step]?button(d.step<5?'Continuar':data().user?.role==='cliente'?'Confirmar agendamento':'Entrar para confirmar'):
      button('Continuar','button outline','disabled')}</div></div>`)}</div>
    <aside class="panel booking-summary">${eyebrow('RESUMO')}<h2>Seu atendimento</h2>${service?row(service.name,(d.duration??service.duration)+' min',money(d.price??service.price)):notice('Selecione um serviço para começar.')}
    ${prof&&d.step>1?row(prof.name,prof.specialty):''}${d.clock?row(d.clock,d.date.split('-').reverse().join('/')):''}
    <div class="summary-note">${icon('clock',17)} Horários de Brasília</div></aside></div>`;
}
const eventList=(events,nameKey)=>events?.length?`<ol class="event-list">${events.map(e=>`<li><strong>${esc(label(e[nameKey]))}</strong><span>${when(e.at)}${e.info?.from?' · '+when(e.info.from)+' para '+when(e.info.to):''}</span>${e.reason||e.info?.note?`<p>${esc(e.reason||e.info.note)}</p>`:''}</li>`).join('')}</ol>`:empty('Sem eventos');
function bookingList(ref,detail) {
  if(ref) {
    if(!detail) return empty('Agendamento indisponível','',link('/app/agendamentos','Ver agendamentos','button'));
    const b=detail.booking;
    return `${link('/app/agendamentos','Todos os agendamentos','text-button')}${pageHead(b.service_name,when(b.starts)+' · '+b.professional_name,status(b.status))}
      <div class="split"><section class="panel"><h2>Reserva</h2>${row('Duração',b.duration+' min'+(b.padding?' · intervalo de '+b.padding+' min':''),money(b.price))}
      ${row('Preferências',b.preferences.map(p=>p.name).join(', ')||'Sem preferência')}${b.reason?row('Motivo do cancelamento',b.reason):''}
      ${b.status==='CONCLUIDO'?link(journeyHref(b.id),'Ver atendimento','button primary'):''}
      ${b.status==='CONFIRMADO'? `<details class="disclosure"><summary>Solicitar remarcação</summary>${form('requestMove',hidden('id',b.id)+textarea('Preferência de horário','reason','','maxlength="250"')+button('Enviar solicitação'))}</details>
        <details class="disclosure"><summary>Cancelar agendamento</summary>${form('cancelBooking',hidden('id',b.id)+textarea('Motivo opcional','reason','','maxlength="300"')+check('Confirmo o cancelamento.','confirm',false,'required')+button('Cancelar agendamento','button outline'))}</details>`:''}</section>
      <section class="panel"><h2>Eventos</h2>${eventList(detail.history,'type')}</section></div>`;
  }
  const filter=q('status');
  return `${pageHead('Meus agendamentos','Acompanhe seus horários e consulte o histórico de reservas.',link('/app/agendar','Novo agendamento','button primary','calendar'))}
    ${form('urlFilter',`<div class="filters">${select('Situação','status',[['','Todas'],...['CONFIRMADO','EM_ATENDIMENTO','CONCLUIDO','CANCELADO','NAO_COMPARECEU'].map(s=>[s,label(s)])],filter)}
    ${button('Filtrar','button outline')}</div>`)}
    <div class="section-gap">${lines(data().bookings.filter(b=>!filter||b.status===filter),b=>bookLine(b),empty('Sem agendamentos nesta visão','',link('/app/agendar','Consultar horários','button')))}</div>`;
}
export function offersView() {
  return `${pageHead('NORDEN Flow','Veja as ofertas de antecipação. Seu horário atual permanece reservado até a confirmação.')}
    ${lines(data().flow.offers,o=>`<section class="panel offer">${sectionHead(o.service_name,status(o.status),o.professional_name)}<div class="split">
    ${row('Horário atual',when(o.original))}${row('Horário sugerido',when(o.proposed))}</div>${o.status==='OFERTADA'?
      `<p>Responda até ${when(o.expiry)}.</p>${form('flowAnswer',hidden('id',o.id)+`<div class="actions">
      ${button('Aceitar novo horário','button primary','name="decision" value="aceitar"')}${button('Recusar oferta','button outline','name="decision" value="recusar"')}</div>`)}`:''}</section>`,
      empty('Sem ofertas disponíveis','Você receberá um aviso se surgir uma alternativa para sua reserva.',link('/app/agendamentos','Meus agendamentos','button')))}`;
}
function productLines(list) {
  return `<div class="mini-products">${lines(list,item=>{
    const p=find('products',item.productId);
    const desc=[item.amount,item.detail].filter(Boolean).join(' · ');
    return `<article class="mini-product">${p?.image?img(p.image,item.name,'mini-product-image'): `<div class="mini-product-placeholder">${icon('bag')}</div>`}
      <div><h4>${esc(item.name)}</h4>${desc?`<p>${esc(desc)}</p>`:''}
      ${p?.active?link('/loja/'+p.id,'Ver produto','text-button'):item.productId?'<span class="hint">Fora do catálogo atual</span>':''}</div></article>`;
  },'<p class="hint">Nenhum produto registrado neste atendimento.</p>')}</div>`;
}
export function manualSections(manual) {
  return `<article class="manual"><h3>${esc(manual.title||'Manual de cuidados')}</h3>
    ${[['Orientações',manual.sections.instructions],['Nas primeiras horas',manual.sections.first],['O que evitar',manual.sections.avoid],['Manutenção',manual.sections.maintenance]].filter(([,v])=>v).map(([title,value])=>
      `<div><h4>${title}</h4><p>${esc(value)}</p></div>`).join('')}</article>`;
}
function treatmentView(ref,data,care) {
  if(!data?.treatment) return empty('Atendimento indisponível','O registro fica disponível após a conclusão.',link('/app/jornada','Voltar ao Journey','button'));
  const {booking:b,treatment:a,media,review}=data;
  if(care) return `${link(journeyHref(ref),'Ver atendimento','text-button')}${pageHead('NORDEN Care','Manual revisado para o atendimento de '+date(b.finished)+'.')}
    <section class="panel">${manualSections(a.manual)}${a.recommended.length?`<h3>Produtos recomendados</h3>${productLines(a.recommended)}`:''}</section>`;
  return `${link('/app/jornada','Voltar à linha do tempo','text-button')}${pageHead(a.procedure,when(b.finished)+' · '+b.professional_name,
    link('/app/agendar?servico='+b.service_id+'&profissional='+b.professional_id,'Reagendar','button primary'),'NORDEN JOURNEY')}
    <div class="split"><section class="panel"><h2>Seu atendimento</h2>${row('Serviço agendado',b.service_name,b.duration+' min')}
      ${row('Observações',a.summary||'Sem observações')}${a.return_on?row('Retorno sugerido',a.return_on):''}
      ${link(careHref(ref),'Abrir manual de cuidados','button outline','book')}</section>
      <section class="panel"><h2>Produtos realmente usados</h2>${productLines(a.used)}<h2 class="section-gap">Recomendações para manutenção</h2>${productLines(a.recommended)}</section></div>
    ${media.length?`<section class="section-gap"><h2>Fotos privadas</h2><div class="gallery-grid">${media.map(m=>`<figure>${img('/api/foto/'+m.id,m.kind)}<figcaption>${esc(m.kind)}</figcaption></figure>`).join('')}</div></section>`:''}
    ${state.data.catalog.info.reviews?`<section class="panel section-gap"><h2>Avaliar atendimento</h2>${form('review',hidden('id',ref)+
      select('Nota','rating',[[5,'5 — excelente'],[4,'4'],[3,'3'],[2,'2'],[1,'1']],review?.rating??5)+textarea('Comentário','comment',review?.comment??'','maxlength="700"')+
      check('Autorizo publicar o comentário após moderação.','publishOk',Boolean(review?.publish_ok))+button('Salvar avaliação'))}</section>`:''}`;
}
function journeyView(ref,detail,care=false) {
  if(ref) return treatmentView(ref,detail,care);
  const service=q('servico'),from=q('de'),to=q('ate');
  const values=data().journey.filter(j=>(!service||j.service_id===service)&&(!from||dateKey(j.finished)>=from)&&(!to||dateKey(j.finished)<=to));
  const known=[...new Map(data().journey.map(j=>[j.service_id,j.service_name]))];
  const next=activeBookings()[0];
  return `${pageHead(care?'NORDEN Care':'Sua evolução, em cada detalhe.',care?'Manuais de cuidados vinculados a cada atendimento.':'Acompanhe o que foi feito, os produtos utilizados e como manter seu resultado.',link('/app/agendar','Novo atendimento','button primary','calendar'),care?'CUIDADO CONTÍNUO':'NORDEN JOURNEY')}
    ${!care?`<section class="journey-overview" aria-label="Resumo da sua jornada"><div><span class="eyebrow">SEU HISTÓRICO DIGITAL</span><strong>${data().journey.length} ${data().journey.length===1?'atendimento registrado':'atendimentos registrados'}</strong><p>Do salão à sua rotina. Tudo conectado.</p></div><div class="journey-next">${icon('calendar',25)}<div><span>PRÓXIMO ENCONTRO</span><p>${next?esc(next.service_name)+' · '+esc(when(next.starts)):'Seu próximo capítulo começa com um horário.'}</p>${link(next?bookingHref(next.id):'/app/agendar',next?'Ver agendamento':'Consultar agenda','text-button')}</div></div></section>
    <div class="journey-legend"><span>${icon('check',16)} Atendimento concluído</span><span>${icon('bag',16)} Produtos da sua sessão</span><span>${icon('book',16)} Cuidados em casa</span></div>`:''}
    ${form('urlFilter',`<div class="filters">${select('Serviço','servico',[['','Todos'],...known],service)}${field('De','de',from,'date')}${field('Até','ate',to,'date')}${button('Filtrar','button outline')}</div>`)}
    ${values.length?`<ol class="timeline journey-timeline">${values.map(j=>`<li><article class="journey-session"><header class="journey-session-head"><time datetime="${new Date(j.finished).toISOString()}">${icon('calendar',16)} ${date(j.finished)}</time><span class="status concluido">${icon('check',14)} Concluído</span></header>
      <h2>${esc(j.procedure)}</h2><p class="session-professional">${esc(j.professional_name)} · ${j.duration} min · ${esc(j.service_name)}</p>
      ${j.summary?`<p class="session-summary">${esc(j.summary)}</p>`:''}
      ${care?link(careHref(j.id),'Abrir manual de cuidados','button outline','book'):`<div class="session-products"><section><h3>${icon('scissors',17)} Usados no atendimento</h3><p class="hint">O que seu profissional aplicou na sessão.</p>${productLines(j.used??[])}</section><section><h3>${icon('bag',17)} Para sua rotina em casa</h3><p class="hint">Recomendações para manter o resultado.</p>${productLines(j.recommended??[])}</section></div>
      <footer class="session-footer"><p>${icon('clock',17)} <span>Retorno sugerido<br><strong>${esc(j.return_on||'Combine com seu profissional')}</strong></span></p><div class="actions">${link(journeyHref(j.id),'Ficha do atendimento','button outline')}${link(careHref(j.id),'Meu manual Care','button primary','book')}</div></footer>`}</article></li>`).join('')}</ol>`:
      empty('Nenhum atendimento nesta visão','Procedimentos concluídos aparecem aqui.',link('/app/agendar','Agendar horário','button'))}`;
}
export const addressInputs=(a={})=>pair(field('CEP','zip',a.zip??'','text','inputmode="numeric" maxlength="10"'),
  field('Rua','street',a.street??'','','maxlength="150"'),field('Número','number',a.number??'','','maxlength="20"'),field('Complemento','extra',a.extra??'','','maxlength="120"'),
  field('Bairro','district',a.district??''),field('Cidade','city',a.city??''),field('UF','state',a.state??'','','maxlength="2"'));
function profile() {
  const {user,safety,addresses,privacy}=data();
  return `${pageHead('Meu perfil','Atualize suas preferências e gerencie os dados da sua conta.')}
    <div class="split"><section class="panel"><h2>Dados e preferências</h2>${form('profile',pair(field('Nome','name',user.name,'text','required'),
      field('Telefone','phone',user.phone,'tel','required'),field('Nascimento opcional','birth',user.birth,'date'),field('E-mail','email',user.email,'email','readonly'))+
      textarea('Preferências de estilo e cuidados','preference',user.preference,'maxlength="900"')+
      check('Quero receber ofertas de antecipação de horário.','moveOk',Boolean(user.move_ok))+
      check('Autorizo fotos privadas para meu histórico quando eu confirmar com a equipe.','photoOk',Boolean(user.photo_ok))+button('Salvar perfil'))}
      ${user.verified?banner('E-mail verificado.'):state.data.accountEmailEnabled?form('resend',notice('E-mail ainda não verificado.')+button('Enviar link de verificação','button outline')):''}</section>
    <section class="panel"><h2>Alergias e sensibilidades</h2>${form('safety',
      select('Tem alergias ou sensibilidades conhecidas?','status',[['','Selecione'],['sim','Sim'],['não','Não'],['não sei','Não sei'],['informar ao profissional','Prefiro informar ao profissional']],safety?.status??'')+
      textarea('Substâncias ou produtos conhecidos, se marcou Sim','details',safety?.details??'','maxlength="420"')+
      textarea('Outros cuidados relevantes','care',safety?.care??'','maxlength="420"')+
      check('Autorizo o armazenamento e acesso pela equipe responsável durante o atendimento.','consent',Boolean(safety),'required')+
      notice('Informe apenas o necessário para o atendimento. Leia a política de privacidade.')+button('Salvar alertas'))}
      ${safety?form('withdrawSafety',check('Confirmo a retirada do consentimento e dos alertas salvos.','confirm',false,'required')+button('Retirar consentimento','button outline')):''}
      ${link('/privacidade','Política de privacidade','text-button')}</section>
    <section class="panel"><h2>Endereços salvos</h2>${lines(addresses,a=>`<details class="disclosure"><summary>${esc(a.label)}</summary>
      ${form('address',hidden('id',a.id)+field('Identificação','label',a.label)+addressInputs(a)+button('Salvar alterações'))}
      ${form('addressRemove',hidden('id',a.id)+check('Confirmo a remoção.','confirm',false,'required')+button('Remover endereço','button outline'))}</details>`,notice('Nenhum endereço cadastrado.'))}
      <details class="disclosure"><summary>Adicionar endereço</summary>${form('address',field('Identificação','label','','text','required')+addressInputs()+button('Salvar endereço'))}</details></section>
    <section class="panel"><h2>Solicitações de privacidade</h2>${form('privacy',select('Tipo','kind',[['acesso','Acesso'],['correção','Correção'],['exclusão','Exclusão']])+
      textarea('Mensagem opcional','message','','maxlength="420"')+button('Enviar solicitação'))}
      ${lines(privacy,p=>row(p.kind,date(p.created),status(p.state)))}</section></div>`;
}
function notifications() {
  const records=data().notifications;
  return `${pageHead('Notificações','Atualizações de horários, cuidados e pedidos.',records.some(n=>!n.read_at)?
    form('readNotifications',button('Marcar todas como lidas','button outline')):'')}
    ${lines(records,n=>`<article class="line notification ${n.read_at?'':'unread'}"><div class="line-main"><a data-notification="${esc(n.id)}" class="line-title" href="${esc(n.href)}">${esc(n.title)}</a><p>${when(n.created)} · ${n.read_at?'Lida':'Nova'}</p></div>
    ${!n.read_at?form('readNotifications',hidden('id',n.id)+button('Marcar como lida','button small outline')):''}</article>`,empty('Nenhuma notificação'))}`;
}
export function cartView() {
  const signed=data().user?.role==='cliente';
  const items=signed?data().cart.items:Object.entries(guestCart()).map(([id,quantity])=>{
    const p=find('products',id);return p?{...p,quantity,unitPrice:p.promo??p.price}:{id,quantity,name:'Produto indisponível',unitPrice:0,available:0};
  });
  const subtotal=items.reduce((sum,x)=>sum+x.quantity*x.unitPrice,0);
  return `${pageHead('Carrinho','Revise seus produtos antes de finalizar.',link('/loja','Continuar comprando','button outline'))}
    ${items.length?`<div class="booking-layout"><section class="panel cart-list">${items.map(p=>`<article class="cart-row">${img(p.image,p.name)}
    <div><a class="line-title" href="/loja/${esc(p.id)}">${esc(p.name)}</a><p>${money(p.unitPrice)} por unidade${(!p.active||p.available<p.quantity)?' · quantidade indisponível':''}</p>
    ${form('cartItem',hidden('productId',p.id)+`<div class="actions">${field('Quantidade','quantity',p.quantity,'number','min="1" max="99"')} ${button('Atualizar','button outline small')}</div>`)}
    ${form('cartItem',hidden('productId',p.id)+hidden('quantity',0)+button('Remover','text-button'))}</div><strong>${money(p.unitPrice*p.quantity)}</strong></article>`).join('')}</section>
    <aside class="panel"><h2>Resumo</h2>${row('Subtotal','',money(subtotal))}<p>A taxa de entrega é calculada no checkout.</p>
    ${link('/app/checkout','Ir para checkout','button primary')}</aside></div>`:empty('Seu carrinho está vazio','Explore a loja para adicionar seus produtos.',link('/loja','Ir para a loja','button primary'))}`;
}
function rowsForQuote(quote) {
  return `<div class="quote-items" aria-label="Itens confirmados na cotação">${quote.items.map(item=>
    row(item.name,item.quantity+' × '+money(item.price),money(item.quantity*item.price))).join('')}</div>`;
}
function checkout() {
  const {user,cart,addresses,catalog}=data();
  if(!cart.items.length) return empty('Seu carrinho está vazio','',link('/loja','Ir para a loja','button primary'));
  const d=state.checkout??{mode:'retirada',name:user.name,phone:user.phone},quote=state.quote;
  const pickup=catalog.info.pickup;
  const discount=quote?.items.reduce((sum,item)=>sum+item.quantity*item.discount,0)??0;
  return `${pageHead('Finalizar pedido','Revise o recebimento e o valor antes de confirmar.',link('/app/carrinho','Voltar ao carrinho','button outline'))}
    <div class="booking-layout"><section class="panel"><h2>Dados de recebimento</h2>
      ${form('quote',pair(field('Destinatário','name',d.name,'text','required'),field('Telefone','phone',d.phone,'tel','required'))+
      select('Modalidade','mode',[['retirada','Retirada'],['entrega','Entrega']],d.mode,'data-watch="checkout"')+
      (d.mode==='entrega'?select('Endereço','addressId',[['','Novo endereço'],...addresses.map(a=>[a.id,a.label])],d.addressId??'','data-watch="checkout"')+
        (d.addressId?'':addressInputs(d.address))+field('Distância estimada (km)','distance',d.distance??'','number','step="0.01" min="0.01" required')+
        notice('Informe a distância aproximada. Cobertura estimada de até '+catalog.info.deliveryMax+' km.'):`<p>${esc(pickup)}</p>`)+button('Calcular e revisar'))}
      </section><aside class="panel quote-pane"><h2>Resumo do pedido</h2>${row('Subtotal dos produtos','',money(quote?.subtotal??cart.subtotal))}
        ${discount?row('Desconto incluído no subtotal','',money(discount)):''}
        ${row(quote?.rules.estimated?'Taxa estimada':'Taxa',quote?.rules.estimated?quote.rules.distance+' km informados por você':quote?'Retirada':'A calcular',quote?money(quote.fee):'—')}
        ${quote?.rules.estimated?notice('A taxa e a cobertura dependem da distância informada. A equipe confirma a entrega e o valor com você antes do pagamento presencial.'):''}
        ${quote?rowsForQuote(quote):''}${row('Total','',quote?money(quote.total):'—')}${banner(catalog.info.payment==='simulado'?'Pagamento simulado. Nenhuma cobrança será realizada.':'Pagamento presencial. Nenhuma cobrança online.')}
        ${quote?form('checkout',check('Revisei modalidade, itens e total.','confirm',false,'required')+button('Confirmar pedido')):notice('Calcule o valor para liberar a confirmação.')}</aside></div>`;
}
export function orderView(order,adminActions='') {
  if(!order) return empty('Pedido indisponível','',link('/app/pedidos','Ver meus pedidos','button'));
  const o=order;
  const a=o.destination.address;
  return `${link(adminActions?'/gestao/pedidos':'/app/pedidos','Todos os pedidos','text-button')}
    ${pageHead('Pedido '+o.id.slice(0,8).toUpperCase(),when(o.created)+' · '+(o.mode==='entrega'?'Entrega':'Retirada'),status(o.status))}
    <div class="split"><section class="panel"><h2>Itens</h2>${o.items.map(p=>row(p.name,p.quantity+' × '+money(p.price),money(p.quantity*p.price))).join('')}
    ${row('Subtotal','',money(o.subtotal))}${row(o.quote.estimated?'Taxa estimada':'Taxa',o.quote.estimated?o.quote.distance+' km informados':'Retirada',money(o.fee))}
    ${row('Total',label(o.financial),money(o.total))}<h3>Recebimento</h3><p>${esc(o.destination.name)} · ${esc(o.destination.phone)}</p>
    <p>${a?esc([a.street,a.number,a.extra,a.district,a.city,a.state,a.zip].filter(Boolean).join(', ')):esc(o.destination.pickup)}</p>
    ${adminActions}</section><section class="panel"><h2>Histórico do pedido</h2>${eventList(o.events,'status')}</section></div>`;
}
function orderList() {return `${pageHead('Meus pedidos','Confira compras, modalidades e atualizações de status.',link('/loja','Ir para a loja','button outline','bag'))}
  ${lines(data().orders,orderLine,empty('Você ainda não tem pedidos','',link('/loja','Explorar NORDEN Store','button primary')))}`;}
export function clientPage(parts,detail) {
  const [,page,ref]=parts;
  const views={agendar:bookingWizard,agendamentos:()=>bookingList(ref,detail),realocacoes:offersView,jornada:()=>journeyView(ref,detail),cuidados:()=>journeyView(ref,detail,true),
    perfil:profile,notificacoes:notifications,carrinho:cartView,checkout,pedidos:()=>ref?orderView(detail):orderList()};
  return page?(views[page]?.()??empty('Página indisponível','',link('/app','Minha área','button'))):clientHome();
}
export { notifications,eventList };
