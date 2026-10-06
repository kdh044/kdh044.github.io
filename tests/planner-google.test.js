import {it,expect,vi} from 'vitest';
import {createGoogleHandler,calendarBody,managedId} from '../supabase/functions/planner-google/handler.js';
const owner='e63815c9-ff91-4c68-a3ec-846603083849',origin='https://kdh044.github.io';
const response=(data,status=200)=>new Response(data===null?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function fixture(){
  let connected=true,records={},workspace={tasks:[],events:[],deadlines:[]},profile='danny1321@jbnu.ac.kr';const events=new Map(),writes=[],tokens=[];
  const fetcher=vi.fn(async(url,o={})=>{
    if(url.endsWith('/auth/v1/user'))return response({id:o.headers.Authorization==='Bearer owner-session'?owner:'other'});
    if(url.includes('/rpc/planner_google_connection')){const v=JSON.parse(o.body);if(v.action==='read')return response({client_secret:'test-client-secret',refresh_token:connected?'test-refresh':null,records:structuredClone(records)});if(v.action==='records')records=structuredClone(v.records);if(v.action==='store'){connected=true;tokens.push(v.token);}if(v.action==='disconnect')connected=false;return response({});}
    if(url.includes('/workspaces?'))return response([{content:workspace,revision:1}]);
    if(url==='https://oauth2.googleapis.com/token')return response({access_token:'test-access',refresh_token:'test-refresh'});
    if(url.endsWith('/userinfo'))return response({email:profile,verified_email:true});
    if(url.endsWith('/revoke'))return response(null);
    if(url.startsWith('https://www.googleapis.com/calendar/v3')){expect(o.headers.Authorization).toBe('Bearer test-access');const id=url.split('/events/')[1];if(o.method==='GET')return events.has(id)?response(events.get(id)):response({error:{message:'missing'}},404);const body=o.body?JSON.parse(o.body):null;writes.push({method:o.method,id:id||body.id,body});if(o.method==='DELETE'){events.delete(id);return response(null,204);}events.set(id||body.id,{id:id||body.id,...body});return response(events.get(id||body.id));}
    throw Error(url);
  });
  const handler=createGoogleHandler({url:'https://project.supabase.co',serviceKey:'server-test-key',fetcher});
  const call=(input,extra={})=>handler(new Request('https://project.supabase.co/functions/v1/planner-google',{method:'POST',headers:{Origin:origin,Authorization:'Bearer owner-session','Content-Type':'application/json',...extra},body:JSON.stringify(input)}));
  return {call,fetcher,writes,events,tokens,setWorkspace:v=>workspace=v,setProfile:v=>profile=v,setConnected:v=>connected=v};
}
it('rejects anonymous, other-owner and cross-origin calls before touching connection secrets',async()=>{
  const f=fixture();expect((await f.call({action:'status'},{Authorization:''})).status).toBe(401);expect((await f.call({action:'status'},{Authorization:'Bearer somebody'})).status).toBe(403);expect((await f.call({action:'status'},{Origin:'https://other.invalid'})).status).toBe(403);expect(f.fetcher.mock.calls.some(([url])=>url.includes('/rpc/'))).toBe(false);
});
it('binds persistent authorization to the exact school account and never returns credentials',async()=>{
  const f=fixture();expect((await f.call({action:'connect',code:'test-code'})).status).toBe(400);f.setProfile('someone@gmail.com');expect((await f.call({action:'connect',code:'test-code'},{'X-Requested-With':'XmlHttpRequest'})).status).toBe(403);expect(f.tokens).toEqual([]);f.setProfile('danny1321@jbnu.ac.kr');const r=await f.call({action:'connect',code:'test-code'},{'X-Requested-With':'XmlHttpRequest'});expect(await r.json()).toEqual({connected:true,email:'danny1321@jbnu.ac.kr'});expect(f.tokens).toEqual(['test-refresh']);expect((await f.call({action:'disconnect'})).status).toBe(200);expect(await (await f.call({action:'status'})).json()).toMatchObject({connected:false});
});
it('blocks arbitrary proxy URLs and keeps writes behind the server-owned workspace',async()=>{const f=fixture();for(const path of ['https://evil.invalid','/users/me/settings','/calendars/primary/events/../../other'])expect((await f.call({action:'request',path})).status).toBe(400);expect(f.writes).toEqual([]);});
it('syncs new records, edits and completion once, and deletes only managed projections',async()=>{
  const f=fixture(),task={id:'task-a',title:'Work',date:'2026-10-06',status:'todo'},event={id:'event-a',title:'Meeting',date:'2026-10-07',time:'10:00'};f.setWorkspace({tasks:[task,{id:'undated',title:'Later'}],events:[event]});
  expect(await (await f.call({action:'sync'})).json()).toEqual({synced:2,pending:0});expect(f.writes).toHaveLength(2);expect(f.writes[0].body.summary).toBe('☐ Work');expect(f.writes[1].body.start.dateTime).toBe('2026-10-07T01:00:00.000Z');
  await f.call({action:'sync'});expect(f.writes).toHaveLength(2);task.status='done';task.date='2026-10-08';await f.call({action:'sync'});expect(f.writes.at(-1)).toMatchObject({method:'PATCH',body:{summary:'✓ Work',start:{date:'2026-10-08'}}});
  f.events.set('external',{id:'external',summary:'Keep research lab event'});f.setWorkspace({tasks:[task],events:[]});await f.call({action:'sync'});expect(f.writes.at(-1).method).toBe('DELETE');expect(f.events.has('external')).toBe(true);
});
it('retries interrupted inserts with stable IDs instead of making duplicates',async()=>{expect(await managedId('task','a')).toBe(await managedId('task','a'));expect(await managedId('task','a')).not.toBe(await managedId('event','a'));expect(await managedId('task','a')).toMatch(/^[0-9a-v]{5,1024}$/);const f=fixture(),t={id:'a',title:'Saved',date:'2026-12-31'};f.setWorkspace({tasks:[t],events:[]});const id=await managedId('task','a');f.events.set(id,{id,...calendarBody(t,'task')});await f.call({action:'sync'});expect(f.writes).toHaveLength(1);expect(f.writes[0].method).toBe('PATCH');expect(f.events.size).toBe(1);});
it('continues large batches without losing unsynced items and avoids exporting private plans',async()=>{const f=fixture();f.setWorkspace({tasks:Array.from({length:5},(_,i)=>({id:'task'+i,title:'Work'+i,date:'2026-10-06'})),events:[],dailyPlans:{'2026-10-06':'Private journal'},notes:{'2026-10-06':'Private memo'},habits:[{title:'Private habit'}]});expect(await (await f.call({action:'sync'})).json()).toEqual({synced:3,pending:2});expect(await (await f.call({action:'sync'})).json()).toEqual({synced:2,pending:0});expect(JSON.stringify(f.writes)).not.toContain('Private');});
