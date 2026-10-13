import {ready,rest,getUser,OWNER,paymentsTable,paymentMode} from '../lib/payments.js';
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!ready()||paymentMode()!=='test'||process.env.VERCEL_ENV==='production')return res.status(503).json({error:'Test recovery unavailable'});
 try{
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const user=await getUser(token);
  if(user?.id!==OWNER)return res.status(403).json({error:'Administrator access required'});
  const id=req.body?.paymentId;
  if(!/^[0-9a-f-]{36}$/i.test(id||''))return res.status(400).json({error:'Invalid payment'});
  const rows=await rest(paymentsTable()+'?select=id,status,stripe_session_id&id=eq.'+encodeURIComponent(id));
  const payment=rows[0];
  if(!payment)return res.status(404).json({error:'Payment not found'});
  if(payment.status!=='pending')return res.status(409).json({error:'Payment is no longer pending'});
  const sessionId=payment.stripe_session_id;
  if(!/^cs_test_[a-zA-Z0-9_]+$/.test(sessionId||''))return res.status(409).json({error:'Checkout session is missing. Manual Stripe reconciliation required; checkout remains blocked'});
  const key=process.env.TEST_STRIPE_KEY;
  const headers={Authorization:'Bearer '+key};
  const endpoint='https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sessionId);
  let response=await fetch(endpoint,{headers});
  if(!response.ok)throw Error('Stripe session lookup failed');
  let session=await response.json();
  if(session.id!==sessionId||session.livemode!==false||session.mode!=='payment')throw Error('Stripe session verification failed');
  if(session.payment_status==='paid'||session.status==='complete')return res.status(409).json({error:'Checkout completed or payment may exist. Reconcile Stripe payment before retrying'});
  if(session.status==='open'){
   response=await fetch(endpoint+'/expire',{method:'POST',headers});
   if(!response.ok)return res.status(409).json({error:'Stripe did not confirm expiration. Checkout remains blocked'});
   response=await fetch(endpoint,{headers});
   if(!response.ok)throw Error('Stripe expiration verification failed');
   session=await response.json();
  }
  if(session.id!==sessionId||session.status!=='expired'||session.payment_status==='paid')return res.status(409).json({error:'Stripe expiration not confirmed. Checkout remains blocked'});
  const released=await rest('rpc/bandits_release_expired_checkout',{method:'POST',body:JSON.stringify({p_payment_id:id,p_session_id:sessionId})});
  if(released!==true)return res.status(409).json({error:'Payment changed during recovery; check payment status'});
  return res.status(200).json({recovered:true,message:'Stripe checkout expired and pending lock released'});
 }catch{return res.status(503).json({error:'Unable to verify Stripe checkout safely. Pending checkout remains blocked'})}
}
