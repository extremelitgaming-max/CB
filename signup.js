import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const login=document.getElementById('login');
const open=document.createElement('button');open.type='button';open.id='signup-open';open.textContent='Create a team account';open.style.cssText='background:transparent;color:#d9e6db;border:1px solid #799782;';
login.append(open);
const form=document.createElement('form');form.id='bandits-signup';form.className='login-form';form.hidden=true;
form.innerHTML='<h3>Request team access</h3><p>Create an account. A team administrator must approve your division before you can view private rosters or practices.</p><label>Your name<input id="signup-name" required maxlength="100" autocomplete="name"></label><label>Email address<input id="signup-email" type="email" required autocomplete="email"></label><label>Password (12 characters minimum)<input id="signup-password" type="password" minlength="12" required autocomplete="new-password"></label><label>Requested division<select id="signup-division" required><option value="8U">8U</option><option value="9U">9U</option><option value="12U">12U</option></select></label><button type="submit">Request account</button><button type="button" id="signup-cancel">Back to sign in</button><p id="signup-message" role="status" aria-live="polite"></p>';
login.after(form);
function switchForm(signup){form.hidden=!signup;login.hidden=signup;if(signup)document.getElementById('signup-email').focus()}
open.¶»§q«^