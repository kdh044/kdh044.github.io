import {createGoogleHandler} from './handler.js';
Deno.serve(createGoogleHandler({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}));
