'use strict';
(() => {
  const el=id=>document.getElementById(id);
  let latestResult=null;
  let refreshing=false;

  const countText=body=>`${Array.from(body||'').length.toLocaleString()}자`;
  const hideLatest=()=>{const panel=el('latestResult');if(panel)panel.hidden=true;};

  async function refreshLatestResult(showWaiting=true){
    if(refreshing||!novel||!chapter)return;
    refreshing=true;
    try{
      const result=await api('jobs.current');
      latestResult=null;
      if(!result?.job||result.job.chapter_id!==chapter.id){
        if(showWaiting)say('현재 회차에는 확인할 새 집필 작업이 없습니다.');
        hideLatest();
        return;
      }
      showJob(result);
      const panel=el('latestResult');
      const state=el('latestResultState');
      const body=el('latestResultBody');
      const use=el('applyLatestResult');
      if(result.response?.body){
        latestResult=result;
        panel.hidden=false;
        body.hidden=false;
        body.value=result.response.body;
        state.textContent=`새 글 도착 · ${countText(result.response.body)}`;
        use.hidden=false;
        use.disabled=chapter.body===result.response.body;
        use.textContent=use.disabled?'현재 본문에 반영됨':'본문으로 사용';
        if(showWaiting)say('새로 집필된 글을 불러왔습니다.');
      }else{
        panel.hidden=false;
        body.hidden=true;
        body.value='';
        use.hidden=true;
        state.textContent=result.job.status==='pending'?'집필 중 · 아직 새 글이 도착하지 않았습니다.':'저장된 새 글이 없습니다.';
        if(showWaiting)say(state.textContent);
      }
    }catch(error){
      if(showWaiting)showSaveError(error);
    }finally{refreshing=false;}
  }

  el('showLatestResult')?.addEventListener('click',()=>refreshLatestResult(true));
  el('hideLatestResult')?.addEventListener('click',hideLatest);

  el('applyLatestResult')?.addEventListener('click',()=>run(async()=>{
    await flush();
    const result=latestResult||await api('jobs.current');
    if(!result?.job||result.job.chapter_id!==chapter.id||!result.response?.body)return say('현재 회차에 적용할 새 글이 없습니다.');
    if(chapter.body===result.response.body)return say('이미 현재 본문에 반영된 글입니다.');
    if(!(await ask('새로 집필된 글로 현재 본문을 교체할까요?')))return;

    if(result.job.status==='pending'&&chapter.version===result.job.base_version){
      const applied=await api('results.apply',{id:result.job.id,version:chapter.version});
      renderChapter(applied.chapter);showJob(applied);
    }else{
      el('chapterTitle').value=result.response.title||chapter.title;
      el('body').value=result.response.body;
      changed('chapter');
      await flush();
    }
    say('새로 집필된 글을 현재 본문에 반영했습니다.');
    await refreshLatestResult(false);
  }));

  el('clearBody')?.addEventListener('click',()=>run(async()=>{
    await flush();
    if(!el('body').value)return say('현재 본문은 이미 비어 있습니다.');
    if(!(await ask('현재 회차의 기존 본문을 비울까요? 회차 설정과 집필 결과 기록은 남습니다.')))return;
    el('body').value='';
    changed('chapter');
    await flush();
    el('count').textContent='0자 · 공백 포함';
    say('기존 본문을 비웠습니다. 새 집필 결과는 별도로 확인할 수 있습니다.');
  }));

  el('rewriteJob')?.addEventListener('click',()=>run(async()=>{
    await flush();
    if(!(await ask('현재 회차를 새 글로 다시 집필할까요? 기존 본문은 그대로 두고 새 결과를 별도로 받습니다.')))return;
    const published=await api('jobs.create',{id:chapter.id});
    showJob({job:published});
    hideLatest();
    say('새 집필 작업을 만들었습니다. 집필 창으로 이동합니다.');
    setTimeout(()=>el('publishJob')?.click(),0);
  }));

  const state=el('jobState');
  if(state)new MutationObserver(()=>{
    const text=state.textContent||'';
    if(text.includes('집필 완료')||text.includes('결과 도착'))setTimeout(()=>refreshLatestResult(false),150);
  }).observe(state,{childList:true,subtree:true,characterData:true});

  window.addEventListener('focus',()=>setTimeout(()=>refreshLatestResult(false),250));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>refreshLatestResult(false),250);});
})();
