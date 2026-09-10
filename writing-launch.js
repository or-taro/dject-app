'use strict';
(() => {
  const el=id=>document.getElementById(id);
  const URL_KEY='dject.v1.gptLaunchUrls';
  const ACTIVE_KEY='dject.v1.activeGpt';
  const DEFAULT_URL='https://chatgpt.com/';
  const PROJECT_REF='slimqungpcrpwojpaoyd';

  const COMMON_WEBNOVEL_RULES=`공통 웹소설 제작 원칙:
- 현재 작품의 고유 문체, 캐릭터, 설정, 세계관과 이미 작성된 내용을 우선한다.
- 특정 기존 작품의 문체·캐릭터·고유 설정·장면을 모방하거나 복제하지 않는다.
- 플랫폼 전략은 독자 기대, 전개 속도, 상품 구조, 후킹, 회차 구성 같은 추상적 특성만 활용한다.
- 회차 안에서 사건이나 감정이 실제로 움직이게 하고, 정보 설명만 길게 이어지지 않게 한다.
- 저장된 시점·분위기·전개 속도·분량·등장인물·세계관·플롯·회차 목표를 지킨다.
- 기존 본문은 사용자가 승인하기 전 자동으로 덮어쓰지 않는다.`;

  const KAKAO_STRATEGY=`카카오페이지 전략:
- 한 문장으로 이해되는 강한 콘셉트와 차별점을 선명하게 유지한다.
- 제목·설정·주인공 상황을 빠르게 이해할 수 있게 한다.
- 캐릭터 매력과 관계 확장 가능성을 초반부터 보여준다.
- 1~3화 안에 핵심 사건 또는 핵심 설정이 본격적으로 작동하게 한다.
- 초반 회차 후킹과 장기 연재 확장성을 함께 고려한다.
- CP 편집자가 작품의 상품 구조와 전체 방향을 빠르게 파악할 수 있는 밀도로 구성한다.`;

  const NAVER_STRATEGY=`네이버 전략:
- 제목과 작품 소개에서 클릭 이유가 분명하게 보이도록 한다.
- 1화 진입 장벽을 낮추고 주인공의 목표를 빠르게 이해시키는 데 집중한다.
- 회차마다 사건이 실제로 진행되고 독자가 체감할 보상·발견·성취를 배치한다.
- 매 회차의 끝에 다음 화를 눌러야 할 질문, 변화, 위기 또는 기대를 만든다.
- 자유연재 단계에서 독자 반응을 얻기 쉬운 연독성과 지속적인 연재 동력을 고려한다.`;

  const PLATFORM_COMPARISON=`플랫폼 미정 전략:
- 카카오페이지와 네이버 두 플랫폼만 비교한다. 다른 플랫폼 기준은 사용하지 않는다.
- 특정 한 플랫폼에 억지로 맞추지 말고 두 플랫폼에서 공통으로 유효한 초반 이해도, 사건 진행, 캐릭터 매력, 회차 후킹을 우선한다.
- 비교 점수는 실제 성공 확률이 아니라 작품 구조를 기준으로 한 상대적 적합도로만 다룬다.`;

  const platformLabel=value=>({kakao:'카카오페이지',naver:'네이버',undecided:'플랫폼 미정'}[value]||'플랫폼 미정');
  const strategyFor=value=>value==='kakao'?KAKAO_STRATEGY:value==='naver'?NAVER_STRATEGY:PLATFORM_COMPARISON;
  const currentPlatform=()=>novel?.data?.target_platform||el('target_platform')?.value||'undecided';

  const GENERAL_INSTRUCTIONS=`Dject를 네이버·카카오 웹소설 제작 저장소로 사용한다.
${COMMON_WEBNOVEL_RULES}

${KAKAO_STRATEGY}

${NAVER_STRATEGY}

${PLATFORM_COMPARISON}

사용자가 Dject 집필을 요청하면 실제로 사용할 수 있는 저장 도구를 먼저 확인한다.
1순위는 dject Action이다. dject Action이 없으면 연결된 Supabase 도구를 사용한다.
Supabase 경로에서는 프로젝트 ${PROJECT_REF}의 Dject 테이블을 execute_sql의 일반 SQL로 직접 조회·저장하며 public.dject_dispatch 또는 다른 RPC/함수 호출은 사용하지 않는다.
작업 행의 owner_id는 내부 처리에만 사용하며 사용자에게 노출하지 않는다.
집필 단계에서는 chapter 본문을 수정하거나 results.apply를 수행하지 않는다. 새 결과만 저장하고 사용자가 Dject에서 확인한 뒤 승인하도록 한다.`;

  const buildStartRequest=jobId=>{
    const platform=currentPlatform();
    return `Dject의 현재 회차를 집필하고 결과 저장까지 끝내줘.
작업 ID: ${jobId}
목표 플랫폼: ${platformLabel(platform)}

${COMMON_WEBNOVEL_RULES}

${strategyFor(platform)}

저장 도구 처리 규칙:
A) dject Action이 있으면 jobs.current와 jobs.get으로 위 작업 ID가 현재 작업과 정확히 같은지 확인하고, 집필 후 같은 ID에 results.save를 사용한다.
B) dject Action이 없고 Supabase 연결 도구가 있으면 프로젝트 ${PROJECT_REF}를 사용한다. public.dject_dispatch나 다른 RPC/함수 호출은 사용하지 말고 execute_sql의 일반 SQL로 Dject 테이블을 직접 조회·저장한다.
C) 둘 다 사용할 수 없으면 본문을 작성하지 말고 연결이 필요하다고 알려준다. 플러그인 검색이나 웹 검색으로 대체하지 않는다.

Supabase 경로의 필수 순서:
1) public.dject_gpt_jobs, public.dject_settings, public.dject_gpt_responses를 일반 SELECT로 조회해 위 ID가 current_job_id와 같고 status='pending'이며 기존 response가 없는지 확인한다.
2) 조건이 다르면 작성·저장하지 않는다.
3) job.snapshot.novel.data와 job.snapshot.chapter를 읽는다. target_platform, debut_goal, genre, secondary_genres, logline, work_intro, differentiation, characters, world, summary, long_term_plot, early_episode_plan, mood, pov, pace, length, extra와 회차 goal을 모두 반영한다.
4) 완성 후 같은 작업 ID에 제목과 본문을 저장한다. Supabase 경로에서는 한 트랜잭션 안에서 조건을 다시 확인한 뒤 public.dject_gpt_responses에 INSERT하고, chapter.version과 base_version이 같으면 job.status='ready', 다르면 'conflict'로 바꾼다.
5) 저장 후 일반 SELECT로 response 존재와 ready/conflict 상태를 실제 확인한다.
6) public.dject_chapters의 title/body는 수정하지 않고 results.apply도 호출하지 않는다.

저장 확인 전에는 완료라고 말하지 않는다. 저장 성공 후에는 긴 본문을 반복 출력하지 말고 "집필을 마쳤습니다. 디젝트에서 새 글을 확인하세요."라고 짧게 알려줘.`;
  };

  const readUrls=()=>{try{return JSON.parse(localStorage.getItem(URL_KEY)||'{}')||{};}catch{return {};}};
  const writeUrls=value=>localStorage.setItem(URL_KEY,JSON.stringify(value));
  const activeId=()=>localStorage.getItem(ACTIVE_KEY)||'';
  const parseGeneralUrl=value=>{
    try{
      const u=new URL((value||'').trim());
      if(u.protocol!=='https:'||u.hostname!=='chatgpt.com')return null;
      if(!(u.pathname==='/'||/^\/c\/[^/]+\/?$/.test(u.pathname)))return null;
      u.search='';u.hash='';return u;
    }catch{return null;}
  };
  const safeUrl=value=>parseGeneralUrl(value)?.href||'';
  const urlError=value=>{
    if(!value?.trim())return '';
    try{
      const u=new URL(value.trim());
      if(u.hostname==='chatgpt.com'&&u.pathname.startsWith('/share/'))return '공유 링크(/share/...)는 이어서 대화할 수 없어 집필 연결로 사용할 수 없습니다.';
      if(u.hostname==='chatgpt.com'&&u.pathname.startsWith('/g/'))return '일반 ChatGPT 대화 주소(/c/...)를 사용하거나 주소를 비워 주세요.';
    }catch{}
    return '일반 ChatGPT의 https://chatgpt.com/ 또는 https://chatgpt.com/c/... 주소만 사용할 수 있습니다.';
  };

  function migrateOldUrls(){const urls=readUrls();let changed=false;for(const [id,value] of Object.entries(urls)){if(value&&!safeUrl(value)){delete urls[id];changed=true;}}if(changed)writeUrls(urls);}
  function ensureGeneralUi(){
    const manager=document.querySelector('.gpt-manager');const intro=manager?.querySelector(':scope > .muted');
    if(intro)intro.textContent='주소를 비워두면 일반 ChatGPT를 엽니다. 특정 일반 대화를 계속 쓰고 싶을 때만 /c/... 주소를 저장하세요.';
    const input=el('gptUrl');if(input){const label=document.querySelector('label[for="gptUrl"]');if(label)label.textContent='ChatGPT 대화 주소 (선택)';input.placeholder='https://chatgpt.com/c/...';const hint=el('gptUrlHint');if(hint)hint.textContent='비워두면 일반 ChatGPT 새 대화를 엽니다. /share/... 공유 링크는 사용할 수 없습니다.';}
    el('testGptConnection')?.remove();const guide=document.querySelector('.connect-guide');if(guide)guide.hidden=true;
  }
  migrateOldUrls();ensureGeneralUi();

  const fillUrl=()=>{ensureGeneralUi();const input=el('gptUrl');if(input)input.value=readUrls()[activeId()]||'';};
  el('saveGptProfile')?.addEventListener('click',event=>{
    const input=el('gptUrl');const value=input?.value.trim()||'';
    if(value&&!safeUrl(value)){event.preventDefault();event.stopImmediatePropagation();say(urlError(value));input?.focus();return;}
    setTimeout(()=>{const id=activeId();if(!id)return;const urls=readUrls();if(value)urls[id]=safeUrl(value);else delete urls[id];writeUrls(urls);say(value?'일반 ChatGPT 대화 주소를 저장했습니다.':'주소를 비웠습니다. 일반 ChatGPT 새 대화를 사용합니다.');},0);
  },true);
  let deletingId='';
  el('deleteGptProfile')?.addEventListener('click',()=>{deletingId=activeId();setTimeout(()=>{if(!deletingId)return;const urls=readUrls();delete urls[deletingId];writeUrls(urls);deletingId='';fillUrl();},0);},true);
  el('newGptProfile')?.addEventListener('click',()=>{if(el('gptName'))el('gptName').value='';if(el('gptPurpose'))el('gptPurpose').value='';if(el('gptUrl'))el('gptUrl').value='';el('gptName')?.focus();});
  el('openGptManager')?.addEventListener('click',()=>queueMicrotask(fillUrl));
  el('manageGptInline')?.addEventListener('click',()=>queueMicrotask(fillUrl));
  el('activeGpt')?.addEventListener('change',()=>queueMicrotask(fillUrl));
  el('gptProfileList')?.addEventListener('click',()=>setTimeout(fillUrl,0));

  el('copyGptInstructions')?.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    try{await navigator.clipboard.writeText(GENERAL_INSTRUCTIONS);say('네이버·카카오 집필 지침을 복사했습니다.');}
    catch{const box=el('gptInstructionsText');if(box){box.hidden=false;box.value=GENERAL_INSTRUCTIONS;box.select();}say('복사가 차단되어 집필 지침을 표시했습니다.');}
  },true);

  async function copyLaunchRequest(text){
    try{await navigator.clipboard.writeText(text);return true;}
    catch{const box=el('requestText');if(box){box.hidden=false;box.value=text;box.focus();box.select();}return false;}
  }

  function launchUrl(){const stored=readUrls()[activeId()]||'';if(stored&&!safeUrl(stored))return {error:urlError(stored)};return {url:safeUrl(stored)||DEFAULT_URL};}
  async function openRequest(text,message='요청을 준비했습니다. ChatGPT로 이동합니다.'){
    const target=launchUrl();if(target.error){say(target.error);openGptManager();queueMicrotask(fillUrl);return false;}
    const copied=await copyLaunchRequest(text);if(!copied){say('요청문 자동 복사가 차단되었습니다. 표시된 요청문을 직접 복사해 주세요.');return false;}
    say(message);window.location.assign(target.url);return true;
  }

  const startButton=el('publishJob');
  if(startButton){startButton.onclick=()=>run(async()=>{
    await flush();
    let published=job;
    if(!published||published.chapter_id!==chapter.id||published.status!=='pending'||published.base_version!==chapter.version){published=await api('jobs.create',{id:chapter.id});}
    showJob({job:published});
    await openRequest(buildStartRequest(published.id),'집필 요청을 준비했습니다. ChatGPT로 이동합니다.');
  });}

  window.DjectLaunch={
    openRequest,
    buildStartRequest,
    strategyFor,
    platformLabel,
    commonRules:COMMON_WEBNOVEL_RULES,
    projectRef:PROJECT_REF
  };

  const replacements=[['GPT 작성 대기','집필 중'],['GPT 집필이 완료되어','집필이 완료되어'],['저장된 GPT 결과','저장된 집필 결과'],['GPT 결과','집필 결과'],['GPT용 작업','집필 작업']];
  const normalize=node=>{if(!node)return;let value=node.textContent||'';for(const [from,to] of replacements)value=value.replaceAll(from,to);if(node.textContent!==value)node.textContent=value;};
  for(const id of ['jobState','message','askMessage']){const node=el(id);if(!node)continue;normalize(node);new MutationObserver(()=>normalize(node)).observe(node,{childList:true,subtree:true,characterData:true});}
})();
