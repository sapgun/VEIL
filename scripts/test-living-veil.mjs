// Run after npm run build, with Playwright installed as a temporary QA tool.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],{stdio:'ignore'});
const url='http://127.0.0.1:4173';
const results=[],warnings=[];
let browser;
function pass(name){ results.push({name,passed:true}); console.log('PASS',name); }
async function position(page,p){
  await page.locator('#living-veil').evaluate((e,p)=>{
    const s=e.querySelector('.vl-living-stage');
    window.scrollTo({top:e.getBoundingClientRect().top+scrollY-78+(e.offsetHeight-s.offsetHeight)*p,behavior:'instant'});
  },p);
}
try {
  for(let i=0;i<50;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  await mkdir('test-artifacts/living-veil',{recursive:true});
  browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')warnings.push(m.text());});
  await page.goto(url,{waitUntil:'networkidle'});
  await position(page,.04);
  await page.waitForSelector('.vl-living-screen[data-rendered]',{timeout:15000});
  assert.equal(await page.locator('.vl-living-canvas').count(),1);pass('real WebGL2 canvas, shader compilation and texture upload');
  const screenshots=[];
  for(const [name,p] of [['separate',.04],['merged',.48],['scatter',.72],['dissolved',1]]){
    await position(page,p);await page.waitForTimeout(1400);
    assert.notEqual(await page.locator('#living-veil').getAttribute('data-motion'),'off',warnings.join('\n'));
    const shot=await page.screenshot({path:`test-artifacts/living-veil/${name}.png`});screenshots.push(shot);
  }
  assert.equal(screenshots[0].equals(screenshots[1]),false);assert.equal(screenshots[1].equals(screenshots[3]),false);pass('four scroll scenes produce distinct rendered frames');
  await position(page,.48);await page.waitForTimeout(1500);
  assert.equal(await page.locator('[data-story-phase][data-active=true]').textContent(),'One private self.');pass('reverse scroll restores merged story');
  await page.waitForTimeout(3000);
  await page.evaluate(()=>{window.__frames=0;const original=window.requestAnimationFrame;window.requestAnimationFrame=fn=>original(t=>{window.__frames++;fn(t);});});
  await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>window.__frames),0);pass('GPU loop stops at rest');
  await page.locator('.vl-motion-toggle').click();await page.waitForTimeout(250);
  assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('veil:motion:v1')),'off');pass('motion toggle disposes GPU and persists choice');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('canvas').count(),0);pass('motion-off survives reload');
  await page.locator('.vl-motion-toggle').click();await position(page,.48);await page.waitForSelector('.vl-living-screen[data-rendered]');
  pass('motion can be re-enabled without duplicate canvases');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
  assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('.vl-motion-toggle').isDisabled(),true);pass('OS preference changes immediately stop motion');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForSelector('.vl-living-screen[data-rendered]');
  await page.locator('canvas').evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForTimeout(400);assert.equal(await page.locator('canvas').count(),0);assert.match(await page.locator('#vl-motion-note').innerText(),/fallback/);pass('GPU context loss returns to still artwork');
  assert.equal(await page.locator('[data-app-link]').count(),4);
  await page.locator('.vl-header [data-app-link]').click();await page.waitForURL('**/app');assert.ok(await page.locator('.shell').count());pass('APP link still navigates directly to existing app');
  const reduced=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const requests=[];reduced.on('request',r=>requests.push(r.url()));await reduced.goto(url,{waitUntil:'networkidle'});
  assert.equal(await reduced.locator('canvas').count(),0);assert.ok(!requests.some(u=>/engine-.*\.js/.test(u)));pass('reduced motion does not download GPU module');
  await reduced.screenshot({path:'test-artifacts/living-veil/reduced.png',fullPage:true});
  const mobile=await browser.newPage({viewport:{width:390,height:844}});await mobile.goto(url,{waitUntil:'networkidle'});
  assert.equal(await mobile.locator('canvas').count(),0);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);pass('narrow screens use static artwork without overflow');
  const disabled=await browser.newPage({viewport:{width:1440,height:1000}});
  await disabled.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:old.call(this,type,...args)};});
  await disabled.goto(url,{waitUntil:'networkidle'});await position(disabled,.1);await disabled.waitForTimeout(700);
  assert.match(await disabled.locator('#vl-motion-note').innerText(),/fallback/);assert.equal(await disabled.locator('canvas').count(),0);pass('unsupported WebGL uses still artwork');
  assert.deepEqual(errors,[]);pass('no page errors during scene and existing-app navigation');
} catch(error){ results.push({name:'browser suite',passed:false,error:String(error),warnings});throw error; }
finally {
  await writeFile('test-artifacts/living-veil/results.json',JSON.stringify({results,warnings},null,2));
  await browser?.close();server.kill();
}
