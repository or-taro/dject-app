'use strict';
(() => {
  const el=id=>document.getElementById(id);
  let latestResult=null;
  let refreshing=false;
  let currentHasResponse=false;

  syncJobPolling=function(){
    if(jobPollTimer){clearTimeout(jobPollTimer);jobPollTimer=null;}
    if(!novel||!chapter||!job||job.status!=='pending'||currentHasResponse||job.chapter_id!==chapter.id||document.hidden)return;
    jobPollTimer=setTimeout(()=>{
      jobPollTimer=null;
      checkJob(true).catch(()=>syncJobPolling());
    },JOB_POLL_MS);
  };

  showJob=function(result){
    job=result?.job||null;
    currentHasResponse=!!result?.response;
    const labels={pending:'집필 중 · 자동 확인 중',ready:'새 글 도착',completed:'본문 반영 완료',conflict:'새 글 확인 필요',superseded:'새 글 없음'};
    const effective=currentHasResponse&&job?.status==='pending'?'ready':job?.status;
    el('jobState').textContent=job?`${labels[effective]||effective}${job.chapter_id!==chapter?.id?' · 다른 회차':''}`:'준비 전';
    if(el('review'))el('review').hidden=true;
    syncJobPolling();
  };

  checkJob=async function(autoRefresh=false){
    if(!novel||jobSyncing)return;
    jobSyncing=true;
    try{
      const result=await api('jobs.current');
      showJob(result);
      if(!result?.job||!chapter||result.job.chapter_id!==chapter.id)return;
      if(dirtyN||dirtyC||queue||blocked)return;

      if(result.response&&['pending','ready','conflict'].includes(result.job.status)){
        if(autoRefresh){
          if(result.job.status==='conflict')say('새 글이 도착했습니다. 현재 본문이 변경되어 새 글 확인에서 검토해 주세요.');
          else say('새 글이 도착했습니다. 새 글 확인에서 먼저 읽어볼 수 있습니다.');
        }
        return;
      }

      if(result.job.status==='completed'){
        const expectedId=chapter.id;
        const latest=await api('chapters.get',{id:expectedId});
        if(chapter?.id!==expectedId||dirtyN||dirtyC||queue||blocked)return;
        if(latest.version!==chapter.version||latest.body!==chapter.body){
          renderChapter(latest);
          if(autoRefresh)say('선택한 새 글이 본문에 반영된 최신 상태를 불러왔습니다.');
        }
      }
    }finally{
      jobSyncing=false;
      syncJobPolling();
    }
  };

  const countText=body=>`${Array.from(body||'').length.toLocaleString()}자`;
  const hideLatest=()=>{const panel=el('latestResult');if(panel)panel.hidden=true;};

  function ensureDiscardButton(){
    let button=el('discardLatestResult');
    if(button)return button;
    const use=el('applyLatestResult');
    if(!use?.parentElement)return null;
    button=document.createElement('button');
    button.id='discardLatestResult';
    button.type='button';
    button.className='danger';
    button.textContent='새 글 버리기';
    use.after(button);
    return button;
  }

  const discardButton=ensureDiscardButton();

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
      const discard=el('discardLatestResult')||ensureDiscardButton();
      if(result.response?.body){
        latestResult=result;
        panel.hidden=false;
        body.hidden=false;
        body.value=result.response.body;
        const note=result.job.status==='conflict'?' · 현재 본문과 버전이 달라 검토 필요':'';
        state.textContent=`새 글 도착 · ${countText(result.response.body)}${note}`;
        use.hidden=false;
        use.disabled=chapter.body===result.response.body;
        use.textContent=use.disabled?'현재 본문에 반영됨':'본문으로 사용';
        if(discard)discard.hidden=!!use.disabled||result.job.status==='completed';
        if(showWaiting)say('새로 집필된 글을 불러왔습니다. 본문을 바꾸지 않고 먼저 확인할 수 있습니다.');
      }else{
        panel.hidden=false;
        body.hidden=true;
        body.value='';
        use.hidden=true;
        if(discard)discard.hidden=true;
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

    const latestChapter=await api('chapters.get',{id:chapter.id});
    if(chapter.id!==latestChapter.id)return;
    if(latestChapter.version!==chapter.version||latestChapter.body!==chapter.body)renderChapter(latestChapter);

    const applied=await api('results.apply',{id:result.job.id,version:latestChapter.version});
    renderChapter(applied.chapter);
    showJob(applied);
    say('확인한 새 글을 현재 본문에 반영했습니다.');
    await refreshLatestResult(false);
  }));

  discardButton?.addEventListener('click',()=>run(async()=>{
    await flush();
    const result=latestResult||await api('jobs.current');
    if(!result?.job||result.job.chapter_id!==chapter.id||!result.response?.body)return say('버릴 새 글이 없습니다.');
    if(result.job.status==='completed'||chapter.body===result.response.body)return say('이미 본문에 반영된 글은 여기서 버릴 수 없습니다.');
    if(!(await ask('이 새 글을 삭제할까요? 현재 본문은 그대로 유지됩니다.')))return;
    const discarded=await api('results.discard',{id:result.job.id});
    latestResult=null;
    showJob(discarded);
    hideLatest();
    say('새 글을 삭제했습니다. 현재 본문은 변경하지 않았습니다. 다시 집필할 수 있습니다.');
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
    if(text.includes('새 글 도착')||text.includes('새 글 확인 필요')||text.includes('본문 반영 완료'))setTimeout(()=>refreshLatestResult(false),150);
  }).observe(state,{childList:true,subtree:true,characterData:true});

  window.addEventListener('focus',()=>setTimeout(()=>refreshLatestResult(false),250));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>refreshLatestResult(false),250);});
})();

(() => {
  const script=document.createElement('script');
  script.src='./novel-list-tools.js?v=14';
  script.async=false;
  document.head.append(script);
})();
