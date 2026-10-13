import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
const OWNER='2b42fc1e-9c19-41d6-91a7-a34671d7ff80';
let epoch=0,recovering=false,sessionUser=null,roles=new Map(),players=[],practices=[];
const status=s=>$('status').textContent=s;
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const admin=document.createElement('section');admin.id='admin';admin.className='portal-block';admin.hidden=true;
admin.innerHTML='<h3>Administrator controls</h3><p>Add, edit, or remove players and practices in the selected division.</p><div class="admin-grid"><form id="player-form" class="admin-form"><h4>Manage players</h4><input id="player-id" type="hidden"><label>Player name<input id="player-name" required maxlength="120"></label><label>Jersey number<input id="jersey-number" maxlength="12"></label><div class="admin-actions"><button id="player-save">Add player</button><button type="button" id="player-clear" class="secondary">Clear</button></div></form><form id="practice-form" class="admin-form"><h4>Manage practices</h4><input id="practice-id" type="hidden"><label>Date and time (Eastern)<input id="practice-start" type="datetime-local" required></label><label>Location<input id="practice-location" maxlength="250" required></label><label>Notes<textarea id="practice-notes" rows="3" maxlength="1000"></textarea></label><div class="admin-action¶»§q«^