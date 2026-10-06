const OWNER='e63815c9-ff91-4c68-a3ec-846603083849', EMAIL='danny1321@jbnu.ac.kr';
const CLIENT='559780297433-0fi3qu0r1ein13srpr2umhub4nj23fva.apps.googleusercontent.com';
const ORIGIN='https://kdh044.github.io';
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&!isNaN(new Date(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function calendarBody(item,kind){
  const next=new Date(item.date+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);
  const timed=kind==='event'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.time||'');
  const start=timed?new Date(item.date+'T'+item.time+':00+09:00'):null;
  return {status:'confirmed',summary:kind==='task'?(item.status==='done'?'✓ ':'☐ ')+item.title:item.title,description:item.description||'',
    start:timed?{dateTime:start.toISOString(),timeZone:'Asia/Seoul'}:{date:item.date},
    end:timed?{dateTime:new Date(+start+3600000).toISOString(),timeZone:'Asia/Seoul'}:{date:next.toISOString().slice(0,10)},
    transparency:kind==='task'?'transparent':'opaque',
    extendedProperties:{private:{plannerOwner:OWNER,plannerId:item.id,plannerKind:kind}}};
}
export async function managedId(kind,id){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(OWNER+':'+kind+':'+id));return 'p'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export function createGoogleHandler({url,serviceKey,fetcher=fetch}){
  return async request=>{
    const origin=request.headers.get('Origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-requested-with','Access-Control-Allow-Methods':'POST, OPTIONS'};
    const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
    if(origin&&origin!==ORIGIN)return reply({message:'허용되지 않은 요청입니다.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply({message:'POST 요청이 필요합니다.'},405);
    try{
      const auth=request.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return reply({message:'로그인이 필요합니다.'},401);
      const userRes=await fetcher(url+'/auth/v1/user',{headers:{apikey:serviceKey,Authorization:auth},signal:AbortSignal.timeout(10000)});
      const user=await userRes.json();if(!userRes.ok||user.id!==OWNER)return reply({message:'접근 권한이 없습니다.'},403);
      const text=await request.text();if(text.length>16000)return reply({message:'요청이 너무 큽니다.'},400);const input=JSON.parse(text);
      const db=async(path,body,method='POST')=>{const r=await fetcher(url+'/rest/v1/'+path,{method,headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('연결 저장소 요청이 실패했습니다.');return r.json();};
      const connection=(action,extra={})=>db('rpc/planner_google_connection',{action,owner_id:OWNER,...extra});
      const secrets=await connection('read');
      if(input.action==='status')return reply({connected:!!secrets.refresh_token,email:EMAIL});
      const tokenRequest=async(values)=>{const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT,client_secret:secrets.client_secret,...values}),signal:AbortSignal.timeout(15000)});const v=await r.json();if(!r.ok){const e=Error('Google 권한이 만료되었거나 취소되었습니다. 다시 연결해주세요.');e.status=428;throw e;}return v;};
      if(input.action==='connect'){
        if(origin!==ORIGIN||request.headers.get('X-Requested-With')!=='XmlHttpRequest'||typeof input.code!=='string')return reply({message:'잘못된 승인 요청입니다.'},400);
        if(!secrets.client_secret)return reply({message:'Google 서버 설정이 필요합니다.'},503);
        const token=await tokenRequest({code:input.code,grant_type:'authorization_code',redirect_uri:ORIGIN});
        const profile=await fetcher('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(10000)});const account=await profile.json();
        if(!profile.ok||account.email!==EMAIL||!account.verified_email){await fetcher('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:token.refresh_token||token.access_token})});return reply({message:EMAIL+' 계정으로 승인해주세요.'},403);}
        if(!token.refresh_token&&!secrets.refresh_token)return reply({message:'연결 유지 권한을 받지 못했습니다. 다시 승인해주세요.'},428);
        if(token.refresh_token)await connection('store',{token:token.refresh_token});return reply({connected:true,email:EMAIL});
      }
      if(!secrets.refresh_token)return reply({message:'Google 연결을 한 번 승인해주세요.'},428);
      if(input.action==='disconnect'){await fetcher('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:secrets.refresh_token}),signal:AbortSignal.timeout(10000)});await connection('disconnect');return reply({connected:false});}
      const token=await tokenRequest({refresh_token:secrets.refresh_token,grant_type:'refresh_token'});
      const google=async(path,method='GET',body)=>{const r=await fetcher('https://www.googleapis.com/calendar/v3'+path,{method,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});const v=await r.json().catch(()=>null);if(!r.ok){const e=Error(v?.error?.message||'Google 동기화가 실패했습니다.');e.status=r.status;throw e;}return v;};
      if(input.action==='request'){
        // The browser can read calendars, but all writes use server-loaded planner records.
        if(typeof input.path!=='string'||input.path.length>6000||!/^\/(users\/me\/calendarList|calendars\/[^/?]+\/events(?:\/[^/?]+)?)(?:\?[^#]*)?$/.test(input.path)||input.path.includes('..'))return reply({message:'허용되지 않은 캘린더 요청입니다.'},400);
        return reply(await google(input.path));
      }
      if(input.action!=='sync')return reply({message:'잘못된 요청입니다.'},400);
      const rows=await db('workspaces?owner_id=eq.'+OWNER+'&select=content,revision',undefined,'GET');if(!rows.length)return reply({pending:0,synced:0});
      const w=rows[0].content, records={...(secrets.records||{})},items=[];
      for(const [kind,list] of [['task',w.tasks],['event',w.events],['event',w.deadlines]])for(const item of list||[])if(item&&typeof item.id==='string'&&typeof item.title==='string'&&item.title.trim()&&dateOK(item.date)&&!items.some(x=>x.key===kind+':'+item.id))items.push({key:kind+':'+item.id,item,kind});
      const wanted=new Set(items.map(x=>x.key));let synced=0,pending=0;
      for(const {key,item,kind} of items){
        const body=calendarBody(item,kind),fingerprint=JSON.stringify(body);if(records[key]?.fingerprint===fingerprint)continue;if(synced>=3){pending++;continue;}
        const id=await managedId(kind,item.id),path='/calendars/primary/events/'+id;let existing=null;
        try{existing=await google(path);}catch(e){if(![404,410].includes(e.status))throw e;}
        if(existing&&existing.extendedProperties?.private?.plannerOwner!==OWNER)throw Error('Google 일정 소유 정보가 일치하지 않습니다.');
        if(existing&&existing.status!=='cancelled')await google(path,'PATCH',body);
        else {try{await google('/calendars/primary/events','POST',{id,...body});}catch(e){if(e.status!==409)throw e;await google(path,'PATCH',body);}}
        records[key]={id,fingerprint};synced++;await connection('records',{records});
      }
      for(const [key,record] of Object.entries(records))if(!wanted.has(key)){
        if(synced>=3){pending++;continue;}
        // Only remove this app's deterministic projection, never unrelated calendar events.
        const [kind,...parts]=key.split(':'),id=await managedId(kind,parts.join(':'));if(record.id!==id)continue;
        try{const e=await google('/calendars/primary/events/'+id);if(e.extendedProperties?.private?.plannerOwner===OWNER)await google('/calendars/primary/events/'+id,'DELETE');}catch(e){if(![404,410].includes(e.status))throw e;}
        delete records[key];synced++;await connection('records',{records});
      }
      return reply({synced,pending});
    }catch(error){return reply({message:error.status===428?error.message:'Google 동기화: '+error.message},error.status===428?428:502);}
  };
}
