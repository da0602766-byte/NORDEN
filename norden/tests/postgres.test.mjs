import assert from 'node:assert/strict';
import {test} from 'node:test';
import {testPostgres} from './postgres-fixture.mjs';
import {seed} from '../src/seed.mjs';

test('PostgreSQL isola o esquema e protege reservas independentemente da API',async t=>{
  const {db,postgres}=await testPostgres();
  t.after(()=>db.close());
  await postgres.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  for(const role of ['anon','authenticated','norden_app']) {
    const {rows:[access]}=await postgres.query(`SELECT has_schema_privilege($1,'norden','USAGE') AS schema,
      has_table_privilege($1,'norden.accounts','SELECT') AS accounts`,[role]);
    assert.deepEqual(access,{schema:role==='norden_app',accounts:role==='norden_app'});
  }
  assert.deepEqual((await postgres.query('SELECT id FROM norden.accounts')).rows,[]);
  await seed(db,'Senha-ficticia-de-teste');
  const booked=await db.get("SELECT * FROM bookings WHERE status='CONFIRMADO' LIMIT 1");
  await assert.rejects(db.run(`INSERT INTO bookings(id,client_id,professional_id,service_id,service_name,professional_name,starts,ends,duration,padding,price,status,created)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,'CONFIRMADO',?)`,'conflito',booked.client_id,booked.professional_id,booked.service_id,
  booked.service_name,booked.professional_name,booked.starts,booked.ends,booked.duration,booked.padding,booked.price,booked.created),{code:'23P01'});
  for(let attempt=1;attempt<=19;attempt++) assert.equal(await db.authAttempt('teste'),attempt);
  assert.equal(await db.authAttempt('teste'),19);
});
