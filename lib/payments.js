export function paymentMode(){return process.env.STRIPE_MODE==='live'?'live':(!process.env.STRIPE_MODE||process.env.STRIPE_MODE==='test')?'test':null}
export function ready(){
 const mode=paymentMode();
 if(!mode||!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.PAYMENTS_SITE_URL?.startsWith('https://')||!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))return false;
 if(mode==='test')return process.env.TEST_STRIPE_KEY?.startsWith('sk_test_')===true;
 return process.env.LIVE_PAYMENTS_ENABLED==='true'&&process.env.LIVE_STRIPE_KEY?.startsWith('sk_live_')===true&&process.env.VERCEL_ENV==='production';
}
export async function rest(path,options={}){const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{...options,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',...options.headers}});if(!r.ok)throw Error('Database request failed ('+r.status+')');const t=await r.text();return t?JSON.parse(t):null}
export async function getUser(token){if(!token)return null;const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+token}});if(!r.ok)return null;return await r.json()}
export async function stripe(path,params){const key=paymentMode()==='live'?process.env.LIVE_STRIPE_KEY:process.env.TEST_STRIPE_KEY;const r=await fetch('https://api.stripe.com/v1/'+path,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});const data=await r.json();if(!r.ok)throw Error(data.error?.message||'Stripe request failed');return data}
export const OWNER='2b42fc1e-9c19-41d6-91a7-a34671d7ff80';

export function duesTable(){return paymentMode()==='live'?'bandits_live_dues':'bandits_player_dues'}
export function paymentsTable(){return paymentMode()==='live'?'bandits_live_payments':'bandits_stripe_payments'}
export function paymentRecordingRpc(){return paymentMode()==='live'?'bandits_record_live_stripe_payment':'bandits_record_stripe_payment'}
