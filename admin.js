import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const OWNER='2b42fc1e-9c19-41d6-91a7-a34671d7ff80';
const $=id=>document.getElementById(id);
let generation=0,authorized=false;
function message(s){$('message').textContent=s}
function el(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
async function verify(){const v=++generation;authorized=false;$('admin-content').hidden=true;$('denied').hidden=true;message('Checking administrator access…');const {data,error}=await db.auth.getUser();if(v!==generation)return;authorized=!error&&data?.user?.id===OWNER;$('denied').hidden=authorized;$('admin-content').hidden=!authorized;message(authorized?'Administrator verified.':'Administrator access required.');if(authorized)await Promise.all([load(),loadPayments()])}
async function load(){if(!authorized)return;const v=generation,root=$('requests');root.replaceChildren(el('p','Loading requests…'));let q=db.from('bandits_division_requests').select('user_id,division,status,created_at').eq('status','pending').order('created_at');if($('filter').value)q=q.eq('division',$('filter').value);const {data,error}=await q;if(v!==generation||!authorized)return;root.replaceChildren();if(error){root.append(el('p','Unable to load requests: '+error.message));return}if(!data?.length){root.append(el('p','No pending requests.'));return}for(const r of data){const item=el('article');item.className='request';item.append(el('strong',r.division+' · Pending approval'),el('small','Account ID: '+r.user_id));const controls=el('div');controls.className='controls';const role=el('select');role.setAttribute('aria-label','Role for '+r.division);for(const name of ['parent','coach','admin']){const option=el('option',name[0].toUpperCase()+name.slice(1));option.value=name;role.append(option)}controls.append(role);for(const action of ['approve','deny']){const button=el('button',action==='approve'?'Approve':'Deny');button.type='button';if(action==='deny')button.className='danger';button.addEventListener('click',async()=>{if(!authorized||!confirm((action==='approve'?'Approve':'Deny')+' '+r.division+' request?'))return;for(const b of controls.querySelectorAll('button'))b.disabled=true;const {error}=await db.rpc('bandits_review_division_request',{p_user_id:r.user_id,p_division:r.division,p_action:action,p_role:role.value});if(error){message('Action failed: '+error.message);for(const b of controls.querySelectorAll('button'))b.disabled=false;return}message('Request '+(action==='approve'?'approved.':'denied.'));await load()});controls.append(button)}item.append(controls);root.append(item)}}
$('refresh').addEventListener('click',load);$('filter').addEventListener('change',load);db.auth.onAuthStateChange(()=>setTimeout(verify,0));verify().catch(()=>message('Unable to verify administrator access.'));
async function loadPayments(){if(!authorized)return;const root=$('payment-report');root.replaceChildren(el('p','Loading TEST payment report…'));const [dues,tx,roster]=await Promise.all([db.from('bandits_player_dues').select('id,player_id,description,amount,amount_paid,due_date'),db.from('bandits_stripe_payments').select('id,player_id,amount_cents,status,paid_at').eq('status','paid').order('paid_at',{ascending:false}).limit(100),db.from('bandits_roster').select('id,player_name,division')]);root.replaceChildren();if(dues.error||tx.error||roster.error){root.textContent='Unable to load payment report.';return}const names=new Map(roster.data.map(p=>[p.id,p.player_name+' ('+p.division+')']));const currency=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);const total=dues.data.reduce((a,d)=>a+Number(d.amount),0),paid=dues.data.reduce((a,d)=>a+Number(d.amount_paid),0),online=tx.data.reduce((a,p)=>a+p.amount_cents/100,0);root.append(el('h3','TEST ONLY — excluded from live revenue'),el('p','Total dues: '+currency(total)+' · Recorded paid: '+currency(paid)+' · Outstanding: '+currency(total-paid)+' · Recent Stripe payments: '+currency(online)));root.append(el('h3','Outstanding dues'));for(const d of dues.data.filter(d=>Number(d.amount)>Number(d.amount_paid))){const row=el('p',(names.get(d.player_id)||'Player')+' — '+d.description+' — '+currency(Number(d.amount)-Number(d.amount_paid)));root.append(row)}root.append(el('h3','Recent Stripe payments'));if(!tx.data.length)root.append(el('p','No completed Stripe payments yet.'));for(const p of tx.data){root.append(el('p',(names.get(p.player_id)||'Player')+' — '+currency(p.amount_cents/100)+' — '+new Date(p.paid_at).toLocaleDateString()))}await loadLiveReport(root)}
$('refresh-payments').addEventListener('click',loadPayments);

async function loadLiveReport(root){
 const section=el('section');section.append(el('h3','LIVE PAYMENTS — NOT ENABLED'));
 root.append(section);
 const {data:{session}}=await db.auth.getSession();
 if(!session?.access_token){section.append(el('p','Sign in to view the restricted live report.'));return}
 try{
  const response=await fetch('/api/live-payment-report',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  if(!response.ok)throw Error('Report unavailable');
  const report=await response.json();
  if(report.mode!=='live')throw Error('Invalid report mode');
  const currency=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const total=report.dues.reduce((a,d)=>a+Number(d.amount),0);
  const paid=report.dues.reduce((a,d)=>a+Number(d.amount_paid),0);
  section.append(el('p','Live dues: '+currency(total)+' · Recorded paid: '+currency(paid)+' · Outstanding: '+currency(total-paid)));
  section.append(el('p','Live transactions: '+report.payments.length+' (separate from test records)'));
  for(const p of report.payments)if(p.status==='paid')section.append(el('p',currency(p.amount_cents/100)+' · '+new Date(p.paid_at).toLocaleDateString()));
 }catch{section.append(el('p','Live payment report is not available. No live transactions can be initiated here.'))}
}
