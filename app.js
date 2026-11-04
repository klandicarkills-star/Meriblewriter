'use strict';
const $=id=>document.getElementById(id), key='merible_writer_v1';
let docs=[],current=null,timer=null;
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function persist(){try{localStorage.setItem(key,JSON.stringify({docs,current}));queueServerSave();$('status').textContent='Saved locally'}catch(e){$('status').textContent='Save failed — storage full';alert('Saving failed: '+e.message)}}
function save(){clearTimeout(timer);timer=null;let d=docs.find(x=>x.id===current);if(!d)return;d.title=$('title').value||'Untitled';d.html=$('editor').innerHTML;d.updated=Date.now();persist();render();count()}
function schedule(){clearTimeout(timer);$('status').textContent='Unsaved changes';timer=setTimeout(save,600);count()}
function count(){let t=$('editor').innerText.trim();$('words').textContent=(t?t.split(/\s+/).length:0)+' words'}
function openDoc(id){if(current===id){save();return}save();current=id;let d=docs.find(x=>x.id===id);if(!d)return;$('title').value=d.title;$('editor').innerHTML=d.html;persist();render();count()}
function create(){save();let d={id:uid(),title:'Untitled',html:'',updated:Date.now()};docs.unshift(d);current=d.id;$('title').value=d.title;$('editor').innerHTML='';persist();render();count();$('editor').focus()}
function render(){let lib=$('library'),merge=$('mergeList');lib.replaceChildren();merge.replaceChildren();docs.forEach(d=>{let row=document.createElement('div');row.className='doc'+(d.id===current?' active':'');let b=document.createElement('button');b.textContent=d.title;b.onclick=()=>openDoc(d.id);let del=document.createElement('button');del.textContent='×';del.className='delete';del.title='Delete document';del.onclick=()=>{if(confirm('Delete '+d.title+'?')){docs=docs.filter(x=>x.id!==d.id);if(current===d.id)current=null;persist();render();if(!current&&docs.length)openDoc(docs[0].id);else if(!docs.length)create()}};row.append(b,del);lib.append(row);let label=document.createElement('label');label.className='merge-item';let cb=document.createElement('input');cb.type='checkbox';cb.value=d.id;label.append(cb,document.createTextNode(' '+d.title));merge.append(label)})}
function plainParagraphs(){let clone=$('editor').cloneNode(true);clone.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));clone.querySelectorAll('p,div,li,h1,h2,h3').forEach(el=>el.append('\n'));return (clone.textContent||'').split(/\n/)}
function exportDocx(){save();Android.exportDocx(JSON.stringify({title:$('title').value,paragraphs:plainParagraphs()}))}
function safeName(s){return (s||'Document').replace(/[^\w -]/g,'_').slice(0,70)}
function download(blob,name){let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function combine(){save();let ids=[...$('mergeList').querySelectorAll('input:checked')].map(x=>x.value);if(ids.length<2){alert('Select at least two documents');return}let chosen=ids.map(id=>docs.find(d=>d.id===id)).filter(Boolean);let d={id:uid(),title:'Combined manuscript',html:chosen.map(x=>'<h2>'+esc(x.title)+'</h2>'+x.html).join('<hr>'),updated:Date.now()};docs.unshift(d);current=null;render();openDoc(d.id)}
function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('new').onclick=create;$('save').onclick=save;$('docx').onclick=exportDocx;$('pdf').onclick=()=>{save();Android.printPdf()};$('merge').onclick=combine;
$('backup').onclick=()=>{save();Android.backup(JSON.stringify({docs,current},null,2))};
$('restore').onclick=()=>Android.restore();$('backupFile').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let obj=JSON.parse(await f.text());if(!Array.isArray(obj.docs)||!obj.docs.every(x=>typeof x.id==='string'&&typeof x.title==='string'&&typeof x.html==='string'))throw Error('Invalid backup');if(!confirm('Replace all current documents with this backup?'))return;docs=obj.docs;current=null;persist();render();if(docs.length)openDoc(docs[0].id);else create()}catch(err){alert('Restore failed: '+err.message)}e.target.value=''};
$('title').addEventListener('input',schedule);$('editor').addEventListener('input',schedule);document.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>{document.execCommand(b.dataset.cmd,false,null);schedule();$('editor').focus()});
try{let saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Array.isArray(saved.docs)){docs=saved.docs;current=saved.current}}catch(e){}let first=current||docs[0]?.id;current=null;if(first&&docs.some(x=>x.id===first))openDoc(first);else create();

// Dropdown navigation: close after selecting a document or combining documents.
const menuToggle=$('menuToggle'), menuPanel=$('menuPanel');
function setMenu(open){menuPanel.hidden=!open;menuToggle.setAttribute('aria-expanded',String(open));menuToggle.textContent=open?'✕ Close ▴':'☰ Menu ▾'}
menuToggle.addEventListener('click',()=>setMenu(menuPanel.hidden));
$('library').addEventListener('click',e=>{if(e.target.closest('button'))setMenu(false)});
$('new').addEventListener('click',()=>setMenu(false));
$('merge').addEventListener('click',()=>setMenu(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
document.addEventListener('click',e=>{if(!menuPanel.hidden&&!menuPanel.contains(e.target)&&!menuToggle.contains(e.target))setMenu(false)});

// File menu: keep export/backup actions in a compact dropdown.
const fileToggle=$('fileToggle'),filePanel=$('filePanel');
function setFileMenu(open){filePanel.hidden=!open;fileToggle.setAttribute('aria-expanded',String(open));fileToggle.textContent=open?'File ▴':'File ▾'}
fileToggle.addEventListener('click',()=>{setMenu(false);setFileMenu(filePanel.hidden)});
filePanel.addEventListener('click',e=>{if(e.target.closest('button'))setFileMenu(false)});
document.addEventListener('click',e=>{if(!filePanel.hidden&&!filePanel.contains(e.target)&&!fileToggle.contains(e.target))setFileMenu(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')setFileMenu(false)});
menuToggle.addEventListener('click',()=>setFileMenu(false));

// Native app stores documents in WebView localStorage. No server required.
window.restoreNativeBackup = function(raw){
 try {const obj=JSON.parse(raw);
 if(!Array.isArray(obj.docs)||!obj.docs.every(x=>typeof x.id==='string'&&typeof x.title==='string'&&typeof x.html==='string'))throw Error('Invalid backup');
 if(!confirm('Replace all current documents with this backup?'))return;
 docs=obj.docs;current=null;persist();render();if(docs.length)openDoc(docs[0].id);else create();
 }catch(e){alert('Restore failed: '+e.message)}
};
function queueServerSave(){};
