// v12 Mobile PWA — Router, Save handlers, Master Closer wiring, PWA install
const store={get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),del:(k)=>localStorage.removeItem(k)};
function val(id){ const el=document.getElementById(id); return el?el.value:''; }
function setv(id,v){ const el=document.getElementById(id); if(el) el.value=v; }

// Copy buttons used in Master Closer Toolkit
function wireCopy(){
  document.querySelectorAll('.dm .copy').forEach(btn=>{
    if(btn._wired) return;
    btn._wired=true;
    btn.addEventListener('click', function(){
      const txt=this.parentElement.innerText.replace(/^Copy\n?/,'').trim();
      navigator.clipboard.writeText(txt);
      const prev=this.textContent; this.textContent='Copied ✓';
      setTimeout(()=>this.textContent=prev,1000);
    });
  });
}

// Router + Drawer
(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn()} else {document.addEventListener('DOMContentLoaded',fn)} }
  ready(function(){
    const sidebar=document.getElementById('sidebar');
    const navBtns=(sidebar && sidebar.querySelectorAll('nav button[data-tab]'))||[];
    const panels=document.querySelectorAll('.panel');
    const backdrop=document.getElementById('backdrop');
    const installBtn=document.getElementById('installBtn');
    let deferredPrompt=null;

    function showTab(id){
      if(!id) id='dashboard';
      panels.forEach(p=>p.classList.remove('show'));
      (document.getElementById(id)||document.getElementById('dashboard')).classList.add('show');
      navBtns.forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
      // close drawer on nav
      if(sidebar && sidebar.classList.contains('open')){
        sidebar.classList.remove('open');
        backdrop && backdrop.classList.remove('show');
      }
      try{ if(location.hash!=='#'+id) history.replaceState(null,'','#'+id); }catch(e){}
      if(id==='closer') wireMCT();
      wireCopy();
    }

    document.getElementById('menuBtn')?.addEventListener('click',()=>{
      if(!sidebar) return;
      sidebar.classList.toggle('open');
      if(backdrop){
        if(sidebar.classList.contains('open')) backdrop.classList.add('show');
        else backdrop.classList.remove('show');
      }
    });
    backdrop?.addEventListener('click',()=>{
      sidebar?.classList.remove('open'); backdrop.classList.remove('show');
    });

    navBtns.forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));
    window.addEventListener('hashchange', ()=>showTab((location.hash||'#dashboard').slice(1)));
    showTab((location.hash||'#dashboard').slice(1));

    // PWA install
    window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; if(installBtn) installBtn.hidden=false; });
    installBtn?.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); try{ await deferredPrompt.userChoice; }catch(e){} deferredPrompt=null; installBtn.hidden=true; });

    // SW
    if('serviceWorker' in navigator){ try{ navigator.serviceWorker.register('service-worker.js'); }catch(e){} }

    // Save handlers
    document.getElementById('saveFocus')?.addEventListener('click',()=>store.set('focus',val('focusInput')||''));

    // Quick Income
    document.getElementById('qiAdd')?.addEventListener('click',()=>{
      const text=val('qiText').trim(); if(!text) return;
      const est=Number(val('qiEst')||0);
      const arr=store.get('qi',[]); arr.unshift({text,est,done:false}); store.set('qi',arr);
      setv('qiText',''); setv('qiEst',''); renderQI();
    });
    document.getElementById('qiClear')?.addEventListener('click',()=>{ window.qiUndoCache=store.get('qi',[]); store.set('qi',[]); renderQI(); });
    document.getElementById('qiUndo')?.addEventListener('click',()=>{ if(window.qiUndoCache?.length){ store.set('qi',window.qiUndoCache); window.qiUndoCache=[]; renderQI(); }});

    // Quick Tasks (optional simple list tied to qi for brevity)
    // System
    document.getElementById('saveSystem')?.addEventListener('click',()=>{
      const sys={posts:+val('sys_posts'),starts:+val('sys_starts'),nudges:+val('sys_nudges'),closes:+val('sys_closes'),calls:+val('sys_calls'),sales:+val('sys_sales')};
      store.set('system',sys); renderSystemTotals();
    });

    // Leads
    const leadNext=document.getElementById('leadNext');
    document.querySelectorAll('[data-adddays]')?.forEach(b=>b.addEventListener('click',()=>{ if(leadNext){const n=parseInt(b.dataset.adddays,10)||0; leadNext.value=addDaysISO(n);} }));
    document.getElementById('clearNext')?.addEventListener('click',()=>{ if(leadNext) leadNext.value=''; });
    document.getElementById('addLead')?.addEventListener('click',()=>{
      const name=val('leadName').trim(); if(!name) return;
      const stage=val('leadStage'); const next=val('leadNext'); const note=val('leadNote').trim();
      const arr=store.get('leads',[]); const lead={id:Date.now(),name,stage,next,note}; arr.unshift(lead); store.set('leads',arr);
      if(next){ const cal=store.get('calendar',[]); cal.unshift({id:'lead-'+lead.id, when:next, title:'Follow-up: '+name, source:'Lead'}); store.set('calendar',cal); }
      setv('leadName',''); setv('leadNext',''); setv('leadNote',''); renderLeads(); renderCal();
    });

    // Calendar
    document.getElementById('addCal')?.addEventListener('click',()=>{
      const title=val('calTitle').trim(); const date=val('calDate'); const time=val('calTime');
      if(!title || !date) return;
      const arr=store.get('calendar',[]);
      arr.unshift({id:Date.now(), when: date+(time?(' '+time):''), title, source:'Manual'});
      store.set('calendar',arr); setv('calTitle',''); setv('calDate',''); setv('calTime',''); renderCal();
    });

    // Mindset
    document.getElementById('addAffirm')?.addEventListener('click',()=>{
      const v=val('newAffirm').trim(); if(!v) return;
      const m=store.get('mindset',{affirm:[],journal:[]}); m.affirm.unshift(v); store.set('mindset',m); setv('newAffirm',''); renderMindset();
    });
    document.getElementById('resetAffirmations')?.addEventListener('click',()=>{ store.set('mindset',{affirm:[],journal:store.get('mindset',{affirm:[],journal:[]}).journal}); renderMindset(); });
    document.getElementById('saveJournal')?.addEventListener('click',()=>{
      const text=val('journalText').trim(); if(!text) return;
      const m=store.get('mindset',{affirm:[],journal:[]}); m.journal.unshift({ts:new Date().toISOString(),text}); store.set('mindset',m); setv('journalText',''); renderMindset();
    });

    // Brand
    document.getElementById('saveBrand')?.addEventListener('click',()=>{
      const b={brand:val('brandColor'),accent:val('accentColor'),tag:val('brandTag'),voice:val('brandVoice'),snips:store.get('brand',{}).snips||''};
      store.set('brand',b);
    });
    document.getElementById('saveSnips')?.addEventListener('click',()=>{
      const b=store.get('brand',{brand:"#6b3fa0",accent:"#d4af37",tag:"",voice:"",snips:""}); b.snips=document.getElementById('brandSnips').value||''; store.set('brand',b);
    });

    // Content Vault
    const out=document.getElementById('genOutput');
    function gen(kind){
      const topic=val('genTopic')||'digital freedom'; const aud=val('genAudience')||'busy Gen‑X'; const plat=val('genPlatform')||'Facebook'; const tone=val('genTone')||'Bold'; const cta=val('genCTA')||"Comment 'INFO'"; const len=(val('genLength')||'Short').toLowerCase();
      let items=[];
      if(kind==='hooks'){ items=[`What if ${aud} could turn scroll‑time into income in 7 minutes a day?`,`From $130 in the bank to stacking streams — want the map?`,`It’s already built. You just plug in.`]; }
      if(kind==='captions'){ items=[`${topic} for ${aud} without the guesswork. I’ll show you how I did it — step by step. ${cta}.`, `If ‘start later’ kept you stuck, try 7 minutes today. I’ll send the exact post + follow‑ups. ${cta}.`]; }
      if(kind==='posts'){ items=[`You don’t start because you have the money — you start because waiting costs more. If I give you the map, will you walk it? ${cta}.`, `Second‑act Wi‑Fi: build a life you don’t need to escape from. Short, simple, proof‑based. ${cta}.`]; }
      out.innerHTML = items.map(t=>`<div class="dm"><button class="pill copy" type="button">Copy</button>${t}</div>`).join('');
      wireCopy();
    }
    document.getElementById('genHooks')?.addEventListener('click',()=>gen('hooks'));
    document.getElementById('genCaptions')?.addEventListener('click',()=>gen('captions'));
    document.getElementById('genPosts')?.addEventListener('click',()=>gen('posts'));
    document.getElementById('addAllToVault')?.addEventListener('click',()=>{
      const vault=document.getElementById('contentVault'); if(!vault) return;
      vault.value = (vault.value?vault.value+"\n\n":"") + (out.innerText||'').replace(/^Copy\n?/gm,'');
    });
    document.getElementById('saveContent')?.addEventListener('click',()=>{
      store.set('content', document.getElementById('contentVault').value||'');
    });
    document.getElementById('clearOutput')?.addEventListener('click',()=>{ out.innerHTML=''; });

    // Planner
    document.getElementById('savePlanner')?.addEventListener('click',()=>store.set('planner', val('plannerText')||''));

    // Theme
    document.getElementById('applyTheme')?.addEventListener('click',()=>{
      const mode=document.getElementById('themeSel').value;
      if(mode==='auto'){ document.documentElement.removeAttribute('data-theme'); }
      else{ document.documentElement.setAttribute('data-theme', mode==='light'?'light':''); }
    });

    // Export/Import
    document.getElementById('exportAll')?.addEventListener('click',()=>{
      const dump={
        focus:val('focusInput')||'',
        qi:store.get('qi',[]),
        system:store.get('system',{posts:0,starts:0,nudges:0,closes:0,calls:0,sales:0}),
        leads:store.get('leads',[]),
        calendar:store.get('calendar',[]),
        mindset:store.get('mindset',{affirm:[],journal:[]}),
        brand:store.get('brand',{brand:"#6b3fa0",accent:"#d4af37",tag:"",voice:"",snips:""}),
        content:store.get('content',''),
        planner:store.get('planner','')
      };
      const url=URL.createObjectURL(new Blob([JSON.stringify(dump,null,2)],{type:'application/json'}));
      const a=Object.assign(document.createElement('a'),{href:url,download:'legacybuilt_backup.json'});a.click();URL.revokeObjectURL(url);
    });
    document.getElementById('importFile')?.addEventListener('change',e=>{
      const f=e.target.files[0]; if(!f) return; const r=new FileReader();
      r.onload=()=>{ try{ const obj=JSON.parse(r.result);
        Object.entries(obj).forEach(([k,v])=>{ if(k==='focus') setv('focusInput',v); else store.set(k,v); });
        renderAll(); alert('Imported'); }catch(e){ alert('Invalid JSON'); } };
      r.readAsText(f);
    });

    // Initial renders
    renderAll();
  });
})();

// ----- Renderers -----
function money(n){ return '$'+(Number(n||0).toFixed(2)); }
function renderQI(){
  const arr=store.get('qi',[]);
  let planned=0, done=0, cnt=0, cd=0;
  const list=document.getElementById('qiList'); if(!list) return;
  list.innerHTML=arr.map((t,i)=>{
    planned+=Number(t.est||0); cnt++; cd+=t.done?1:0; done+=t.done?Number(t.est||0):0;
    return `<li><span><input type="checkbox" data-i="${i}" class="qi-check" ${t.done?'checked':''}> ${t.text} ${t.est?`<em>($${t.est})</em>`:''}</span><button data-i="${i}" class="del qi-del">Delete</button></li>`;
  }).join('');
  const meta=document.getElementById('qiMeta'); if(meta) meta.textContent=`Total planned: ${money(planned)} · Completed: ${money(done)} (${cd}/${cnt})`;
  document.querySelectorAll('.qi-check').forEach(cb=>cb.addEventListener('change',()=>{ const arr=store.get('qi',[]); arr[cb.dataset.i].done=cb.checked; store.set('qi',arr); renderQI(); }));
  document.querySelectorAll('.qi-del').forEach(b=>b.addEventListener('click',()=>{ const arr=store.get('qi',[]); window.qiUndoCache=arr.slice(); arr.splice(b.dataset.i,1); store.set('qi',arr); renderQI(); }));
}
function renderSystemTotals(){
  const s=store.get('system',{posts:0,starts:0,nudges:0,closes:0,calls:0,sales:0});
  const el=document.getElementById('sysTotals'); if(el) el.innerHTML=`<li>Posts: ${s.posts}</li><li>DM Starts: ${s.starts}</li><li>DM Nudges: ${s.nudges}</li><li>DM Closes: ${s.closes}</li><li>Calls: ${s.calls}</li><li>Sales ($): ${s.sales}</li>`;
}
function renderLeads(){
  const arr=store.get('leads',[]);
  const body=document.querySelector('#leadTable tbody'); if(!body) return;
  body.innerHTML=arr.map(r=>`<tr><td>${r.name}</td><td>${r.stage}</td><td>${r.next||''}</td><td>${r.note||''}</td>
  <td><button class="mini send" data-id="${r.id}">Send</button> <button class="mini danger" data-id="${r.id}" data-del="lead">Del</button></td></tr>`).join('');
  document.querySelectorAll('button.mini.send').forEach(b=>b.addEventListener('click',()=>{
    const arr=store.get('leads',[]); const r=arr.find(x=>String(x.id)===String(b.dataset.id)); if(!r||!r.next) return alert('Add next date first');
    const cal=store.get('calendar',[]); cal.unshift({id:'lead-'+r.id, when:r.next, title:'Follow-up: '+r.name, source:'Lead'}); store.set('calendar',cal); renderCal();
  }));
  document.querySelectorAll('button[data-del="lead"]').forEach(b=>b.addEventListener('click',()=>{
    const arr=store.get('leads',[]); const i=arr.findIndex(x=>String(x.id)===String(b.dataset.id)); if(i>=0){ arr.splice(i,1); store.set('leads',arr); renderLeads(); }
  }));
}
function renderCal(){
  const arr=store.get('calendar',[]);
  const body=document.querySelector('#calTable tbody'); if(!body) return;
  body.innerHTML=arr.map(ev=>`<tr><td>${ev.when}</td><td>${ev.title}</td><td>${ev.source||''}</td>
  <td><button class="mini danger" data-id="${ev.id}" data-del="cal">Del</button></td></tr>`).join('');
  document.querySelectorAll('button[data-del="cal"]').forEach(b=>b.addEventListener('click',()=>{
    const arr=store.get('calendar',[]); const i=arr.findIndex(x=>String(x.id)===String(b.dataset.id)); if(i>=0){ arr.splice(i,1); store.set('calendar',arr); renderCal(); }
  }));
}
function renderMindset(){
  const m=store.get('mindset',{affirm:[],journal:[]});
  const a=document.getElementById('affirmList'); if(a) a.innerHTML=m.affirm.map(t=>`<li>${t}</li>`).join('');
  const j=document.getElementById('journalList'); if(j) j.innerHTML=m.journal.map(e=>`<li><b>${new Date(e.ts).toLocaleString()}</b> — ${e.text}</li>`).join('');
}
function renderBrand(){
  const b=store.get('brand',{brand:"#6b3fa0",accent:"#d4af37",tag:"",voice:"",snips:""});
  setv('brandColor',b.brand); setv('accentColor',b.accent); setv('brandTag',b.tag); setv('brandVoice',b.voice);
  const sn=document.getElementById('brandSnips'); if(sn) sn.value=b.snips||'';
}
function renderContent(){
  const cv=document.getElementById('contentVault'); if(cv) cv.value=store.get('content','');
}
function renderPlanner(){
  const pl=document.getElementById('plannerText'); if(pl) pl.value=store.get('planner','');
}
function renderAll(){
  setv('focusInput', store.get('focus',''));
  renderQI(); renderSystemTotals(); renderLeads(); renderCal(); renderMindset(); renderBrand(); renderContent(); renderPlanner();
  wireCopy();
}

// Helpers
function addDaysISO(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

// Master Closer Tabs
function wireMCT(){
  const tabs=document.querySelectorAll('#mctTabs button[data-pane]');
  const panes=document.querySelectorAll('.mct-pane');
  if(!tabs.length) return;
  function showPane(id){
    panes.forEach(p=>p.classList.remove('show'));
    document.getElementById(id)?.classList.add('show');
    tabs.forEach(b=>b.classList.toggle('active', b.dataset.pane===id));
    wireCopy();
  }
  tabs.forEach(b=>{ b.onclick=()=>showPane(b.dataset.pane); });
  showPane((document.querySelector('#mctTabs .active')||tabs[0]).dataset.pane);
  wireCopy();
}
