import {it,expect,vi} from 'vitest';
import {createPinHandler} from '../supabase/functions/planner-login/handler.js';
import {Backend,mergeConfig} from '../src/workspace/api.js';
const owner='11111111-1111-1111-1111-111111111111';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
const req=(pin='5678',origin='https://kdh044.github.io')=>new Request('https://test.supabase.co/functions/v1/planner-login',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({pin})});
const env={url:'https://test.supabase.co',serviceKey:'server-only-credential'};
it('issues only an owner session after successful server PIN validation without sending email',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(json({ok:true,owner_id:owner})).mockResolvedValueOnce(json({id:owner,email:'owner@test.invalid'})).mockResolvedValueOnce(json({hashed_token:'one-time-server-token',action_link:'must-not-leak',email_otp:'must-not-leak'})).mockResolvedValueOnce(json({access_token:'owner-access',refresh_token:'owner-refresh',expires_in:3600,user:{id:owner,email:'owner@test.invalid'}}));
  const response=await createPinHandler({...env,fetcher})(req());expect(response.status).toBe(200);const body=await response.json();expect(body.user.id).toBe(owner);expect(body.access_token).toBe('owner-access');expect(JSON.stringify(body)).not.toContain('server-only');expect(JSON.stringify(body)).not.toContain('one-time-server-token');expect(JSON.stringify(body)).not.toContain('must-not-leak');expect(response.headers.get('Cache-Control')).toBe('no-store');expect(fetcher.mock.calls.map(x=>x[0])).toEqual([env.url+'/rest/v1/rpc/verify_planner_pin',env.url+'/auth/v1/admin/users/'+owner,env.url+'/auth/v1/admin/generate_link',env.url+'/auth/v1/verify']);expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({type:'magiclink',email:'owner@test.invalid'});expect(JSON.parse(fetcher.mock.calls[3][1].body)).toEqual({type:'magiclink',token_hash:'one-time-server-token'});
});
it('never creates a session for incorrect or locked PIN attempts',async()=>{
  for(const [check,status] of [[{ok:false,retry_after:0},400],[{ok:false,retry_after:900},429]]){const fetcher=vi.fn().mockResolvedValue(json(check));const response=await createPinHandler({...env,fetcher})(req());expect(response.status).toBe(status);expect(fetcher).toHaveBeenCalledTimes(1);expect(await response.text()).not.toContain('access_token');if(status===429)expect(response.headers.get('Retry-After')).toBe('900');}
});
it('rejects malformed PINs and unexpected browser origins before accessing the server',async()=>{
  const fetcher=vi.fn();const handler=createPinHandler({...env,fetcher});expect((await handler(req('bad'))).status).toBe(400);expect((await handler(req('5678','https://unexpected.invalid'))).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
});
it('rejects mismatched owner sessions and hides internal errors',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(json({ok:true,owner_id:owner})).mockResolvedValueOnce(json({id:owner,email:'owner@test.invalid'})).mockResolvedValueOnce(json({hashed_token:'secret-hash'})).mockResolvedValueOnce(json({access_token:'another-access',refresh_token:'another-refresh',user:{id:'another-user'}}));const response=await createPinHandler({...env,fetcher})(req());expect(response.status).toBe(503);expect(await response.text()).not.toContain('another-access');
});
it('posts PIN only to the deployed server endpoint and keeps the normal refresh session',async()=>{
  sessionStorage.clear();const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(json({user:{id:owner},access_token:'token',refresh_token:'refresh',expires_in:3600}));const backend=new Backend({url:env.url,key:'sb_publishable_test',email:'owner@test.invalid',owner,loginMode:'pin'});await backend.login('5678');expect(fetcher.mock.calls[0][0]).toBe(env.url+'/functions/v1/planner-login');expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({pin:'5678'});expect(sessionStorage.getItem('folio:session')).not.toContain('5678');fetcher.mockClear();await expect(backend.login('123')).rejects.toThrow('네 자리');expect(fetcher).not.toHaveBeenCalled();fetcher.mockRestore();sessionStorage.clear();
});
it('does not let old browser configuration turn off the published PIN mode',()=>{expect(mergeConfig({loginMode:'pin'},{loginMode:'password'}).loginMode).toBe('pin');});
