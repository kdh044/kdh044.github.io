import {it,expect,vi} from 'vitest';
const owner='11111111-1111-1111-1111-111111111111';
const wait=()=>new Promise(r=>setTimeout(r,40));
const response=(v,status=200)=>({ok:status<400,status,json:async()=>v});
const click=action=>{const b=document.querySelector(`[data-action="${action}"]`);expect(b).not.toBeNull();b.click();};
const submit=()=>{const f=document.querySelector('dialog form');const b=f.querySelector('[type=submit]');f.dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:b}));};
it('keeps planner private and empty, then allows real editing and explicit portfolio publication',async()=>{
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
  localStorage.clear();sessionStorage.clear();window.location.hash='#/';
  document.body.innerHTML='<div id="app"></div><div id="modal-root"></div><div id="toast"></div>';
  let stored=null,revision=0,published=null;const privateReads=[];
  const f=vi.spyOn(globalThis,'fetch').mockImplementation(async(url,o={})=>{
    if(url==='/config.json')return response({url:'https://test.supabase.co',key:'sb_publishable_test',email:'owner@test.invalid',owner});
    if(url.includes('/auth/v1/token'))return response({user:{id:owner},access_token:'token',refresh_token:'refresh',expires_in:3600});
    if(url.includes('/auth/v1/logout'))return response(null);
    if(url.includes('/workspaces')){expect(o.headers.Authorization).toBe('Bearer token');if(!o.method||o.method==='GET'){privateReads.push(url);return response(stored?[{content:stored,revision}]:[]);}const data=JSON.parse(o.body);stored=data.content;revision=data.revision;return response([{content:stored,revision}]);}
    if(url.includes('/portfolio')){if(o.method==='POST'){published=JSON.parse(o.body).content;return response(null);}return response(published?[{content:published}]:[]);}throw Error(url);
  });
  await import('../src/main.js');await wait();
  expect(document.querySelector('.portfolio')).not.toBeNull();expect(document.querySelector('.profile-content h1')).toBeNull();expect(privateReads.length).toBe(0);expect(document.querySelector('[placeholder]')).toBeNull();
  window.location.hash='#/planner';window.dispatchEvent(new Event('hashchange'));await wait();expect(document.querySelector('#login-form')).not.toBeNull();expect(privateReads.length).toBe(0);
  const login=document.querySelector('#login-form');login.elements.password.value='test-password';login.dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:login.querySelector('button')}));await wait();
  expect(document.querySelector('.workspace-shell')).not.toBeNull();expect(document.querySelector('.focus-number').textContent).toContain('0');
  click('new-task');expect(document.querySelector('dialog input[name=title]').value).toBe('');document.querySelector('dialog input[name=title]').value='<script>private task</script>';submit();await wait();expect(document.querySelector('.task-title').textContent).toBe('<script>private task</script>');expect(document.querySelector('.task-title script')).toBeNull();
  click('save');await wait();expect(document.querySelector('#toast').textContent).not.toContain('is not defined');expect(stored,document.querySelector('#toast').textContent+' '+document.querySelector('#save-status').textContent).not.toBeNull();expect(stored.tasks[0].title).toBe('<script>private task</script>');
  click('new-page');document.querySelector('dialog input[name=title]').value='Private note';submit();await wait();click('new-block');document.querySelector('dialog textarea[name=text]').value='Private page body';submit();await wait();expect(document.querySelector('.document-blocks').textContent).toContain('Private page body');
  click('portfolio');const name=document.querySelector('.portfolio-form input[name=name]');name.value='Published name';name.dispatchEvent(new Event('input',{bubbles:true}));click('save');await wait();expect(published).toBeNull();click('publish');await wait();expect(published.name).toBe('Published name');expect(JSON.stringify(published)).not.toContain('Private page body');
  click('logout');await wait();expect(document.querySelector('#login-form')).not.toBeNull();expect(document.body.textContent).not.toContain('Private page body');expect(sessionStorage.length).toBe(0);expect(localStorage.getItem('folio:workspace')).toBeNull();
  window.location.hash='#/';window.dispatchEvent(new Event('hashchange'));await wait();expect(document.querySelector('.profile-content h1').textContent).toBe('Published name');expect(document.body.textContent).not.toContain('private task');f.mockRestore();
});
