import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source = path.resolve(import.meta.dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'letebele-smoke-'));
try {
  for (const name of ['scripts','data','public']) fs.cpSync(path.join(source,name),path.join(temp,name),{recursive:true});
  const approved = { name:'Fixture Only', slug:'fixture-only', category:'Fixture', description:'Test-only approved listing.', image:null, imageAlt:null, priceZar:null, priceUpdatedAt:null, visible:true, ownerApproved:true, pharmacistReviewRequired:false, pharmacistApproved:true };
  const hidden = { ...approved, name:'Hidden Fixture', slug:'hidden-fixture', visible:false };
  const productsFile=path.join(temp,'data/products.json');
  fs.writeFileSync(productsFile, JSON.stringify([approved,hidden]));
  const env={...process.env,SITE_URL:'https://example.test',WHATSAPP_NUMBER:'27123456789'};
  const build=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,env,encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
  const detail=fs.readFileSync(path.join(temp,'dist/catalogue/fixture-only/index.html'),'utf8');
  const home=fs.readFileSync(path.join(temp,'dist/index.html'),'utf8');
  const sitemap=fs.readFileSync(path.join(temp,'dist/sitemap.xml'),'utf8');
  assert.match(detail,/<h1>Fixture Only<\/h1>/);
  assert.match(detail,/data-whatsapp-form/);
  assert.match(detail,/rel="canonical" href="https:\/\/example.test\/catalogue\/fixture-only\/"/);
  assert.match(detail,/"@type":"Product"/);
  assert.doesNotMatch(detail,/"offers"|"availability"/);
  assert.match(home,/Order request on WhatsApp/);
  assert.match(sitemap,/catalogue\/fixture-only\//);
  assert.ok(!fs.existsSync(path.join(temp,'dist/catalogue/hidden-fixture')));
  fs.writeFileSync(productsFile,JSON.stringify([{...approved,pharmacistApproved:false}]));
  const rejected=spawnSync(process.execPath,['scripts/check.mjs'],{cwd:temp,env,encoding:'utf8'});
  assert.notEqual(rejected.status,0,'Unsafe visible item must fail validation');
  console.log('Smoke passed: approved page and sitemap; draft hidden; unsafe visible item rejected.');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
