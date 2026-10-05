const CONFIG_KEY='folio:connection',SESSION_KEY='folio:session';
export const readConfig=()=>{try{return JSON.parse(localStorage.getItem(CONFIG_KEY))||{};}catch{return {};}};
export function writeConfig(c) {
  const u=new URL(c.url);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co'))throw Error('Supabase 프로젝트 URL을 확인해주세요.');
  if(!c.key||!c.email||!c.owner)throw Error('공개 키, 계정 이메일, 사용자 UID가 필요합니다.');
  if(c.key.startsWith('sb_secret_'))throw Error('공개 publishable 또는 anon 키만 사용할 수 있습니다.');
  try{const payload=JSON.parse(atob(c.key.split('.')[1]));if(payload.role==='service_role')throw Error('secret');}catch(e){if(e.message==='secret')throw Error('service_role 키는 사용할 수 없습니다.');}
  if(!/^[0-9a-f-]{36}$/i.test(c.owner))throw Error('사용자 UID를 확인해주세요.');localStorage.setItem(CONFIG_KEY,JSON.stringify({...c,url:u.origin}));
}
export function mergeConfig(shared={},local={}) {
  const published=typeof shared.googleClientId==='string'?shared.googleClientId.trim():'';
  const browser=typeof local.googleClientId==='string'?local.googleClientId.trim():'';
  const deliberateOverride=local.googleBaseClientId===(published||'');
  return {...shared,...local,googleClientId:published&&(!deliberateOverride||!browser)?published:(browser||published)};
}
export const configured=c=>Boolean(c.url&&c.key&&c.email&&c.owner);
export class Backend {
  constructor(c){this.config=c;this.session=null;this.revision=null;this.exists=false;this.epoch=0;}
  async request(path,{method='GET',body,auth=true,headers={}}={}) {
    if(!configured(this.config))throw Error('연결 설정이 필요합니다.');if(auth&&!this.session)throw Error('로그인이 필요합니다.');
    if(auth&&this.session.expires_at<Date.now()/1000+30)await this.refresh();
    const res=await fetch(this.config.url+path,{method,headers:{apikey:this.config.key,'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${this.session.access_token}`} : {}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    const data=await res.json().catch(()=>null);if(!res.ok){const e=new Error(res.status===401?'로그인이 만료되었습니다. 다시 로그인해주세요.':data?.message||data?.error_description||'요청을 완료하지 못했습니다.');e.status=res.status;throw e;}return data;
  }
  setSession(s){if(s?.user?.id!==this.config.owner)throw Error('이 계정에는 접근 권한이 없습니다.');this.session={...s,expires_at:s.expires_at||Date.now()/1000+s.expires_in};sessionStorage.setItem(SESSION_KEY,JSON.stringify(this.session));}
  async login(password){const s=await this.request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email:this.config.email,password}});this.setSession(s);}
  async refresh(){if(!this.session?.refresh_token)throw Error('다시 로그인해주세요.');const epoch=this.epoch;const s=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:this.session.refresh_token}});if(epoch!==this.epoch)throw Error('로그아웃되었습니다.');this.setSession(s);}
  async restore(){try{const s=JSON.parse(sessionStorage.getItem(SESSION_KEY));if(!s)return false;this.setSession(s);const u=await this.request('/auth/v1/user');if(u.id!==this.config.owner)throw Error('권한 없음');return true;}catch{this.clear();return false;}}
  clear(){this.epoch++;this.session=null;this.exists=false;this.revision=null;sessionStorage.removeItem(SESSION_KEY);}
  async logout(){try{if(this.session)await this.request('/auth/v1/logout',{method:'POST'});}finally{this.clear();}}
  async publicPortfolio(){if(!configured(this.config))return null;const rows=await this.request('/rest/v1/portfolio?id=eq.main&select=content',{auth:false});return rows?.[0]?.content||null;}
  async load(){const rows=await this.request(`/rest/v1/workspaces?owner_id=eq.${this.config.owner}&select=content,revision`);this.exists=Boolean(rows?.length);this.revision=rows?.[0]?.revision||0;return rows?.[0]?.content||null;}
  async save(content){const revision=this.revision+1;const rows=await this.request(`/rest/v1/workspaces${this.exists?`?owner_id=eq.${this.config.owner}&revision=eq.${this.revision}`:''}`,{method:this.exists?'PATCH':'POST',body:this.exists?{content,revision}:{owner_id:this.config.owner,content,revision},headers:{Prefer:'return=representation'}});if(!rows?.length)throw Error('다른 기기에서 변경되었습니다. 백업을 내보낸 후 새로고침해주세요.');this.exists=true;this.revision=revision;}
  async publish(content){await this.request('/rest/v1/portfolio?on_conflict=id',{method:'POST',body:{id:'main',owner_id:this.config.owner,content},headers:{Prefer:'resolution=merge-duplicates'}});}
}
let googleToken=null,googleExpiry=0,googleLoader=null;
export const googleConnected=()=>Boolean(googleToken&&googleExpiry>Date.now());
export function clearGoogle(){if(googleToken&&window.google?.accounts?.oauth2)window.google.accounts.oauth2.revoke(googleToken,()=>{});googleToken=null;googleExpiry=0;}
export function prepareGoogle(){
  if(window.google?.accounts?.oauth2)return Promise.resolve();
  if(!googleLoader)googleLoader=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
    const timer=setTimeout(()=>{s.remove();googleLoader=null;reject(Error('Google 로그인 도구를 불러오지 못했습니다. 다시 연결해주세요.'));},15000);
    s.onload=()=>{clearTimeout(timer);if(window.google?.accounts?.oauth2)resolve();else{googleLoader=null;reject(Error('Google 로그인 도구를 확인할 수 없습니다.'));}};
    s.onerror=()=>{clearTimeout(timer);s.remove();googleLoader=null;reject(Error('Google 로그인 도구를 불러오지 못했습니다.'));};document.head.append(s);
  });return googleLoader;
}
export async function connectGoogle(clientId){
  if(!clientId)throw Error('설정에서 Google OAuth Client ID를 입력해주세요.');
  if(!window.google?.accounts?.oauth2)await prepareGoogle();
  await new Promise((resolve,reject)=>{const client=window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly',include_granted_scopes:true,callback:r=>{if(r.error){reject(Error(r.error==='deleted_client'?'Google OAuth 클라이언트가 삭제되었습니다. 연결 설정의 Client ID를 확인해주세요.':'Google 캘린더 연결이 취소되었습니다.'));return;}googleToken=r.access_token;googleExpiry=Date.now()+r.expires_in*1000;resolve();},error_callback:()=>reject(Error('Google 로그인 창이 닫혔습니다.'))});client.requestAccessToken({prompt:'consent'});});
}
async function googleRequest(path,options={}){if(!googleConnected())throw Error('Google 캘린더를 다시 연결해주세요.');const res=await fetch('https://www.googleapis.com/calendar/v3'+path,{...options,headers:{Authorization:`Bearer ${googleToken}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});const v=await res.json().catch(()=>null);if(!res.ok){if(res.status===401){googleToken=null;googleExpiry=0;throw Error('Google 연결이 만료되었습니다. 다시 연결해주세요.');}throw Error(v?.error?.message||'Google 캘린더 요청이 실패했습니다.');}return v;}
export async function listGoogleCalendars(){
  let calendars=[],next;
  do{const p=new URLSearchParams({minAccessRole:'reader',showHidden:'true',maxResults:'250',...(next?{pageToken:next}:{})});const r=await googleRequest('/users/me/calendarList?'+p);calendars.push(...(r.items||[]));next=r.nextPageToken;}while(next);
  return calendars.filter(c=>!c.deleted&&['owner','writer','writerWithoutPrivateAccess','reader'].includes(c.accessRole)).sort((a,b)=>Number(Boolean(b.primary))-Number(Boolean(a.primary))||(a.summaryOverride||a.summary||'').localeCompare(b.summaryOverride||b.summary||'','ko'));
}
export const googleEventKey=(calendarId,eventId)=>encodeURIComponent(JSON.stringify([calendarId,eventId]));
export async function listGoogleEvents(month,range,calendar={id:'primary'}){
  const start=range?.start||new Date(month.getFullYear(),month.getMonth(),1),end=range?.end||new Date(month.getFullYear(),month.getMonth()+1,1);let events=[],next;
  do{const p=new URLSearchParams({timeMin:start.toISOString(),timeMax:end.toISOString(),singleEvents:'true',orderBy:'startTime',maxResults:'2500',...(next?{pageToken:next}:{})});const r=await googleRequest('/calendars/'+encodeURIComponent(calendar.id)+'/events?'+p);events.push(...(r.items||[]));next=r.nextPageToken;}while(next);
  return events.filter(x=>x.status!=='cancelled').map(e=>({...e,googleKey:googleEventKey(calendar.id,e.id),calendarId:calendar.id,calendarName:calendar.summaryOverride||calendar.summary||'Google Calendar',calendarColor:calendar.backgroundColor||''}));
}
export async function addGoogleEvent(e){const next=new Date(e.date+'T12:00:00');next.setDate(next.getDate()+1);return googleRequest('/calendars/primary/events',{method:'POST',body:JSON.stringify({summary:e.title,description:e.description||'',start:e.time?{dateTime:new Date(e.date+'T'+e.time).toISOString()}:{date:e.date},end:e.time?{dateTime:new Date(new Date(e.date+'T'+e.time).getTime()+60*60*1000).toISOString()}:{date:next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(next.getDate()).padStart(2,'0')}})});}
