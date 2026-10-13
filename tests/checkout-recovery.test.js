import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/recover-test-checkout.js';
import {OWNER} from '../lib/payments.js';
const ID='11111111-1111-4111-8111-111111111111';
const SESSION='cs_test_mock123';
function reply(status,data){return {ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)}}
async function run({state='expired',paymentStatus='unpaid',enabled=true,owner=true,sessionId=SESSION,expireOk=true,lookupOk=true}={}){
 const oldEnv={...process.env},oldFetch=globalThis.fetch,requests=[];
 Object.assign(process.env,{STRIPE_MODE:'test',VERCEL_ENV:'preview',TEST_CHECKOUT_RECOVERY_ENABLED:enabled?'true':'false',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'mock',PAYMENTS_SITE_URL:'https://preview.example.com',STRIPE_WEBHOOK_SECRET:'whsec_mock',TEST_STRIPE_KEY:'sk_test_mock'});
 globalThis.fetch=async(url,options={})=>{
  const path=String(url);requests.push(path);
  if(path.includes('/auth/v1/user'))return reply(200,{id:owner?OWNER:'another-user'});
  if(path.includes('/rest/v1/bandits_stripe_payments?'))return reply(200,[{id:ID,status:'pending',stripe_session_id:sessionId}]);
  if(path.includes('/rpc/bandits_release_expired_checkout'))return reply(200,true);
  if(path.includes('api.stripe.com')){
   if(path.endsWith('/expire'))return reply(expireOk?200:409,{id:sessionId,status:expireOk?'expired':'open',payment_status:paymentStatus});
   if(!lookupOk)return reply(503,{error:'unavailable'});
   return reply(200,{id:sessionId,status:state==='open'&&requests.filter(x=>x.endsWith('/expire')).length?'expired':state,payment_status:paymentStatus,livemode:false,mode:'payment'});
  }
  throw Error('Unexpected external request');
 };
 const res={statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};
 try{await handler({method:'POST',headers:{authorization:'Bearer mocked'},body:{paymentId:ID}},res);return {res,requests}}
 finally{globalThis.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in oldEnv))delete process.env[k];Object.assign(process.env,oldEnv)}
}
test('recovery is disabled by default',async()=>{const {res,requests}=await run({enabled:false});assert.equal(res.statusCode,503);assert.equal(requests.length,0)});
test('expired unpaid checkout releases pending lock',async()=>{const {res,requests}=await run();assert.equal(res.statusCode,200);assert.equal(requests.filter(x=>x.includes('rpc/bandits_release_expired_checkout')).length,1)});
test('open unpaid checkout expires at Stripe before release',async()=>{const {res,requests}=await run({state:'open'});assert.equal(res.statusCode,200);assert.equal(requests.some(x=>x.endsWith('/expire')),true)});
test('completed checkout is never released',async()=>{const {res,requests}=await run({state:'complete',paymentStatus:'paid'});assert.equal(res.statusCode,409);assert.equal(requests.some(x=>x.includes('rpc/bandits_release_expired_checkout')),false)});
test('uncertain payment status remains blocked',async()=>{const {res,requests}=await run({state:'expired',paymentStatus:'no_payment_required'});assert.equal(res.statusCode,409);assert.equal(requests.some(x=>x.includes('rpc/bandits_release_expired_checkout')),false)});
test('Stripe lookup error remains blocked',async()=>{const {res,requests}=await run({lookupOk:false});assert.equal(res.statusCode,503);assert.equal(requests.some(x=>x.includes('rpc/bandits_release_expired_checkout')),false)});
test('Stripe expiration error remains blocked',async()=>{const {res,requests}=await run({state:'open',expireOk:false});assert.equal(res.statusCode,409);assert.equal(requests.some(x=>x.includes('rpc/bandits_release_expired_checkout')),false)});
test('non-owner cannot recover checkout',async()=>{const {res,requests}=await run({owner:false});assert.equal(res.statusCode,403);assert.equal(requests.some(x=>x.includes('api.stripe.com')),false)});
test('missing Stripe session stays blocked',async()=>{const {res,requests}=await run({sessionId:null});assert.equal(res.statusCode,409);assert.equal(requests.some(x=>x.includes('api.stripe.com')),false)});
