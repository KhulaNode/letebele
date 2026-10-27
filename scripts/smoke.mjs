import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source = path.resolve(import.meta.dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'letebele-smoke-'));
try {
  for (const name of ['scripts','data','public']) fs.cpSync(path.join(source,name),path.join(temp,name),{recursive:true});
  const approved = { name:'Fixture Only', slug:'fixture-only', category:'Fixture', description:'Test-only approved listing.', image:null, imageAlt:null, priceZar:12.5, priceUpdatedAt:'2026-10-27', visible:true, ownerApproved:true, pharmacistReviewRequired:false, pharmacistApproved:true };
  const hidden = { ...approved, name:'Hidden Fixture', slug:'hidden-fixture', visible:false };
  const demo = { ...approved, name:'Demo Fixture', slug:'demo-fixture', category:'Demo product', visible:false, ownerApproved:false, pharmacistReviewRequired:true, pharmacistApproved:false, demo:true };
  const productsFile=path.join(temp,'data/products.json');
  fs.writeFileSync(productsFile, JSON.stringify([approved,hidden,demo]));
  const env={...process.env,SITE_URL:'https://example.test',WHATSAPP_NUMBER:'27123456789'};
  const build=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,env,encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
  const detail=fs.readFileSync(path.join(temp,'dist/catalogue/fixture-only/index.html'),'utf8');
  const home=fs.readFileSync(path.join(temp,'dist/index.html'),'utf8');
  const branchesPage=fs.readFileSync(path.join(temp,'dist/branches/index.html'),'utf8');
  const contact=fs.readFileSync(path.join(temp,'dist/contact/index.html'),'utf8');
  const bloodRiver=fs.readFileSync(path.join(temp,'dist/branches/blood-river/index.html'),'utf8');
  const westenburg=fs.readFileSync(path.join(temp,'dist/branches/westenburg/index.html'),'utf8');
  const sitemap=fs.readFileSync(path.join(temp,'dist/sitemap.xml'),'utf8');
  assert.match(detail,/<h1>Fixture Only<\/h1>/);
  assert.match(detail,/data-whatsapp-form/);
  assert.match(detail,/rel="canonical" href="https:\/\/example.test\/catalogue\/fixture-only\/"/);
  assert.match(detail,/"@type":"Product"/);
  assert.doesNotMatch(detail,/"offers"|"availability"/);
  assert.match(home,/Order on WhatsApp/);
  assert.match(home,/<h1>Your health is our <em>world\.<\/em><\/h1>/);
  const hero = home.match(/<section class="hero">[\s\S]*?<\/section>/)[0];
  assert.match(hero,/YOUR LOCAL PHARMACY · BLOOD RIVER &amp; WESTENBURG/);
  assert.match(hero,/Browse our products, choose your collection branch and place your order on WhatsApp\. Prices are shown on each product listing\./);
  assert.match(hero,/class="button button--cream" href="\/catalogue\/"[^>]*>Browse products/);
  assert.match(hero,/class="button button--ghost" href="\/branches\/"[^>]*>Find a branch/);
  assert.ok(hero.indexOf('Browse products') < hero.indexOf('Find a branch'));
  assert.match(hero,/Select your branch and quantity on the product page\./);
  assert.match(hero,/Two branches\.<br>Care close to home\./);
  assert.doesNotMatch(hero,/01 \/ 02|Business number being confirmed/);
  assert.match(home,/Letebele%20Pharmacy%20green%20cross%20logo%20v2\.png/);
  assert.match(home,/property="og:image" content="https:\/\/example\.test\/images\/FINAL%20LOGO%20Green%20pharmacy%20cross%20with%20red%20vein%20accents\.png"/);
  for (const page of [home, branchesPage, contact, westenburg, bloodRiver, detail]) {
    for (const [, imageUrl] of page.matchAll(/(?:src|href)="(\/images\/[^\"]+)"/g)) {
      assert.ok(fs.existsSync(path.join(temp, 'dist', decodeURIComponent(imageUrl).slice(1))), `Missing image: ${imageUrl}`);
    }
  }
  assert.match(sitemap,/catalogue\/fixture-only\//);
  assert.doesNotMatch(sitemap,/demo-fixture/);
  assert.ok(!fs.existsSync(path.join(temp,'dist/catalogue/demo-fixture')));
  assert.match(bloodRiver,/0x81b5b776bf25b7c9/);
  assert.doesNotMatch(westenburg,/0x81b5b776bf25b7c9/);
  assert.match(westenburg,/0x826df17a4f802a34/);
  assert.doesNotMatch(bloodRiver,/0x826df17a4f802a34/);
  assert.match(westenburg,/Monday–Friday/);
  assert.match(westenburg,/8 am–6 pm/);
  assert.match(westenburg,/8:30 am–4 pm/);
  assert.match(bloodRiver,/Monday–Friday/);
  assert.match(bloodRiver,/8:30 am–4 pm/);
  for (const page of [westenburg, bloodRiver]) {
    assert.match(page,/Public holidays:<\/strong> 8:30 am–4 pm\./);
    assert.doesNotMatch(page,/confirm public-holiday hours/);
    assert.doesNotMatch(page,/specialOpeningHoursSpecification/);
  }
  assert.match(branchesPage,/For general enquiries, call Letebele Pharmacy on <a href="tel:\+27156900907"/);
  assert.doesNotMatch(branchesPage,/Neither branch has its own phone number|Public holiday hours:/);
  assert.doesNotMatch(home.match(/<footer\b[\s\S]*?<\/footer>/)[0],/Public holiday/);
  assert.match(contact,/Both branches are open 8:30 am–4 pm on public holidays/);
  for (const page of [home, branchesPage, contact, westenburg, bloodRiver]) assert.doesNotMatch(page,/follow Sunday hours|same as Sunday/);
  const westenburgSchema = JSON.parse(westenburg.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  const bloodRiverSchema = JSON.parse(bloodRiver.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  const organizationSchema = JSON.parse(home.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(organizationSchema['@type'], 'Organization');
  assert.equal(organizationSchema.telephone, '+27 15 690 0907');
  assert.equal(organizationSchema.email, 'info@letebelepharmacy.co.za');
  for (const schema of [westenburgSchema, bloodRiverSchema]) {
    assert.equal(schema.telephone, undefined);
    assert.equal(schema.email, undefined);
  }
  for (const page of [home, branchesPage, contact, westenburg, bloodRiver, detail]) {
    assert.doesNotMatch(page,/shared (?:Letebele Pharmacy )?(?:number|contact)|organisation-wide number|supplied main number|Neither branch has its own phone number|direct line/i);
  }
  assert.match(westenburg,/Letebele Pharmacy contact number/);
  assert.match(bloodRiver,/Letebele Pharmacy contact number/);
  assert.deepEqual(westenburgSchema.openingHoursSpecification.map(row => [row.dayOfWeek, row.opens, row.closes]), [
    [['Monday','Tuesday','Wednesday','Thursday','Friday'],'08:00','18:00'],
    [['Saturday'],'08:00','17:00'],
    [['Sunday'],'08:30','16:00']
  ]);
  assert.deepEqual(bloodRiverSchema.openingHoursSpecification, westenburgSchema.openingHoursSpecification);
  assert.ok(!fs.existsSync(path.join(temp,'dist/catalogue/hidden-fixture')));
  const withoutWhatsApp=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,env:{...env,WHATSAPP_NUMBER:''},encoding:'utf8'});
  assert.equal(withoutWhatsApp.status,0,withoutWhatsApp.stderr);
  const offlineHero=fs.readFileSync(path.join(temp,'dist/index.html'),'utf8').match(/<section class="hero">[\s\S]*?<\/section>/)[0];
  assert.match(offlineHero,/Explore our product catalogue and find your nearest Letebele Pharmacy\. Prices are shown on each product listing\./);
  assert.match(offlineHero,/WhatsApp ordering coming soon\./);
  assert.match(offlineHero,/For product enquiries, call <a href="tel:\+27156900907" data-event="phone_tap">015 690 0907<\/a>\./);
  assert.doesNotMatch(offlineHero,/Business number being confirmed|Order request on WhatsApp/);
  const localBuild=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,env:{...env,SITE_URL:''},encoding:'utf8'});
  assert.equal(localBuild.status,0,localBuild.stderr);
  const localCatalogue=fs.readFileSync(path.join(temp,'dist/catalogue/index.html'),'utf8');
  const demoDetail=fs.readFileSync(path.join(temp,'dist/catalogue/demo-fixture/index.html'),'utf8');
  assert.match(localCatalogue,/Catalogue preview/);
  assert.match(localCatalogue,/Demo Fixture/);
  assert.match(demoDetail,/Demo listing only/);
  assert.doesNotMatch(demoDetail,/data-whatsapp-form|"@type":"Product"|Request on WhatsApp/);
  assert.match(demoDetail,/name="robots" content="noindex,nofollow"/);
  fs.writeFileSync(productsFile,JSON.stringify([{...approved,pharmacistApproved:false}]));
  const rejected=spawnSync(process.execPath,['scripts/check.mjs'],{cwd:temp,env,encoding:'utf8'});
  assert.notEqual(rejected.status,0,'Unsafe visible item must fail validation');
  console.log('Smoke passed: approved page and sitemap; draft hidden; unsafe visible item rejected.');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
