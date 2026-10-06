export const uid = () => crypto.randomUUID();
export const escape = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const emptyPortfolio = () => ({name:'',role:'',intro:'',email:'',image:'',accent:'#496954',width:'normal',cover:true,sections:[{id:'work',title:'Projects',blocks:[]},{id:'experience',title:'Experience',blocks:[]},{id:'education',title:'Education',blocks:[]}]});
export const emptyWorkspace = () => ({tasks:[],projects:[],pages:[],events:[],notes:{},dailyPlans:{},weeklyPlans:{},deadlines:[],habits:[],googleImportant:{},categories:['연구','취업','개인'],googleCalendarIds:null,portfolio:emptyPortfolio()});
export function safeURL(v) { try { const u = new URL(v); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch {return '';} }
export function monthCells(d) { const first=new Date(d.getFullYear(),d.getMonth(),1);const start=new Date(first);start.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>{const x=new Date(start);x.setDate(start.getDate()+i);return x;}); }
export function moveItem(items,id,delta) {const at=items.findIndex(x=>x.id===id),to=at+delta;if(at>=0&&to>=0&&to<items.length)[items[at],items[to]]=[items[to],items[at]];}
export function eventOnDay(e,key) {const start=e.start?.dateTime?dateKey(new Date(e.start.dateTime)):(e.start?.date||e.date||''),end=e.end?.dateTime?dateKey(new Date(new Date(e.end.dateTime).getTime()-1)):(e.end?.date||e.date||'');if(e.start?.date)return key>=start&&key<end;return key>=start&&key<=end;}
export function normalizeWorkspace(v) {const e=emptyWorkspace();if(!v||typeof v!=='object')return e;for(const k of ['tasks','projects','pages','events','categories'])if(Array.isArray(v[k]))e[k]=v[k];if(Array.isArray(v.googleCalendarIds))e.googleCalendarIds=[...new Set(v.googleCalendarIds.filter(id=>typeof id==='string'&&id.length>0&&id.length<1024))];if(v.notes&&typeof v.notes==='object')e.notes=v.notes;for(const k of ['dailyPlans','weeklyPlans'])if(v[k]&&typeof v[k]==='object'&&!Array.isArray(v[k]))e[k]=Object.fromEntries(Object.entries(v[k]).filter(([key,text])=>validDateKey(key)&&typeof text==='string'));if(Array.isArray(v.deadlines))e.deadlines=v.deadlines.filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&validDateKey(x.date)).map(x=>({id:x.id,title:x.title,date:x.date}));e.habits=normalizeHabits(v.habits);if(v.googleImportant&&typeof v.googleImportant==='object'&&!Array.isArray(v.googleImportant))e.googleImportant=Object.fromEntries(Object.entries(v.googleImportant).filter(([key,x])=>key.length<2048&&x&&typeof x.title==='string'&&validDateKey(x.date)));if(v.portfolio&&typeof v.portfolio==='object')e.portfolio={...emptyPortfolio(),...v.portfolio};return e;}

export function weekCells(d) {const start=new Date(d.getFullYear(),d.getMonth(),d.getDate());start.setDate(start.getDate()-start.getDay());return Array.from({length:7},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);return day;});}

export function validDateKey(key) {if(typeof key!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(key))return false;const d=new Date(key+'T12:00:00');return !Number.isNaN(d.getTime())&&dateKey(d)===key;}
export function plannerWeek(d=new Date()) {const start=new Date(d.getFullYear(),d.getMonth(),d.getDate());start.setDate(start.getDate()-(start.getDay()+6)%7);return Array.from({length:7},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);return day;});}
export const weekKey=(d=new Date())=>dateKey(plannerWeek(d)[0]);
export function daysUntil(target,today=dateKey()) {if(!validDateKey(target)||!validDateKey(today))return null;const day=k=>{const [y,m,d]=k.split('-').map(Number);return Date.UTC(y,m-1,d);};return Math.round((day(target)-day(today))/86400000);}
export function deadlineLabel(target,today=dateKey()) {const n=daysUntil(target,today);return n===null?'':n===0?'D-day':n>0?'D-'+n:'D+'+Math.abs(n);}

export function monthDates(d=new Date()) {return Array.from({length:new Date(d.getFullYear(),d.getMonth()+1,0).getDate()},(_,i)=>dateKey(new Date(d.getFullYear(),d.getMonth(),i+1)));}
export function normalizeHabits(habits) {return Array.isArray(habits)?habits.filter(h=>h&&typeof h.id==='string'&&typeof h.title==='string').map(h=>({id:h.id,title:h.title,checks:Object.fromEntries(Object.entries(h.checks&&typeof h.checks==='object'?h.checks:{}).filter(([key,value])=>validDateKey(key)&&value===true))})):[];}
export const googleEventDate=e=>e.start?.date|| (e.start?.dateTime?dateKey(new Date(e.start.dateTime)):'');
export function importantItems(w,google=[]) {
  const items=[];
  for(const [kind,list] of [['task',w.tasks],['event',w.events],['project',w.projects]])for(const x of list||[])if(x.important&&x.status!=='done'&&validDateKey(x.date))items.push({id:x.id,kind,title:x.title,date:x.date});
  for(const [key,snapshot] of Object.entries(w.googleImportant||{})){const live=google.find(e=>(e.googleKey||e.id)===key);if(live?.status==='cancelled')continue;const date=live?googleEventDate(live):snapshot.date;if(validDateKey(date))items.push({id:key,kind:'google',title:live?.summary||snapshot.title,date});}
  // Retain existing D-days as important calendar entries; no second input list.
  for(const x of w.deadlines||[])if(!items.some(i=>i.kind==='event'&&i.id===x.id))items.push({...x,kind:'legacy'});
  return items.sort((a,b)=>{const x=daysUntil(a.date),y=daysUntil(b.date);return (x<0)-(y<0)||a.date.localeCompare(b.date);});
}
