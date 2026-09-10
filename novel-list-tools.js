'use strict';
(() => {
  const el=id=>document.getElementById(id);

  const style=document.createElement('style');
  style.textContent=`
    #novelList .novel-list-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:stretch}
    #novelList .novel-open{width:100%;min-width:0;max-width:none;text-align:left}
    #novelList .novel-delete{width:44px;min-width:44px;max-width:44px;padding:8px;text-align:center;color:#a13030;font-weight:800}
    @media(max-width:760px){
      #novelList .novel-list-item{flex:0 0 190px;min-width:160px;max-width:210px}
      #novelList .novel-open{width:100%;min-width:0;max-width:none}
      #novelList .novel-delete{width:44px;min-width:44px;max-width:44px}
    }
  `;
  document.head.append(style);

  function clearNovelDrafts(id){
    try{
      for(const key of Object.keys(localStorage)){
        if(key.startsWith(`dject.v1.draft.${id}.`))localStorage.removeItem(key);
      }
    }catch{}
  }

  async function confirmDelete(row){
    const first=await ask(`“${row.title}” 작품을 삭제할까요?\n설정·모든 회차·집필 결과가 함께 삭제되며 되돌릴 수 없습니다.`);
    if(!first)return false;
    const typed=await ask(`삭제 확인을 위해 작품 제목을 정확히 입력하세요.\n${row.title}`,'');
    if(typed===null)return false;
    if(typed.trim()!==String(row.title||'').trim()){
      say('작품 제목이 일치하지 않아 삭제하지 않았습니다.');
      return false;
    }
    return true;
  }

  async function deleteNovelRow(row){
    if(!row?.id)return;
    if(!(await confirmDelete(row)))return;

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
      novel=chapter=job=null;
      chapters=[];
      if(jobPollTimer){clearTimeout(jobPollTimer);jobPollTimer=null;}
      syncJobPolling();
      el('editor').hidden=true;
      el('empty').hidden=false;
      el('recovery').hidden=true;
    }

    await list();
    say(`“${row.title}” 작품을 삭제했습니다.`);
  }

  list=async function(){
    const rows=await api('novels.list');
    const container=el('novelList');
    container.replaceChildren();

    for(const row of rows){
      const item=document.createElement('div');
      item.className='novel-list-item';

      const open=document.createElement('button');
      open.type='button';
      open.className='novel-open';
      open.textContent=row.title;
      open.classList.toggle('active',novel?.id===row.id);
      open.onclick=()=>run(async()=>{
        if(novel?.id===row.id)return;
        await flush();
        await openNovel(row.id);
      });

      const remove=document.createElement('button');
      remove.type='button';
      remove.className='novel-delete danger';
      remove.textContent='×';
      remove.title=`${row.title} 삭제`;
      remove.setAttribute('aria-label',`${row.title} 작품 삭제`);
      remove.onclick=event=>{
        event.preventDefault();
        event.stopPropagation();
        run(()=>deleteNovelRow(row));
      };

      item.append(open,remove);
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
