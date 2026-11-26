import nodemailer from 'nodemailer';

export function mailDelivery(env) {
  if(!env.NORDEN_SMTP_URL || !env.NORDEN_MAIL_FROM || !env.NORDEN_SITE_URL) return undefined;
  const origin=new URL(env.NORDEN_SITE_URL);
  if(origin.protocol!=='https:') throw new Error('Use HTTPS para NORDEN_SITE_URL.');
  const smtp=new URL(env.NORDEN_SMTP_URL);
  if(!['smtp:','smtps:'].includes(smtp.protocol)) throw new Error('Use smtp ou smtps em NORDEN_SMTP_URL.');
  const secure=smtp.protocol==='smtps:';
  const transport=nodemailer.createTransport({host:smtp.hostname,port:Number(smtp.port||(secure?465:587)),secure,requireTLS:!secure,
    auth:{user:decodeURIComponent(smtp.username),pass:decodeURIComponent(smtp.password)},connectionTimeout:8000,socketTimeout:10000});
  return async ({email,purpose,path})=>{
    const title=purpose==='redefinir'?'Redefina sua senha no NORDEN':'Confirme seu e-mail no NORDEN';
    await transport.sendMail({from:env.NORDEN_MAIL_FROM,to:email,subject:title,
      text:`${title}\n\n${new URL(path,origin).href}\n\nSe você não solicitou este link, ignore a mensagem.`});
  };
}
