const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const base=path.resolve(__dirname,'..');
const listeners={};
const nodes={};
function node(){return {innerHTML:'',textContent:'',style:{setProperty(){}},classList:{toggle(){},remove(){}},addEventListener(){},showModal(){this.open=true},close(){this.open=false},querySelector(){return null},querySelectorAll(){return []}};}
for(const key of ['#app','#toast','#modal','#modal-content','.save-status'])nodes[key]=node();
const document={querySelector:s=>nodes[s]||null,querySelectorAll:()=>[],documentElement:node(),head:{append(){}},addEventListener:(key,fn)=>(listeners[key]??=[]).push(fn),visibilityState:'visible',createElement:()=>({click(){}})};
const store=()=>({getItem:()=>null,setItem(){},removeItem(){}});
const context=vm.createContext({console,document,window:{SPACE_CONFIG:{},addEventListener(){}},location:{hash:'',href:'https://kdh044.github.io/'},localStorage:store(),sessionStorage:store(),navigator:{},crypto:webcrypto,URL,URLSearchParams,Blob,Date,Intl,JSON,Math,Set,Number,String,Object,Array,atob,confirm:()=>true,setTimeout:()=>1,clearTimeout(){},FormData:class{constructor(form){this.values=form.values;}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]();}},fetch:()=>{throw new Error('Unexpected network request')}});
vm.runInContext(fs.readFileSync(path.join(base,'app.js'),'utf8'),context);
const run=code=>vm.runInContext(code,context);
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS',name);}
async function click(action,extra={}){await listeners.click[0]({target:{closest:()=>({dataset:{action,...extra}})}});}
async function submit(id,values,dataset={}){const form={id,values,dataset,querySelector(){return null}};await listeners.submit[0]({target:form,preventDefault(){}});}
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 check('public template has no personal content',()=>{assert.equal(run('state.profile.name'),'');assert.equal(run('state.profile.bio'),'');assert.equal(run('state.profile.projects.length'),0);assert(!nodes['#app'].innerHTML.includes('placeholder='));});
 check('private routes require login',()=>{context.location.hash='#pages';run('render()');assert(nodes['#app'].innerHTML.includes('id="login-form"'));assert(!nodes['#app'].innerHTML.includes('document-title'));});
 await click('preview');
 check('preview begins completely empty',()=>{for(const key of ['tasks','projects','pages','categories'])assert.equal(run(`state.data.${key}.length`),0);assert.equal(run('state.data.note'),'');});
 for(const route of ['today','projects','calendar','pages','settings']){context.location.hash='#'+route;run('render()');check('render '+route,()=>{assert(nodes['#app'].innerHTML.includes('class="workspace'));assert(!nodes['#app'].innerHTML.includes('placeholder='));});fs.writeFileSync(path.join(base,'..','qa',route+'.html'),nodes['#app'].innerHTML);}
 context.location.hash='#today';
 await submit('quick-task',{title:'<script>alert(1)</script>'});
 check('task add escapes user input',()=>{assert.equal(run('state.data.tasks.length'),1);assert(nodes['#app'].innerHTML.includes('&lt;script&gt;'));assert(!nodes['#app'].innerHTML.includes('<script>alert'));});
 await submit('project-form',{title:'unit-project',description:'',due:'',categoryId:'',color:'#4b63df'},{id:''});
 check('project creation stores structured fields',()=>assert.equal(run('state.data.projects[0].title'),'unit-project'));
 context.location.hash='#pages';run('render()');await click('add-page');await click('add-block',{type:'check'});
 check('page and empty block creation',()=>{assert.equal(run('state.data.pages.length'),1);assert.equal(run('currentPage().blocks[0].text'),'');assert.equal(run('currentPage().title'),'');});
 run("state.events=[{id:'g',summary:'event',start:{date:'2026-10-05'},end:{date:'2026-10-07'}}]");
 check('Google all-day exclusive end date',()=>{assert.equal(run("eventsOn('2026-10-05').filter(e=>e.source!=='task').length"),1);assert.equal(run("eventsOn('2026-10-06').filter(e=>e.source!=='task').length"),1);assert.equal(run("eventsOn('2026-10-07').filter(e=>e.source!=='task').length"),0);});
 check('import normalizes unsafe colors/types/order',()=>{const normalized=run("normalizeData({tasks:[],projects:[],categories:[{id:'x',name:'',color:'red;position:fixed'}],pages:[{id:'p',blocks:[{id:'b',type:'<script>',text:''}]}],settings:{accent:'bad',dashboard:['tasks','tasks','tasks','tasks']}})");assert.equal(normalized.settings.accent,'#4b63df');assert.equal(normalized.categories[0].color,'#4b63df');assert.equal(normalized.pages[0].blocks[0].type,'text');assert.equal(new Set(normalized.settings.dashboard).size,4);});
 check('unsafe URLs rejected',()=>assert.equal(run("safeUrl('javascript:alert(1)')"),'#'));
 check('private keys rejected by setup',()=>assert.throws(()=>run("validateConfig({supabaseUrl:'https://unit.supabase.co',supabaseKey:'sb_secret_unit'})")));
 run("state.preview=false;state.user={id:'owner'};state.revision=2;state.dirty=true;state.generation=1;state.data.note='retained'");
 function mockDb(result){context.mockResult=result;run("state.db={from:()=>({update:()=>({eq:()=>({eq:()=>({select:async()=>mockResult})})})})}");}
 mockDb({data:null,error:{message:'network'}});await run('flush()');
 check('failed save retains unsaved data',()=>{assert.equal(run('state.data.note'),'retained');assert.equal(run('state.dirty'),true);assert(run('state.status').startsWith('저장 실패'));});
 mockDb({data:[],error:null});await run('flush()');
 check('stale revision prevents overwriting remote changes',()=>{assert.equal(run('state.conflict'),true);assert.equal(run('state.revision'),2);assert.equal(run('state.dirty'),true);});
 run('state.conflict=false');mockDb({data:[{revision:3}],error:null});await run('flush()');
 check('successful save advances revision',()=>{assert.equal(run('state.revision'),3);assert.equal(run('state.dirty'),false);});
 let resolveSave;context.pendingSave=new Promise(resolve=>resolveSave=resolve);run("state.dirty=true;state.db={from:()=>({update:()=>({eq:()=>({eq:()=>({select:()=>pendingSave})})})})}");const pending=run('flush()');run("state.generation++;state.data.note='new edit'");resolveSave({data:[{revision:4}],error:null});await pending;
 check('edits during a save remain pending',()=>{assert.equal(run('state.dirty'),true);assert.equal(run('state.status'),'저장 대기');});
 run('clearPrivate()');
 check('logout clears all private memory',()=>{assert.equal(run('state.data'),null);assert.equal(run('state.events.length'),0);assert.equal(run('state.token'),null);});
 const raw=fs.readFileSync(path.join(base,'supabase/functions/pin-login/index.ts'),'utf8');
 let handler,verdict='invalid';
 const admin={rpc:async()=>({data:verdict,error:null}),from:()=>({select:()=>({eq:()=>({single:async()=>({data:{owner_id:'owner'},error:null})})})}),auth:{admin:{getUserById:async()=>({data:{user:{email:'unit@example.invalid'}},error:null}),generateLink:async()=>({data:{properties:{hashed_token:'unit-hash'}},error:null})},verifyOtp:async()=>({data:{user:{id:'owner'},session:{access_token:'unit-access',refresh_token:'unit-refresh'}},error:null})}};
 const edge=vm.createContext({createClient:()=>admin,Deno:{env:{get:key=>({SITE_ORIGIN:'https://kdh044.github.io',SUPABASE_URL:'unit',SUPABASE_SERVICE_ROLE_KEY:'private-server-only'}[key])},serve:fn=>handler=fn},Response,Request,JSON,Number});
 const js=raw.replace(/^import .*;\n/,'').replace('(request: Request)','(request)').replace('(status: number, body: unknown)','(status, body)').replaceAll("Deno.env.get('SUPABASE_URL')!","Deno.env.get('SUPABASE_URL')").replaceAll("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!","Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
 vm.runInContext(js,edge);
 const request=(origin='https://kdh044.github.io',body='{"pin":"unit"}')=>new Request('https://unit.supabase.co/functions/v1/pin-login',{method:'POST',headers:{origin,'Content-Type':'application/json'},body});
 let response=await handler(request('https://other.invalid'));check('PIN function rejects other origins',()=>assert.equal(response.status,403));
 response=await handler(request());check('wrong PIN does not issue a session',()=>assert.equal(response.status,401));
 verdict='locked';response=await handler(request());check('locked PIN does not issue a session',()=>assert.equal(response.status,423));
 verdict='ok';response=await handler(request());const session=await response.json();check('verified PIN issues owner session',()=>{assert.equal(response.status,200);assert.equal(session.access_token,'unit-access');assert(!JSON.stringify(session).includes('private-server-only'));});
 check('PIN hash is not readable from public roles',()=>{const sql=fs.readFileSync(path.join(base,'supabase/schema.sql'),'utf8');assert(sql.includes('for update;'));assert(sql.includes('failures+1>=5'));assert(sql.includes('revoke all on private.pin_guard from public,anon,authenticated'));assert(sql.includes('revoke all on function public.check_private_pin(text) from public,anon,authenticated'));});
 console.log(`\n${passed} checks passed. Live account integrations remain untested.`);
})().catch(error=>{console.error(error);process.exitCode=1});
