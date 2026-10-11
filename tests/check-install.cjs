const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const windowEvents={},serviceEvents={},documentEvents={},elements={},messages=[],toasts=[];let promptCount=0,persistCount=0,reloadCount=0,modalMarkup='';
function element(id){return elements[id]??={id,textContent:'',hidden:false,classList:{toggle(){}}}}
const doc={getElementById:element,querySelectorAll(){return[element('installApp')]},addEventListener:(type,fn)=>documentEvents[type]=fn};
const registration={active:{postMessage:d=>messages.push(d)},waiting:{postMessage:d=>messages.push(d)},addEventListener(){}};
const context={window:{matchMedia:()=>({matches:false}),isSecureContext:true,addEventListener:(type,fn)=>windowEvents[type]=fn},navigator:{onLine:true,storage:{persist:async()=>{persistCount++}},serviceWorker:{ready:Promise.resolve(registration),register:async(url,options)=>{assert.equal(url,'./sw.js');assert.equal(options.updateViaCache,'none');return registration},addEventListener:(type,fn)=>serviceEvents[type]=fn}},document:doc,MutationObserver:class{observe(){}},state:{session:null},toast:t=>toasts.push(t),modal:t=>modalMarkup=t,icon:()=>'',location:{reload(){reloadCount++}},Promise,Boolean,console};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/install.js'),'utf8'),context);
function click(kind){const b={matches:selector=>selector.includes(kind)};documentEvents.click({target:{closest:()=>b}})}
(async()=>{await new Promise(setImmediate);assert(messages.some(m=>m.type==='PREPARE_OFFLINE'));assert(!messages.some(m=>Object.values(m).some(v=>typeof v==='object')),'No user payload is sent to worker');
 let prevented=false;windowEvents.beforeinstallprompt({preventDefault(){prevented=true},async prompt(){promptCount++},userChoice:Promise.resolve({outcome:'accepted'})});assert(prevented);click('installApp');await new Promise(setImmediate);assert.equal(promptCount,1);assert.equal(persistCount,1);
 windowEvents.appinstalled();assert(element('installApp').hidden);assert.equal(element('installApp').textContent,'App installed ✓');
 serviceEvents.message({data:{type:'OFFLINE_PROGRESS',done:327,total:327,complete:true}});assert.equal(element('offlineStatus').textContent,'Ready offline');context.navigator.onLine=false;windowEvents.offline();assert.equal(element('offlineStatus').textContent,'Offline · ready');
 context.state.session={};click('data-update-app');assert(!messages.some(m=>m.type==='ACTIVATE_UPDATE'),'Active workout prevents an update');context.state.session=null;click('data-update-app');assert(messages.some(m=>m.type==='ACTIVATE_UPDATE'));serviceEvents.controllerchange();assert.equal(reloadCount,1);
 console.log('PASS: installation prompts, persistent-storage request, installed-state UI, offline status, and active-workout-safe updates behave correctly.');
})().catch(e=>{console.error(e);process.exitCode=1});
