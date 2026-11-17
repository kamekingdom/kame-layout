// One-time operation for Issue #19. Removed after the audited cleanup run.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {cookieHeader} from '../sync-scrapbox.mjs';
const origin='https://scrapbox.io';
const project='kamelayout';
const manifest=JSON.parse(fs.readFileSync(new URL('./legacy-pages.json',import.meta.url)));
const sha=lines=>crypto.createHash('sha256').update(JSON.stringify(lines)).digest('hex');
const lines=p=>p.lines.map(l=>l.text);
assert.equal(manifest.project,project);
assert.equal(manifest.pages.length,73);
assert.equal(new Set(manifest.pages.map(p=>p.title)).size,73);
for(const p of manifest.pages)assert.ok(/^kame-layout:[a-z-]+$/.test(p.title)&&p.title!=='kame-layout:delivery');
const headers={Cookie:cookieHeader(process.env.SCRAPBOX_SID),Origin:origin,Referer:origin+'/'+project+'/',Accept:'application/json'};
const get=async(path)=>{const r=await fetch(origin+path+'?cleanup='+crypto.randomUUID(),{headers,redirect:'error',signal:AbortSignal.timeout(30000),cache:'no-store'});assert.ok(r.ok,'Read failed: '+r.status);return r.json();};
const page=title=>get('/api/pages/'+project+'/'+encodeURIComponent(title));
async function inventory(){const listing=await get('/api/pages/'+project); assert.ok(listing.count<=listing.limit || listing.count<=100); return listing;}
async function list(){const r=await fetch(origin+'/api/pages/'+project+'?limit=1000&cleanup='+crypto.randomUUID(),{headers,redirect:'error',signal:AbortSignal.timeout(30000)});assert.ok(r.ok);const data=await r.json();assert.equal(data.count,data.pages.length);return data.pages;}
const profile=await get('/api/users/me');assert.ok(profile.id&&!profile.isGuest,'Authentication failed');
const meta=await get('/api/projects/'+project);assert.ok(meta.id&&meta.name===project,'Wrong project');
const listing=await list();const current=[];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<listing.length){const p=listing[cursor++];current.push(await page(p.title));}}));
const candidates=new Map(manifest.pages.map(p=>[p.title,p]));
const remaining=current.filter(p=>!candidates.has(p.title));
assert.equal(remaining.length,97,'Unexpected retained-page count');
assert.ok(remaining.find(p=>p.title==='kame-layout:delivery')?.lines.some(l=>l.text==='kame-layout managed delivery v1'));
for(const p of current.filter(p=>candidates.has(p.title))){const expected=candidates.get(p.title);assert.equal(p.id,expected.id,p.title);assert.equal(sha(lines(p)),expected.sha256,p.title+' changed since backup');}
for(const p of remaining)for(const l of p.lines)assert.ok(!/kame-layout:(?!delivery)/.test(l.text),'Retained page references legacy: '+p.title);
fs.mkdirSync('.cache/legacy-cleanup',{recursive:true});
fs.writeFileSync('.cache/legacy-cleanup/before.scrapbox.json',JSON.stringify({pages:current.map(p=>({title:p.title,lines:lines(p)}))},null,2));
const require=createRequire(process.env.LEGACY_RUNTIME+'/package.json');
const {io}=require('socket.io-client');
const socket=io(origin,{transports:['websocket'],auth:{protocolVersion:2},extraHeaders:headers,reconnection:false,autoConnect:false});
const emit=(event,data)=>new Promise((resolve,reject)=>{socket.timeout(20000).emit(event,data,(error,result)=>{if(error)reject(Error('Socket acknowledgement timeout'));else if(result?.error)reject(Error('Commit rejected: '+result.error.name));else resolve(result.data);});});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Connection timeout')),20000);socket.once('connect',()=>{clearTimeout(timer);resolve();});socket.once('connect_error',()=>{clearTimeout(timer);reject(Error('Socket connection failed'));});socket.connect();});
 for(const expected of manifest.pages){
  const fresh=await page(expected.title);
  if(!fresh.persistent){console.log('Already absent: '+expected.title);continue;}
  assert.equal(fresh.id,expected.id);assert.equal(sha(lines(fresh)),expected.sha256,'Page changed: '+expected.title);
  await emit('commit',{kind:'page',projectId:meta.id,pageId:fresh.id,parentId:fresh.commitId,userId:profile.id,changes:[{deleted:true}],cursor:null,freeze:true});
  assert.equal((await page(expected.title)).persistent,false,'Delete not visible: '+expected.title);
  console.log('Deleted: '+expected.title);
 }
 const final=await list(); assert.equal(final.length,97);assert.deepEqual(final.map(p=>p.title).sort(),remaining.map(p=>p.title).sort());
 for(const expected of remaining){const actual=await page(expected.title);assert.equal(sha(lines(actual)),sha(lines(expected)),'Retained content changed: '+expected.title);}
 const report={project,before:170,after:97,removed:73,retainedPagesUnchanged:97,verified:true};
 fs.writeFileSync('.cache/legacy-cleanup/result.json',JSON.stringify(report,null,2));console.log(report);
}finally{socket.disconnect();}
