import {it,expect,vi} from 'vitest';
const owner='11111111-1111-1111-1111-111111111111';
const wait=()=>new Promise(r=>setTimeout(r,60));
const response=(v,status=200)=>({ok:status<400,status,json:async()=>v});
it('restores Google after PIN login and sends shared daily records after saving, preserving data on Google errors',async()=>{
  localStorage.clear();sessionStorage.clear();location.hash='#/planner';document.body.innerHTML='<div id="app"></div><div id="modal-root"></div><div id="toast"></div>';
  let stored=null,revision=0,fail=false;const synced=[];const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,o={})=>{
    if(url==='/config.json')return response({url:'https://test.supabase.co',key:'sb_publishable_test',email:'school@jbnu.ac.kr',owner,loginMode:'pin',googlePersistent:true});
    if(url.includes('/planner-login'))return response({user:{id:owner},access_token:'test-session',refresh_token:'test-session-refresh',expires_in:3600});
    if(url.includes('/planner-google')){expect(o.headers.Authorization).toBe('Bearer test-session');const v=JSON.parse(o.body);if(v.action==='status')return response({connected:true});if(v.action==='request')return response({items:v.path.includes('calendarList')?[{id:'school',primary:true,accessRole:'owner'}]:[]});if(v.action==='sync'){synced.push(structuredClone(stored));return fail?response({message:'Temporary Google error'},502):response({synced:1,pending:0});}throw Error(v.action);}
    if(url.includes('/workspaces')){if(o.method==='GET')return response(stored?[{content:stored,revision}]:[]);const v=JSON.parse(o.body);stored=v.content;revision=v.revision;return response([{content:stored,revision}]);}
    if(url.includes('/portfolio'))return response([]);if(url.includes('/auth/v1/logout'))return response(null);throw Error(url);
  });
  await import('../src/main.js');await wait();const login=document.querySelector('#login-form');login.elements.password.value='5678';login.dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:login.querySelector('button')}));await wait();expect(document.querySelector('#google-sync-status').textContent).toContain('Google 연결됨');expect(document.querySelector('.workspace-content h1')).toBeNull();
  const add=(selector,title)=>{const form=document.querySelector(selector);form.elements.title.value=title;form.dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:form.querySelector('button')}));};
  add('[data-task-composer]','Shared task');add('[data-event-composer]','Shared event');document.querySelector('[data-action="save"]').click();await wait();expect(synced.at(-1).tasks[0].title).toBe('Shared task');expect(synced.at(-1).events[0].title).toBe('Shared event');
  document.querySelector('[data-action="view:weekly"]').click();await wait();expect(document.querySelector('.weekly-todos').textContent).toContain('Shared event');expect([...document.querySelectorAll('.task-title')].map(x=>x.value)).toContain('Shared task');
  fail=true;document.querySelector('[data-action="task-toggle:'+stored.tasks[0].id+'"]').click();document.querySelector('[data-action="save"]').click();await wait();expect(stored.tasks[0].status).toBe('done');expect(document.querySelector('#save-status').textContent).toBe('저장됨');expect(document.querySelector('#google-sync-status').textContent).toContain('재시도');
  fail=false;document.querySelector('#google-sync-status').click();await wait();expect(document.querySelector('#google-sync-status').textContent).toContain('연결됨');expect(synced.at(-1).tasks[0].status).toBe('done');
  document.querySelector('[data-action="logout"]').click();await wait();expect(document.querySelector('#login-form')).not.toBeNull();expect(fetcher.mock.calls.some(([,o])=>o.body&&JSON.parse(o.body).action==='disconnect')).toBe(false);fetcher.mockRestore();
});
