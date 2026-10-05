export const uid = () => crypto.randomUUID();
export const escape = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const emptyPortfolio = () => ({name:'',role:'',intro:'',email:'',image:'',accent:'#496954',width:'normal',cover:true,sections:[{id:'work',title:'Projects',blocks:[]},{id:'experience',title:'Experience',blocks:[]},{id:'education',title:'Education',blocks:[]}]});
export const emptyWorkspace = () => ({tasks:[],projects:[],pages:[],events:[],notes:{},categories:['연구','취업','개인'],googleCalendarIds:null,portfolio:emptyPortfolio()});
export function safeURL(v) { try { const u = new URL(v); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch {return '';} }
export function monthCells(d) { const first=new Date(d.getFullYear(),d.getMonth(),1);const start=new Date(first);start.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>{const x=new Date(start);x.setDate(start.getDate()+i);return x;}); }
export function moveItem(items,id,delta) {const at=items.findIndex(x=>x.id===id),to=at+delta;if(at>=0&&to>=0&&to<items.length)[items[at],items[to]]=[items[to],items[at]];}
export function eventOnDay(e,key) {const start=e.start?.dateTime?dateKey(new Date(e.start.dateTime)):(e.start?.date||e.date||''),end=e.end?.dateTime?dateKey(new Date(new Date(e.end.dateTime).getTime()-1)):(e.end?.date||e.date||'');if(e.start?.date)return key>=start&&key<end;return key>=start&&key<=end;}
export function normalizeWorkspace(v) {const e=emptyWorkspace();if(!v||typeof v!=='object')return e;for(const k of ['tasks','projects','pages','events','categories'])if(Array.isArray(v[k]))e[k]=v[k];if(Array.isArray(v.googleCalendarIds))e.googleCalendarIds=[...new Set(v.googleCalendarIds.filter(id=>typeof id==='string'&&id.length>0&&id.length<1024))];if(v.notes&&typeof v.notes==='object')e.notes=v.notes;if(v.portfolio&&typeof v.portfolio==='object')e.portfolio={...emptyPortfolio(),...v.portfolio};return e;}

export function weekCells(d) {const start=new Date(d.getFullYear(),d.getMonth(),d.getDate());start.setDate(start.getDate()-start.getDay());return Array.from({length:7},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);return day;});}
