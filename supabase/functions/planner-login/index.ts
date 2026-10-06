import {createPinHandler} from './handler.js';
Deno.serve(createPinHandler({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}));
