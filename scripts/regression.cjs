'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
if(!process.env.DFL_TEST_TZ){
  for(const TZ of ['America/Phoenix','America/New_York','Asia/Tokyo']){
    const r=spawnSync(process.execPath,[__filename],{env:{...process.env,TZ,DFL_TEST_TZ:'1'},encoding:'utf8'});
    process.stdout.write(r.stdout);process.stderr.write(r.stderr);
    assert.equal(r.status,0,`Tests failed in ${TZ}`);
  }
  process.exit(0);
}
const src=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
new vm.Script(src);
let now=Date.parse('2026-10-30T01:00:00-07:00');
class ClockDate extends Date {static now(){return now;}}
const scope={Date:ClockDate};vm.createContext(scope);
vm.runInContext(src.slice(src.indexOf('function phoenixTimestamp'),src.indexOf('function esc(')),scope);
const event={date:'2026-10-29',time:'7:00 PM',end:'2026-11-02T02:00'};
assert.equal(scope.eventStart(event),Date.parse('2026-10-29T19:00:00-07:00'));
assert.equal(scope.eventStart({...event,time:'12:00 AM'}),Date.parse('2026-10-29T00:00:00-07:00'));
assert.equal(scope.eventStart({...event,time:'12:00 PM'}),Date.parse('2026-10-29T12:00:00-07:00'));
assert.ok(Number.isNaN(scope.eventStart({...event,time:''})));
assert.equal(scope.isUpcoming(event),true,'multi-day event remains visible');
assert.equal(scope.isUpcoming({date:'2026-10-29',end:'2026-10-30T02:00'}),true,'overnight remains visible');
assert.equal(scope.phoenixTimestamp('2026-11-02T02:00'),Date.parse('2026-11-02T09:00:00Z'));
assert.equal(scope.phoenixTimestamp('2026-11-02T09:00:00Z'),Date.parse('2026-11-02T09:00:00Z'));
now=Date.parse('2026-11-02T02:00:00-07:00');
assert.equal(scope.isUpcoming(event),false,'expired event disappears at its end');
now=Date.parse('2026-10-29T23:59:59-07:00');
assert.equal(scope.isUpcoming({date:'2026-10-29'}),true,'no-end event stays through Phoenix day');
now=Date.parse('2026-10-30T00:00:00-07:00');
assert.equal(scope.isUpcoming({date:'2026-10-29'}),false);
assert.equal(scope.isUpcoming({date:'invalid'}),false);
for(const page of ['bars.html','tempe.html','majors.html','rentals.html']){
  const mount={}; const nav={path:page,home:'index.html',CONFIG:{},IC:{},withTrk:()=>'',document:{getElementById:()=>mount,querySelector:()=>null}};
  vm.createContext(nav); vm.runInContext(src.slice(src.indexOf('function buildNav'),src.indexOf('function buildFooter')),nav);nav.buildNav();
  const tag=mount.outerHTML.match(new RegExp('<a href="'+page.replace('.','\\.')+'"[^>]*>'))[0];
  assert.equal((tag.match(/class=/g)||[]).length,1,tag);
  assert.match(tag,/class="[^"]*\bactive\b/);assert.match(tag,/aria-current="page"/);

}
const interest={};Object.defineProperty(interest,'sessionStorage',{get(){throw Error('Storage denied');}});
vm.createContext(interest);
vm.runInContext(src.slice(src.indexOf('let interestMemory'),src.indexOf('function applyInterest')),interest);
assert.equal(interest.getInterest(),'');interest.setInterest('FEAR FOREST');assert.equal(interest.getInterest(),'FEAR FOREST');
let handler, redirected={};const notify={...interest,location:redirected,document:{addEventListener(_,h){handler=h;},getElementById(){return null;}}};
// Retain throwing storage getter, and evaluate only the actual interest click handler.
Object.defineProperty(notify,'sessionStorage',{get(){throw Error('Storage denied');}});
vm.createContext(notify);vm.runInContext(src.slice(src.indexOf('let interestMemory'),src.indexOf('function applyInterest')),notify);
const begin=src.indexOf('document.addEventListener("click",e=>{',src.indexOf('function applyInterest'));
vm.runInContext(src.slice(begin,src.indexOf('\napplyInterest();',begin)),notify);
let prevented=false;handler({target:{closest(){return {getAttribute(){return 'FEAR FOREST';}};}},preventDefault(){prevented=true;}});
assert.equal(prevented,true);assert.equal(redirected.href,'index.html#list');
console.log(`PASS ${process.env.TZ}: syntax, Phoenix countdown, event end/overnight/day fallback, navigation attributes, denied-storage notification redirect`);
