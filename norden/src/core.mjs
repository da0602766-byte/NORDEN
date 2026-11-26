import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { promisify } from 'node:util';

export const minute = 60_000;
export const day = 1440 * minute;
export const now = () => Date.now();
export const id = () => randomBytes(12).toString('hex');
export const token = () => randomBytes(32).toString('base64url');
export const hash = value => createHash('sha256').update(value).digest('hex');
export const parse = value => JSON.parse(value);
export const encode = value => JSON.stringify(value);
export const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export function str(value, label, max = 300, min = 0) {
  if (value == null && min === 0) return '';
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail('Confira o campo ' + label + '.');
  return value.trim();
}
export function integer(value, label, min = 0, max = 1_000_000_000) {
  if (value === '' || value === null || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    fail('Confira o campo ' + label + '.');
  }
  return Number(value);
}
export const email = value => {
  const clean = str(value, 'e-mail', 240, 5).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) fail('Informe um e-mail válido.');
  return clean;
};
const derive = promisify(scrypt);
export async function password(value, stored) {
  if (typeof value !== 'string' || value.length < (stored ? 1 : 10) || value.length > 128) fail('Use uma senha de 10 a 128 caracteres.');
  const [salt, expected] = stored ? stored.split(':') : [randomBytes(24).toString('hex')];
  const key = await derive(value, salt, 64);
  return expected ? timingSafeEqual(key, Buffer.from(expected, 'hex')) : salt + ':' + key.toString('hex');
}
export const timeZone = 'America/Sao_Paulo';
const localParts = new Intl.DateTimeFormat('en-CA', {
  timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'
});
export function local(ms) {
  const parts = Object.fromEntries(localParts.formatToParts(ms).map(p => [p.type,p.value]));
  return { date: parts.year + '-' + parts.month + '-' + parts.day, clock: parts.hour + ':' + parts.minute };
}
export function dateTime(date, clock = '00:00') {
  if (!/^\d{4}-\d\d-\d\d$/.test(date ?? '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock ?? '')) fail('Data ou horário inválido.');
  const expected = Date.parse(date + 'T' + clock + ':00Z');
  if (!Number.isFinite(expected)) fail('Data inválida.');
  const guess = expected + 180 * minute;
  const actual = local(guess);
  const ms = guess + expected - Date.parse(actual.date + 'T' + actual.clock + ':00Z');
  if (local(ms).date !== date || local(ms).clock !== clock) fail('Horário inválido no fuso do salão.');
  return ms;
}
export const addDays = (date,n) => new Date(Date.parse(date + 'T12:00:00Z') + n * day).toISOString().slice(0,10);
export const weekday = date => new Date(date + 'T12:00:00Z').getUTCDay();
export const money = value => (value / 100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const defaultSettings = {
  headline:'Estilo de verdade.\nCuidado em cada detalhe.',
  introduction:'Corte, barba e cuidado masculino com precisão. Agende online e leve sua rotina além da cadeira.',
  address:'', contact:'', hoursText:'', pickup:'Combine o local de retirada com a equipe no ambiente de demonstração.',
  cancellationHours:2, leadMinutes:30, bookingDays:45, flowDays:7, offerHours:3,
  deliveryRate:250, deliveryMax:12, deliveryBase:0, deliveryMinimum:0,
  payment:'simulado', reviews:false, faq:[
    ['Como funciona o agendamento?','Escolha o serviço, o profissional e um horário disponível. A confirmação aparece na sua conta.'],
    ['Posso retirar meu pedido?','Sim. Escolha retirada no checkout para acompanhar quando o pedido ficar pronto.']
  ]
};
export function openDatabase(filename, options = {}) {
  if (filename !== ':memory:') mkdirSync(dirname(filename),{recursive:true,mode:0o700});
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
  db.exec('CREATE TABLE IF NOT EXISTS migrations (file TEXT PRIMARY KEY)');
  const migrations = new URL('../migrations/',import.meta.url);
  const sql = {
    get:(query,...params)=>db.prepare(query).get(...params),
    all:(query,...params)=>db.prepare(query).all(...params),
    run:(query,...params)=>db.prepare(query).run(...params),
    tx(callback) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = callback();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  };
  for (const file of readdirSync(migrations).sort()) {
    sql.tx(() => {
      if (sql.get('SELECT 1 FROM migrations WHERE file=?',file)) return;
      db.exec(readFileSync(new URL(file,migrations),'utf8'));
      sql.run('INSERT INTO migrations VALUES(?)',file);
    });
  }
  sql.run('INSERT OR IGNORE INTO settings VALUES(1,?)',encode(defaultSettings));
  const secret = options.secret || (filename === ':memory:' ? token() : localSecret(dirname(filename)));
  const encryptionKey = createHash('sha256').update(secret).digest();
  return Object.assign(sql,{
    settings:()=>({...defaultSettings,...parse(sql.get('SELECT value FROM settings WHERE id=1').value)}),
    close:()=>db.close(),
    encrypt(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm',encryptionKey,iv);
      const body = Buffer.concat([cipher.update(encode(value),'utf8'),cipher.final()]);
      return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');
    },
    decrypt(value) {
      const bytes = Buffer.from(value,'base64');
      const cipher = createDecipheriv('aes-256-gcm',encryptionKey,bytes.subarray(0,12));
      cipher.setAuthTag(bytes.subarray(12,28));
      return parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));
    }
  });
}
function localSecret(dir) {
  const file = join(dir,'safety.key');
  try { writeFileSync(file,token(),{flag:'wx',mode:0o600}); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return readFileSync(file,'utf8');
}
export function audit(db,actor,action,entity,target) {
  db.run('INSERT INTO audits VALUES(?,?,?,?,?,?)',id(),actor,action,entity,target,now());
}
export function notify(db,user,title,href,key) {
  if (!user) return;
  db.run('INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,NULL,?)',id(),user,title,href,now(),key);
}
export function notifyManagers(db,title,href,key) {
  for (const account of db.all("SELECT id FROM accounts WHERE role='gestor' AND active=1")) notify(db,account.id,title,href,key);
}
export function selection(value, allowed, label) {
  if (!allowed.includes(value)) fail('Selecione uma opção válida em ' + label + '.');
  return value;
}
export const array = (value, max = 30) => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) fail('Lista inválida.');
  return value;
};
