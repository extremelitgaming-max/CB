import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/create-checkout.js';

const DUE='11111111-1111-4111-8111-111111111111';
const PLAYER='22222222-2222-4222-8222-222222222222';
const USER='33333333-3333-4333-8333-333333333333';
function response(){return {statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}}}
async function check({token,body,linked=true}){
 const prior={...process.env},oldFetch=globalThis.fetch;
 const requests=[];
 Object.assign(process.env,{STRIPE_MODE:'test',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake-service-key',PAYMENTS_SITE_URL:'https://preview.example.com',STRIPE_WEBHOOK_SECRET:'whsec_fake',TEST_STRIPE_KEY:'sk_test_fake'});
 globalThis.fetch=async(url,options={})=>{
  requests.push(String(url));
  if(String(url).includes('/auth/v1/user'))return {ok:!!token,status:token?200:401,json:async()=>({id:USER})};
  if(String(url).includes('bandits_player_dues?'))return {ok:true,text:async()=>JSON.stringify([{id:DUE,player_id:PLAYER,description:'Test dues',amount:10,amount_paid:0}])};
  if(String(url).includes('bandits_player_guardians?'))return {ok:true,text:async()=>JSON.stringify(linked?[{user_id:USER}]:[])};
  throw Error('Unexpected external request: '+url);
 };
 try{
  const res=response();
  await handler({method:'POST',headers:token?{authorization:'Bearer '+token}:{},body},res);
  return {res,requests};
 }finally{
  globalThis.fetch=oldFetch;
  for(const k of Object.keys(process.env))if(!(k in prior))delete process.env[k];
  Object.assign(process.env,prior);
 }
}
test('anonymous checkout is rejected before database or Stripe access',async()=>{
 const {res,requests}=await check({body:{dueId:DUE}});
 assert.equal(res.statusCode,401);
 assert.deepEqual(requests,[]);
});
test('unlinked parent is rejected before Stripe access',async()=>{
 const {res,requests}=await check({token:'test-parent',body:{dueId:DUE},linked:false});
 assert.equal(res.statusCode,403);
 assert.equal(requests.some(x=>x.includes('api.stripe.com')),false);
});
test('custom amount is rejected before Stripe access',async()=>{
 const {res,requests}=await check({token:'test-parent',body:{dueId:DUE,amountCents:50}});
 assert.equal(res.statusCode,400);
 assert.match(res.body.error,/Custom payment amounts/);
 assert.equal(requests.some(x=>x.includes('api.stripe.com')),false);
});
