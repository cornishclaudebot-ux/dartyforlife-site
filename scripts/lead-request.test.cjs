const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
(async()=>{
 let calls=[],timer,cleared=0,status=true,payload,signal;
 const scope={FormData:class{keys(){return ['equipment'];}getAll(){return ['Foam cannon'];}},AbortController,TRACK:{vid:'test',first:{}},LEADS_URL:'test',track:(...x)=>calls.push(x),setTimeout:fn=>(timer=fn,1),clearTimeout:()=>cleared++,fetch:async(_,opts)=>{payload=JSON.parse(opts.body);signal=opts.signal;return {ok:status};}};
 vm.createContext(scope);vm.runInContext(src.slice(src.indexOf('function sendLead('),src.indexOf('/* Honest submits')),scope);
 status=false;assert.equal((await scope.sendLead('rental',{},['equipment'])).ok,false);assert.equal(calls.length,0);assert.deepEqual(payload.equipment,['Foam cannon']);assert.equal(cleared,1);
 status=true;await scope.sendLead('list',{});assert.equal(calls.length,1);assert.equal(calls[0][0],'Lead');assert.equal(signal.aborted,false);timer();assert.equal(signal.aborted,true);assert.equal(cleared,2);
 scope.fetch=()=>Promise.reject(Error('offline'));await assert.rejects(scope.sendLead('list',{}));assert.equal(calls.length,1);assert.equal(cleared,3);
 console.log('PASS failed/offline requests do not report leads; successful requests report once; timeout aborts and timers clear; rental arrays preserved. No requests sent.');
})().catch(e=>{console.error(e);process.exitCode=1;});
