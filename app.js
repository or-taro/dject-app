'use strict';
const $=id=>document.getElementById(id);
const fields=['idea','genre','mood','pov','pace','length','extra','characters','world','summary'];
let novel=null,chapter=null,chapters=[],job=null,dirtyN=0,dirtyC=0,queue=null,timer=null,blocked=false,jobPollTimer=null,jobSyncing=false;
const JOB_POLL_MS=4000;
const say=t=>$('message').textContent=t;
function ask(message,value=null){return new Promise(resolve=>{
 const dialog=$('askDialog');$('askMessage').textContent=message;$('askInput').hidden=value===null;$('askInput').value=value||'';
 const finish=result=>{dialog.close();resolve(result);};
 $('askForm').onsubmit=e=>{e.preventDefault();finish(value===null?true:$('askInput').value);};
 $('askCancel').onclick=()=>finish(null);dialog.oncancel=e=>{e.preventDefault();finish(null);};dialog.showModal();
 if(value!==null)$('askInput').focus();
});}

const EDGE_URL='https://slimqungpcrpwojpaoyd.supabase.co/functions/v1/dject-web';
const WEB_KEY='dject_web_LuvCa-6QqtuMoiYMmxLZKhrOV_OKr1s7';
async function request(op,data={}){
 const response=await fetch(EDGE_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Dject-Web-Key':WEB_KEY},body:JSON.stringify({op,data})});
 let result;try{result=await response.json();}catch{throw Error('저장소 응답을 확인하지 못했습니다.');}
 if(!response.ok){const messages={unauthorized:'웹 연결 키가 맞지 않습니다.',invalid_operation:'지원하지 않는 작업입니다.',payload_too_large:'요청이 너무 큽니다.',gateway_not_configured:'저장소 설정이 필요합니다.',upstream_unavailable:'저장소 연결이 지연되고 있습니다.'};const e=Error(messages[result.error]||result.message||result.error||'요청 실패');e.status=response.status;throw e;}return result;
}
const api=(op,data={})=>request(op,data);
const novelInput=()=>({id:novel.id,version:novel.version,title:$('title').value,data:{...novel.data,...Object.fromEntries(fields.map(f=>[f,$(f).value]))}});
const chapterInput=()=>({id:chapter.id,version:chapter.version,title:$('chapterTitle').value,goal:$('goal').value,body:$('body').value});
const draftKey=()=>`dject.v1.draft.${novel.id}.${chapter.id}`;
function captureDraft(){try{localStorage.setItem(draftKey(),JSON.stringify({novel:novelInput(),chapter:chapterInput()}));}catch{say('브라우저 임시 저장이 불가능합니다. 지금 저장을 눌러 주세요.');}}
function changed(kind){if(!novel||!chapter)return;if(kind==='novel')dirtyN++;else dirtyC++;captureDraft();$('saveState').textContent='저장 대기';$('count').textContent=`${Array.from($('body').value).length.toLocaleString()}자 · 공백 포함`;clearTimeout(timer);timer=setTimeout(()=>flush().catch(showSaveError),3000);}
function showSaveError(e){$('saveState').textContent='저장하지 못함';say(e.message);if(e.status===409){blocked=true;$('recovery').hidden=false;}}
async function flush(){
 clearTimeout(timer);if(queue)return queue;if(blocked)throw Error('충돌한 입력을 보관하고 새로 불러와 주세요.');
 queue=(async()=>{
  while(dirtyN||dirtyC){
   $('saveState').textContent='저장 중';
   if(dirtyN){const seq=dirtyN;const data=novelInput();const saved=await api('novels.save',data);novel=saved;if(dirtyN===seq)dirtyN=0;}
   if(dirtyC){const seq=dirtyC;const data=chapterInput();const saved=await api('chapters.save',data);chapter=saved;chapters=chapters.map(c=>c.id===saved.id?saved:c);if(dirtyC===seq)dirtyC=0;}
  }
  $('saveState').textContent='저장됨';try{localStorage.removeItem(draftKey());}catch{}
 })();try{await queue;}finally{queue=null;}
}
function download(content,name,type='text/plain'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderChapters(){const sel=$('chapterSelect');sel.replaceChildren();for(const c of chapters){const o=document.createElement('option');o.value=c.id;o.textContent=`${c.number}화${c.title?' · '+c.title:''}`;sel.append(o);}sel.value=chapter.id;}
function renderChapter(c){chapter=c;$('chapterTitle').value=c.title;$('goal').value=c.goal;$('body').value=c.body;$('count').textContent=`${Array.from(c.body).length.toLocaleString()}자 · 공백 포함`;renderChapters();$('review').hidden=true;}
async function list(){const rows=await api('novels.list');$('novelList').replaceChildren();for(const row of rows){const b=document.createElement('button');b.textContent=row.title;b.classList.toggle('active',novel?.id===row.id);b.onclick=()=>run(async()=>{await flush();await openNovel(row.id);});$('novelList').append(b);}}
async function openNovel(id,selected){
 const result=await api('novels.get',{id});novel=result.novel;chapters=result.chapters;dirtyN=dirtyC=0;blocked=false;
 $('title').value=novel.title;for(const f of fields){const el=$(f);const v=novel.data[f];if(v)el.value=v;else if(el.tagName==='SELECT')el.selectedIndex=0;else el.value='';}
 renderChapter(await api('chapters.get',{id:(chapters.find(c=>c.id===selected)||chapters[0]).id}));$('editor').hidden=false;$('empty').hidden=true;$('recovery').hidden=true;$('saveState').textContent='저장됨';
 let draft;try{draft=JSON.parse(localStorage.getItem(draftKey())||'null');}catch{}
 if(draft){
  if(draft.novel.version===novel.version&&draft.chapter.version===chapter.version&&await ask('이 브라우저에 저장하지 못한 입력이 있습니다. 복원할까요?')){
   $('title').value=draft.novel.title;for(const f of fields)$(f).value=draft.novel.data[f]||'';$('chapterTitle').value=draft.chapter.title;$('goal').value=draft.chapter.goal;$('body').value=draft.chapter.body;changed('novel');changed('chapter');
  }else{$('recovery').hidden=false;blocked=true;say('임시 입력을 파일로 보관하거나 새로 불러오기를 선택해 주세요.');}
 }
 await list();await checkJob(true);
}
function syncJobPolling(){
 if(jobPollTimer){clearTimeout(jobPollTimer);jobPollTimer=null;}
 if(!novel||!chapter||!job||job.status!=='pending'||job.chapter_id!==chapter.id||document.hidden)return;
 jobPollTimer=setTimeout(()=>{
  jobPollTimer=null;
  checkJob(true).catch(()=>syncJobPolling());
 },JOB_POLL_MS);
}
function showJob(result){
 job=result?.job||null;const labels={pending:'GPT 작성 대기 · 자동 확인 중',completed:'집필 완료',conflict:'결과 검토 필요',superseded:'새 작업으로 교체됨'};
 $('jobState').textContent=job?`${labels[job.status]}${job.chapter_id!==chapter?.id?' · 다른 회차':''}`:'준비 전';
 if(result?.response && job.chapter_id===chapter?.id && job.status==='conflict'){$('review').hidden=false;$('responseBody').value=result.response.body;}else $('review').hidden=true;
 syncJobPolling();
}
async function checkJob(autoRefresh=false){
 if(!novel||jobSyncing)return;
 jobSyncing=true;
 try{
  let result=await api('jobs.current');showJob(result);
  if(!result?.job||!chapter||result.job.chapter_id!==chapter.id)return;
  if(dirtyN||dirtyC||queue||blocked)return;

  if(result.response&&result.job.status==='pending'){
   const expectedId=chapter.id;
   const latest=await api('chapters.get',{id:expectedId});
   if(chapter?.id!==expectedId||dirtyN||dirtyC||queue||blocked)return;
   if(latest.version===result.job.base_version){
    const recovered=await api('results.apply',{id:result.job.id,version:latest.version});
    renderChapter(recovered.chapter);showJob(recovered);say('저장된 GPT 결과를 자동으로 복구해 본문에 적용했습니다.');
   }else{
    $('jobState').textContent='결과 검토 필요';$('review').hidden=false;$('responseBody').value=result.response.body;
    say('GPT 결과가 도착했지만 현재 본문이 변경되어 자동 적용하지 않았습니다. 결과를 검토해 주세요.');
   }
   return;
  }

  if(result.job.status==='completed'){
   const expectedId=chapter.id;
   let latest=await api('chapters.get',{id:expectedId});
   if(chapter?.id!==expectedId||dirtyN||dirtyC||queue||blocked)return;
   if(result.response&&latest.version===result.job.base_version&&latest.body!==result.response.body){
    const recovered=await api('results.apply',{id:result.job.id,version:latest.version});
    latest=recovered.chapter;showJob(recovered);
   }
   if(latest.version!==chapter.version||latest.body!==chapter.body){renderChapter(latest);if(autoRefresh)say('GPT 집필이 완료되어 최신 본문을 자동으로 불러왔습니다.');}
  }
 }finally{jobSyncing=false;syncJobPolling();}
}
let running=false;
async function run(fn){if(running)return;running=true;const controls=[...document.querySelectorAll('button,input,select,textarea')].filter(el=>!el.closest('dialog')).map(el=>[el,el.disabled]);for(const [el] of controls)el.disabled=true;try{await fn();}catch(e){showSaveError(e);}finally{for(const [el,disabled] of controls)el.disabled=disabled;running=false;}}
$('createNovel').onclick=()=>run(async()=>{await flush();const title=await ask('작품 제목을 입력하세요.','');if(!title?.trim())return;const result=await api('novels.create',{title:title.trim(),data:{}});await openNovel(result.novel.id);});
$('deleteNovel').onclick=()=>run(async()=>{if(!(await ask('이 작품의 설정·모든 회차·GPT 작업을 삭제할까요? 되돌릴 수 없습니다.')))return;await flush();await api('novels.delete',{id:novel.id});try{for(const key of Object.keys(localStorage))if(key.startsWith(`dject.v1.draft.${novel.id}.`))localStorage.removeItem(key);}catch{}novel=chapter=job=null;chapters=[];syncJobPolling();$('editor').hidden=true;$('empty').hidden=false;await list();say('작품을 삭제했습니다.');});
$('chapterSelect').onchange=()=>{const selected=$('chapterSelect').value;run(async()=>{try{await flush();await openNovel(novel.id,selected);}catch(e){$('chapterSelect').value=chapter.id;throw e;}});};
$('nextChapter').onclick=()=>run(async()=>{await flush();const c=await api('chapters.create',{id:novel.id,goal:''});await openNovel(novel.id,c.id);$('goal').focus();say('다음 회차를 준비했습니다. 기존 줄거리와 이번 회차 목표를 확인하세요.');});
$('publishJob').onclick=()=>run(async()=>{await flush();const published=await api('jobs.create',{id:chapter.id});showJob({job:published});say('GPT용 작업을 저장했습니다. 결과가 도착하면 자동으로 확인해 본문을 불러옵니다.');});
async function copy(text,fallback){try{await navigator.clipboard.writeText(text);say('복사했습니다.');}catch{if(fallback){fallback.hidden=false;fallback.value=text;fallback.select();}say('복사가 차단되었습니다. 표시된 글을 길게 눌러 직접 복사하세요.');}}
$('copyRequest').onclick=()=>{if(!job||job.chapter_id!==chapter.id||job.status!=='pending')return say('먼저 현재 회차의 GPT용 작업을 저장하세요.');const target=currentGpt()?.name||'개인 GPT';copy(`${target}에서 디젝트의 현재 작업을 읽고 집필해줘. 작업 ID는 ${job.id}야. 반환된 ID가 다르면 작성하지 말고 알려줘. 저장된 장르·분위기·시점·전개 속도·분량·인물·배경·줄거리·회차 목표를 반영해 웹소설 본문을 완성하고 같은 작업 ID로 디젝트에 결과를 저장해줘.`,$('requestText'));};
$('checkJob').onclick=()=>run(async()=>{await checkJob(true);say('최신 작업 상태와 본문을 확인했습니다.');});
$('applyResult').onclick=()=>run(async()=>{if(!(await ask('검토한 GPT 결과로 현재 회차 본문을 교체할까요?')))return;await flush();const r=await api('results.apply',{id:job.id,version:chapter.version});renderChapter(r.chapter);showJob(r);say('GPT 결과를 적용했습니다.');});
$('save').onclick=()=>run(()=>flush());
$('refresh').onclick=()=>run(async()=>{if((dirtyN||dirtyC||blocked)&&!(await ask('저장되지 않은 입력 대신 서버 내용을 불러올까요? 필요한 입력은 먼저 파일로 보관하세요.')))return;if(queue)await queue.catch(()=>{});clearTimeout(timer);try{localStorage.removeItem(draftKey());}catch{}dirtyN=dirtyC=0;blocked=false;await openNovel(novel.id,chapter.id);});
$('copyBody').onclick=()=>copy($('body').value,$('body'));
$('download').onclick=()=>download($('body').value,`dject-${chapter.number}.txt`);
$('exportDraft').onclick=()=>{let value;try{value=localStorage.getItem(draftKey());}catch{}download(value||JSON.stringify({novel:novelInput(),chapter:chapterInput()},null,2),'dject-unsaved.json','application/json');};
for(const f of ['title',...fields])$(f).addEventListener('input',()=>changed('novel'));
for(const f of ['chapterTitle','goal','body'])$(f).addEventListener('input',()=>changed('chapter'));
window.addEventListener('beforeunload',e=>{if(dirtyN||dirtyC||queue){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)syncJobPolling();else if(novel)checkJob(true).catch(()=>syncJobPolling());});
window.addEventListener('focus',()=>{if(novel&&!running)checkJob(true).catch(()=>syncJobPolling());});
async function boot(){
 $('workspace').hidden=false;$('mode').textContent='GitHub Pages';await list();
}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
boot().catch(e=>say(e.message));

// --- Multi-GPT connection manager ---
const GPT_PROFILE_KEY='dject.v1.gptProfiles';
const GPT_ACTIVE_KEY='dject.v1.activeGpt';
const ACTION_SCHEMA=`openapi: 3.1.0
info:
  title: Dject
  version: 1.0.1
  description: 디젝트 웹소설 프로젝트의 소설, 챕터, 작업 및 결과를 관리하는 개인용 API
servers:
  - url: https://slimqungpcrpwojpaoyd.supabase.co/functions/v1
paths:
  /dject-gateway:
    post:
      operationId: dject
      summary: Dject 데이터 읽기 및 저장
      description: Dject의 소설, 챕터, GPT 작업 및 결과를 관리한다. op에 작업 종류를 지정하고 data에 필요한 값을 전달한다.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [op]
              properties:
                op:
                  type: string
                  enum:
                    - novels.list
                    - novels.create
                    - novels.get
                    - novels.save
                    - novels.delete
                    - chapters.create
                    - chapters.get
                    - chapters.save
                    - jobs.create
                    - jobs.current
                    - jobs.get
                    - results.save
                    - results.apply
                data:
                  type: object
                  properties:
                    id: { type: string }
                    novel_id: { type: string }
                    chapter_id: { type: string }
                    job_id: { type: string }
                    title: { type: string }
                    body: { type: string }
                    summary: { type: string }
                    status: { type: string }
                    version: { type: integer }
                    result: { type: string }
                  additionalProperties: true
      responses:
        "200":
          description: 성공
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  data:
                    type: object
                    properties:
                      id: { type: string }
                      title: { type: string }
                      body: { type: string }
                      status: { type: string }
                      version: { type: integer }
                    additionalProperties: true
                  error: { type: string }
                additionalProperties: true
        "400": { description: 잘못된 요청 }
        "401": { description: 인증 실패 }
        "409": { description: 버전 충돌 }
        "500": { description: 서버 오류 }
`;
const GPT_INSTRUCTIONS=`Dject를 웹소설 작업 저장소로 사용한다.
사용자가 Dject의 소설이나 챕터를 불러오거나 저장하거나 수정해 달라고 하면 dject Action을 사용한다.
새 글을 작성하기 전에 필요한 경우 현재 소설과 선택된 챕터를 먼저 조회한다.
글을 생성한 뒤 사용자가 저장 또는 반영을 요청하면 Dject에 저장한다.
Dject에 저장된 장르, 분위기, 시점, 전개 속도, 분량, 등장인물, 세계관, 줄거리, 회차 목표를 우선 반영한다.
사용자가 본문을 검토하기 전에는 임의로 기존 본문을 덮어쓰지 않는다.
Dject 작업에서는 별도의 OpenAI API를 호출하지 않는다.`;
function loadGptProfiles(){
 try{
  const saved=JSON.parse(localStorage.getItem(GPT_PROFILE_KEY)||'null');
  if(Array.isArray(saved)&&saved.length)return saved;
 }catch{}
 return [{id:'default-di',name:'디',purpose:'기본 집필 GPT'}];
}
let gptProfiles=loadGptProfiles();
let activeGptId=localStorage.getItem(GPT_ACTIVE_KEY)||gptProfiles[0].id;
function persistGptProfiles(){
 localStorage.setItem(GPT_PROFILE_KEY,JSON.stringify(gptProfiles));
 localStorage.setItem(GPT_ACTIVE_KEY,activeGptId);
}
function currentGpt(){return gptProfiles.find(p=>p.id===activeGptId)||gptProfiles[0];}
function renderGptProfiles(){
 const listEl=$('gptProfileList'); if(!listEl)return;
 listEl.replaceChildren();
 const select=$('activeGpt'); if(select)select.replaceChildren();
 for(const p of gptProfiles){
  const row=document.createElement('button'); row.type='button'; row.className='profile-card'+(p.id===activeGptId?' active':'');
  const title=document.createElement('strong'); title.textContent=p.name;
  const desc=document.createElement('span'); desc.textContent=p.purpose||'용도 미지정';
  row.append(title,desc); row.onclick=()=>{activeGptId=p.id;persistGptProfiles();renderGptProfiles();$('gptName').value=p.name;$('gptPurpose').value=p.purpose||'';};
  listEl.append(row);
  if(select){const o=document.createElement('option');o.value=p.id;o.textContent=p.purpose?`${p.name} · ${p.purpose}`:p.name;select.append(o);}
 }
 if(select)select.value=activeGptId;
}
function openGptManager(){
 const p=currentGpt(); $('gptName').value=p?.name||'';$('gptPurpose').value=p?.purpose||'';
 $('actionSchemaText').value=ACTION_SCHEMA;$('gptInstructionsText').value=GPT_INSTRUCTIONS;renderGptProfiles();$('gptDialog').showModal();
}
$('openGptManager')?.addEventListener('click',openGptManager);
$('manageGptInline')?.addEventListener('click',openGptManager);
$('closeGptManager')?.addEventListener('click',()=>$('gptDialog').close());
$('saveGptProfile')?.addEventListener('click',()=>{
 const name=$('gptName').value.trim();const purpose=$('gptPurpose').value.trim(); if(!name)return say('GPT 이름을 입력하세요.');
 const existing=gptProfiles.find(p=>p.id===activeGptId&&p.name===$('gptName').dataset.originalName);
 const selected=gptProfiles.find(p=>p.id===activeGptId);
 if(selected && selected.name===$('gptName').value.trim() && selected.purpose===purpose){say('이미 저장된 GPT 프로필입니다.');return;}
 const id=(crypto.randomUUID?.()||`gpt-${Date.now()}`);
 gptProfiles.push({id,name,purpose});activeGptId=id;persistGptProfiles();renderGptProfiles();say(`${name} 연결 프로필을 저장했습니다.`);
});
$('deleteGptProfile')?.addEventListener('click',()=>{
 if(gptProfiles.length<=1)return say('GPT 프로필은 최소 1개가 필요합니다.');
 const p=currentGpt();gptProfiles=gptProfiles.filter(x=>x.id!==p.id);activeGptId=gptProfiles[0].id;persistGptProfiles();renderGptProfiles();const n=currentGpt();$('gptName').value=n.name;$('gptPurpose').value=n.purpose||'';say(`${p.name} 프로필을 삭제했습니다.`);
});
$('copyActionSchema')?.addEventListener('click',()=>copy(ACTION_SCHEMA,$('actionSchemaText')));
$('copyGptInstructions')?.addEventListener('click',()=>copy(GPT_INSTRUCTIONS,$('gptInstructionsText')));
$('activeGpt')?.addEventListener('change',e=>{activeGptId=e.target.value;persistGptProfiles();renderGptProfiles();});
renderGptProfiles();
