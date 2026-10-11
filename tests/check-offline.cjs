const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),origin='https://repclub.example';
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.woff':'font/woff','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const events={},buckets=new Map(),messages=[];let online=true,failPath=null;let calls=[];
const urlOf=value=>typeof value==='string'?value:value.url;
function bucket(){const items=new Map();return{async match(k){return items.get(urlOf(k))?.clone()},async put(k,v){items.set(urlOf(k),v.clone())},async delete(k){return items.delete(urlOf(k))},items}}
const caches={async open(name){if(!buckets.has(name))buckets.set(name,bucket());return buckets.get(name)},async keys(){return [...buckets.keys()]},async delete(name){return buckets.delete(name)}};
const self={registration:{scope:origin+'/'},location:{origin},clients:{async matchAll(){return[{postMessage:d=>messages.push(d)}]},async claim(){}},addEventListener:(name,fn)=>events[name]=fn,async skipWaiting(){}};
async function fetchMock(request){const url=new URL(urlOf(request));assert.equal(url.origin,origin,'All runtime downloads are same-origin');calls.push(url.href);if(!online||url.pathname===failPath)throw Error('Offline');const file=path.join(dist,url.pathname.replace(/^\//,''));if(!fs.existsSync(file))return new Response('Missing',{status:404});return new Response(fs.readFileSync(file),{headers:{'content-type':types[path.extname(file)]||'application/octet-stream'}})}
const context={self,caches,fetch:fetchMock,URL,Response,Promise,Array,Boolean,Error,console};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(dist,'sw.js'),'utf8'),context);
async function trigger(name,extra={}){const waits=[];let response;events[name]({...extra,waitUntil:p=>waits.push(p),respondWith:p=>response=p});await Promise.all(waits);return response?await response:null}
(async()=>{
 await caches.open('unrelated-cache');await caches.open('repclub-offline-old');await trigger('install');await trigger('activate');assert(buckets.has('unrelated-cache'));assert(!buckets.has('repclub-offline-old'));
 const images=JSON.parse(fs.readFileSync(path.join(dist,'image-assets.json'))),main=await caches.open(vm.runInContext('VERSION',context));assert.equal(images.length,327);
 failPath='/'+images[0];await trigger('message',{data:{type:'PREPARE_OFFLINE'}});assert(messages.some(m=>m.type==='OFFLINE_ERROR'));assert(!await main.match(origin+'/__repclub_offline_status__'),'Partial download is never marked ready');
 failPath=null;await trigger('message',{data:{type:'PREPARE_OFFLINE'}});assert(messages.at(-1).complete);assert.equal(messages.at(-1).done,327);
 let status;await trigger('message',{data:{type:'GET_OFFLINE_STATUS'},source:{postMessage:d=>status=d}});assert(status.complete);
 const before=calls.length;online=false;const shell=await trigger('fetch',{request:{url:origin+'/',method:'GET',mode:'navigate'}});assert((await shell.text()).includes('Repclub'));const picture=await trigger('fetch',{request:{url:origin+'/'+images[0],method:'GET',mode:'cors'}});assert.equal(picture.headers.get('content-type'),'image/webp');assert.equal(calls.length,before,'Offline app shell and images require no network');
 assert.equal(await trigger('fetch',{request:{url:origin+'/sync',method:'POST',mode:'cors'}}),null,'Worker never sends or handles workout uploads');assert.equal(await trigger('fetch',{request:{url:'https://another.example/private',method:'GET',mode:'cors'}}),null,'External requests are outside the worker');
 await main.delete(origin+'/'+images[0]);await trigger('message',{data:{type:'GET_OFFLINE_STATUS'},source:{postMessage:d=>status=d}});assert(!status.complete,'Missing imagery invalidates readiness');
 const manifest=JSON.parse(fs.readFileSync(path.join(dist,'manifest.webmanifest')));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');for(const i of manifest.icons)assert(fs.existsSync(path.join(dist,i.src)));
 const assetList=vm.runInContext('CORE',context);for(const asset of assetList)assert(fs.existsSync(path.join(dist,asset)),asset+' exists');for(const asset of images)assert(fs.existsSync(path.join(dist,asset)));
 const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!match[1].startsWith('http'))assert(fs.existsSync(path.join(dist,match[1])),match[1]+' exists')}
 const css=fs.readFileSync(path.join(dist,'style.css'),'utf8');assert(!css.includes('@import'));assert.equal(css.match(/\{/g).length,css.match(/\}/g).length);
 const source=JSON.parse(fs.readFileSync(path.join(dist,'exercise-sources.json')));for(const e of source.exercises){assert(e.sourceUrl&&e.license&&e.licenseUrl);for(const image of e.images)assert(image.author&&image.license&&image.sourceUrl&&fs.existsSync(path.join(dist,image.src)))}
 console.log('PASS: app and all 327 images cache locally; partial downloads retry; offline navigation and images need no network; no upload route; cache cleanup preserves unrelated data; install manifest, assets, and credits valid.');
})().catch(e=>{console.error(e);process.exitCode=1});
