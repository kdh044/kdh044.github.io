import {it,expect,vi,afterEach} from 'vitest';
import {connectGoogle,clearGoogle,googleConnected,listGoogleEvents,addGoogleEvent} from '../src/workspace/api.js';
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
function googleMock(result={access_token:'google-test-token',expires_in:3600}){
  const requestAccessToken=vi.fn();window.google={accounts:{oauth2:{revoke:vi.fn(),initTokenClient:vi.fn(opts=>{requestAccessToken.mockImplementation(()=>opts.callback(result));return {requestAccessToken};})}}};return requestAccessToken;
}
afterEach(()=>{clearGoogle();delete window.google;vi.restoreAllMocks();});
it('reads the visible cross-month range and every page, omitting cancelled events',async()=>{
  sessionStorage.clear();localStorage.clear();const consent=googleMock();await connectGoogle('123-test.apps.googleusercontent.com');expect(consent).toHaveBeenCalledWith({prompt:'consent'});
  const f=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(response({items:[{id:'one'},{id:'cancelled',status:'cancelled'}],nextPageToken:'next'})).mockResolvedValueOnce(response({items:[{id:'two'}]}));
  const start=new Date(2026,11,27),end=new Date(2027,0,3);expect((await listGoogleEvents(new Date(2026,11,27),{start,end})).map(e=>e.id)).toEqual(['one','two']);const q=new URL(f.mock.calls[0][0]).searchParams;expect(q.get('timeMin')).toBe(start.toISOString());expect(q.get('timeMax')).toBe(end.toISOString());expect(new URL(f.mock.calls[1][0]).searchParams.get('pageToken')).toBe('next');expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer google-test-token');expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0);
});
it('creates all-day and timed events with correct exclusive ends',async()=>{
  googleMock();await connectGoogle('123-test.apps.googleusercontent.com');const f=vi.spyOn(globalThis,'fetch').mockResolvedValue(response({id:'created'}));await addGoogleEvent({title:'All day',date:'2026-12-31'});let body=JSON.parse(f.mock.calls[0][1].body);expect(body.start).toEqual({date:'2026-12-31'});expect(body.end).toEqual({date:'2027-01-01'});await addGoogleEvent({title:'Timed',date:'2026-12-31',time:'23:30'});body=JSON.parse(f.mock.calls[1][1].body);expect(new Date(body.end.dateTime)-new Date(body.start.dateTime)).toBe(3600000);
});
it('clears an expired token and requires a fresh Google connection',async()=>{
  googleMock();await connectGoogle('123-test.apps.googleusercontent.com');const f=vi.spyOn(globalThis,'fetch').mockResolvedValue(response({error:{message:'expired'}},401));await expect(listGoogleEvents(new Date())).rejects.toThrow('만료');expect(googleConnected()).toBe(false);await expect(listGoogleEvents(new Date())).rejects.toThrow('다시 연결');expect(f).toHaveBeenCalledTimes(1);
});
it('does not establish a connection after declined consent',async()=>{googleMock({error:'access_denied'});await expect(connectGoogle('123-test.apps.googleusercontent.com')).rejects.toThrow('취소');expect(googleConnected()).toBe(false);});

it('explains a deleted OAuth client without treating it as successful consent',async()=>{googleMock({error:'deleted_client'});await expect(connectGoogle('123-test.apps.googleusercontent.com')).rejects.toThrow('클라이언트가 삭제');expect(googleConnected()).toBe(false);});
