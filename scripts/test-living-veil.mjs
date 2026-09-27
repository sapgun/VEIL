// C revision: validate the real production build, not a generated concept image.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const dir='test-artifacts/atmosphere-c',url='http://127.0.0.1:4173';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],{stdio:'ignore'});
const results=[],errors=[];let browser;
const pass=name=>{results.push({name,passed:true});console.log('PASS',name);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(page){await page.goto(url,{waitUntil:'networkidle'});await page.locator('.vl-atmosphere').waitFor();await page.waitForTimeout(500);}
async function phase(page,p){await page.evaluate(p=>{const box=document.querySelector('.vl-presence').getBoundingClientRect();const anchor=Math.max(0,box.top+scrollY-innerHeight*.55);const travel=Math.max(240,box.height*.55);scrollTo({top:anchor+travel*p,behavior:'instant'});},p);await page.waitForTimeout(1200);}
try {
  await mkdir(dir,{recursive:true});
  for(let i=0;i<60;i++){try{if((await fetch(url)).ok)break;}catch{}await pause(200);}
  const manifest=JSON.parse(await readFile('public/veil/atmosphere/manifest.json','utf8'));
  for(const [name,record] of Object.entries(manifest.files)){
    const bytes=await readFile('public/veil/atmosphere/'+name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,name);
    const response=await fetch(url+'/veil/atmosphere/'+name);assert.equal(response.status,200,name);
    if(name.endsWith('.svg')){const svg=bytes.toString();assert.ok(!svg.includes('<use '));assert.ok(!svg.includes('<pattern'));assert.ok(svg.includes('feGaussianBlur'));}
  }pass('four production assets: exact hashes, served, no tiled curtain geometry');
  browser=await chromium.launch({args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const requests=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await ready(page);
  assert.equal(await page.locator('canvas,#living-veil,.vl-living-stage').count(),0);
  assert.equal(await page.getByText('Skip scene',{exact:true}).count(),0);
  assert.equal(await page.getByText('Still composition',{exact:true}).count(),0);
  assert.ok(!requests.some(u=>u.includes('/veil/motion/')||/engine-.*\.js/.test(u)));
  pass('old isolated curtain stage and GPU masks are not loaded');
  const top=await page.locator('.vl-atmosphere').evaluate(e=>({position:getComputedStyle(e).position,pointer:getComputedStyle(e).pointerEvents,rect:e.getBoundingClientRect().toJSON()}));
  assert.equal(top.position,'fixed');assert.equal(top.pointer,'none');assert.equal(await page.locator('[data-veil-sheet]').count(),3);
  const gap=await page.evaluate(()=>document.querySelector('#philosophy').getBoundingClientRect().top-document.querySelector('.vl-signal').getBoundingClientRect().bottom);
  assert.ok(gap>=-1&&gap<80,String(gap));pass('continuous page background without a reserved animation gap');
  await page.screenshot({path:`${dir}/desktop-hero.png`});
  await phase(page,.45);
  assert.ok(Math.abs(Number(await page.locator('.vl-presence').getAttribute('data-progress'))-.45)<.01);
  assert.ok(Number(await page.locator('[data-photo-echo="0"]').evaluate(e=>getComputedStyle(e).opacity))<.001);
  await page.screenshot({path:`${dir}/desktop-merged.png`});pass('photo echoes align into one non-additive presence');
  await phase(page,.72);assert.ok(Number(await page.locator('[data-photo-echo="0"]').evaluate(e=>getComputedStyle(e).opacity))>.08);
  await phase(page,1);assert.ok(Number(await page.locator('[data-photo-echo="1"]').evaluate(e=>getComputedStyle(e).opacity))<.001);
  await phase(page,.45);assert.ok(Number(await page.locator('[data-photo-echo="1"]').evaluate(e=>getComputedStyle(e).opacity))>.7);
  pass('separation, fading and reverse scroll remain deterministic');
  await page.locator('#experience').scrollIntoViewIfNeeded();await page.waitForTimeout(1000);
  assert.equal(await page.locator('.vl-atmosphere').evaluate(e=>Math.round(e.getBoundingClientRect().top)),Math.round(top.rect.y));
  await page.getByRole('tab',{name:/API/}).click();
  // The visible switch/label is the pointer target; the transparent input is the keyboard target.
  await page.locator('.vl-consent').click();
  assert.equal(await page.getByRole('checkbox').isChecked(),true);
  assert.match(await page.getByRole('status').innerText(),/shared|included|disclosed/i);
  await page.getByRole('checkbox').focus();await page.keyboard.press('Space');
  assert.equal(await page.getByRole('checkbox').isChecked(),false);
  await page.keyboard.press('Space');assert.equal(await page.getByRole('checkbox').isChecked(),true);
  await page.getByRole('tab',{name:/DeFi/}).click();assert.equal(await page.getByRole('checkbox').isChecked(),false);
  await page.screenshot({path:`${dir}/desktop-experience.png`});pass('global veil stays below pointer and keyboard consent controls');
  await page.getByText('What does revocation actually do?',{exact:true}).click();
  assert.ok(await page.getByText(/Revocation stops future use/).isVisible());pass('FAQ remains operable');
  await page.getByRole('button',{name:'Ambient motion',exact:true}).click();
  assert.equal(await page.locator('.vl-atmosphere').getAttribute('data-motion'),'off');
  assert.equal(await page.evaluate(()=>localStorage.getItem('veil:motion:v1')),'off');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.vl-atmosphere').getAttribute('data-motion'),'off');
  pass('footer preference persists with no failure-style scene controls');
  await page.getByRole('button',{name:'Ambient motion',exact:true}).click();await phase(page,.2);await page.waitForTimeout(4000);
  await page.evaluate(()=>{window.__calls=0;const old=requestAnimationFrame;window.requestAnimationFrame=fn=>old(t=>{window.__calls++;fn(t);});});
  await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>window.__calls),0);pass('scroll spring sleeps at rest');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  assert.equal(await page.locator('.vl-atmosphere').getAttribute('data-motion'),'off');assert.equal(await page.locator('.vl-ambient-control').count(),0);
  assert.equal(await page.locator('[data-veil-sheet="near"]').evaluate(e=>getComputedStyle(e).transform),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(200);assert.equal(await page.locator('.vl-atmosphere').getAttribute('data-motion'),'on');
  pass('live system reduced-motion changes cleanly stop and restore motion');
  assert.equal(await page.locator('[data-app-link]').count(),4);await page.locator('.vl-header [data-app-link]').click();await page.waitForURL('**/app');
  assert.equal(await page.locator('.vl-atmosphere').count(),0);assert.ok(await page.locator('.shell').count());pass('APP navigates directly and removes the global material');
  for(const width of [360,390,768,1024,1920]){
    const mobile=await browser.newPage({viewport:{width,height:844}});mobile.on('pageerror',e=>errors.push(e.message));await ready(mobile);
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,String(width));
    const hero=await mobile.locator('.vl-hero').boundingBox();assert.ok(hero.height<1100,String(hero.height));
    if(width<960)assert.equal(await mobile.locator('[data-photo-echo="0"]').isVisible(),false);
    await mobile.screenshot({path:`${dir}/width-${width}-hero.png`});
    await mobile.locator('#philosophy').scrollIntoViewIfNeeded();await mobile.waitForTimeout(900);
    await mobile.screenshot({path:`${dir}/width-${width}-body.png`});await mobile.close();
  }pass('five widths: no overflow, compact hero and natural mobile still');
  const failed=await browser.newPage({viewport:{width:1440,height:1000}});
  await failed.route('**/veil/atmosphere/presence.webp',r=>r.abort());await ready(failed);
  assert.equal(await failed.locator('.vl-presence').getAttribute('data-photo-available'),'false');
  assert.equal(await failed.locator('[data-photo-echo]').count(),0);assert.ok(await failed.locator('.vl-header [data-app-link]').isVisible());pass('missing photo quietly preserves the page and CTA');
  const storage=await browser.newPage({viewport:{width:390,height:844}});
  await storage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked');}}));
  await ready(storage);await storage.getByRole('button',{name:'Ambient motion',exact:true}).click();assert.equal(await storage.locator('.vl-atmosphere').getAttribute('data-motion'),'off');pass('motion does not require storage access');
  assert.deepEqual(errors,[]);pass('no uncaught browser errors');
}catch(error){results.push({name:'atmosphere suite',passed:false,error:String(error)});throw error;}
finally{await writeFile(`${dir}/results.json`,JSON.stringify({results,errors},null,2));await browser?.close();server.kill();}
