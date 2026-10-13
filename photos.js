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
  if(row.photo_path){const {data,error}=await db.storage.from(BUCKET).createSignedUrl(row.photo_path,3600);if(token!==refreshToken)return;if(!error&&data?.signedUrl){img.src=data.signedUrl;area.append(img)}}
  if(admin){
   const upload=document.createElement('label');upload.className='bandits-photo-upload';upload.textContent=row.photo_path?'Replace photo':'Upload photo';
   const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.style.display='none';
   upload.append(input);area.append(upload);
   input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){msg('Choose a JPG, PNG, or WebP image smaller than 5 MB.');return}
    const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
    const path=team+'/'+row.id+'/'+crypto.randomUUID()+'.'+ext;
    upload.style.opacity='.5';input.disabled=true;
    const up=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
    if(up.error){msg('Photo upload failed: '+up.error.message);input.disabled=false;upload.style.opacity='1';return}
    const save=await db.from('bandits_roster').update({photo_path:path}).eq('id',row.id).eq('division',team);
    if(save.error){await db.storage.from(BUCKET).remove([path]);msg('Photo could not be saved: '+save.error.message);input.disabled=false;upload.style.opacity='1';return}
    if(row.photo_path)await db.storage.from(BUCKET).remove([row.photo_path]);
    msg('Player photo saved.');li.dataset.photoId='';busy=false;refreshPhotos();
   });
   if(row.photo_path){const remove=document.createElement('button');remove.type='button';remove.className='bandits-photo-remove';remove.textContent='Remove photo';remove.addEventListener('click',async()=>{if(!confirm('Remove this player photo?'))return;const saved=await db.from('bandits_roster').update({photo_path:null}).eq('id',row.id).eq('division',team);if(saved.error){msg('Unable to remove photo: '+saved.error.message);return}await db.storage.from(BUCKET).remove([row.photo_path]);msg('Photo removed.');li.dataset.photoId='';busy=false;refreshPhotos()});area.append(remove)}
  }
  li.prepend(area);
 }
 }catch(e){msg('Could not load player photos: '+e.message)}finally{busy=false}
}
const css=document.createElement('style');css.textContent='.bandits-photo-area{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0}.bandits-player-photo{width:84px;height:84px;object-fit:cover;border-radius:10px;border:2px solid #6c8870}.bandits-photo-upload{cursor:pointer;border:1px solid #8caa91;border-radius:4px;padding:7px 10px;font-size:12px}.bandits-photo-remove{padding:7px 10px;font-size:12px;background:#382222;color:#fff}.list li{min-height:50px}';document.head.append(css);
const observer=new MutationObserver(()=>{if(!busy)refreshPhotos()});observer.observe(roster,{childList:true});division.addEventListener('change',()=>{refreshToken++;setTimeout(refreshPhotos,450)});
db.auth.onAuthStateChange(()=>{refreshToken++;setTimeout(refreshPhotos,500)});
setTimeout(refreshPhotos,750);
