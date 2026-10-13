import {getUser,rest,OWNER} from '../lib/payments.js';
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','no-store');
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 const user=await getUser(token);
 if(!user||user.id!==OWNER)return res.status(403).json({error:'Administrator access required'});
 try{
  const [dues,payments]=await Promise.all([
   rest('bandits_live_dues?select=id,player_id,description,amount,amount_paid,due_date&order=created_at.desc&limit=500'),
   rest('bandits_live_payments?select=id,player_id,amount_cents,status,paid_at&order=created_at.desc&limit=100')
  ]);
  return res.status(200).json({mode:'live',enabled:false,dues,payments});
 }catch{return res.status(503).json({error:'Live payment report unavailable'})}
}
