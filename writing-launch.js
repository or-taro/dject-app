'use strict';
(() => {
  const el=id=>document.getElementById(id);
  const URL_KEY='dject.v1.gptLaunchUrls';
  const ACTIVE_KEY='dject.v1.activeGpt';

  const NEW_INSTRUCTIONS=`Dject를 웹소설 작업 저장소로 사용한다.
사용자가 "집필 시작" 또는 Dject 현재 작업 집필을 요청하면 반드시 dject Action을 사용한다.
사용자 메시지에 작업 ID가 있으면 jobs.current와 jobs.get으로 확인하고, 두 작업 ID가 같을 때만 진행한다. ID가 다르면 집필하거나 저장하지 말고 사용자에게 알린다.
작업이 pending이면 snapshot의 장르·분위기·시점·전개 속도·분량·등장인물·세계관·줄거리·회차 목표를 우선 반영해 웹소설 제목과 본문을 완성한다.
본문 작성이 끝나면 채팅 답변보다 먼저 results.save를 같은 작업 ID와 제목·본문으로 반드시 호출한다.
results.save의 성공 응답에서 response가 저장되고 작업 상태가 ready 또는 conflict가 된 것을 확인하기 전에는 작업 완료라고 답하지 않는다.
results.save에 실패하면 본문만 출력하고 끝내지 말고 저장 실패 사실을 알려준다.
집필 단계에서는 results.apply를 호출하지 않는다. 본문 반영은 Dject에서 사용자가 새 글을 확인한 뒤 선택한다.
이미 같은 작업에 같은 결과가 저장되어 있으면 중복 저장하지 않는다.
저장이 끝나면 긴 본문을 채팅에 반복하지 말고 "집필을 마쳤습니다. 디젝트에서 새 글을 확인하세요."처럼 짧게 안내한다.`;

  const buildStartRequest=jobId=>`Dject 집필 작업을 끝까지 처리해줘.
작업 ID: ${jobId}

반드시 다음 순서로 처리해.
1) dject Action의 jobs.current와 jobs.get을 호출해서 현재 작업 ID와 위 작업 ID가 정확히 같은지 확인한다.
2) ID가 다르거나 작업 상태가 pending이 아니면 작성하거나 저장하지 말고 알려준다.
3) snapshot에 저장된 장르·분위기·시점·전개 속도·분량·등장인물·세계관·줄거리·회차 목표를 반영해 제목과 웹소설 본문을 완성한다.
4) 작성이 끝나면 반드시 dject Action의 results.save를 호출해 위 작업 ID에 제목과 본문을 저장한다.
5) results.save 성공 응답에서 결과가 저장되고 상태가 ready 또는 conflict가 된 것을 확인한 뒤에만 완료라고 말한다.
6) results.apply는 호출하지 않는다. 본문 반영은 내가 Dject에서 새 글을 확인한 뒤 선택한다.

중요: 글만 채팅에 작성하고 results.save 없이 끝내면 안 된다. 저장 성공 후에는 긴 본문을 다시 출력하지 말고 "집필을 마쳤습니다. 디젝트에서 새 글을 확인하세요."라고 짧게 알려줘.`;

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
    try{await navigator.clipboard.writeText(NEW_INSTRUCTIONS);say('최신 집필 지침을 복사했습니다.');}
    catch{const box=el('gptInstructionsText');if(box){box.hidden=false;box.value=NEW_INSTRUCTIONS;box.select();}say('복사가 차단되어 최신 집필 지침을 표시했습니다.');}
  },true);

  async function copyLaunchRequest(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch{
      const box=el('requestText');
      if(box){box.hidden=false;box.value=text;box.focus();box.select();}
      return false;
    }
  }

  const startButton=el('publishJob');
  if(startButton){
    startButton.onclick=()=>run(async()=>{
      const url=safeUrl(readUrls()[activeId()]);
      if(!url){say('처음 한 번만 집필 연결에서 사용할 대화 주소를 등록해 주세요.');openGptManager();queueMicrotask(fillUrl);return;}
      await flush();
      let published=job;
      if(!published||published.chapter_id!==chapter.id||published.status!=='pending'||published.base_version!==chapter.version){
        published=await api('jobs.create',{id:chapter.id});
      }
      showJob({job:published});
      const request=buildStartRequest(published.id);
      const copied=await copyLaunchRequest(request);
      if(!copied){
        say('집필 요청 자동 복사가 차단되었습니다. 표시된 요청문을 복사한 뒤 집필 시작을 다시 눌러 주세요.');
        return;
      }
      say('집필 요청을 준비했습니다. 집필 창으로 이동합니다.');
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
