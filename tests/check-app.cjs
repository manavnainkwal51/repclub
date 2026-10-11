const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const projectRoot=path.resolve(__dirname,'..');
const elements=new Map(),listeners={};function element(){return {innerHTML:'',textContent:'',value:'',open:false,dataset:{},classList:{add(){},remove(){},toggle(){return false}},setAttribute(){},showModal(){this.open=true},close(){this.open=false},addEventListener(){},click(){},querySelector(){return element()}}}
const document={querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},createElement:element,addEventListener(type,fn){(listeners[type]??=[]).push(fn)}};
const memory=new Map(),context={document,localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},location:{hash:''},history:{replaceState(_a,_b,v){context.location.hash=v}},window:{scrollTo(){},addEventListener(){}},console,Date,Math,JSON,Number,String,Array,Object,Set,Map,Blob,URL,globalThis:{crypto:require('crypto').webcrypto},setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},FormData:class{constructor(f){this.f=f}get(k){return this.f.values[k]}}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(projectRoot,'dist/exercise-data.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(projectRoot,'dist/app.js'),'utf8'),context);
const run=s=>vm.runInContext(s,context);const click=data=>{const button={dataset:data,setAttribute(){},classList:{toggle(){}},closest(){return {classList:{toggle(){}}}}};listeners.click[0]({target:{closest(){return button}}})};
for(const page of ['overview','workout','plan','records','progress','library','settings','history']){run(`navigate('${page}')`);const html=elements.get('#main').innerHTML;assert(html.length>500,page+' renders');assert(!html.includes('undefined'),page+' has no undefined values')}
assert(run('validBackup(JSON.parse(JSON.stringify(state)))'));assert(!run('validBackup({version:1})'));
const baseCount=run('state.workouts.length');click({action:'start',routine:'upper'});assert.equal(run('state.session.exercises.length'),5);const sid=run('state.session.id');click({action:'start',routine:'lower'});assert.equal(run('state.session.id'),sid,'Resume preserves session');const instance=run('state.session.exercises[0].instance');run('state.session.exercises[0].sets[0].weight=150');click({action:'complete-set',instance,set:'0'});assert(run('state.session.exercises[0].sets[0].done'));assert(run('timerDeadline>Date.now()'));click({action:'finish-workout'});assert.equal(run('state.workouts.length'),baseCount+1);assert.equal(run('state.session'),null);assert.equal(run("recordFor('bench').weight"),150);assert.equal(run('state.workouts.at(-1).exercises[0].sets.length'),1);assert(run("state.workouts.at(-1).prs.includes('bench')"));
click({action:'confirm-delete-workout',id:run('state.workouts.at(-1).id')});assert.equal(run('state.workouts.length'),baseCount);assert.equal(run("recordFor('bench').weight"),80);
click({action:'confirm-clear'});assert.equal(run('state.workouts.length'),0);assert.equal(run('state.body.length'),0);for(const page of ['overview','records','progress','history']){run(`navigate('${page}')`);assert(!elements.get('#main').innerHTML.includes('NaN'))}
click({action:'start',routine:'upper'});click({action:'finish-workout'});assert(run('state.session!==null'),'Empty workout cannot finish');run('state.session.exercises[0].sets[0].reps=0');click({action:'complete-set',instance:run('state.session.exercises[0].instance'),set:'0'});assert(!run('state.session.exercises[0].sets[0].done'),'Invalid reps cannot be completed');
click({action:'confirm-restore'});assert(run('validBackup(JSON.parse(JSON.stringify(state)))'));console.log('PASS: all eight pages render; backups validate; sessions resume; sets, PRs, history deletion, empty states and invalid input behave correctly.');

assert.equal(run('exercises.length'),897,'Full local catalog loaded');
assert(run("exercises.some(e=>e.id==='wger_1551')"),'Push-ups included');
assert(run("exercises.some(e=>e.id==='wger_475')"),'Pull-ups included');
assert.equal(run("modeFor('wger_1551')"),'reps');
assert.equal(run("modeFor('wger_458')"),'time');
run("search='push ups';libraryFilter='All';bodyPartFilter='All';equipmentFilter='All';illustratedOnly=false");assert(run("catalogFiltered().some(e=>e.id==='wger_1551')"),'Push-ups searchable despite punctuation');
run("search='';illustratedOnly=true");assert(run('catalogFiltered().every(e=>e.images.length>0)'),'Illustrated filter works');run('illustratedOnly=false');
run('state.workouts=[];state.manualRecords=[];state.body=[];state.session=null;state.demo=false');
click({action:'start',routine:'bodyweight'});assert.equal(run('state.session.exercises.length'),4);
const pushInstance=run("state.session.exercises.find(e=>e.id==='wger_1551').instance");
const plankInstance=run("state.session.exercises.find(e=>e.id==='wger_458').instance");
run("state.session.exercises.find(e=>e.id==='wger_1551').sets[0].reps=25");
run("state.session.exercises.find(e=>e.id==='wger_458').sets[0].reps=120");
click({action:'complete-set',instance:pushInstance,set:'0'});click({action:'complete-set',instance:plankInstance,set:'0'});
click({action:'finish-workout'});assert.equal(run("recordFor('wger_1551').reps"),25);assert.equal(run("recordFor('wger_458').reps"),120);assert.equal(run('volume(state.workouts[0])'),0,'Bodyweight and seconds do not become weighted tonnage');assert(run("state.workouts[0].prs.includes('wger_1551')"));assert(run("state.workouts[0].prs.includes('wger_458')"));assert(run('validBackup(JSON.parse(JSON.stringify(state)))'),'Timed backup round trip valid');
assert(run("recordsPage().includes('MOST REPS')"));assert(run("recordsPage().includes('LONGEST DURATION')"));
run("openPR('wger_1551')");assert(elements.get('#modalContent').innerHTML.includes('Best reps in one set'));run("openPR('wger_458')");assert(elements.get('#modalContent').innerHTML.includes('Best duration (seconds)'));
console.log('PASS: 897 sourced exercises; pull-up/push-up search; image filtering; bodyweight and timed logging; automatic PRs; correct volume; backup compatibility.');
