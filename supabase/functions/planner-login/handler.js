// PIN and administrative credentials stay on the server. No email is sent.
export function createPinHandler({url,serviceKey,fetcher=fetch,allowedOrigins=['https://kdh044.github.io','http://localhost:5173']}) {
  return async request => {
    const origin=request.headers.get('origin');
    const allowed=!origin||allowedOrigins.includes(origin);
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'content-type, apikey, authorization','Access-Control-Allow-Methods':'POST, OPTIONS'};
    const reply=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
    if(!allowed)return reply({message:'허용되지 않은 요청입니다.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply({message:'POST 요청이 필요합니다.'},405,{'Allow':'POST, OPTIONS'});
    if(!url||!serviceKey)return reply({message:'로그인 서버 설정을 확인해주세요.'},503);
    let input;
    try {const body=await request.text();if(body.length>128)return reply({message:'PIN 네 자리를 입력해주세요.'},400);input=JSON.parse(body);}catch{return reply({message:'PIN 네 자리를 입력해주세요.'},400);}
    if(typeof input?.pin!=='string'||!/^\d{4}$/.test(input.pin))return reply({message:'PIN 네 자리를 입력해주세요.'},400);
    const serverRequest=async(path,body,method='POST')=>{
      const response=await fetcher(url+path,{method,headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('Backend request failed');
      return response.json();
    };
    try {
      const check=await serverRequest('/rest/v1/rpc/verify_planner_pin',{pin:input.pin});
      if(check.retry_after>0){const seconds=Math.min(900,Math.max(1,Math.ceil(check.retry_after)));return reply({message:`입력 시도 횟수를 초과했습니다. ${Math.ceil(seconds/60)}분 후 다시 시도해주세요.`,retry_after:seconds},429,{'Retry-After':String(seconds)});}
      if(!check.ok)return reply({message:check.configured===false?'PIN 로그인 설정을 확인해주세요.':'PIN이 일치하지 않습니다.'},check.configured===false?503:400);
      if(typeof check.owner_id!=='string'||!/^[-0-9a-f]{36}$/i.test(check.owner_id))throw Error('Owner missing');
      const account=await serverRequest('/auth/v1/admin/users/'+check.owner_id,undefined,'GET');
      if(account.id!==check.owner_id||!account.email)throw Error('Owner mismatch');
      const link=await serverRequest('/auth/v1/admin/generate_link',{type:'magiclink',email:account.email});
      if(!link.hashed_token)throw Error('No verification token');
      // The verification hash is exchanged here and is never returned to the browser.
      const session=await serverRequest('/auth/v1/verify',{type:'magiclink',token_hash:link.hashed_token});
      if(session.user?.id!==check.owner_id||!session.access_token||!session.refresh_token)throw Error('Session owner mismatch');
      return reply({access_token:session.access_token,refresh_token:session.refresh_token,token_type:session.token_type||'bearer',expires_in:session.expires_in,expires_at:session.expires_at,user:{id:session.user.id,email:session.user.email}});
    }catch{return reply({message:'로그인을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.'},503);}
  };
}
