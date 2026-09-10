'use strict';
(() => {
  const el=id=>document.getElementById(id);
  for(const name of ['style_guide','speech_guide'])if(!fields.includes(name))fields.push(name);
  let latestResult=null;
  let refreshing=false;
  let currentHasResponse=false;
  let originalResultBody='';
  let originalResultTitle='';
  let latestResultJobId='';
  let editTimer=null;

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
  const editKey=id=>`dject.v16.resultEdit.${id}`;
  const readEdit=id=>{try{const saved=JSON.parse(localStorage.getItem(editKey(id))||'null');return saved&&saved.job_id===id&&typeof saved.body==='string'?saved.body:null;}catch{return null;}};
  const clearEdit=id=>{if(!id)return;try{localStorage.removeItem(editKey(id));}catch{}};
  function editChanged(){const body=el('latestResultBody');return !!body&&body.value!==originalResultBody;}
  function renderEditState(){
    const state=el('latestEditState'),body=el('latestResultBody');if(!state||!body)return;
    if(!latestResult||latestResult.job?.status==='completed'){state.textContent='AI 원본 · 본문 반영 완료';return;}
    state.textContent=editChanged()?'편집 중 · 이 기기에 임시 저장됨':'AI 원본';
    const status=el('latestResultState');
    if(status){const conflict=latestResult.job?.status==='conflict'?' · 현재 본문과 버전이 달라 검토 필요':'';status.textContent=`새 글 도착 · ${countText(body.value)}${editChanged()?' · 편집본': ''}${conflict}`;}
  }
  function saveEditNow(){
    if(!latestResultJobId||!latestResult||latestResult.job?.status==='completed')return;
    const body=el('latestResultBody');if(!body)return;
    try{localStorage.setItem(editKey(latestResultJobId),JSON.stringify({job_id:latestResultJobId,response_id:latestResult.response?.id||'',body:body.value,updated_at:new Date().toISOString()}));}catch{}
    renderEditState();
  }
  function queueEditSave(){clearTimeout(editTimer);editTimer=setTimeout(saveEditNow,250);renderEditState();}
  function renderProofread(value){
    const panel=el('latestProofreadPanel'),body=el('latestProofreadBody'),state=el('latestProofreadState');if(!panel||!body)return;
    const data=value&&typeof value==='object'?value:null;
    if(!data||String(data.job_id||'')!==String(latestResultJobId)){panel.hidden=true;body.replaceChildren();return;}
    panel.hidden=false;body.replaceChildren();if(state)state.textContent='점검 결과는 제안이며 편집본을 자동으로 고치지 않습니다.';
    const labels={summary:'요약',typos:'오타·맞춤법',notation_consistency:'숫자·시간·표기',speech_consistency:'말투·호칭',style_consistency:'문체·시점',cautions:'확인이 필요한 부분',issues:'발견 사항',suggestion:'수정 제안',original:'현재 표현',reason:'이유'};
    const add=(parent,key,val)=>{if(val===null||val===undefined||val==='')return;const section=document.createElement('section');section.className='report-section';const h=document.createElement('h4');h.textContent=labels[key]||String(key).replaceAll('_',' ');section.append(h);if(Array.isArray(val)){const ul=document.createElement('ul');for(const item of val){const li=document.createElement('li');li.textContent=typeof item==='object'?Object.entries(item).map(([k,v])=>`${labels[k]||k}: ${typeof v==='object'?JSON.stringify(v):v}`).join(' / '):String(item);ul.append(li);}section.append(ul);}else if(val&&typeof val==='object'){for(const [k,v] of Object.entries(val))add(section,k,v);}else{const p=document.createElement('p');p.textContent=String(val);section.append(p);}parent.append(section);};
    for(const [key,val] of Object.entries(data))if(!['job_id','platform','generated_at'].includes(key))add(body,key,val);
  }
  async function refreshProofreadFromServer(showMessage=false){
    if(!novel||!latestResultJobId||dirtyN||dirtyC||queue||blocked)return;
    try{const result=await api('novels.get',{id:novel.id});if(result?.novel){novel=result.novel;renderProofread(novel.data?.latest_result_proofread);if(showMessage)say('최신 오타·문체 점검 결과를 불러왔습니다.');}}catch(error){if(showMessage)showSaveError(error);}
  }
  function proofreadPrompt(result,text){
    const platform=novel?.data?.target_platform||'undecided';
    const style=novel?.data?.style_guide||'비어 있음: 객관적인 시간·수량은 숫자 표기 우선, 표기 혼용 금지';
    const speech=novel?.data?.speech_guide||'비어 있음: 기존 캐릭터 설정과 앞선 대화의 호칭·존댓말/반말 패턴을 일관되게 유지';
    return `Dject의 새 글 편집본을 오타·문체 기준으로 점검하고 결과를 작품에 저장해줘.
작품 ID: ${novel.id}
확인할 작품 version: ${novel.version}
집필 작업 ID: ${result.job.id}
목표 플랫폼: ${platform}

점검 기준:
- 명백한 오타, 맞춤법, 띄어쓰기, 조사, 문장부호, 중복 표현과 비문을 찾는다.
- 숫자·시간·날짜·단위 표기가 한 작품 안에서 이유 없이 혼용되는지 확인한다.
- 인물별·상대별 존댓말/반말과 호칭이 상황 변화 없이 흔들리는지 확인한다.
- 서술 시점, 문체, 고유 용어 표기를 확인한다.
- 의미, 사건, 캐릭터 성격을 바꾸는 재창작은 하지 않는다.
- 편집본을 자동 수정하거나 기존 회차 본문을 덮어쓰지 않는다.

문체·표기 기준:
${style}

인물별 말투·호칭 기준:
${speech}

점검할 편집본 시작
---
${text}
---
점검할 편집본 끝

결과는 public.dject_novels의 기존 data를 모두 보존하면서 data.latest_result_proofread 하나에만 저장한다. 저장 JSON 구조는 {job_id, platform, generated_at, summary, typos:[{original,suggestion,reason}], notation_consistency:[{original,suggestion,reason}], speech_consistency:[{original,suggestion,reason}], style_consistency:[{original,suggestion,reason}], cautions:[]} 로 한다. job_id는 정확히 ${result.job.id}로 저장한다.
Dject Action이 있으면 novels.get/novels.save를 사용하고, 없고 Supabase 도구가 있으면 Dject 프로젝트의 public.dject_novels를 일반 SELECT/UPDATE로 직접 처리한다. public.dject_dispatch/RPC는 사용하지 않는다. UPDATE는 작품 id와 읽은 version을 조건으로 하고 version을 1 증가시킨다. 저장 후 다시 조회하여 latest_result_proofread와 version 증가를 확인한 뒤에만 완료라고 말한다. 저장 도구가 없으면 점검을 임의로 완료했다고 하지 말고 연결이 필요하다고 알려준다.
긴 원문이나 전체 교정본은 채팅에 반복하지 않는다.`;
  }

  function chapterCopyeditPrompt(){
    const platform=novel?.data?.target_platform||'undecided';
    const strategy=window.DjectLaunch?.strategyFor?.(platform)||'';
    return `Dject의 현재 회차를 오타·문체 일관성 기준으로 점검하고 결과를 작품에 저장해줘.
작품 ID: ${novel.id}
확인할 작품 version: ${novel.version}
회차 ID: ${chapter.id}
회차 번호: ${chapter.number}
목표 플랫폼: ${platform}

먼저 실제 저장 도구로 작품 data와 현재 회차 title, goal, body를 읽는다. 작품 data의 style_guide와 speech_guide, characters, pov도 반드시 함께 읽는다.

점검 기준:
- 명백한 오타, 맞춤법, 띄어쓰기, 조사, 문장부호, 중복 표현, 비문
- 숫자·시간·날짜·단위 표기의 불필요한 혼용
- 인물별·상대별 존댓말/반말, 호칭, 말버릇의 이유 없는 변화
- 서술 시점, 문체, 고유 용어 표기의 일관성
- 의미나 사건을 바꾸는 재창작은 하지 않는다.
- 원문은 절대 자동 수정하거나 덮어쓰지 않는다.

플랫폼 전략은 보조 기준으로만 사용한다:
${strategy}

결과는 기존 작품 data 전체를 보존하면서 data.latest_chapter_review 하나에만 {chapter_id, chapter_number, kind:'copyedit', platform, report:{strengths:[],issues:[],recommendations:[]}} 구조로 저장한다. chapter_id는 정확히 ${chapter.id}, chapter_number는 ${chapter.number}로 저장한다.
Dject Action이 있으면 novels.get/chapters.get/novels.save를 사용한다. Dject Action이 없고 Supabase 도구가 있으면 Dject 프로젝트의 public.dject_novels과 public.dject_chapters를 일반 SELECT/UPDATE로 직접 처리하며 public.dject_dispatch/RPC는 사용하지 않는다. UPDATE는 작품 id와 읽은 version을 조건으로 하고 version을 1 증가시킨다. 저장 후 다시 조회해 결과와 version 증가를 확인한 뒤에만 완료라고 말한다. 저장 도구가 없으면 완료했다고 하지 말고 연결이 필요하다고 알려준다.`;
  }

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
      latestResult=null;originalResultBody='';originalResultTitle='';latestResultJobId='';
      if(!result?.job||result.job.chapter_id!==chapter.id){
        if(showWaiting)say('현재 회차에는 확인할 새 집필 작업이 없습니다.');
        hideLatest();return;
      }
      showJob(result);
      const panel=el('latestResult'),state=el('latestResultState'),body=el('latestResultBody'),use=el('applyLatestResult');
      const discard=el('discardLatestResult')||ensureDiscardButton();const reset=el('resetLatestResult'),proof=el('proofreadLatestResult');
      if(result.response?.body!==undefined&&result.response?.body!==null){
        latestResult=result;latestResultJobId=result.job.id;originalResultBody=result.response.body;originalResultTitle=result.response.title||'';
        panel.hidden=false;body.hidden=false;
        const completed=result.job.status==='completed';
        const saved=completed?null:readEdit(result.job.id);
        body.value=saved===null?originalResultBody:saved;body.readOnly=completed;
        use.hidden=completed;use.disabled=completed;use.textContent='편집본을 본문으로 사용';
        if(discard)discard.hidden=completed;if(reset)reset.hidden=completed;if(proof)proof.hidden=completed;
        const note=result.job.status==='conflict'?' · 현재 본문과 버전이 달라 검토 필요':'';
        state.textContent=completed?`AI 원본 · ${countText(originalResultBody)} · 본문 반영 완료`:`새 글 도착 · ${countText(body.value)}${saved!==null&&saved!==originalResultBody?' · 편집본':''}${note}`;
        renderEditState();renderProofread(novel?.data?.latest_result_proofread);
        if(showWaiting)say(completed?'이 집필 결과는 이미 본문에 반영됐습니다.':'새 글을 불러왔습니다. 읽으면서 직접 고치거나 내용을 덧붙인 뒤 본문으로 사용할 수 있습니다.');
      }else{
        panel.hidden=false;body.hidden=true;body.value='';use.hidden=true;if(discard)discard.hidden=true;if(reset)reset.hidden=true;if(proof)proof.hidden=true;
        el('latestProofreadPanel')?.setAttribute('hidden','');
        state.textContent=result.job.status==='pending'?'집필 중 · 아직 새 글이 도착하지 않았습니다.':'저장된 새 글이 없습니다.';
        if(showWaiting)say(state.textContent);
      }
    }catch(error){if(showWaiting)showSaveError(error);}finally{refreshing=false;}
  }

  el('showLatestResult')?.addEventListener('click',()=>refreshLatestResult(true));
  el('hideLatestResult')?.addEventListener('click',hideLatest);

  el('latestResultBody')?.addEventListener('input',queueEditSave);

  el('runCopyeditReview')?.addEventListener('click',()=>run(async()=>{
    await flush();
    if(!chapter?.body?.trim())return say('오타·문체를 점검할 현재 회차 본문이 없습니다.');
    if(!window.DjectLaunch?.openRequest)return say('집필 연결 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
    await window.DjectLaunch.openRequest(chapterCopyeditPrompt(),'오타·문체 점검 요청을 준비했습니다. ChatGPT로 이동합니다.');
  }));

  el('resetLatestResult')?.addEventListener('click',()=>run(async()=>{
    if(!latestResult||latestResult.job?.status==='completed')return;
    const body=el('latestResultBody');if(!body)return;
    if(body.value!==originalResultBody&&!(await ask('직접 수정한 내용을 버리고 AI가 처음 작성한 원본으로 되돌릴까요?')))return;
    body.value=originalResultBody;clearEdit(latestResultJobId);renderEditState();say('AI가 처음 작성한 새 글로 되돌렸습니다. 기존 본문은 변경하지 않았습니다.');
  }));

  el('proofreadLatestResult')?.addEventListener('click',()=>run(async()=>{
    await flush();
    const result=latestResult||await api('jobs.current');
    if(!result?.job||result.job.chapter_id!==chapter.id||!result.response)return say('점검할 새 글이 없습니다.');
    if(result.job.status==='completed')return say('이미 본문에 반영된 결과입니다. 본문 아래의 오타·문체 점검을 사용해 주세요.');
    saveEditNow();const text=el('latestResultBody')?.value||'';if(!text.trim())return say('점검할 글이 비어 있습니다.');
    if(!window.DjectLaunch?.openRequest)return say('집필 연결 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
    await window.DjectLaunch.openRequest(proofreadPrompt(result,text),'오타·표기·말투 점검 요청을 준비했습니다. ChatGPT로 이동합니다.');
  }));

  el('applyLatestResult')?.addEventListener('click',()=>run(async()=>{
    await flush();
    const result=latestResult||await api('jobs.current');
    if(!result?.job||result.job.chapter_id!==chapter.id||!result.response)return say('현재 회차에 적용할 새 글이 없습니다.');
    if(result.job.status==='completed')return say('이미 본문에 반영된 글입니다.');
    const editedBody=el('latestResultBody')?.value??result.response.body;
    if(!editedBody.trim()&&!(await ask('편집본이 비어 있습니다. 현재 회차 본문을 빈 글로 교체할까요?')))return;
    if(editedBody.trim()&&!(await ask(editChanged()?'직접 수정한 편집본으로 현재 회차 본문을 교체할까요? AI 원본은 별도로 보존됩니다.':'AI 원본을 현재 회차 본문으로 사용할까요?')))return;

    const latestChapter=await api('chapters.get',{id:chapter.id});
    if(chapter.id!==latestChapter.id)return;
    if(latestChapter.version!==chapter.version||latestChapter.body!==chapter.body)renderChapter(latestChapter);
    const changedBody=editedBody!==result.response.body;
    const applied=changedBody
      ?await api('results.apply_edited',{id:result.job.id,version:latestChapter.version,title:result.response.title||'',body:editedBody})
      :await api('results.apply',{id:result.job.id,version:latestChapter.version});
    clearEdit(result.job.id);latestResult=null;latestResultJobId='';originalResultBody='';originalResultTitle='';
    renderChapter(applied.chapter);showJob(applied);hideLatest();
    say(changedBody?'직접 수정한 편집본을 본문에 반영했습니다. AI 원본은 집필 결과 기록에 그대로 보존됩니다.':'확인한 새 글을 현재 본문에 반영했습니다.');
  }));

  discardButton?.addEventListener('click',()=>run(async()=>{
    await flush();
    const result=latestResult||await api('jobs.current');
    if(!result?.job||result.job.chapter_id!==chapter.id||!result.response?.body)return say('버릴 새 글이 없습니다.');
    if(result.job.status==='completed'||chapter.body===result.response.body)return say('이미 본문에 반영된 글은 여기서 버릴 수 없습니다.');
    if(!(await ask('이 새 글을 삭제할까요? 현재 본문은 그대로 유지됩니다.')))return;
    const discarded=await api('results.discard',{id:result.job.id});
    clearEdit(result.job.id);latestResultJobId='';originalResultBody='';originalResultTitle='';latestResult=null;
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
    if(latestResultJobId)clearEdit(latestResultJobId);
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

  window.addEventListener('focus',()=>setTimeout(async()=>{await refreshLatestResult(false);await refreshProofreadFromServer(false);},250));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(async()=>{await refreshLatestResult(false);await refreshProofreadFromServer(false);},250);});
})();

