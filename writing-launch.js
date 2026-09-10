'use strict';
(() => {
  const el=id=>document.getElementById(id);
  const URL_KEY='dject.v1.gptLaunchUrls';
  const ACTIVE_KEY='dject.v1.activeGpt';
  const START_TEXT='디젝트 현재 작업을 읽고 집필하고 결과를 저장해줘.';
  const NEW_INSTRUCTIONS=`Dject를 웹소설 작업 저장소로 사용한다.
사용자가 "집필 시작" 또는 Dject 현재 작업 집필을 요청하면 먼저 dject Action의 jobs.current로 현재 작업을 확인한다.
현재 작업이 pending이면 반환된 작업 ID와 snapshot의 장르·분위기·시점·전개 속도·분량·등장인물·세계관·줄거리·회차 목표를 우선 반영해 웹소설 본문을 완성한다.
필요하면 jobs.get으로 같은 작업을 다시 확인하되 처음 확인한 현재 작업 ID와 다른 ID에는 결과를 저장하지 않는다.
완성 후 results.save로 반드시 같은 작업 ID에 제목과 본문을 저장한다.
이미 같은 작업에 결과가 저장되어 있으면 중복 저장하거나 새 작업을 만들지 않는다.
저장이 끝나면 긴 본문을 채팅에 반복하지 말고 "집필을 마쳤습니다. 디젝트로 돌아가세요."처럼 짧게 안내한다.`;

  const readUrls=()=>{try{return JSON.parse(localStorage.getItem(URL_KEY)||'{}')||{};}catch{return {};}};
  const writeUrls=value=>localStorage.setItem(URL_KEY,JSON.stringify(value));
  const activeId=()=>localStorage.getItem(ACTIVE_KEY)||'';
  const safeUrl=value=>{try{const u=new URL(value||'');return u.protocol==='https:'&&(u.hostname==='chatgpt.com'||u.hostname.endsWith('.chatgpt.com'))?u.href:'';}catch{return '';}};
  const fillUrl=()=>{const input=el('gptUrl');if(input)input.value=readUrls()[activeId()]||'';};

  const saveButton=el('saveGptProfile');
  saveButton?.addEventListener('click',event=>{
    const input=el('gptUrl');const value=input?.value.trim()||'';
    if(value&&!safeUrl(value)){event.preventDefault();event.stopImmediatePropagation();say('집필 창 주소는 https://chatgpt.com/ 주소를 입력해 주세요.');return;}
    setTimeout(()=>{const id=activeId();if(!id)return;const urls=readUrls();if(value)urls[id]=value;else delete urls[id];writeUrls(urls);},0);
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
    try{await navigator.clipboard.writeText(NEW_INSTRUCTIONS);say('집필 지침을 복사했습니다.');}catch{const box=el('gptInstructionsText');if(box){box.hidden=false;box.value=NEW_INSTRUCTIONS;box.select();}say('복사가 차단되어 지침을 표시했습니다.');}
  },true);

  const startButton=el('publishJob');
  if(startButton){
    startButton.onclick=()=>run(async()=>{
      const url=safeUrl(readUrls()[activeId()]);
      if(!url){say('처음 한 번만 집필 연결에서 사용할 대화 주소를 등록해 주세요.');openGptManager();queueMicrotask(fillUrl);return;}
      try{await navigator.clipboard.writeText(START_TEXT);}catch{}
      await flush();
      let published=job;
      if(!published||published.chapter_id!==chapter.id||published.status!=='pending')published=await api('jobs.create',{id:chapter.id});
      showJob({job:published});
      say('집필 준비가 끝났습니다. 집필 창으로 이동합니다.');
      window.location.assign(url);
    });
  }

  const replacements=[
    ['GPT 작성 대기','집필 중'],['GPT 집필이 완료되어','집필이 완료되어'],['저장된 GPT 결과','저장된 집필 결과'],
    ['GPT 결과','집필 결과'],['GPT용 작업','집필 작업']
  ];
  const normalize=node=>{if(!node)return;let value=node.textContent||'';for(const [from,to] of replacements)value=value.replaceAll(from,to);if(node.textContent!==value)node.textContent=value;};
  for(const id of ['jobState','message','askMessage']){const node=el(id);if(!node)continue;normalize(node);new MutationObserver(()=>normalize(node)).observe(node,{childList:true,subtree:true,characterData:true});}
})();
