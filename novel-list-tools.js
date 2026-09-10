'use strict';
(() => {
  const el=id=>document.getElementById(id);
  const PLATFORM_LABEL={kakao:'카카오페이지',naver:'네이버',undecided:'플랫폼 미정'};
  const STATUS_LABEL={planning:'기획 중',writing:'집필 중',preparing:'연재·투고 준비'};

  function clearNovelDrafts(id){
    try{
      for(const key of Object.keys(localStorage)){
        if(key.startsWith(`dject.v1.draft.${id}.`))localStorage.removeItem(key);
      }
    }catch{}
  }

  function formatDate(value){
    if(!value)return '수정일 정보 없음';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '수정일 정보 없음';
    return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'short',day:'numeric'}).format(date);
  }

  function genres(data={}){
    const main=data.genre||'장르 미정';
    const secondary=String(data.secondary_genres||'').split(',').map(v=>v.trim()).filter(Boolean);
    return [main,...secondary.filter(v=>v!==main)].slice(0,3).join(' / ');
  }

  async function confirmDelete(row){
    const first=await ask(`‘${row.title}’을 삭제하시겠습니까?\n\n이 작품의 설정과 모든 회차, 저장된 집필 결과가 함께 삭제됩니다.`);
    if(!first)return false;
    const typed=await ask(`삭제를 계속하려면 작품 제목을 정확히 입력하세요.\n${row.title}`,'');
    if(typed===null)return false;
    if(typed.trim()!==String(row.title||'').trim()){
      say('작품 제목이 일치하지 않아 삭제하지 않았습니다.');
      return false;
    }
    return true;
  }

  async function deleteNovelRow(row){
    if(!row?.id||!(await confirmDelete(row)))return;
    const deletingCurrent=novel?.id===row.id;
    if(deletingCurrent){
      clearTimeout(timer);
      if(queue)await queue.catch(()=>{});
      dirtyN=dirtyC=0;
      blocked=false;
    }
    await api('novels.delete',{id:row.id});
    clearNovelDrafts(row.id);
    if(deletingCurrent){
      novel=chapter=job=null;chapters=[];
      if(jobPollTimer){clearTimeout(jobPollTimer);jobPollTimer=null;}
      syncJobPolling();
      el('editor').hidden=true;
      el('homeSection').hidden=false;
      el('empty').hidden=false;
      el('recovery').hidden=true;
      document.body.classList.remove('novel-open');
    }
    await list();
    say(`‘${row.title}’ 작품을 삭제했습니다.`);
  }

  list=async function(){
    const rows=await api('novels.list');
    const container=el('novelList');
    const count=el('novelCount');
    if(count)count.textContent=rows.length?`${rows.length}개 작품`:'';
    container.replaceChildren();
    if(el('empty'))el('empty').hidden=rows.length>0;

    const detailRows=await Promise.all(rows.map(async row=>{
      try{return {...row,detail:await api('novels.get',{id:row.id})};}
      catch{return {...row,detail:null};}
    }));

    for(const row of detailRows){
      const data=row.detail?.novel?.data||{};
      const chapterRows=row.detail?.chapters||[];
      const latest=chapterRows.slice().sort((a,b)=>(b.number||0)-(a.number||0))[0]||null;
      const item=document.createElement('article');
      item.className='novel-list-item';
      item.classList.toggle('active',novel?.id===row.id);

      const head=document.createElement('div');head.className='novel-card-head';
      const title=document.createElement('div');title.className='novel-card-title';title.textContent=row.title;
      const status=document.createElement('span');status.className='novel-card-status';status.textContent=STATUS_LABEL[data.project_status]||'기획 중';
      head.append(title,status);

      const meta=document.createElement('div');meta.className='novel-card-meta';
      for(const text of [PLATFORM_LABEL[data.target_platform]||'플랫폼 미정',genres(data)]){const tag=document.createElement('span');tag.textContent=text;meta.append(tag);}

      const sub=document.createElement('div');sub.className='novel-card-sub';
      sub.textContent=`${latest?`${latest.number}화까지 생성`:'회차 정보 없음'} · 최근 수정 ${formatDate(row.updated_at)}`;

      const actions=document.createElement('div');actions.className='novel-card-actions';
      const continueBtn=document.createElement('button');continueBtn.type='button';continueBtn.className='primary';continueBtn.textContent='계속 작성';
      continueBtn.onclick=()=>run(async()=>{await flush();await openNovel(row.id,latest?.id);setTimeout(()=>el('writingSection')?.scrollIntoView({behavior:'smooth',block:'start'}),80);});
      const manageBtn=document.createElement('button');manageBtn.type='button';manageBtn.textContent='작품 관리';
      manageBtn.onclick=()=>run(async()=>{await flush();await openNovel(row.id,latest?.id);setTimeout(()=>el('dashboardSection')?.scrollIntoView({behavior:'smooth',block:'start'}),80);});
      const remove=document.createElement('button');remove.type='button';remove.className='novel-delete danger';remove.textContent='삭제';remove.title=`${row.title} 삭제`;remove.setAttribute('aria-label',`${row.title} 작품 삭제`);
      remove.onclick=event=>{event.preventDefault();event.stopPropagation();run(()=>deleteNovelRow(row));};
      actions.append(continueBtn,manageBtn,remove);

      item.append(head,meta,sub,actions);
      container.append(item);
    }
  };

  const topDelete=el('deleteNovel');
  if(topDelete){
    topDelete.textContent='작품 삭제';
    topDelete.onclick=()=>run(async()=>{
      if(!novel)return;
      const title=(el('title')?.value||novel.title||'').trim()||novel.title;
      await deleteNovelRow({id:novel.id,title});
    });
  }

  list().catch(error=>say(error.message));
})();
