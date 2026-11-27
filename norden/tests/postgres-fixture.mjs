import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {postgresDatabase} from '../src/postgres.mjs';

export async function testPostgres() {
  const postgres=new PGlite({extensions:{btree_gist}});
  const migration=new URL('../../supabase/migrations/20261126231645_norden_schema.sql',import.meta.url);
  await postgres.exec(readFileSync(migration,'utf8'));
  const indexes=new URL('../../supabase/migrations/20261127004533_norden_query_indexes.sql',import.meta.url);
  await postgres.exec(readFileSync(indexes,'utf8'));
  let pending=Promise.resolve();
  const pool={
    async connect() {
      let release;
      const available=pending;
      pending=new Promise(resolve=>{release=resolve;});
      await available;
      return {query:async(sql,params)=>{
        const result=await postgres.query(sql,params);
        return {...result,rowCount:result.affectedRows};
      },release};
    },
    end:()=>postgres.close()
  };
  const db=postgresDatabase(pool,'chave-ficticia-para-testes-do-norden');
  await db.init();
  return {db,postgres};
}
