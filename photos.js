import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const OWNER='2b42fc1e-9c19-41d6-91a7-a34671d7ff80',BUCKET='bandits-player-photos';
const roster=document.getElementById('roster'),division=document.getElementById('division'),status=document.getElementById('status');
let refreshToken=0,busy=false;
function msg(s){status.textContent=s}
async function refreshPhotos(){
 if(busy)return;
 const token=++refreshToken,team=division.value;
 if(!team||!roster.children.length||document.getElementById('dashboard').hidden)return;
 busy=true;
 try{
 const {data:{user}}=await db.auth.getUser();if(token!==refreshToken)return;if(!user)return;
 const [membership,records]=await Promise.all([db.from('bandits_memberships').select('role').eq('division',team).maybeSingle(),db.from('bandits_roster').select('id,player_name,jersey_number,photo_path').eq('division',team).order('player_name')]);
 if(records.error||membership.error)return;
 const admin=user.id===OWNER&&membership.data?.role==='admin';
 const lis=[...roster.children];const rows=records.data||[];
 for(let i=0;i<rows.length&&i<lis.length;i++){
  const row=rows[i],li=lis[i];if(li.dataset.photoId===row.id)continue;
  li.dataset.photoId=row.id;
  const area=document.createElement('div');area.className='bandits-photo-area';
  const img=document.createElement('img');img.className='bandits-player-photo';img.alt='Photo of '+row.player_name;img.loading='lazy';
  if(row.photo_path){const¶»§q«^