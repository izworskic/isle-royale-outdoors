const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const source=path.resolve(__dirname,'..');
const builder=path.join(source,'scripts/inject-ga4.mjs');
test('ferry deployment HTML is fully styled, executable without independently routed assets, and ad-free above the decision',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ferry-standalone-'));
 try{
  fs.mkdirSync(path.join(dir,'public/isle-royale-ferry'),{recursive:true});
  fs.mkdirSync(path.join(dir,'public/assets'),{recursive:true});
  fs.writeFileSync(path.join(dir,'public/isle-royale-ferry/index.html'),fs.readFileSync(path.join(source,'public/isle-royale-ferry/index.html')));
  for(const asset of ['grand-portage-ferry-v2.css','grand-portage-ferry.js','grand-portage-ferry-v2.js']){
   fs.copyFileSync(path.join(source,'public/assets',asset),path.join(dir,'public/assets',asset));
  }
  fs.writeFileSync(path.join(dir,'public/other.html'),'<html><head></head><body><h1>Other page</h1></body></html>');
  const run=()=>spawnSync(process.execPath,[builder],{cwd:dir,encoding:'utf8'});
  const first=run();
  assert.equal(first.status,0,first.stderr||first.stdout);
  const compiled=fs.readFileSync(path.join(dir,'public/isle-royale-ferry/index.html'),'utf8');
  for(const asset of ['grand-portage-ferry-v2.css','grand-portage-ferry.js','grand-portage-ferry-v2.js'])
   assert.ok(compiled.includes('data-ferry-inline="'+asset+'"'),'inline missing '+asset);
  assert.doesNotMatch(compiled,/src="\/assets\/grand-portage-ferry(?:-v2)?\.js"/);
  assert.doesNotMatch(compiled,/href="\/assets\/grand-portage-ferry-v2\.css"/);
  assert.doesNotMatch(compiled,/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/,'do not put an auto ad before the planner');
  assert.match(compiled,/\.skip\{position:absolute/,'mobile skip link hidden until keyboard focus');
  assert.match(compiled,/\.grid\{display:grid/,'decision layout styles baked into the HTML');
  assert.match(compiled,/function recommendJourney/,'route decision model bundled');
  assert.match(compiled,/function evaluate\(input\)/,'original timetable engine bundled');
  assert.match(compiled,/data-voyage="rock-harbor-day"/,'real trip selector still present');
  assert.match(compiled,/aria-live="polite"/,'answer remains accessible');
  const other=fs.readFileSync(path.join(dir,'public/other.html'),'utf8');
  assert.match(other,/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/,'other pages retain existing AdSense behavior');
  const second=run();
  assert.equal(second.status,0,second.stderr||second.stdout);
  assert.equal(fs.readFileSync(path.join(dir,'public/isle-royale-ferry/index.html'),'utf8'),compiled,'rebuild must be idempotent');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
