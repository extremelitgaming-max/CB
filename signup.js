import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const login=document.getElementById('login');
const open=document.createElement('button');
open.type='button';open.id='signup-open';open.textContent='Create a team account';
login.append(open);
const form=document.createElement('form');form.id='bandits-signup';form.className='login-form';form.hidden=true;
form.innerHTML=`<h3>Request team access</h3><p>Choose one or more divisions. An administrator must approve each request.</p><label>Your name<input id="signup-name" required maxlength="100" autocomplete="name"></label><label>Email address<input id="signup-email" type="email" required autocomplete="email"></label><label>Password (12 characters minimum)<input id="signup-password" type="password" minlength="12" required autocomplete="new-password"></label><fieldset><legend>Requested divisions</legend>${['8U','9U','12U'].map(d=>`<label><input type="checkbox" name="signup-division" value="${d}"> ${d}</label>`).join('')}</fieldset><button type="submit">Request account</button><button type="button" id="signup-cancel">Back to sign in</button><p id="signup-message" role="status" aria-live="polite"></p>`;
login.after(form);
open.addEventListener('click',()=>{login.hidden=true;form.hidden=false});
document.getElementById('signup-cancel').addEventListener('click',()=>{form.hidden=true;login.hidden=false});
form.addEventListener('submit',async e=>{
e.preventDefault();
const output=document.getElementById('signup-message');
const divisions=[...form.querySelectorAll('[name="signup-division"]:checked')].map(x=>x.value);
if(!divisions.length){output.textContent='Select at least one division.';return}
const button=form.querySelector('[type="submit"]');button.disabled=true;
try{
const {error}=await db.auth.signUp({email:document.getElementById('signup-email').value.trim(),password:document.getElementById('signup-password').value,options:{emailRedirectTo:location.origin+'/portal',data:{full_name:document.getElementById('signup-name').value.trim(),requested_divisions:divisions}}});
output.textContent=error?'Unable to create account: '+error.message:'Request received for '+divisions.join(', ')+'. Check your email if confirmation is required. Administrator approval is required.';
if(!error)form.reset();
}catch{output.textContent='Connection failed. Please try again.'}finally{button.disabled=false}
});
db.auth.onAuthStateChange((_event,session)=>{if(session)form.hidden=true});
