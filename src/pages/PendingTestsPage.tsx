import {useState} from "react";
import {useAppContext} from "../context/AppContext";
export default function PendingTestsPage(){
 const {drafts,resumePendingCase,setScreen,deletePendingCase}=useAppContext();
 const [storyFilter,setStoryFilter]=useState("");
 const [deleteError,setDeleteError]=useState("");
 const entries=drafts.filter(entry=>entry.cases.length>0);
 const activeFilter=entries.some(entry=>String(entry.story.id)===storyFilter)?storyFilter:"";
 const items=entries.filter(entry=>!activeFilter||String(entry.story.id)===activeFilter).flatMap(entry=>entry.cases.map(item=>({story:entry.story,item})));
 return <section className="panel">
  <h2>Testes pendentes</h2>
  <p>Retoma os casos que ainda não têm a gravação confirmada na demonstração.</p>
  {deleteError&&<p role="alert">{deleteError}</p>}
  {entries.length>0?<>
   <label htmlFor="pending-story-filter">User Story</label><select id="pending-story-filter" value={activeFilter} onChange={event=>setStoryFilter(event.target.value)} style={{maxWidth:520}}><option value="">Todas as User Stories</option>{entries.map(entry=><option key={entry.story.id} value={entry.story.id}>US #{entry.story.id} — {entry.story.title}</option>)}</select>
   <p className="note">{items.length} casos pendentes. Retomar abre o caso selecionado para validares e gravares.</p>
   <p className="note">Apagar um caso remove apenas o rascunho local. Não apaga testes na demonstração.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
    {items.map(({story,item})=>{
     const uncertain=item.publicationAttempt?.status==="needsReview"||Boolean(item.azureDevOpsId);
     return <article key={`${story.id}:${item.localId}`} className="pending-test-card" style={{border:"1px solid #e2e4e8",borderRadius:14,padding:20,display:"flex",flexDirection:"column",gap:12,background:"white"}}>
      <span className="note">US #{story.id} · {story.title}</span>
      <h3 style={{fontSize:16,lineHeight:1.5,margin:0}}>{item.title}</h3>
      <strong style={{color:uncertain?"#4338ca":"#555"}}>{uncertain?"Resultado por confirmar":"Por gravar"}</strong>
      {item.publicationDestination&&<p className="note" style={{margin:0}}>{item.publicationDestination.planName} → {item.publicationDestination.suitePath}</p>}
      {item.azureDevOpsId&&<span>Test Case #{item.azureDevOpsId}</span>}
      {item.publicationAttempt?.error&&<p className="note" style={{overflowWrap:"anywhere",margin:0}}>{item.publicationAttempt.error}</p>}
      {uncertain&&<p className="note" style={{margin:0}}>A aplicação verifica o resultado anterior antes de permitir uma nova criação.</p>}
      <div style={{marginTop:"auto",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
       <button type="button" className="app-action" aria-label={`Retomar caso ${item.title}`} onClick={()=>resumePendingCase(story.id,item.localId)}>Retomar gravação</button>
       <button type="button" className="issue-link" style={{color:"#a32626"}} aria-label={`Apagar caso ${item.title}`} onClick={()=>{try{deletePendingCase(story.id,item.localId);setDeleteError("");}catch{setDeleteError("Não foi possível apagar o caso do navegador. Tenta novamente.");}}}>Apagar caso</button>
      </div>
     </article>;
    })}
   </div>
  </>:<><p>Não há casos de teste pendentes nas User Stories guardadas.</p><button type="button" className="issue-link" onClick={()=>setScreen("import")}>Importar US</button></>}
 </section>;
}
