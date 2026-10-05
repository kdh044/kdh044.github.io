import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public endpoint. Verification occurs server-side; privileged keys never reach the browser.
Deno.serve(async (request: Request) => {
  const origin = Deno.env.get('SITE_ORIGIN') || '';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'apikey, content-type, authorization, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
  const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), {status, headers});
  if (!origin || request.headers.get('origin') !== origin) return respond(403, {message:'허용되지 않은 사이트입니다.'});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return respond(405,{message:'허용되지 않은 요청입니다.'});
  try {
    if (Number(request.headers.get('content-length') || 0) > 1024) return respond(413,{message:'요청이 너무 큽니다.'});
    const body = await request.text();
    if (body.length > 1024) return respond(413,{message:'요청이 너무 큽니다.'});
    const {pin} = JSON.parse(body);
    if (typeof pin !== 'string' || pin.length < 1 || pin.length > 128) return respond(400,{message:'비밀번호를 입력해 주세요.'});
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data: verdict,error} = await admin.rpc('check_private_pin',{candidate:pin});
    if (error) return respond(503,{message:'로그인 서버 설정을 확인해 주세요.'});
    if (verdict === 'locked') return respond(423,{message:'5회 실패로 잠겼습니다. 소유자가 서버에서 잠금을 해제해야 합니다.'});
    if (verdict === 'unconfigured') return respond(503,{message:'서버에 비밀번호를 등록해 주세요.'});
    if (verdict !== 'ok') return respond(401,{message:'비밀번호가 일치하지 않습니다.'});
    const {data: owner,error:ownerError} = await admin.from('app_owner').select('owner_id').eq('id',true).single();
    if (ownerError || !owner) return respond(503,{message:'소유자 계정을 등록해 주세요.'});
    const {data:userInfo,error:userError} = await admin.auth.admin.getUserById(owner.owner_id);
    if (userError || !userInfo.user?.email) return respond(503,{message:'소유자 계정을 확인해 주세요.'});
    const {data:link,error:linkError} = await admin.auth.admin.generateLink({type:'magiclink',email:userInfo.user.email});
    if (linkError || !link.properties?.hashed_token) return respond(503,{message:'로그인 세션을 만들지 못했습니다.'});
    const {data:verified,error:verifyError} = await admin.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'});
    if (verifyError || !verified.session || verified.user?.id !== owner.owner_id) return respond(503,{message:'로그인 세션을 확인하지 못했습니다.'});
    return respond(200,{access_token:verified.session.access_token,refresh_token:verified.session.refresh_token});
  } catch {
    return respond(400,{message:'로그인 요청을 확인해 주세요.'});
  }
});
