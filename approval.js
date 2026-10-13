import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const section=document.createElement('section');
section.hidden=true;
section.innerHTML='<h3>Pending division requests</h3><button type="button" id="refresh-requests">Refresh</button><div id="requests" aria-live="polite"></div>';
document.getElementById('dashboard').append(section);
async function load(){
 const {data:{user}}=await db.auth.getUser();
 if(user?.id!=='2b42fc1e-9c19-41d6-91a7-a34671d7ff80'){section.hidden=true;return;}
 section.hidden=false;
 const root=document.getElementById('requests');
 root.textContent='Loading requests…';
 const {data,error}=await db.from('bandits_division_requests').select('user_id,division,status,created_at').eq('status','pending').order('created_at');
 root.replaceChildren();
 if(error){root.textContent='Could not load requests: '+error.message;return;}
 if(!data?.length){root.textContent='No pending requests';return;}
 for(const request of data){
  const line=document.createElement('p');
  line.textContent=request.user_id+' — '+request.division+' — pending';
  for(const action of ['approve','deny']){
   const button=document.createElement('button');button.type='button';button.textContent=action==='approve'?'Approve':'Deny';button.disabled=true;button.title='Action will be enabled after approval integration is validated';line.append(button);
  }
  root.append(line);
 }
}
document.getElementById('refresh-requests').addEventListener('click',load);
db.auth.onAuthStateChange(()=>setTimeout(load,100));
setTimeout(load,500);
