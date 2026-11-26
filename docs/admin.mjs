import {state,esc,icon,img,link,button,eyebrow,form,field,hidden,textarea,select,check,multi,pair,pageHead,sectionHead,empty,row,notice,
  publicItems,find,money,date,clock,when,status,lines,q,banner,titleOptions,addDays,dateKey,label} from './ui.mjs';
import {eventList,notifications,orderView,manualSections} from './client.mjs';

const data=()=>state.data;
const manager=()=>data().user.role==='gestor';
const bookingHref=id=>'/gestao/atendimentos/'+id;
const orderHref=id=>'/gestao/pedidos/'+id;
const bookLine=b=>row(b.service_name,' '+clock(b.starts)+' · '+b.client_name+' · '+b.professional_name+' · '+b.duration+' min'+(b.padding?' + '+b.padding+' min de intervalo':''),status(b.status),bookingHref(b.id));
const staffHead=(title,description,actions='')=>pageHead(title,description,actions,manager()?'GESTÃO NORDEN':'ÁREA PROFISSIONAL');
const states=['CONFIRMADO','EM_ATENDIMENTO','CONCLUIDO','CANCELADO','NAO_COMPARECEU'];
const stateOpts=(items,all='Todas')=>[['',all],...items.map(s=>[s,label(s)])];
const proName=id=>find('professionals',id)?.name||'Profissional';
const serviceName=id=>find('services',id)?.name||'Serviço';
const startParams=(key,value)=>new URLSearchParams(value?[ [key,value] ]:[]).toString();
const entityLinks=(rows,key,name,caption)=>lines(rows,item=>row(item.name,caption(item),item.active?status('ATIVO'):status('INATIVO'),'/gestao/'+key+'/'+item.id),empty('Nenhum '+name+' cadastrado'));
function dashboard() {
  const {user,bookings,flow,orders=[],catalog,today}=data();
  const start=q('de',today),end=q('ate',addDays(today,7)),prof=q('profissional');
  const set=bookings.filter(b=>dateKey(b.starts)>=start&&dateKey(b.starts)<=end&&(!prof||b.professional_id===prof));
  const orderPeriod=orders.filter(o=>dateKey(o.created)>=start&&dateKey(o.created)<=end);
  const windows=flow.windows.filter(w=>dateKey(w.starts)>=start&&dateKey(w.starts)<=end&&(!prof||set.some(b=>b.id===w.id&&b.professional_id===prof)));
  const upcoming=set.filter(b=>b.status==='CONFIRMADO'&&b.starts>Date.now()).sort((a,b)=>a.starts-b.starts);
  const agendaBase={data:start,visao:'semana',profissional:prof,de:start,ate:end};
  const agenda=status=>'/gestao/agenda?'+new URLSearchParams({...agendaBase,status});
  const metrics=[
    ['calendar','Confirmados',set.filter(b=>b.status==='CONFIRMADO').length,agenda('CONFIRMADO')],
    ['scissors','Concluídos',set.filter(b=>b.status==='CONCLUIDO').length,agenda('CONCLUIDO')],
    ['flow','Encaixes sugeridos',windows.reduce((n,w)=>n+w.candidates.length,0),'/gestao/flow?'+new URLSearchParams({de:start,ate:end})],
    ['clock','Cancelamentos',set.filter(b=>b.status==='CANCELADO').length,agenda('CANCELADO')]
  ];
  if(manager()) metrics.push(['bag','Pedidos em preparação',orderPeriod.filter(o=>o.status==='EM_PREPARACAO').length,'/gestao/pedidos?'+new URLSearchParams({status:'EM_PREPARACAO',de:start,ate:end})],
    ['bag','Prontos para retirada',orderPeriod.filter(o=>o.status==='PRONTO_RETIRADA').length,'/gestao/pedidos?'+new URLSearchParams({status:'PRONTO_RETIRADA',de:start,ate:end})],
    ['grid','Estoque baixo',catalog.products.filter(p=>p.active&&p.available<=p.threshold).length,'/gestao/estoque?baixo=1']);
  return `${staffHead('Visão geral','Olá, '+user.name.split(' ')[0]+'. Acompanhe a operação deste ambiente de demonstração.',link('/gestao/agenda','Abrir agenda','button primary','calendar'))}
  ${form('urlFilter',`<div class="filters">${field('Início','de',start,'date')}${field('Fim','ate',end,'date')}
  ${manager()?select('Profissional','profissional',[['','Todos'],...catalog.professionals.map(p=>[p.id,p.name])],prof):''}${button('Aplicar','button outline')}</div>`)}
  <div class="metrics">${metrics.map(([glyph,title,count,href])=>`<a href="${esc(href)}">${icon(glyph)}<strong>${count}</strong><span>${title}</span></a>`).join('')}</div>
  <div class="split section-gap"><section class="panel">${sectionHead('Próximos atendimentos',link(agenda('CONFIRMADO'),'Agenda','text-button'))}
    ${lines(upcoming.slice(0,6),bookLine,empty('Nenhum atendimento no período'))}</section>
  <section class="panel">${sectionHead('Disponibilidade',link('/gestao/agenda#disponibilidade','Consultar horários','text-button'))}
    ${lines(windows.slice(0,6),w=>row(w.professional,when(w.starts)+' até '+clock(w.ends),link('/gestao/flow','Ver opções','text-button')),empty('Nenhuma janela liberada por cancelamento'))}
    ${manager()?banner('Os pedidos simulados ficam registrados para avaliação e não compõem receita.'):''}</section></div>`;
}
function availabilityForm(manual=false) {
  const professionals=publicItems('professionals').filter(p=>manager()||p.id===data().user.professionalId);
  const services=publicItems('services');
  const ready=state.adminSlots?.type===(manual?'manual':'consulta')?state.adminSlots:null;
  const names=titleOptions(manual?data().clients:[]);
  return form(manual?'manualBook':'availabilityAdmin',
    (manual?select('Cliente','clientId',names,ready?.fields.clientId,'required'):'')+
    pair(select('Serviço','serviceId',titleOptions(services),ready?.fields.serviceId,'required'),
      select('Profissional','professionalId',titleOptions(professionals),ready?.fields.professionalId,'required'),
      field('Data','date',ready?.fields.date??addDays(data().today,1),'date','required min="'+data().today+'" data-watch="adminDate"'))+
    `<div class="actions">${button('Consultar horários','button outline','type="submit" name="phase" value="consultar"')}</div>`+
    (ready?ready.slots.length?select('Horários · Brasília','clock',ready.slots.map(s=>[s.clock,s.clock]),'')+
      (manual?hidden('price',ready.price)+button('Confirmar reserva','button primary','name="phase" value="confirmar"'):''):
      banner('Sem horários livres para essa combinação.'):notice('Escolha um serviço, um profissional e uma data.')));
}
function agenda() {
  const {today,bookings,catalog,blocks=[]}=data();
  const base=q('data',today),view=q('visao','dia'),professional=q('profissional'),state=q('status');
  const from=q('de'),to=q('ate');
  const start=from||(view==='mes'?base.slice(0,7)+'-01':base);
  const finish=to||(view==='mes'?new Date(Date.UTC(Number(base.slice(0,4)),Number(base.slice(5,7)),0)).toISOString().slice(0,10):addDays(base,view==='semana'?6:0));
  const used=bookings.filter(b=>dateKey(b.starts)>=start&&dateKey(b.starts)<=finish&&(!professional||b.professional_id===professional)&&(!state||b.status===state))
    .sort((a,b)=>a.starts-b.starts);
  const groups=[...new Map(used.map(b=>[dateKey(b.starts),date(b.starts,{day:'numeric',month:'long',weekday:'long'})]))];
  return `${staffHead('Agenda','Consulte atendimentos, disponibilidade e bloqueios do salão.')}
    ${form('urlFilter',`<div class="filters">${field('Data de referência','data',base,'date','required')}
      ${select('Visualização','visao',[['dia','Dia'],['semana','Semana'],['mes','Mês']],view)}
      ${manager()?select('Profissional','profissional',[['','Todos'],...catalog.professionals.map(p=>[p.id,p.name])],professional):''}
      ${select('Situação','status',stateOpts(states),state)}${button('Aplicar filtros','button outline')}</div>`)}
    <div class="section-gap">${lines(groups,([day,title])=>`<section class="agenda-group"><h2>${esc(title)}</h2>
      ${view==='mes'?row(used.filter(b=>dateKey(b.starts)===day).length+' atendimento(s)','',link('/gestao/agenda?data='+day+'&profissional='+encodeURIComponent(professional),'Ver dia','text-button')):
        used.filter(b=>dateKey(b.starts)===day).map(bookLine).join('')}</section>`,empty('Sem reservas neste período','Use outra data ou ajuste os filtros.'))}</div>
    <div class="split section-gap"><section class="panel" id="disponibilidade"><h2>Novo agendamento manual</h2>${availabilityForm(true)}</section>
    ${manager()?`<section class="panel"><h2>Bloqueios e folgas</h2>${form('block',select('Profissional','professionalId',titleOptions(catalog.professionals),'','required')+
      pair(field('Início','startDate',base,'date','required'),field('Hora de início','startClock','09:00','time','required'),
      field('Fim','endDate',base,'date','required'),field('Hora de fim','endClock','19:00','time','required'))+
      field('Motivo','reason','','text','required')+button('Criar bloqueio'))}
      ${lines(blocks,b=>row(proName(b.professional_id),when(b.starts)+' a '+when(b.ends)+' · '+b.reason,
        form('unblock',hidden('professionalId',b.professional_id)+hidden('remove',b.id)+button('Remover','button small outline','data-confirm="Remover este bloqueio?"'))))}</section>`:
      `<section class="panel"><h2>Horários livres</h2>${availabilityForm()}</section>`}</div>`;
}
function flow() {
  const from=q('de'),end=q('ate');
  const windows=data().flow.windows.filter(w=>(!from||dateKey(w.starts)>=from)&&(!end||dateKey(w.starts)<=end));
  return `${staffHead('NORDEN Flow','Aproveite janelas abertas por cancelamentos com o aceite do cliente.')}
  ${form('urlFilter',`<div class="filters">${field('De','de',from,'date')}${field('Até','ate',end,'date')}${button('Filtrar','button outline')}</div>`)}
  <div class="section-gap">${lines(windows,w=>`<section class="panel offer">${sectionHead(when(w.starts)+'–'+clock(w.ends),'',w.professional+' · '+Math.round((w.ends-w.starts)/60000)+' min liberados')}
    ${lines(w.candidates,c=>row(c.client_name+' · '+c.service_name,when(c.starts)+' para '+when(w.starts)+' · '+c.duration+' min. '+c.reason,
      manager()?form('offer',hidden('vacancyId',w.id)+hidden('bookingId',c.id)+button('Oferecer horário','button primary small','data-confirm="Enviar oferta interna a este cliente?"')):''),
      empty('Sem candidatos compatíveis'))}</section>`,empty('Nenhuma janela liberada no período','Quando uma reserva futura for cancelada, o Flow calcula os encaixes compatíveis.'))}</div>
  <section class="section-gap"><h2>Ofertas enviadas</h2>${lines(data().flow.offers,o=>row((o.client_name||'Cliente')+' · '+o.service_name,
    when(o.original)+' para '+when(o.proposed)+' · Prazo '+when(o.expiry),status(o.status),bookingHref(o.booking_id)),empty('Nenhuma oferta enviada'))}</section>`;
}
function productEditor(kind,values) {
  const used=kind==='used',products=data().catalog.products;
  const choices=[['',used?'Item informado manualmente':'Selecione'],...products.map(p=>[p.id,p.name+(p.active?'':' · inativo')])];
  const item=(line={})=>`<div class="care-item">${select('Produto',kind+'Product',choices,line.productId??'')}
    ${used?field('Nome manual, se aplicável',kind+'Name',line.productId?'':line.name??'')+field('Quantidade e unidade',kind+'Amount',line.amount??''):''}
    ${field(used?'Observação':'Justificativa',kind+'Detail',line.detail??'')}
    ${button('Remover item','button small outline','type="button" data-command="removeCare"')}</div>`;
  return `<fieldset class="choice-list care-items" data-care-group="${kind}"><legend>${used?'Produtos utilizados':'Produtos recomendados'}</legend>
    <div data-care-rows>${values.map(item).join('')}</div><template>${item()}</template>
    ${button(used?'Adicionar produto utilizado':'Adicionar recomendação','button outline small','type="button" data-command="addCare"')}</fieldset>`;
}
const manualFields=(manual={sections:{}})=>field('Título do manual','title',manual.title??'','text','maxlength="110"')+
  textarea('Orientações','instructions',manual.sections.instructions??'','maxlength="2500"')+
  textarea('Primeiras horas','first',manual.sections.first??'','maxlength="1600"')+
  textarea('O que evitar','avoid',manual.sections.avoid??'','maxlength="1600"')+
  textarea('Manutenção','maintenance',manual.sections.maintenance??'','maxlength="1600"');
function treatment(ref,detail) {
  if(!detail) return empty('Atendimento indisponível','',link('/gestao/agenda','Voltar à agenda','button'));
  const {booking:b,treatment:a,template,profile,safety,media}=detail;
  const manual=a?.manual??{title:template?.title,sections:template?.sections??{},templateId:template?.id};
  const editable=b.status==='EM_ATENDIMENTO'||(b.status==='CONCLUIDO'&&manager());
  return `${link('/gestao/agenda','Voltar à agenda','text-button')}${staffHead(b.service_name,b.client_name+' · '+when(b.starts)+' · '+b.professional_name,status(b.status))}
    <div class="split"><section class="panel"><h2>Preparação</h2>${row('Preferência de estilo',profile.preference||'Não informada')}
    ${row('Produtos solicitados',b.preferences.map(p=>p.name).join(', ')||'Sem preferência')}
    ${row('Alergias e sensibilidades',safety?(safety.status+(safety.details?' · '+safety.details:'')):'Não informado')}${safety?.care?row('Outros cuidados',safety.care):''}
    ${b.status==='CONFIRMADO'?form('start',hidden('id',ref)+check('Revisei as preferências e alertas disponíveis.','acknowledged',false,'required')+button('Iniciar atendimento')):''}</section>
    <section class="panel"><h2>Eventos da reserva</h2>${eventList(detail.history,'type')}
    ${b.status==='CONFIRMADO'?`<details class="disclosure"><summary>Remarcar reserva</summary>${form('manualMove',hidden('id',ref)+pair(field('Nova data','date','','date','required'),
      field('Novo horário','clock','','time','required'))+check('Confirmei o novo horário com o cliente.','approved',false,'required')+button('Salvar remarcação'))}</details>
      <details class="disclosure"><summary>Cancelar ou registrar falta</summary>
        ${form('cancelBooking',hidden('id',ref)+field('Motivo opcional','reason')+button('Cancelar reserva','button outline','data-confirm="Cancelar este agendamento?"'))}
        ${b.starts<=Date.now()?form('noShow',hidden('id',ref)+button('Registrar não comparecimento','button outline','data-confirm="Registrar falta neste atendimento?"')):''}
      </details>`:''}</section></div>
    ${editable?`<section class="panel section-gap"><h2>${b.status==='CONCLUIDO'?'Corrigir registro':'Registro de atendimento'}</h2>
      ${form('treatment',hidden('id',ref)+hidden('templateId',manual.templateId??'')+field('Procedimento realizado','procedure',a?.procedure??b.service_name)+
      productEditor('used',a?.used??[])+check('Nenhum produto foi utilizado.','noneUsed',Boolean(a?.manual.reviewed&&!a?.used.length))+
      productEditor('recommended',a?.recommended??[])+textarea('Observações visíveis ao cliente','summary',a?.summary??'')+
      textarea('Notas internas','privateNote',a?.private_note??'')+field('Retorno sugerido','returnOn',a?.return_on??'')+
      '<h3>Manual NORDEN Care</h3>'+manualFields(manual)+
      `<div data-manual-preview></div>${button('Pré-visualizar manual','button outline','type="button" data-command="manualPreview"')}`+
      check('Revisei o conteúdo e aprovo sua publicação para o cliente.','reviewed',false)+
      (b.status==='CONCLUIDO'?textarea('Motivo da correção','reason','','required')+button('Publicar correção','button primary','name="phase" value="correct"'):
        `<div class="actions">${button('Salvar rascunho','button outline','name="phase" value="draft"')}${button('Concluir e publicar','button primary','name="phase" value="finalize"')}</div>`))}
      </section>`:a?`<section class="panel section-gap">${manualSections(a.manual)}</section>`:''}
    ${a?`<section class="panel section-gap"><h2>Fotos privadas</h2>
      ${lines(media,m=>`<div class="media-row">${img('/api/foto/'+m.id,m.kind)}<span>${esc(m.kind)}</span>${form('photoRemove',hidden('id',ref)+hidden('remove',m.id)+button('Excluir foto','button small outline','data-confirm="Excluir esta foto?"'))}</div>`,notice('Nenhuma foto anexada.'))}
      ${profile.photo_ok?form('photo',hidden('id',ref)+select('Tipo','kind',[['Antes','Antes'],['Depois','Depois']])+
        field('Foto','image','','file','accept="image/png,image/jpeg,image/webp" required')+check('O cliente autorizou esta foto especificamente.','authorized',false,'required')+button('Adicionar foto')):
        banner('O cliente precisa habilitar autorização de fotos privadas no perfil.')}</section>`:''}`;
}
function clients(ref) {
  const search=q('q').toLocaleLowerCase('pt-BR'),clients=data().clients;
  if(ref) {
    const c=clients.find(x=>x.id===ref);
    if(!c) return empty('Ficha indisponível');
    return `${link('/gestao/clientes','Todos os clientes','text-button')}${staffHead(c.name,c.email??c.phone)}
    <div class="split"><section class="panel"><h2>Ficha</h2>${row('Contato',c.phone)}${c.preference?row('Preferências',c.preference):''}
    ${notice('Alertas de saúde ficam disponíveis somente no atendimento autorizado.')}</section>
    <section class="panel"><h2>Atendimentos e reservas</h2>${lines(data().bookings.filter(b=>b.client_id===ref),bookLine,empty('Sem atendimentos'))}</section></div>`;
  }
  return `${staffHead('Clientes','Consulte fichas essenciais e reservas autorizadas.')}
    ${form('urlFilter',`<div class="filters">${field('Buscar','q',q('q'),'search','placeholder="Nome, e-mail ou telefone"')}${button('Buscar','button outline')}</div>`)}
    ${lines(clients.filter(c=>(c.name+' '+(c.email??'')+' '+c.phone).toLocaleLowerCase('pt-BR').includes(search)),c=>row(c.name,c.email??c.phone,'','/gestao/clientes/'+c.id),empty('Nenhum cliente encontrado'))}`;
}
const basic=(entity,row)=>field('Nome','name',row.name??'','text','required maxlength="90"')+
  (entity==='profissional'?'':field('Categoria','category',row.category??'','text','required maxlength="60"'))+
  textarea(entity==='profissional'?'Apresentação':'Descrição','description',row.description??'','required')+
  check('Ativo no catálogo','active',row.active!==0);
const amount=(title,key,value='',min=0)=>field(title,key,value,'number',`min="${min}" step="1" ${key==='promo'?'':'required'}`);
const linksFor=(entity,ref)=>data().catalog.compatibility.filter(x=>x[entity+'_id']===ref).map(x=>x[entity==='service'?'professional_id':'service_id']);
const goodsFor=ref=>data().catalog.serviceProducts.filter(x=>x.service_id===ref).map(x=>x.product_id);
const servicesFor=ref=>data().catalog.serviceProducts.filter(x=>x.product_id===ref).map(x=>x.service_id);
const asChoices=items=>items.map(x=>[x.id,x.name+(x.active?'':' · inativo')]);
function catalogPage(type,ref) {
  const map={servicos:['services','service','Serviços','serviço'],profissionais:['professionals','professional','Profissionais','profissional'],
    produtos:['products','product','Produtos','produto']};
  const [table,action,title,name]=map[type];
  const items=data().catalog[table];
  if(!ref) return `${staffHead(title,'Gerencie os registros, vínculos e visibilidade do catálogo.',link('/gestao/'+type+'/novo','Adicionar '+name,'button primary','plus'))}
    ${entityLinks(items,type,name,x=>table==='services'?x.duration+' min · '+money(x.price):table==='products'?x.sku+' · '+x.category+' · '+money(x.promo??x.price):x.specialty)}`;
  const item=ref==='novo'?{}:find(table,ref);
  if(!item) return empty('Registro indisponível');
  let fields=basic(table==='professionals'?'profissional':name,item);
  if(table==='services') fields+=pair(amount('Preço em centavos','price',item.price),amount('Duração em minutos','duration',item.duration??45,15),
    amount('Intervalo técnico em minutos','padding',item.padding??0))+textarea('Orientações iniciais','instructions',item.instructions??'')+
    multi('Profissionais habilitados','professionals',asChoices(data().catalog.professionals),linksFor('service',ref))+
    multi('Produtos compatíveis','products',asChoices(data().catalog.products),goodsFor(ref));
  if(table==='professionals') fields+=field('Especialidades','specialty',item.specialty??'','text','required')+
    field('Imagem autorizada (URL HTTPS ou /assets)','image',item.image??'')+multi('Serviços habilitados','services',asChoices(data().catalog.services),linksFor('professional',ref));
  if(table==='products') fields+=pair(field('SKU','sku',item.sku??'','text','required'),field('Marca','brand',item.brand??'NORDEN','text','required'),
    amount('Preço em centavos','price',item.price),amount('Preço promocional em centavos','promo',item.promo??''),
    field('Tamanho ou unidade','size',item.size??''),amount('Alerta de estoque baixo','threshold',item.threshold??3))+
    field('Imagem (URL HTTPS ou /assets)','image',item.image??'')+textarea('Ingredientes','ingredients',item.ingredients??'')+
    textarea('Modo de uso','usage',item.usage??'')+textarea('Alertas','warnings',item.warnings??'')+
    multi('Compatível com os serviços','services',asChoices(data().catalog.services),servicesFor(ref));
  return `${link('/gestao/'+type,'Voltar para '+title.toLowerCase(),'text-button')}${staffHead(item.name??'Novo '+name,'Edite conteúdo, relações e disponibilidade.')}
    <div class="split"><section class="panel">${form(action,hidden('id',item.id??'')+fields+button('Salvar '+name))}</section>
    ${table==='professionals'&&item.id?hoursForm(item):table==='services'&&item.id?`<aside class="panel"><h2>Manual vinculado</h2>
      ${lines(data().templates.filter(t=>t.service_id===item.id&&t.active),t=>row(t.title,'Versão '+t.version,'','/gestao/manuais/'+t.id),empty('Nenhum modelo ativo'))}
      ${link('/gestao/manuais/novo?servico='+item.id,'Criar versão de manual','button outline')}</aside>`:''}</div>`;
}
const weekdayNames=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
function hoursForm(p) {
  const hours=data().hours.filter(h=>h.professional_id===p.id);
  return `<aside class="panel"><h2>Disponibilidade semanal</h2>${form('hours',hidden('professionalId',p.id)+weekdayNames.map((name,i)=>{
    const entries=hours.filter(h=>h.day===i);
    return `<fieldset class="choice-list"><legend>${name}</legend>${pair(
      field('Início 1','start-'+i+'-0',entries[0]?.starts??'','time'),field('Fim 1','end-'+i+'-0',entries[0]?.ends??'','time'),
      field('Início 2','start-'+i+'-1',entries[1]?.starts??'','time'),field('Fim 2','end-'+i+'-1',entries[1]?.ends??'','time'),
      field('Início 3','start-'+i+'-2',entries[2]?.starts??'','time'),field('Fim 3','end-'+i+'-2',entries[2]?.ends??'','time'))}</fieldset>`;
  }).join('')+button('Salvar expediente'))}</aside>`;
}
function templates(ref) {
  if(!ref) return `${staffHead('Manuais de cuidados','Publique versões por serviço. O Journey mantém o manual revisado em cada atendimento.',
    link('/gestao/manuais/novo','Novo modelo','button primary','plus'))}${lines(data().templates,t=>row(t.title,serviceName(t.service_id)+' · Versão '+t.version,t.active?status('ATIVO'):status('INATIVO'),'/gestao/manuais/'+t.id),empty('Nenhum modelo cadastrado'))}`;
  const item=data().templates.find(t=>t.id===ref);
  if(ref!=='novo'&&!item) return empty('Manual indisponível');
  return `${link('/gestao/manuais','Todos os manuais','text-button')}${staffHead(item?.title??'Novo modelo','Salvar cria uma versão. As orientações já publicadas em atendimentos continuam preservadas.')}
    <section class="panel">${form('template',select('Serviço','serviceId',titleOptions(data().catalog.services),item?.service_id??q('servico'),'required')+
    manualFields(item??{sections:{}})+check('Usar como modelo ativo do serviço.','active',true)+
    `<div data-manual-preview></div>${button('Pré-visualizar','button outline','type="button" data-command="manualPreview"')}`+button('Salvar nova versão'))}</section>`;
}
function stock() {
  const isLow=q('baixo'),ref=q('produto');
  const products=data().catalog.products.filter(p=>(!isLow||(p.active&&p.available<=p.threshold))&&(!ref||p.id===ref));
  return `${staffHead('Estoque','Acompanhe saldos, reservas e movimentos auditados.')}
    ${form('urlFilter',`<div class="filters">${select('Produto','produto',[['','Todos'],...asChoices(data().catalog.products)],ref)}
      ${select('Disponibilidade','baixo',[['','Todas'],['1','Estoque baixo']],isLow)}${button('Filtrar','button outline')}</div>`)}
    <div class="split section-gap"><section class="panel"><h2>Saldos atuais</h2>${lines(products,p=>row(p.name,p.physical+' físico · '+p.reserved+' reservado',`<span>${p.available} disponíveis</span>`,'/gestao/estoque?produto='+p.id),empty('Nenhum item nesta visão'))}</section>
    <section class="panel"><h2>Movimentar estoque</h2>${form('inventory',select('Produto','productId',titleOptions(data().catalog.products),ref,'required')+
      select('Movimento','kind',[['ENTRADA','Entrada'],['AJUSTE','Ajuste de saldo'],['DEVOLUCAO','Devolução conferida']])+
      amount('Quantidade (ajuste pode ser negativo)','quantity','',-99999)+textarea('Motivo','reason','','required')+button('Registrar movimento'))}</section></div>
    <section class="section-gap"><h2>Movimentações recentes</h2>${lines(data().movements.filter(m=>!ref||m.product_id===ref),m=>row(m.product_name,when(m.at)+' · '+(m.actor_name??'Equipe')+' · '+m.reason,
      `<span>${esc(label(m.kind))} · ${m.quantity}</span>`),empty('Nenhuma movimentação registrada'))}</section>`;
}
function ordersView(ref,detail) {
  if(ref) {
    if(!detail) return empty('Pedido indisponível','',link('/gestao/pedidos','Todos os pedidos','button'));
    const states={RECEBIDO:['EM_PREPARACAO','CANCELADO'],EM_PREPARACAO:[detail.mode==='retirada'?'PRONTO_RETIRADA':'SAIU_ENTREGA','CANCELADO'],
      PRONTO_RETIRADA:['CONCLUIDO','CANCELADO'],SAIU_ENTREGA:['CONCLUIDO']}[detail.status]??[];
    return orderView(detail,`<div class="section-gap">${states.length?form('orderState',hidden('id',ref)+
      select('Próxima situação','state',states.map(s=>[s,label(s)]))+field('Motivo (obrigatório ao cancelar)','reason')+button('Atualizar pedido')):notice('Pedido em estado final.')}</div>`);
  }
  const statusQ=q('status'),mode=q('modo'),de=q('de'),ate=q('ate');
  const set=data().orders.filter(o=>(!statusQ||o.status===statusQ)&&(!mode||o.mode===mode)&&(!de||dateKey(o.created)>=de)&&(!ate||dateKey(o.created)<=ate));
  return `${staffHead('Pedidos','Acompanhe preparação, retirada e entrega a partir da mesma fila.')}
    ${form('urlFilter',`<div class="filters">${select('Situação','status',stateOpts(['RECEBIDO','EM_PREPARACAO','PRONTO_RETIRADA','SAIU_ENTREGA','CONCLUIDO','CANCELADO']),statusQ)}
    ${select('Modalidade','modo',[['','Todas'],['retirada','Retirada'],['entrega','Entrega']],mode)}
    ${field('De','de',de,'date')}${field('Até','ate',ate,'date')}${button('Filtrar','button outline')}</div>`)}
    ${lines(set,o=>row(o.client_name+' · '+o.id.slice(0,8).toUpperCase(),when(o.created)+' · '+o.mode+' · '+money(o.total)+' · '+label(o.financial),status(o.status),orderHref(o.id)),empty('Nenhum pedido nesta visão'))}`;
}
function content() {
  const {settings,catalog,reviews}=data();
  const galleryForm=item=>form('gallery',hidden('id',item.id??'')+field('Título','title',item.title??'','text','required')+
    field('Imagem (URL HTTPS ou /assets)','image',item.image??'','text','required')+
    check('Tenho autorização específica para publicação.','authorized',Boolean(item.authorized))+
    check('Exibir na galeria.','active',item.active!==0)+button('Salvar imagem'));
  return `${staffHead('Conteúdo público','Organize a galeria e modere avaliações autorizadas.',link('/gestao/configuracoes#conteudo','Editar textos e contato','button outline'))}
  <div class="split"><section class="panel"><h2>Galeria</h2>${lines(catalog.gallery,item=>`<details class="disclosure"><summary>${esc(item.title)}</summary>${galleryForm(item)}</details>`)}
    <details class="disclosure"><summary>Adicionar imagem</summary>${galleryForm({})}</details></section>
    <section class="panel"><h2>Avaliações</h2>
    ${!settings.reviews?banner('O módulo de avaliações está desativado nas configurações.'):''}
    ${lines(reviews,r=>`<article class="line"><div class="line-main"><h3>${esc(r.service_name)} · ${r.rating}/5</h3><p>${esc(r.comment)} · ${esc(label(r.moderation))}</p>
    ${form('moderate',hidden('id',r.booking_id)+select('Publicação','status',[['PUBLICADA','Publicar'],['REJEITADA','Rejeitar']],r.moderation)+button('Salvar moderação','button outline small'))}</div></article>`,
    empty('Nenhuma avaliação para moderar'))}</section></div>`;
}
function settings() {
  const {settings:s,catalog}=data();
  const nums=[['Antecedência para agendar (min)','leadMinutes'],['Horizonte da agenda (dias)','bookingDays'],['Prazo para cancelar (h)','cancellationHours'],
    ['Horizonte do Flow (dias)','flowDays'],['Validade da oferta (h)','offerHours'],['Tarifa por km (centavos)','deliveryRate'],
    ['Cobertura (km)','deliveryMax'],['Taxa base (centavos)','deliveryBase'],['Taxa mínima (centavos)','deliveryMinimum']];
  return `${staffHead('Configurações','Parâmetros operacionais e conteúdo da demonstração.')}
  <div class="split"><section class="panel" id="conteudo"><h2>Salão e regras</h2>${form('settings',textarea('Título da página inicial (duas linhas)','headline',s.headline,'required')+
    textarea('Apresentação','introduction',s.introduction,'required')+pair(field('Endereço','address',s.address),field('Contato','contact',s.contact),
    field('Horário ao público','hoursText',s.hoursText))+textarea('Instruções de retirada','pickup',s.pickup)+
    textarea('Perguntas frequentes (pergunta | resposta por linha)','faq',s.faq.map(x=>x.join(' | ')).join('\n'))+
    pair(...nums.map(([title,key])=>amount(title,key,s[key])))+
    select('Pagamento','payment',[['simulado','Simulado'],['presencial','Presencial']],s.payment)+
    check('Habilitar avaliações após atendimento.','reviews',s.reviews)+notice('Fuso da agenda: America/Sao_Paulo. Notificações internas estão ativas.')+button('Salvar configurações'))}</section>
    <aside class="panel"><h2>Convites de equipe</h2>${form('invite',field('E-mail','email','','email','required')+
      select('Papel','role',[['profissional','Profissional'],['gestor','Gestor']])+
      select('Profissional sem conta, quando aplicável','professionalId',titleOptions(catalog.professionals.filter(p=>!p.account_id)))+
      button('Gerar convite')+'<div data-invite-result aria-live="polite"></div>')}
    <h2 class="section-gap">Solicitações de privacidade</h2>${lines(data().privacy,p=>`<article class="line"><div class="line-main"><h3>${esc(p.client_name)} · ${esc(p.kind)}</h3>
    <p>${when(p.created)} · ${esc(p.message)}</p>${form('privacyState',hidden('id',p.id)+select('Solicitação','state',stateOpts(['ABERTA','EM_ANALISE','RESPONDIDA']).slice(1),p.state)+
    button('Atualizar solicitação','button small outline'))}</div></article>`,empty('Nenhuma solicitação'))}</aside></div>`;
}
function audits() {
  const search=q('q').toLocaleLowerCase('pt-BR');
  return `${staffHead('Auditoria','Acompanhe os eventos administrativos e o acesso a alertas em atendimentos.')}
    ${form('urlFilter',`<div class="filters">${field('Buscar evento','q',q('q'),'search')}${button('Buscar','button outline')}</div>`)}
    ${lines(data().audits.filter(a=>(a.action+' '+a.entity+' '+a.target+' '+(a.actor_name??'')).toLocaleLowerCase('pt-BR').includes(search)),a=>
      row(label(a.action),when(a.at)+' · '+(a.actor_name??'Sistema')+' · '+a.entity+' · '+a.target),empty('Nenhum evento encontrado'))}`;
}
export function adminPage(parts,detail) {
  const [,page,ref]=parts;
  const staffPages={agenda,flow,atendimentos:()=>treatment(ref,detail),clientes:()=>clients(ref),notificacoes:notifications};
  const adminPages={profissionais:()=>catalogPage(page,ref),servicos:()=>catalogPage(page,ref),produtos:()=>catalogPage(page,ref),
    estoque:stock,manuais:()=>templates(ref),pedidos:()=>ordersView(ref,detail),configuracoes:settings,conteudo:content,auditoria:audits};
  if(!page) return dashboard();
  if(staffPages[page]) return staffPages[page]();
  if(manager()&&adminPages[page]) return adminPages[page]();
  return empty('Área indisponível para este perfil','',link('/gestao','Voltar à gestão','button'));
}
