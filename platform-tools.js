'use strict';
(() => {
  const el=id=>document.getElementById(id);
  const PROJECT_REF='slimqungpcrpwojpaoyd';
  const EXTRA_FIELDS=['target_platform','debut_goal','secondary_genres','project_status','logline','work_intro','differentiation','long_term_plot','early_episode_plan'];
  for(const name of EXTRA_FIELDS)if(!fields.includes(name))fields.push(name);

  const GENRES=['현대판타지','판타지','무협','로맨스','현대로맨스','로맨스판타지','대체역사','스포츠','미스터리/괴담','아카데미','스릴러','BL','학원물','기타'];
  const PLATFORM_LABEL={kakao:'카카오페이지',naver:'네이버',undecided:'아직 모르겠어요'};
  const GOAL_LABEL={debut:'정식 데뷔',serial:'자유연재',contest:'공모전',undecided:'아직 결정하지 않음'};
  const STATUS_LABEL={planning:'기획 중',writing:'집필 중',preparing:'연재·투고 준비'};
  const REPORT_LABELS={
    platform:'플랫폼',overall:'종합 평가',score:'적합도',scores:'상대 적합도',strengths:'강점',improvements:'보완 필요',recommendations:'추천 수정',reason:'이유',reasons:'이유',kakao:'카카오페이지',naver:'네이버',disclaimer:'안내',
    logline:'한 줄 로그라인',work_intro:'작품 소개',differentiation:'핵심 차별점',characters:'주요 등장인물',world:'세계관',summary:'전체 시놉시스',long_term_plot:'장기 연재 방향',early_episode_plan:'초반 회차 구성',title_suggestions:'제목 후보',keywords:'주요 키워드',
    readiness:'준비 상태',missing:'준비가 필요한 항목',risks:'주의할 점',next_actions:'다음 행동',report:'점검 결과',kind:'점검 종류',chapter_number:'회차',generated_at:'생성 시각',sections:'자료'
  };

  const platformValue=()=>el('target_platform')?.value||novel?.data?.target_platform||'undecided';
  const secondaryValues=()=>String(el('secondary_genres')?.value||'').split(',').map(v=>v.trim()).filter(Boolean);
  const statusValue=()=>el('project_status')?.value||novel?.data?.project_status||'planning';
  const parseObject=value=>{
    if(value&&typeof value==='object')return value;
    if(typeof value==='string'){try{return JSON.parse(value);}catch{return null;}}
    return null;
  };
  const reportText=value=>{
    if(value===null||value===undefined)return '';
    if(Array.isArray(value))return value.map((v,i)=>`${i+1}. ${typeof v==='object'?reportText(v):v}`).join('\n');
    if(typeof value!=='object')return String(value);
    return Object.entries(value).map(([k,v])=>`${REPORT_LABELS[k]||k}\n${reportText(v)}`).join('\n\n');
  };

  function addChip(container,genre,selected,handler){
    const label=document.createElement('label');label.className='genre-chip';
    const input=document.createElement('input');input.type='checkbox';input.value=genre;input.checked=selected;
    const span=document.createElement('span');span.textContent=genre;
    input.addEventListener('change',handler);label.append(input,span);container.append(label);
  }

  function renderSecondaryChoices(){
    const container=el('secondaryGenreChoices');if(!container)return;
    const selected=new Set(secondaryValues());container.replaceChildren();
    for(const genre of GENRES){
      addChip(container,genre,selected.has(genre),()=>{
        const values=[...container.querySelectorAll('input:checked')].map(x=>x.value).filter(v=>v!==el('genre')?.value);
        el('secondary_genres').value=values.join(',');
        changed('novel');renderDashboard();
      });
    }
  }

  function renderWizardGenres(selected=[]){
    const container=el('wizardSecondaryGenres');if(!container)return;container.replaceChildren();
    const set=new Set(selected);
    for(const genre of GENRES)addChip(container,genre,set.has(genre),saveWizardState);
  }

  function renderDashboard(){
    if(!novel)return;
    const title=el('title')?.value||novel.title||'제목 미정';
    const platform=platformValue();
    const mainGenre=el('genre')?.value||novel.data?.genre||'장르 미정';
    const secondaries=secondaryValues().filter(v=>v!==mainGenre);
    if(el('dashboardTitle'))el('dashboardTitle').textContent=title;
    if(el('dashboardPlatform'))el('dashboardPlatform').textContent=PLATFORM_LABEL[platform]||'플랫폼 미정';
    if(el('dashboardGenre'))el('dashboardGenre').textContent=[mainGenre,...secondaries.slice(0,2)].join(' / ');
    if(el('dashboardChapter'))el('dashboardChapter').textContent=chapter?`현재 ${chapter.number}화${chapter.title?` · ${chapter.title}`:''}`:'회차 준비 중';
    if(el('dashboardStatus'))el('dashboardStatus').textContent=STATUS_LABEL[statusValue()]||'기획 중';
    if(el('dashboardMeta'))el('dashboardMeta').textContent=`${PLATFORM_LABEL[platform]||'플랫폼 미정'} · ${GOAL_LABEL[el('debut_goal')?.value||'undecided']} · ${chapter?`${chapter.number}화 작업 중`:'회차 준비 중'}`;
    renderStrategySummary();renderPlatformArtifacts();renderDebut();renderChapterReview();
  }

  function renderStrategySummary(){
    const box=el('writingStrategySummary');if(!box)return;
    const p=platformValue();
    if(p==='kakao')box.textContent='카카오페이지 기준 · 강한 콘셉트, 캐릭터 매력, 1~3화 핵심 사건 진입, 초반 후킹과 장기 확장성을 중점으로 집필합니다.';
    else if(p==='naver')box.textContent='네이버 기준 · 1화 진입력, 회차별 사건과 보상, 명확한 주인공 목표, 다음 화를 누르게 하는 엔딩을 중점으로 집필합니다.';
    else box.textContent='플랫폼 미정 · 네이버와 카카오 두 기준을 비교하되, 공통으로 중요한 초반 이해도·사건 진행·캐릭터 매력·후킹을 우선합니다.';
  }

  function appendValue(parent,key,value){
    if(value===null||value===undefined||value==='')return;
    const section=document.createElement('section');section.className='report-section';
    const heading=document.createElement('h4');heading.textContent=REPORT_LABELS[key]||key;section.append(heading);
    if(key==='scores'&&value&&typeof value==='object'){
      for(const name of ['kakao','naver'])if(value[name]!==undefined){
        const row=document.createElement('div');row.className='score-row';
        const label=document.createElement('span');label.textContent=REPORT_LABELS[name];
        const bar=document.createElement('span');bar.className='score-bar';const fill=document.createElement('span');fill.style.width=`${Math.max(0,Math.min(100,Number(value[name])||0))}%`;bar.append(fill);
        const score=document.createElement('strong');score.textContent=`${value[name]}%`;row.append(label,bar,score);section.append(row);
      }
    }else if(Array.isArray(value)){
      const ul=document.createElement('ul');for(const item of value){const li=document.createElement('li');li.textContent=typeof item==='object'?reportText(item):String(item);ul.append(li);}section.append(ul);
    }else if(value&&typeof value==='object'){
      for(const [childKey,childValue] of Object.entries(value))appendValue(section,childKey,childValue);
    }else{
      const p=document.createElement('p');p.textContent=String(value);section.append(p);
    }
    parent.append(section);
  }

  function renderObject(container,value,emptyText){
    container.replaceChildren();
    const obj=parseObject(value);
    if(!obj){container.classList.add('empty-report');container.textContent=emptyText;return false;}
    container.classList.remove('empty-report');
    for(const [key,val] of Object.entries(obj))appendValue(container,key,val);
    return true;
  }

  function renderConceptSuggestion(){
    const panel=el('conceptSuggestion'),body=el('conceptSuggestionBody'),apply=el('applyConceptSuggestion');if(!panel||!body)return;
    const suggestion=parseObject(novel?.data?.ai_concept_suggestion);
    panel.hidden=!suggestion;if(apply)apply.hidden=!suggestion;
    if(suggestion)renderObject(body,suggestion,'');
  }

  function renderRevisionSuggestion(){
    const panel=el('revisionSuggestion'),body=el('revisionSuggestionBody'),apply=el('applyRevisionSuggestion');if(!panel||!body)return;
    const suggestion=parseObject(novel?.data?.ai_revision_suggestion);
    panel.hidden=!suggestion;if(apply)apply.hidden=!suggestion;
    if(suggestion)renderObject(body,suggestion,'');
  }

  function renderPlatformArtifacts(){
    if(!novel)return;
    const p=platformValue();const box=el('platformAnalysisContent'),intro=el('platformReviewIntro'),button=el('runPlatformAnalysis');if(!box)return;
    if(p==='undecided'){
      if(intro)intro.textContent='카카오페이지와 네이버 두 플랫폼만 비교해 작품 구조상 더 적합한 방향을 찾습니다.';
      if(button)button.textContent='네이버·카카오 비교 분석';
      renderObject(box,novel.data?.platform_comparison,'아직 실행한 플랫폼 비교가 없습니다.');
    }else{
      const label=PLATFORM_LABEL[p];if(intro)intro.textContent=`제목, 소개, 설정, 플롯, 등장인물과 작성 회차를 ${label} 기준으로 점검합니다.`;
      if(button)button.textContent=`${label} 적합성 점검`;
      const analysis=parseObject(novel.data?.platform_analysis);
      if(analysis&&analysis.platform&&analysis.platform!==p){
        box.classList.add('empty-report');box.textContent=`이전 ${PLATFORM_LABEL[analysis.platform]||analysis.platform} 분석이 남아 있습니다. 현재 ${label} 기준으로 다시 점검해 주세요.`;
      }else renderObject(box,analysis,`아직 실행한 ${label} 분석이 없습니다.`);
    }
    renderRevisionSuggestion();
  }

  function renderDebut(){
    if(!novel)return;
    const p=platformValue();const title=el('debutTitle'),intro=el('debutIntro'),box=el('debutPackageContent');
    if(title)title.textContent=p==='kakao'?'카카오페이지 투고 준비':p==='naver'?'네이버 연재 준비':'데뷔 준비';
    if(intro)intro.textContent=p==='kakao'?'CP 투고에 필요한 작품 설명과 시놉시스, 초반 원고 준비 상태를 정리합니다.':p==='naver'?'자유연재와 정식 연재 진입을 고려해 제목·소개·키워드·초반 회차를 정리합니다.':'목표 플랫폼을 정하거나 네이버·카카오 비교 분석을 먼저 실행해 주세요.';
    const pkg=parseObject(novel.data?.debut_package);
    if(box){
      box.replaceChildren();
      if(!pkg){box.classList.add('empty-report');box.textContent='아직 만든 데뷔 준비 자료가 없습니다.';}
      else{
        box.classList.remove('empty-report');
        const sections=pkg.sections&&typeof pkg.sections==='object'?pkg.sections:pkg;
        for(const [key,value] of Object.entries(sections)){
          if(['platform','generated_at'].includes(key))continue;
          const section=document.createElement('section');section.className='report-section';
          const h=document.createElement('h4');const label=document.createElement('span');label.textContent=REPORT_LABELS[key]||key.replaceAll('_',' ');
          const copyButton=document.createElement('button');copyButton.type='button';copyButton.textContent='복사';copyButton.addEventListener('click',()=>copy(reportText(value),el('requestText')));
          h.append(label,copyButton);section.append(h);
          const text=document.createElement('p');text.textContent=reportText(value);section.append(text);box.append(section);
        }
      }
    }
    const manuscript=el('downloadSubmissionManuscript');if(manuscript)manuscript.textContent=p==='kakao'?'투고용 원고 모음':'연재 원고 모음';
    const checkBox=el('prelaunchCheckContent');const check=parseObject(novel.data?.prelaunch_check);
    if(checkBox){checkBox.hidden=!check;if(check)renderObject(checkBox,check,'');}
  }

  function renderChapterReview(){
    const panel=el('chapterReviewPanel'),body=el('chapterReviewBody');if(!panel||!body||!novel||!chapter)return;
    const review=parseObject(novel.data?.latest_chapter_review);
    const relevant=review&&String(review.chapter_id||'')===String(chapter.id);
    panel.hidden=!relevant;if(relevant)renderObject(body,review,'');
  }

  function hydrateEditor(){
    if(!novel)return;
    const data=novel.data||{};
    const defaults={target_platform:'undecided',debut_goal:'undecided',secondary_genres:'',project_status:'planning',logline:'',work_intro:'',differentiation:'',long_term_plot:'',early_episode_plan:''};
    for(const [id,fallback] of Object.entries(defaults)){const node=el(id);if(node)node.value=data[id]??fallback;}
    renderSecondaryChoices();renderConceptSuggestion();renderDashboard();
  }

  async function refreshAiResults(showMessage=true){
    if(!novel)return;
    if(dirtyN||dirtyC||queue||blocked){if(showMessage)say('먼저 현재 입력을 저장한 뒤 분석 결과를 불러와 주세요.');return;}
    const selectedChapter=chapter?.id;
    const result=await api('novels.get',{id:novel.id});
    novel=result.novel;chapters=result.chapters;
    hydrateEditor();
    if(selectedChapter&&chapter?.id===selectedChapter){/* current chapter object is still valid */}
    await list();
    if(showMessage)say('최신 기획·분석 결과를 불러왔습니다.');
  }

  const baseOpenNovel=openNovel;
  openNovel=async function(...args){
    await baseOpenNovel(...args);
    el('homeSection').hidden=true;el('homeHero').hidden=true;el('editor').hidden=false;document.body.classList.add('novel-open');
    hydrateEditor();
  };
  const baseRenderChapter=renderChapter;
  renderChapter=function(c){baseRenderChapter(c);renderDashboard();};

  for(const id of ['target_platform','debut_goal','project_status','logline','work_intro','differentiation','long_term_plot','early_episode_plan']){
    const node=el(id);if(!node)continue;
    node.addEventListener(node.tagName==='SELECT'?'change':'input',()=>{
      changed('novel');renderDashboard();
      if(id==='target_platform')say('목표 플랫폼을 변경했습니다. 기존 설정과 원고는 그대로 유지됩니다. 필요하면 플랫폼 분석을 다시 실행하세요.');
    });
  }
  el('genre')?.addEventListener('change',()=>{renderSecondaryChoices();renderDashboard();});
  el('title')?.addEventListener('input',renderDashboard);
  el('chapterTitle')?.addEventListener('input',renderDashboard);

  el('continueExisting')?.addEventListener('click',()=>el('homeSection')?.scrollIntoView({behavior:'smooth',block:'start'}));
  el('backToProjects')?.addEventListener('click',()=>run(async()=>{await flush();el('editor').hidden=true;el('homeHero').hidden=false;el('homeSection').hidden=false;document.body.classList.remove('novel-open');await list();el('homeSection').scrollIntoView({behavior:'smooth',block:'start'});}));
  el('manualWriting')?.addEventListener('click',()=>{el('writingSection')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>el('body')?.focus(),200);});
  el('refreshAiResults')?.addEventListener('click',()=>run(()=>refreshAiResults(true)));

  function dataStoreInstructions(key,schemaDescription){
    return `결과 저장 키: ${key}\n저장할 JSON 구조: ${schemaDescription}\n\n저장 규칙:\n- 현재 작품의 title, 기존 data 키, 캐릭터, 세계관, 플롯, 회차, 본문은 절대 삭제하거나 자동 수정하지 않는다.\n- dject Action이 있으면 novels.get으로 정확한 작품을 읽고 version을 확인한 뒤, 기존 data 전체를 보존하면서 data.${key}만 추가/교체하여 novels.save한다.\n- dject Action이 없고 Supabase 도구가 있으면 프로젝트 ${PROJECT_REF}에서 public.dject_novels를 일반 SELECT로 읽는다. public.dject_dispatch/RPC는 사용하지 않는다. ID와 version을 확인한 뒤 jsonb_set으로 ${key} 하나만 갱신하고 version=version+1, updated_at=now()로 저장한다. UPDATE는 반드시 id와 기존 version을 조건으로 한다.\n- owner_id는 사용자에게 표시하지 않는다.\n- 저장 후 다시 SELECT하여 ${key}가 존재하고 version이 증가했는지 확인한 뒤에만 완료라고 말한다.\n- 저장 도구를 사용할 수 없으면 분석만 먼저 출력하지 말고 연결이 필요하다고 알린다.`;
  }

  function baseNovelTask(title,key,schema,body){
    const p=platformValue();
    return `Dject ${title} 작업을 처리해줘.\n작품 ID: ${novel.id}\n확인할 작품 version: ${novel.version}\n목표 플랫폼: ${PLATFORM_LABEL[p]}\n주 장르: ${el('genre')?.value||''}\n보조 장르: ${secondaryValues().join(', ')||'없음'}\n\n먼저 작품 전체 data와 회차 목록을 실제 저장 도구로 읽고 분석한다. 작성된 회차의 원고가 필요한 작업이면 dject Action의 chapters.get 또는 Supabase의 public.dject_chapters 일반 SELECT로 title, goal, body까지 읽는다. 특정 기존 작품을 모방하지 말고 독자 기대, 전개 속도, 상품 구조, 후킹, 회차 구성 같은 추상적 특성만 활용한다.\n\n${body}\n\n${dataStoreInstructions(key,schema)}\n\n완료 후 긴 분석을 채팅에 반복하지 말고 "Dject에 결과를 저장했습니다. 앱으로 돌아가 결과를 확인하세요."라고 짧게 알려줘.`;
  }

  function platformRuleText(){return window.DjectLaunch?.strategyFor(platformValue())||'';}

  function conceptPrompt(){
    const p=platformValue();
    return baseNovelTask('작품 콘셉트 정리','ai_concept_suggestion','{platform, title_suggestions[], logline, work_intro, differentiation, keywords[], characters, world, summary, long_term_plot, early_episode_plan}',`${window.DjectLaunch?.commonRules||''}\n\n${platformRuleText()}\n\n현재 아이디어와 기존 설정을 바꾸지 말고 발전 가능한 수정 제안을 만든다. ${p==='kakao'?'카카오페이지용으로 한 줄 로그라인, 즉시 이해되는 작품 소개, 차별점, 주요 인물, 전체 시놉시스, 장기 연재 방향, 초반 10~20화 구성을 특히 구체화한다.':p==='naver'?'네이버용으로 제목 후보, 작품 소개문, 주요 키워드, 주인공 목표, 초반 회차 사건과 회차별 후킹을 특히 구체화한다.':'카카오페이지와 네이버만 비교해 양쪽에 공통으로 강한 콘셉트 방향을 제안한다.'} 결과는 제안일 뿐 원문을 직접 수정하지 않는다.`);
  }

  function platformAnalysisPrompt(){
    const p=platformValue();
    if(p==='undecided')return baseNovelTask('플랫폼 비교 분석','platform_comparison','{scores:{kakao:0-100,naver:0-100}, kakao:{strengths[],weaknesses[],reason}, naver:{strengths[],weaknesses[],reason}, recommendation, disclaimer}',`카카오페이지와 네이버 두 플랫폼만 비교한다. 다른 플랫폼은 언급하거나 평가하지 않는다. 작품의 아이디어, 제목, 소개, 설정, 등장인물, 전체 플롯과 작성된 회차를 근거로 상대 적합도 점수를 제시한다. 점수는 실제 성공 확률이 아니라 작품 구조 기준의 상대적 적합도임을 disclaimer에 명시한다. 카카오는 강한 한 줄 콘셉트, 캐릭터 매력, 초반 몰입, 1~3화 핵심 사건, 장기 확장성, CP가 빠르게 이해할 구조를 본다. 네이버는 제목 클릭력, 소개문, 1화 진입력, 주인공 목표, 회차별 사건·보상, 연독성, 다음 화 엔딩, 지속적 연재 동력을 본다.`);
    const platformCriteria=p==='kakao'?`카카오페이지 기준으로만 평가한다. 한 문장 콘셉트, 제목·설정의 즉각적 이해도, 캐릭터 매력, 초반 몰입, 1~3화 핵심 사건 진입, 장기 확장성, CP 편집자가 빠르게 이해할 구조, 전체 시놉시스 완성도, 초반 후킹, 상품성과 차별점을 점검한다.`:`네이버 기준으로만 평가한다. 제목 클릭력, 작품 소개문, 1화 진입력, 명확한 주인공 목표, 회차별 사건 진행과 보상, 연독성, 다음 화를 누르게 하는 엔딩, 지속적인 연재 동력, 독자 이탈 가능 구간을 점검한다.`;
    return baseNovelTask('플랫폼 적합성 분석','platform_analysis','{platform, overall, score:0-100, strengths[], improvements[], recommendations[], disclaimer}',`${platformCriteria} 작성된 회차가 있으면 실제 원고까지 포함해 평가한다. 추천은 구체적인 수정 방향으로 쓰되 원문은 자동 수정하지 않는다. score는 성공 확률이 아니라 구조적 적합도임을 disclaimer에 명시한다.`);
  }

  function revisionPrompt(){
    const p=platformValue();
    return baseNovelTask('플랫폼 추천 수정안','ai_revision_suggestion','{platform, rationale, logline, work_intro, differentiation, characters, world, summary, long_term_plot, early_episode_plan}',`현재 저장된 ${p==='undecided'?'네이버·카카오 비교 결과':'플랫폼 적합성 분석'}를 참고해 개선안을 만든다. 기존 원문과 본문은 변경하지 않는다. 사용자가 승인할 수 있도록 각 필드별 대체 초안을 제안한다. 특정 기존 작품을 모방하지 않는다. ${platformRuleText()}`);
  }

  function debutPrompt(){
    const p=platformValue();
    if(p==='undecided')return null;
    const schema=p==='kakao'?'{platform:"kakao", sections:{작품명,장르,한_줄_로그라인,작품_소개,기획_의도,작품의_차별점,주요_등장인물,전체_시놉시스,장기_플롯,초반_회차_구성,투고용_원고_준비}}':'{platform:"naver", sections:{작품_제목_후보,최종_제목,작품_소개문,장르_및_키워드,주인공_소개,초반_회차,회차별_핵심_사건,회차별_후킹,연재_준비_상태}}';
    const body=p==='kakao'?'카카오페이지 CP 투고를 검토하기 쉽도록 작품명, 장르, 한 줄 로그라인, 작품 소개, 기획 의도, 차별점, 주요 인물, 전체 시놉시스, 장기 플롯, 초반 회차 구성과 투고용 원고 준비 상태를 정리한다. 실제 제출처나 특정 CP의 최신 정책을 추정하지 않는다.':'네이버 연재 준비용으로 제목 후보, 최종 제목, 소개문, 장르·키워드, 주인공 소개, 초반 회차, 회차별 핵심 사건과 후킹, 연재 준비 상태를 정리한다. 실제 플랫폼 정책이나 성공 가능성을 단정하지 않는다.';
    return baseNovelTask('데뷔 준비 자료','debut_package',schema,body);
  }

  function prelaunchPrompt(){
    const p=platformValue();if(p==='undecided')return null;
    return baseNovelTask('연재·투고 시작 전 점검','prelaunch_check','{platform, readiness, missing[], risks[], next_actions[]}',`${PLATFORM_LABEL[p]}에 맞춰 현재 작품이 실제 연재 또는 투고 준비 단계로 넘어가기 전에 빠진 항목을 점검한다. 작품 내용과 원고를 수정하지 않고 준비 상태, 누락, 위험 요소, 다음 행동만 제안한다. ${platformRuleText()}`);
  }

  function chapterReviewPrompt(kind){
    const p=platformValue();const kindText=kind==='hook'?'후킹 중심 점검':kind==='platform'?'플랫폼 기준 회차 점검':'이번 화 종합 점검';
    const common='사건 진행, 캐릭터 행동의 개연성, 설정 충돌, 반복 표현, 전개 속도, 정보 과다, 다음 화 유도를 확인한다.';
    const special=p==='kakao'?'카카오 기준으로 초반 몰입이 깨지는 구간, 캐릭터 매력, 핵심 설정의 선명도, 다음 회차 궁금증을 특히 본다.':p==='naver'?'네이버 기준으로 회차 내 사건 진행, 독자가 체감할 보상, 주인공 목표 유지, 회차 끝의 다음 화 이유를 특히 본다.':'네이버와 카카오 두 기준에서 공통으로 중요한 회차 진행과 후킹만 비교한다.';
    const focus=kind==='hook'?'특히 첫 문단 진입, 중간 이탈 가능 지점, 마지막 장면의 다음 화 유도만 집중적으로 분석한다.':kind==='platform'?special:`${common} ${special}`;
    return baseNovelTask(kindText,'latest_chapter_review','{chapter_id, chapter_number, kind, platform, report:{strengths[],issues[],recommendations[]}}',`현재 선택된 ${chapter.number}화의 title, goal, body를 반드시 읽고 점검한다. ${focus} 원문은 절대 자동 수정하지 않는다. 결과의 chapter_id는 정확히 ${chapter.id}, chapter_number는 ${chapter.number}, kind는 ${kind}로 저장한다.`);
  }

  async function runAiTask(builder,message){
    await flush();
    const prompt=typeof builder==='function'?builder():builder;
    if(!prompt)return say('먼저 목표 플랫폼을 카카오페이지 또는 네이버로 선택해 주세요.');
    if(!window.DjectLaunch?.openRequest)return say('집필 연결 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
    await window.DjectLaunch.openRequest(prompt,message);
  }

  el('generateConcept')?.addEventListener('click',()=>run(()=>runAiTask(conceptPrompt,'콘셉트 정리 요청을 준비했습니다. ChatGPT로 이동합니다.')));
  el('runPlatformAnalysis')?.addEventListener('click',()=>run(()=>runAiTask(platformAnalysisPrompt,'플랫폼 분석 요청을 준비했습니다. ChatGPT로 이동합니다.')));
  el('runRevisionSuggestion')?.addEventListener('click',()=>run(()=>runAiTask(revisionPrompt,'추천 수정안 요청을 준비했습니다. ChatGPT로 이동합니다.')));
  el('buildDebutPackage')?.addEventListener('click',()=>run(()=>runAiTask(debutPrompt,'데뷔 준비 자료 요청을 준비했습니다. ChatGPT로 이동합니다.')));
  el('prelaunchCheck')?.addEventListener('click',()=>run(()=>runAiTask(prelaunchPrompt,'연재·투고 전 점검 요청을 준비했습니다. ChatGPT로 이동합니다.')));
  el('runEpisodeReview')?.addEventListener('click',()=>run(()=>runAiTask(()=>chapterReviewPrompt('episode'),'이번 화 점검 요청을 준비했습니다. ChatGPT로 이동합니다.')));
  el('runHookReview')?.addEventListener('click',()=>run(()=>runAiTask(()=>chapterReviewPrompt('hook'),'후킹 점검 요청을 준비했습니다. ChatGPT로 이동합니다.')));
  el('runPlatformEpisodeReview')?.addEventListener('click',()=>run(()=>runAiTask(()=>chapterReviewPrompt('platform'),'플랫폼 기준 회차 점검 요청을 준비했습니다. ChatGPT로 이동합니다.')));

  function applySuggestion(key){
    const suggestion=parseObject(novel?.data?.[key]);if(!suggestion)return say('반영할 AI 제안이 없습니다.');
    const allowed=['logline','work_intro','differentiation','characters','world','summary','long_term_plot','early_episode_plan'];
    let changedAny=false;
    for(const id of allowed){if(typeof suggestion[id]==='string'&&el(id)){el(id).value=suggestion[id];changedAny=true;}}
    if(changedAny){changed('novel');renderDashboard();say('AI 제안을 편집 화면에 반영했습니다. 아직 저장 전이므로 내용을 확인한 뒤 저장하세요.');}
  }
  el('applyConceptSuggestion')?.addEventListener('click',()=>run(async()=>{if(await ask('AI 콘셉트 제안을 편집 가능한 작품 설정에 반영할까요? 기존 본문은 변경하지 않습니다.'))applySuggestion('ai_concept_suggestion');}));
  el('applyRevisionSuggestion')?.addEventListener('click',()=>run(async()=>{if(await ask('추천 수정안을 작품 설정에 반영할까요? 기존 회차 본문은 변경하지 않습니다.'))applySuggestion('ai_revision_suggestion');}));

  el('copyDebutPackage')?.addEventListener('click',()=>{const pkg=parseObject(novel?.data?.debut_package);if(!pkg)return say('먼저 데뷔 준비 자료를 만들어 주세요.');copy(reportText(pkg),el('requestText'));});
  el('downloadDebutPackage')?.addEventListener('click',()=>{const pkg=parseObject(novel?.data?.debut_package);if(!pkg)return say('먼저 데뷔 준비 자료를 만들어 주세요.');download(reportText(pkg),`dject-${novel.title}-${platformValue()}-debut.txt`);});
  el('downloadSubmissionManuscript')?.addEventListener('click',()=>run(async()=>{
    await flush();
    const result=await api('novels.get',{id:novel.id});
    const summaries=(result.chapters||[]).slice().sort((a,b)=>a.number-b.number);
    const full=[];
    for(const item of summaries){const c=await api('chapters.get',{id:item.id});if(c.body?.trim())full.push(c);}
    if(!full.length)return say('파일로 모을 작성된 본문이 없습니다.');
    const text=full.map(c=>`${c.number}화${c.title?` · ${c.title}`:''}\n\n${c.body}`).join('\n\n\n');
    download(text,`dject-${novel.title}-${platformValue()}-manuscript.txt`);
    say(`${full.length}개 회차의 원고를 파일로 묶었습니다.`);
  }));

  // --- New novel wizard ---
  let wizardStep=1;
  const wizardStateKey='dject.v2.newNovelWizard';
  function collectWizard(){return {active:true,step:wizardStep,idea:el('wizardIdea')?.value||'',platform:document.querySelector('input[name="wizardPlatform"]:checked')?.value||'undecided',goal:document.querySelector('input[name="wizardGoal"]:checked')?.value||'undecided',genre:el('wizardGenre')?.value||'현대판타지',secondary:[...el('wizardSecondaryGenres')?.querySelectorAll('input:checked')||[]].map(x=>x.value),title:el('wizardTitle')?.value||''};}
  function saveWizardState(){try{sessionStorage.setItem(wizardStateKey,JSON.stringify(collectWizard()));}catch{}}
  function clearWizardState(){try{sessionStorage.removeItem(wizardStateKey);}catch{}}
  function goalHint(){const p=document.querySelector('input[name="wizardPlatform"]:checked')?.value||'undecided';const box=el('wizardGoalHint');if(!box)return;box.textContent=p==='kakao'?'카카오페이지에서는 정식 데뷔·CP 투고를 목표로 한 준비가 잘 맞지만, 다른 방식을 선택해도 됩니다.':p==='naver'?'네이버에서는 자유연재로 독자 반응을 확인하는 방식도 활용할 수 있지만, 원하는 목표를 자유롭게 선택하세요.':'플랫폼을 아직 정하지 않아도 목표는 자유롭게 선택할 수 있습니다.';}
  function renderWizard(){
    document.querySelectorAll('[data-wizard-step]').forEach(s=>s.hidden=Number(s.dataset.wizardStep)!==wizardStep);
    document.querySelectorAll('.wizard-progress span').forEach((s,i)=>s.classList.toggle('active',i+1===wizardStep));
    el('wizardBack').hidden=wizardStep===1;el('wizardNext').hidden=wizardStep===5;el('wizardCreate').hidden=wizardStep!==5;
    if(wizardStep===3)goalHint();
    if(wizardStep===5){const s=collectWizard();el('wizardSummary').replaceChildren();for(const [label,value] of [['아이디어',s.idea],['목표 플랫폼',PLATFORM_LABEL[s.platform]],['도전 방식',GOAL_LABEL[s.goal]],['주 장르',s.genre],['보조 장르',s.secondary.join(', ')||'없음']]){const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label;const span=document.createElement('span');span.textContent=value;p.append(strong,span);el('wizardSummary').append(p);}}
    saveWizardState();
  }
  function resetWizard(){wizardStep=1;el('wizardIdea').value='';el('wizardTitle').value='';el('wizardGenre').value='현대판타지';document.querySelector('input[name="wizardPlatform"][value="undecided"]').checked=true;document.querySelector('input[name="wizardGoal"][value="undecided"]').checked=true;renderWizardGenres([]);renderWizard();}
  function openWizard(){resetWizard();const d=el('newNovelDialog');if(!d.open)d.showModal();setTimeout(()=>el('wizardIdea')?.focus(),60);}
  el('createNovel').onclick=openWizard;
  el('closeNewNovel')?.addEventListener('click',()=>{el('newNovelDialog').close();clearWizardState();});
  el('wizardBack')?.addEventListener('click',()=>{wizardStep=Math.max(1,wizardStep-1);renderWizard();});
  el('wizardNext')?.addEventListener('click',()=>{
    if(wizardStep===1&&!el('wizardIdea').value.trim())return say('아이디어를 한 줄 적거나 아이디어 추천받기를 이용해 주세요.');
    wizardStep=Math.min(5,wizardStep+1);renderWizard();
  });
  document.querySelectorAll('input[name="wizardPlatform"],input[name="wizardGoal"]').forEach(x=>x.addEventListener('change',()=>{goalHint();saveWizardState();}));
  el('wizardIdea')?.addEventListener('input',saveWizardState);el('wizardGenre')?.addEventListener('change',saveWizardState);el('wizardTitle')?.addEventListener('input',saveWizardState);
  renderWizardGenres([]);

  el('wizardIdeaSuggest')?.addEventListener('click',async()=>{
    saveWizardState();
    const seed=el('wizardIdea').value.trim();
    const prompt=`웹소설 아이디어 후보를 5개 제안해줘. Dject에서 새 작품을 만들기 위한 아이디어 단계다. 특정 기존 작품, 캐릭터, 설정, 문체를 모방하지 않는다. 네이버나 카카오 중 어느 한 플랫폼에 억지로 맞추지 말고 한두 문장으로 이해되는 독창적인 아이디어를 제안한다. 플랫폼은 네이버와 카카오 외에는 다루지 않는다.${seed?`\n내가 떠올린 단서: ${seed}`:''}\n각 후보는 한 줄 콘셉트와 주인공 목표가 드러나게 짧게 써줘. 저장 작업은 하지 말고 아이디어 제안만 보여줘.`;
    if(window.DjectLaunch?.openRequest)await window.DjectLaunch.openRequest(prompt,'아이디어 추천 요청을 준비했습니다. ChatGPT로 이동합니다.');
  });

  el('wizardCreate')?.addEventListener('click',()=>run(async()=>{
    const s=collectWizard();if(!s.idea.trim())return say('아이디어를 입력해 주세요.');
    const title=s.title.trim()||'제목 미정';
    const data={idea:s.idea.trim(),target_platform:s.platform,debut_goal:s.goal,genre:s.genre,secondary_genres:s.secondary.filter(v=>v!==s.genre).join(','),project_status:'planning',mood:'설렘',pov:'1인칭',pace:'보통',length:'보통 1화 · 공백 포함 5,000~6,000자',extra:'',characters:'',world:'',summary:'',logline:'',work_intro:'',differentiation:'',long_term_plot:'',early_episode_plan:''};
    const result=await api('novels.create',{title,data});
    clearWizardState();el('newNovelDialog').close();await openNovel(result.novel.id);say('새 작품을 만들었습니다. 다음은 작품 콘셉트를 정리해 보세요.');el('planSection')?.scrollIntoView({behavior:'smooth',block:'start'});
  }));

  function restoreWizard(){
    let s;try{s=JSON.parse(sessionStorage.getItem(wizardStateKey)||'null');}catch{}
    if(!s?.active)return;
    wizardStep=Math.min(5,Math.max(1,Number(s.step)||1));el('wizardIdea').value=s.idea||'';el('wizardTitle').value=s.title||'';el('wizardGenre').value=s.genre||'현대판타지';
    const p=document.querySelector(`input[name="wizardPlatform"][value="${s.platform||'undecided'}"]`);if(p)p.checked=true;
    const g=document.querySelector(`input[name="wizardGoal"][value="${s.goal||'undecided'}"]`);if(g)g.checked=true;
    renderWizardGenres(Array.isArray(s.secondary)?s.secondary:[]);renderWizard();const d=el('newNovelDialog');if(!d.open)d.showModal();
  }
  window.addEventListener('pageshow',()=>setTimeout(restoreWizard,0),{once:true});

  let lastAutoRefresh=0;
  window.addEventListener('focus',()=>{
    if(!novel||dirtyN||dirtyC||queue||blocked)return;
    const now=Date.now();if(now-lastAutoRefresh<2500)return;lastAutoRefresh=now;
    setTimeout(()=>refreshAiResults(false).catch(()=>{}),650);
  });

  const navTargets=[...document.querySelectorAll('.dashboard-nav [data-jump]')];
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      for(const button of navTargets)button.classList.toggle('current-step',button.dataset.jump===visible.target.id);
    },{rootMargin:'-20% 0px -65% 0px',threshold:[0,.2,.5]});
    for(const button of navTargets){const target=el(button.dataset.jump);if(target)observer.observe(target);}
  }

  // Preserve home state on first load.
  el('homeSection').hidden=false;el('homeHero').hidden=false;document.body.classList.remove('novel-open');
})();