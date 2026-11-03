import {demoResponse} from "../demoResponse";
import {useEffect,useRef,useState} from "react";
import {useAppContext} from "../context/AppContext";
import {plainText} from "../utils/textUtils";
import type {WorkItem} from "../models/types";

function StoryDescriptionDialog({story,onClose}:Readonly<{story:WorkItem;onClose:()=>void}>){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;const previous=document.activeElement;
  if(dialog&&!dialog.open)dialog.showModal();
  return()=>{dialog?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[]);
 return <dialog ref={ref} className="story-description-dialog" aria-labelledby="story-description-title" onCancel={e=>{e.preventDefault();onClose();}}>
  <header><span className="import-story-id">US #{story.id}</span><h2 id="story-description-title">{story.title}</h2></header>
  <div className="story-description-content"><h3>Descrição</h3><p>{plainText(story.description)||"Sem descrição."}</p>
   <h3>Critérios de aceitação</h3><p>{plainText(story.acceptanceCriteria)||"Sem critérios fornecidos."}</p>
  </div><footer><button className="app-action" type="button" onClick={onClose} autoFocus>Fechar</button></footer>
 </dialog>;
}
function StoryRefreshMessage({feedback}:Readonly<{feedback:{message:string;error:boolean}}>){
 if(feedback.error)return <p className="story-refresh-error" role="alert">{feedback.message}</p>;
 return <output className="story-refresh-success">{feedback.message}</output>;
}
export default function ImportPage(){
 const c=useAppContext();const [descriptionStory,setDescriptionStory]=useState<WorkItem|null>(null);
 return <>
  <section className="panel">
   <h2>Importar User Story</h2>
   <label htmlFor="storyId">Número da User Story</label>
   <input id="storyId" inputMode="numeric" disabled={c.loading} value={c.userStoryId} placeholder="Demo: 1001 ou 1002" onChange={e=>{c.setUserStoryId(e.target.value.replace(/\D/g,""));c.setError("");}}/>
   <button className="app-action" type="button" disabled={!c.isValid||c.loading} onClick={()=>{setDescriptionStory(null);void c.handleImport();}}>{c.loading?"A importar...":"Importar US"}</button>
   {c.error&&<p role="alert">{c.error}</p>}
  </section>
  {c.drafts.length>0&&<div className="import-story-grid">{c.drafts.map(entry=><article key={entry.story.id} className={`import-story-card${c.selectedStory?.id===entry.story.id?" is-active":""}`}>
   <div className="import-story-top"><span className="import-story-id">US #{entry.story.id}</span>
    <button type="button" className="import-story-delete" aria-label={`Apagar US #${entry.story.id}`} title="Apagar US" disabled={c.loading} onClick={()=>{try{c.deleteDraft(entry.story.id);if(descriptionStory?.id===entry.story.id)setDescriptionStory(null);}catch(error){c.setError(error instanceof Error?error.message:"Não foi possível apagar a US.");}}}>
     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>
    </button></div>
   {c.needsStoryRefresh(entry)&&<button type="button" className="story-refresh-tag" title="Obter os dados mais recentes desta US na demonstração" disabled={c.loading||c.refreshingStoryId!==null} aria-busy={c.refreshingStoryId===entry.story.id} onClick={()=>{void c.refreshStory(entry.story.id);}}><span aria-hidden="true">⚠</span> {c.refreshingStoryId===entry.story.id?"A atualizar…":"Atualizar US"}</button>}
   <h2><button type="button" className="import-story-title" aria-pressed={c.selectedStory?.id===entry.story.id} onClick={()=>c.selectImportStory(entry.story.id)}>{entry.story.title}</button></h2>
   <button type="button" className="issue-link" onClick={()=>setDescriptionStory(entry.story)}>Consultar descrição</button>
   {c.storyRefreshFeedback?.storyId===entry.story.id&&<StoryRefreshMessage feedback={c.storyRefreshFeedback}/>}
   <button type="button" className="import-story-copy app-action" disabled={c.loading} onClick={()=>{void c.copyImportedStory(entry.story.id);}}>Copiar para assistente de IA</button>
  </article>)}</div>}
  {c.selectedStory&&<>
   {c.copyMessage&&<output>{c.copyMessage}</output>}
   {c.showPrompt&&c.preparedPrompt&&<><label htmlFor="copy-fallback">Seleciona e copia o pedido — US #{c.selectedStory.id}</label><textarea id="copy-fallback" readOnly rows={12} value={c.preparedPrompt} onFocus={e=>e.currentTarget.select()} style={{width:"100%",boxSizing:"border-box"}}/></>}
   <section className="panel story-panel">
    <h2>Resposta do assistente de IA — US #{c.selectedStory.id}</h2><p>Cola a resposta para organizar os casos de teste e as questões de refinement.</p>
    <button type="button" className="issue-link" onClick={()=>c.setJsonInput(JSON.stringify(demoResponse,null,2))}>Usar resposta de exemplo</button>
    <label htmlFor="jsonInput">Resposta JSON</label><textarea id="jsonInput" rows={7} value={c.jsonInput} onChange={e=>c.setJsonInput(e.target.value)} placeholder={'{"testCases":[...],"questions":[...]}'} style={{width:"100%",boxSizing:"border-box"}}/>
    <button className="app-action" type="button" disabled={!c.jsonInput.trim()} onClick={c.handleParseResponse}>Importar resposta</button>
    {c.jsonError&&<p role="alert">{c.jsonError}</p>}{c.jsonMessage&&<output>{c.jsonMessage}</output>}
   </section>

  </>}
  {descriptionStory&&<StoryDescriptionDialog key={descriptionStory.id} story={descriptionStory} onClose={()=>setDescriptionStory(null)}/>}
 </>;
}
