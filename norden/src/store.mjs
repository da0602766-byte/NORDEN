import { audit,encode,fail,hash,id,integer,notify,notifyManagers,now,parse,selection,str } from './core.mjs';
import { client,manager } from './identity.mjs';

const movement=async (db,product,kind,quantity,ref,actor,reason)=>await db.run('INSERT INTO movements VALUES(?,?,?,?,?,?,?,?)',id(),product,kind,quantity,ref,actor,reason,now());
const orderEvent=async (db,order,actor,status,reason='')=>await db.run('INSERT INTO order_events VALUES(?,?,?,?,?,?)',id(),order,actor,status,reason,now());
const priceOf=p=>p.promo ?? p.price;
const addressFields={zip:['CEP',10],street:['rua',150],number:['número',20],extra:['complemento',120],district:['bairro',90],city:['cidade',90],state:['UF',2]};
function address(body) {
  const result={};
  for(const [key,[label,max]] of Object.entries(addressFields)) result[key]=str(body?.[key],label,max,key==='extra'?0:1);
  if(!/^\d{5}-?\d{3}$/.test(result.zip)) fail('Informe um CEP com oito dígitos.');
  result.state=selection(result.state.toUpperCase(),['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'],'UF');
  return result;
}
export const addresses=async (db,user)=>(await db.all('SELECT * FROM addresses WHERE client_id=? ORDER BY rowid',user.id)).map(({values_json,...item})=>({...item,...parse(values_json)}));
export async function cart(db,user) {
  client(user);
  const items=(await db.all(`SELECT p.id,p.name,p.price,p.promo,p.image,p.size,p.active,p.physical-p.reserved AS available,c.quantity
    FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.client_id=? ORDER BY c.rowid`,user.id)).map(p=>({...p,unitPrice:priceOf(p)}));
  return {items,subtotal:items.reduce((sum,item)=>sum+item.unitPrice*item.quantity,0)};
}
async function orderRows(db,user) {
  if(user.role==='gestor') return await db.all('SELECT o.*,a.name AS client_name FROM orders o JOIN accounts a ON a.id=o.client_id ORDER BY o.created DESC LIMIT 400');
  client(user);
  return await db.all('SELECT * FROM orders WHERE client_id=? ORDER BY created DESC LIMIT 300',user.id);
}
function publicOrder(row) {
  const {request_key,...safe}=row;
  return {...safe,destination:parse(row.destination),quote:parse(row.quote)};
}
export const orders=async (db,user)=>(await orderRows(db,user)).map(publicOrder);
export async function orderDetails(db,orderId,user) {
  if(!user) fail('Acesse sua conta.',401);
  const order=await db.get('SELECT * FROM orders WHERE id=?',orderId ?? '');
  if(!order||(user.role!=='gestor' && (user.role!=='cliente'||user.id!==order.client_id))) fail('Pedido indisponível.',404);
  return {...publicOrder(order),items:await db.all('SELECT * FROM order_items WHERE order_id=? ORDER BY rowid',order.id),
    events:await db.all('SELECT status,reason,at FROM order_events WHERE order_id=? ORDER BY at,rowid',order.id)};
}
async function low(db,product,ref) {
  const p=await db.get('SELECT name,active,physical-reserved AS available,threshold FROM products WHERE id=?',product);
  if(p.active && p.available<=p.threshold) await notifyManagers(db,'Estoque baixo: '+p.name,'/gestao/estoque','stock:low:'+ref+':'+product);
}
export async function deliveryQuote(db,body,user,{production=false}={}) {
  client(user);
  const {items,subtotal}=await cart(db,user);
  if(items.length===0) fail('Seu carrinho está vazio.',409);
  for(const p of items) if(!p.active || p.available<p.quantity) fail('Confira a disponibilidade de '+p.name+'.',409);
  const mode=selection(body.mode,['retirada','entrega'],'recebimento');
  const settings=await db.settings();
  const destination={name:str(body.name,'destinatário',100,3),phone:str(body.phone,'telefone',24,8)};
  let fee=0;
  const rules={distance:0,rate:0,max:0,base:0,minimum:0,estimated:false};
  if(mode==='retirada') destination.pickup=settings.pickup;
  if(mode==='entrega') {
    if(body.addressId) {
      const stored=await db.get('SELECT values_json FROM addresses WHERE id=? AND client_id=?',body.addressId,user.id);
      if(!stored) fail('Endereço indisponível.',404);
      destination.address=parse(stored.values_json);
    } else destination.address=address(body.address);
    const text=String(body.distance??'').trim();
    const distance=Number(text.replace(',','.'));
    if(!/^\d+(?:[,.]\d{1,2})?$/.test(text)||!Number.isFinite(distance)||distance<=0) fail('Informe a distância estimada em quilômetros, com até duas casas decimais.');
    if(distance>settings.deliveryMax) fail('Endereço fora da cobertura de '+settings.deliveryMax+' km. A retirada está disponível.',409);
    Object.assign(rules,{distance,rate:settings.deliveryRate,max:settings.deliveryMax,base:settings.deliveryBase,
      minimum:settings.deliveryMinimum,estimated:true});
    fee=Math.max(rules.minimum,rules.base+Math.round(Math.round(distance*100)*rules.rate/100));
  }
  const snapshot={mode,destination,rules,subtotal,fee,total:subtotal+fee,payment:production?'presencial':settings.payment,
    items:items.map(p=>({id:p.id,name:p.name,quantity:p.quantity,price:p.unitPrice,discount:p.price-p.unitPrice}))};
  return {...snapshot,key:hash(encode(snapshot))};
}
const validTransitions = {
  RECEBIDO:['EM_PREPARACAO','CANCELADO'],EM_PREPARACAO:['PRONTO_RETIRADA','SAIU_ENTREGA','CANCELADO'],
  PRONTO_RETIRADA:['CONCLUIDO','CANCELADO'],SAIU_ENTREGA:['CONCLUIDO'],CONCLUIDO:[],CANCELADO:[]
};
export const storeActions = {
  async cartItem(db,body,user) {
    client(user);
    return await db.tx(async ()=>{
      const productId=str(body.productId,'produto',80,1);
      const p=await db.get('SELECT * FROM products WHERE id=?',productId);
      if(!p) fail('Produto indisponível.',404);
      const delta=body.delta!==undefined ? integer(body.delta,'quantidade',1,99) : 0;
      const transfer=body.transferQuantity!==undefined;
      const current=(delta||transfer)?(await db.get('SELECT quantity FROM cart_items WHERE client_id=? AND product_id=?',user.id,productId))?.quantity??0:0;
      const quantity=transfer?integer(body.transferQuantity,'quantidade',1,99):
        delta?integer(current+delta,'quantidade',0,99):integer(body.quantity,'quantidade',0,99);
      if(transfer&&current>=quantity) return await cart(db,user);
      if(quantity===0) await db.run('DELETE FROM cart_items WHERE client_id=? AND product_id=?',user.id,productId);
      else {
        if(!p.active || p.physical-p.reserved<quantity) fail('Quantidade indisponível em estoque.',409);
        await db.run('INSERT INTO cart_items VALUES(?,?,?) ON CONFLICT(client_id,product_id) DO UPDATE SET quantity=excluded.quantity',user.id,productId,quantity);
      }
      return await cart(db,user);
    });
  },
  async address(db,body,user) {
    client(user);
    const ref=str(body.id,'endereço',80) || id();
    if(body.remove) {
      const change=await db.run('DELETE FROM addresses WHERE id=? AND client_id=?',ref,user.id);
      if(!change.changes) fail('Endereço indisponível.',404);
    } else {
      if(body.id && !await db.get('SELECT 1 FROM addresses WHERE id=? AND client_id=?',ref,user.id)) fail('Endereço indisponível.',404);
      await db.run(`INSERT INTO addresses VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,values_json=excluded.values_json`,
        ref,user.id,str(body.label,'identificação do endereço',70,2),encode(address(body)));
    }
    return {id:ref};
  },
  quote:deliveryQuote,
  async checkout(db,body,user,ctx) {
    client(user);
    const key=str(body.requestKey,'identificador do pedido',100,16);
    return await db.tx(async ()=>{
      const existing=await db.get('SELECT id FROM orders WHERE client_id=? AND request_key=?',user.id,key);
      if(existing) return {id:existing.id};
      const quote=await deliveryQuote(db,body,user,ctx);
      if(quote.key!==body.quoteKey) fail('O carrinho ou a taxa mudou. Calcule e revise os valores novamente.',409);
      const ref=id();
      await db.run("INSERT INTO orders VALUES(?,?,?,?,'RECEBIDO',?,?,?,?,?,?,?)",ref,user.id,key,quote.mode,quote.payment==='simulado'?'SIMULADO':'NAO_PAGO',
        quote.subtotal,quote.fee,quote.total,encode(quote.destination),encode(quote.rules),now());
      for(const item of quote.items) {
        await db.run('INSERT INTO order_items VALUES(?,?,?,?,?)',ref,item.id,item.name,item.price,item.quantity);
        const result=await db.run('UPDATE products SET reserved=reserved+? WHERE id=? AND active=1 AND physical-reserved>=?',item.quantity,item.id,item.quantity);
        if(!result.changes) fail('Estoque indisponível para '+item.name+'.',409);
        await movement(db,item.id,'RESERVA',item.quantity,ref,user.id,'Pedido confirmado');
        await low(db,item.id,ref);
      }
      await db.run('DELETE FROM cart_items WHERE client_id=?',user.id);
      await orderEvent(db,ref,user.id,'RECEBIDO');
      await notify(db,user.id,'Pedido recebido','/app/pedidos/'+ref,'order:received:'+ref);
      await notifyManagers(db,'Novo pedido na NORDEN Store','/gestao/pedidos/'+ref,'order:received:'+ref);
      await audit(db,user.id,'PEDIDO_CRIADO','pedido',ref);
      return {id:ref};
    });
  },
  async orderState(db,body,user) {
    manager(user);
    return await db.tx(async ()=>{
      const order=await orderDetails(db,body.id,user);
      const state=str(body.state,'estado',30,2);
      if(order.status===state) return {id:order.id,status:state};
      if(!validTransitions[order.status]?.includes(state)||(state==='PRONTO_RETIRADA'&&order.mode!=='retirada')||
        (state==='SAIU_ENTREGA'&&order.mode!=='entrega')) fail('Transição indisponível para este pedido.',409);
      const reason=str(body.reason,'motivo',300,state==='CANCELADO'?2:0);
      const consume=state==='SAIU_ENTREGA'||(state==='CONCLUIDO'&&order.mode==='retirada');
      const release=state==='CANCELADO';
      if(consume || release) {
        for(const item of order.items) {
          const update=await db.run('UPDATE products SET reserved=reserved-?,physical=physical-? WHERE id=? AND reserved>=?',
            item.quantity,consume?item.quantity:0,item.product_id,item.quantity);
          if(!update.changes) fail('Reserva de estoque inconsistente.',409);
          await movement(db,item.product_id,consume?'SAIDA_VENDA':'LIBERACAO',item.quantity,order.id,user.id,reason);
        }
      }
      await db.run('UPDATE orders SET status=? WHERE id=?',state,order.id);
      await orderEvent(db,order.id,user.id,state,reason);
      await audit(db,user.id,state,'pedido',order.id);
      const title={EM_PREPARACAO:'Seu pedido está em preparação',PRONTO_RETIRADA:'Seu pedido está pronto para retirada',
        SAIU_ENTREGA:'Seu pedido saiu para entrega',CONCLUIDO:'Seu pedido foi concluído',CANCELADO:'Pedido cancelado'}[state];
      await notify(db,order.client_id,title,'/app/pedidos/'+order.id,'order:'+state+':'+order.id);
      return {id:order.id,status:state};
    });
  },
  async inventory(db,body,user) {
    manager(user);
    return await db.tx(async ()=>{
      const productId=str(body.productId,'produto',80,1);
      const p=await db.get('SELECT * FROM products WHERE id=?',productId);
      if(!p) fail('Produto indisponível.',404);
      const kind=selection(body.kind,['ENTRADA','AJUSTE','DEVOLUCAO'],'movimento');
      const quantity=integer(body.quantity,'quantidade',kind==='AJUSTE'?-99999:1,99999);
      if(quantity===0 || p.physical+quantity<p.reserved) fail('O ajuste precisa preservar o estoque já reservado.',409);
      const ref=id();
      await db.run('UPDATE products SET physical=physical+? WHERE id=?',quantity,productId);
      await movement(db,productId,kind,quantity,ref,user.id,str(body.reason,'motivo',250,3));
      await low(db,productId,ref);
      await audit(db,user.id,'ESTOQUE_MOVIMENTADO','produto',productId);
      return {id:ref};
    });
  }
};
