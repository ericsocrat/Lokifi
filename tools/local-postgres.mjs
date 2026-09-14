import EmbeddedPostgres from '../.local/postgres/node_modules/embedded-postgres/dist/index.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
mkdirSync('.local', {recursive:true});
const configPath='.local/database.json';
const config=existsSync(configPath)?JSON.parse(readFileSync(configPath,'utf8')):{password:randomBytes(32).toString('hex'),port:15439};
writeFileSync(configPath,JSON.stringify(config));
const pg=new EmbeddedPostgres({databaseDir:'.local/pgdata',user:'lokifi',password:config.password,port:config.port,persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
if(!existsSync('.local/pgdata/PG_VERSION'))await pg.initialise();
await pg.start();
const client=pg.getPgClient(); await client.connect();
for(const name of ['lokifi_rebuild','lokifi_rebuild_test','lokifi_restore_test','lokifi_legacy_test']){
 const r=await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[name]);
 if(!r.rowCount)await client.query(`CREATE DATABASE "${name}"`);
}
await client.end();
console.log('Dedicated PostgreSQL ready on loopback port '+config.port);
setInterval(()=>{},60000);
