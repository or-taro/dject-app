'use strict';
(() => {
  const el=id=>document.getElementById(id);
  const URL_KEY='dject.v1.gptLaunchUrls';
  const ACTIVE_KEY='dject.v1.activeGpt';
  const DEFAULT_URL='https://chatgpt.com/';
  const PROJECT_REF='slimqungpcrpwojpaoyd';

  const GENERAL_INSTRUCTIONS=`Dject를 웹소설 작업 저장소로 사용한다.
사용자가 Dject 집필을 요청하면 먼저 실제로 사용할 수 있는 저장 도구를 확인한다.
1순위는 dject Action이다. dject Action이 없으면 연결된 Supabase 도구를 사용한다.
Supabase를 사용할 때는 프로젝트 ${PROJECT_REF}에서 정확한 작업 ID를 조회하고, 작업 행의 owner_id는 내부 처리에만 사용하며 사용자에게 노출하지 않는다.
집필 전 현재 작업과 요청 작업 ID가 같은지 확인하고 상태가 pending일 때만 작성한다.
snapshot의 장르·분위기·시점·전개 속도·분량·등장인물·세계관·줄거리·회차 목표를 반영한다.
작성 후 반드시 같은 작업 ID에 results.save 동작을 수행하고 저장 성공과 ready 또는 conflict 상태를 확인한다.
집필 단계에서는 results.apply를 호출하지 않는다. 본문 반영은 사용자가 Dject에서 새 글을 확인한 뒤 선택한다.
사용 가능한 dject Action과 Supabase 도구가 모두 없으면 글을 먼저 작성하지 말고 연결이 필요하다고 알린다.`;

  const buildStartRequest=jobId=>`Dject 집필 작업을 끝까지 처리해줘.\n작업 ID: ${jobId}\n\n먼저 이 대화에서 실제로 사용할 수 있는 저장 도구를 확인해.\nA) dject Action이 있으면 jobs.current와 jobs.get을 사용한다.\nB) dject Action이 없고 Supabase 연결 도구가 있으면 프로젝트 ${PROJECT_REF}를 사용한다. public.dject_gpt_jobs에서 위 작업 ID를 정확히 조회해 owner_id를 내부적으로 얻고(사용자에게 표시하지 않음), public.dject_dispatch를 통해 jobs.current와 jobs.get을 확인한 뒤 results.save를 수행한다.\nC) 둘 다 사용할 수 없으면 본문을 작성하지 말고 Dject 또는 Supabase 연결이 필요하다고 알려준다. 플러그인 검색이나 웹 검색으로 대체하지 않는다.\n\n반드시 다음 순서로 처리해.\n1) 현재 작업 ID와 위 작업 ID가 정확히 같은지 실제 도구 호출로 확인한다.\n2) ID가 다르거나 상태가 pending이 아니면 작성하거나 저장하지 않는다.\n3) snapshot에 저장된 장르·분위기·시점·전개 속도·분량·등장인물·세계관·줄거리·회차 목표를 반영해 제목과 웹소설 본문을 완성한다.\n4) 작성이 끝나면 반드시 같은 작업 ID에 results.save를 실행한다. Supabase 경로라면 public.dject_dispatch(owner_id,'results.save', ...)를 사용한다.\n5) 저장된 response가 존재하고 작업 상태가 ready 또는 conflict가 된 것을 실제로 확인한 뒤에만 완료라고 말한다.\n6) results.apply는 호출하지 않는다. 본문 반영은 내가 Dject에서 새 글을 확인한 뒤 선택한다.\n\n중요: 글만 채팅에 작성하고 저장 없이 끝내면 안 된다. 저장 성공 후에는 긴 본문을 반복 출력하지 말고 \"집필을 마쳤습니다. 디젝트에서 새 글을 확인하세요.\"라고 짧게 알려줘.`;

  const readUrls=()=>{try{return JSON.parse(localStorage.getItem(URL_KEY)||'{}')||{};}catch{return {};}};
  const writeUrls=value=>localStorage.setItem(URL_KEY,JSON.stringify(value));
  const activeId=()=>localStorage.getItem(ACTIVE_KEY)||'';
  const parseGeneralUrl=value=>{
    try{
      const u=new URL((value||'').trim());
      if(u.protocol!=='https:'||u.hostname!=='chatgpt.com')return null;
      if(!(u.pathname==='/'||/^\/c\/[^/]+\/?$/.test(u.pathname)))return null;
      u.search='';u.hash='';
      return u;
    }catch{return null;}
  };
  const safeUrl=value=>parseGeneralUrl(value)?.href||'';
  const urlError=value=>{
    if(!value?.trim())return '';
    try{
      const u=new URL(value.trim());
      if(u.hostname==='chatgpt.com'&&u.pathname.startsWith('/share/'))return '공유 링크(/share/...)는 이어서 대화할 수 없어 집필 연결로 사용할 수 없습니다.';
      if(u.hostname==='chatgpt.com'&&u.pathname.startsWith('/g/'))return 'Custom GPT 주소 대신 일반 ChatGPT 대화 주소(/c/...)를 사용하거나 주소를 비워 주세요.';
    }catch{}
    return '일반 ChatGPT의 https://chatgpt.com/ 또는 https://chatgpt.com/c/... 주소만 사용할 수 있습니다.';
  };

  function migrateOldUrls(){
    const urls=readUrls();let changed=false;
    for(const [id,value] of Object.entries(urls)){
      if(value&&!safeUrl(value)){delete urls[id];changed=true;}
    }
    if(changed)writeUrls(urls);
  }

  function ensureGeneralUi(){
    const manager=document.querySelector('.gpt-manager');
    const intro=manager?.querySelector(':scope > .muted');
    if(intro)intro.textContent='주소를 비워두면 일반 ChatGPT를 엽니다. 특정 일반 대화를 계속 쓰고 싶을 때만 /c/... 주소를 저장하세요.';
    const input=el('gptUrl');
    if(input){
      const label=document.querySelector('label[for="gptUrl"]');
      if(label)label.textContent='ChatGPT 대화 주소 (선택)';
      input.placeholder='https://chatgpt.com/c/...';
      let hint=el('gptUrlHint');
      if(!hint){
        hint=document.createElement('p');hint.id='gptUrlHint';hint.className='muted';
        const oldHint=input.nextElementSibling;
        if(oldHint?.classList?.contains('muted'))oldHint.replaceWith(hint);else input.after(hint);
      }
      hint.textContent='비워두면 일반 ChatGPT 새 대화를 엽니다. /share/... 공유 링크는 사용할 수 없습니다.';
    }
    el('testGptConnection')?.remove();
    const guide=document.querySelector('.connect-guide');
    if(guide)guide.hidden=true;
  }

  migrateOldUrls();
  ensureGeneralUi();

  const fillUrl=()=>{
    ensureGeneralUi();
    const input=el('gptUrl');if(!input)return;
    input.value=readUrls()[activeId()]||'';
  };

  const saveButton=el('saveGptProfile');
  saveButton?.addEventListener('click',event=>{
    const input=el('gptUrl');const value=input?.value.trim()||'';
    if(value&&!safeUrl(value)){event.preventDefault();event.stopImmediatePropagation();say(urlError(value));input?.focus();return;}
    setTimeout(()=>{
      const id=activeId();if(!id)return;
      const urls=readUrls();
      if(value)urls[id]=safeUrl(value);else delete urls[id];
      writeUrls(urls);
      say(value?'일반 ChatGPT 대화 주소를 저장했습니다.':'주소를 비웠습니다. 이제 일반 ChatGPT 새 대화를 사용합니다.');
    },0);
  },true);

  let deletingId='';
  el('deleteGptProfile')?.addEventListener('click',()=>{deletingId=activeId();setTimeout(()=>{if(!deletingId)return;const urls=readUrls();delete urls[deletingId];writeUrls(urls);deletingId='';fillUrl();},0);},true);
  el('newGptProfile')?.addEventListener('click',()=>{if(el('gptName'))el('gptName').value='';if(el('gptPurpose'))el('gptPurpose').value='';if(el('gptUrl'))el('gptUrl').value='';el('gptName')?.focus();});
  el('openGptManager')?.addEventListener('click',()=>queueMicrotask(fillUrl));
  el('manageGptInline')?.addEventListener('click',()=>queueMicrotask(fillUrl));
  el('activeGpt')?.addEventListener('change',()=>queueMicrotask(fillUrl));
  el('gptProfileList')?.addEventListener('click',()=>setTimeout(fillUrl,0));

  const instructionsButton=el('copyGptInstructions');
  instructionsButton?.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    try{await navigator.clipboard.writeText(GENERAL_INSTRUCTIONS);say('일반 ChatGPT용 집필 지침을 복사했습니다.');}
    catch{const box=el('gptInstructionsText');if(box){box.hidden=false;box.value=GENERAL_INSTRUCTIONS;box.select();}say('복사가 차단되어 집필 지침을 표시했습니다.');}
  },true);

  async function copyLaunchRequest(text){
    try{await navigator.clipboard.writeText(text);return true;}
    catch{const box=el('requestText');if(box){box.hidden=false;box.value=text;box.focus();box.select();}return false;}
  }

  const startButton=el('publishJob');
  if(startButton){
    startButton.onclick=()=>run(async()=>{
      const stored=readUrls()[activeId()]||'';
      if(stored&&!safeUrl(stored)){say(urlError(stored));openGptManager();queueMicrotask(fillUrl);return;}
      const url=safeUrl(stored)||DEFAULT_URL;
      await flush();
      let published=job;
      if(!published||published.chapter_id!==chapter.id||published.status!=='pending'||published.base_version!==chapter.version){published=await api('jobs.create',{id:chapter.id});}
      showJob({job:published});
      const request=buildStartRequest(published.id);
      const copied=await copyLaunchRequest(request);
      if(!copied){say('집필 요청 자동 복사가 차단되었습니다. 표시된 요청문을 복사한 뒤 집필 시작을 다시 눌러 주세요.');return;}
      say('집필 요청을 준비했습니다. 일반 ChatGPT로 이동합니다.');
      window.location.assign(url);
    });
  }

  const replacements=[['GPT 작성 대기','집필 중'],['GPT 집필이 완료되어','집필이 완료되어'],['저장된 GPT 결과','저장된 집필 결과'],['GPT 결과','집필 결과'],['GPT용 작업','집필 작업']];
  const normalize=node=>{if(!node)return;let value=node.textContent||'';for(const [from,to] of replacements)value=value.replaceAll(from,to);if(node.textContent!==value)node.textContent=value;};
  for(const id of ['jobState','message','askMessage']){const node=el(id);if(!node)continue;normalize(node);new MutationObserver(()=>normalize(node)).observe(node,{childList:true,subtree:true,characterData:true});}
})();
