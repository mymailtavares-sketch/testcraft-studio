import {useEffect,useRef,useState} from "react";
import {useAppContext} from "../context/AppContext";
import type {RefinementEntry} from "../models/refinement";

type QuestionFilter="all"|"empty"|"answered";
function QuestionAnswerDialog({question,index,answer,onCancel,onSave}:Readonly<{question:string;index:number;answer:string;onCancel:()=>void;onSave:(answer:string)=>void}>){
 const ref=useRef<HTMLDialogElement>(null);
 const [value,setValue]=useState(answer);
 const [error,setError]=useState("");
 useEffect(()=>{const dialog=ref.current;const previous=document.activeElement;if(dialog&&!dialog.open)dialog.showModal();return()=>{dialog?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} className="refinement-answer-dialog" aria-labelledby="refinement-answer-title" onCancel={event=>{event.preventDefault();onCancel();}}>
  <form onSubmit={event=>{event.preventDefault();try{onSave(value.trim());}catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível guardar a resposta.");}}}>
   <header><span>Questão {String(index+1).padStart(2,"0")}</span><button type="button" className="refinement-dialog-close" aria-label="Fechar questão" onClick={onCancel}>×</button></header>
   <div className="refinement-answer-body"><h2 id="refinement-answer-title">{question}</h2>
    <label htmlFor="refinement-answer">Resposta (opcional)</label><textarea id="refinement-answer" rows={6} value={value} onChange={event=>setValue(event.target.value)} placeholder="Escreve aqui o esclarecimento da equipa…" autoFocus/>
    <p>Podes guardar sem preencher uma resposta.</p>{error&&<p role="alert">{error}</p>}
   </div>
   <footer><button type="button" className="app-action" onClick={onCancel}>Cancelar</button><button type="submit" className="app-action">Guardar resposta</button></footer>
  </form>
 </dialog>;
}
function RefinementWorkspace({entry}:Readonly<{entry:RefinementEntry}>){
 const c=useAppContext();const [error,setError]=useState("");
 const [filter,setFilter]=useState<QuestionFilter>("all");const [editingQuestion,setEditingQuestion]=useState<string|null>(null);
 const answered=entry.questions.filter(question=>question.answer.trim()).length;
 const editedIndex=entry.questions.findIndex(question=>question.text===editingQuestion);const edited=entry.questions[editedIndex];
 const visible=entry.questions.map((question,index)=>({question,index})).filter(({question})=>filter==="all"||(filter==="answered")===Boolean(question.answer.trim()));
 const complete=()=>{try{c.completeRefinement(entry.story.id);}catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível concluir.");}};
 const filters:ReadonlyArray<{value:QuestionFilter;label:string;count:number}>=[{value:"all",label:"Todas",count:entry.questions.length},{value:"empty",label:"Sem resposta",count:entry.questions.length-answered},{value:"answered",label:"Respondidas",count:answered}];
 return <div className="refinement-page">
  <header className="refinement-heading"><div><h1>Questões Refinment</h1><p>Abre uma questão para responder. Podes concluir com questões em aberto.</p></div><button type="button" className="app-action" onClick={complete}>Concluído</button></header>
  <section className="refinement-story-summary" aria-label="User Story em refinement"><div><span>US #{entry.story.id}</span><h2>{entry.story.title}</h2></div><div className="refinement-answer-progress"><span aria-live="polite">{answered} de {entry.questions.length} respondidas</span><progress max={Math.max(1,entry.questions.length)} value={answered} aria-label="Questões respondidas"/></div></section>
  {error&&<p role="alert">{error}</p>}
  {entry.questions.length>0&&<div className="refinement-filters" role="group" aria-label="Filtrar questões">{filters.map(item=><button type="button" key={item.value} aria-pressed={filter===item.value} onClick={()=>setFilter(item.value)}>{item.label} <span>{item.count}</span></button>)}</div>}
  {entry.questions.length===0&&<p className="refinement-empty">O assistente de IA não devolveu questões de refinement.</p>}
  {entry.questions.length>0&&visible.length===0&&<p className="refinement-empty">Não existem questões neste filtro.</p>}
  <div className="refinement-cards">{visible.map(({question,index})=>{
   const hasAnswer=Boolean(question.answer.trim());
   return <article key={question.text} className="refinement-card"><button type="button" className="refinement-card-open" aria-haspopup="dialog" aria-label={`Questão ${index+1}: ${question.text} — ${hasAnswer?"Editar resposta":"Responder"}`} onClick={()=>setEditingQuestion(question.text)}>
    <span className="refinement-card-top"><span className="refinement-card-number">{String(index+1).padStart(2,"0")}</span><span className="refinement-answer-badge" data-answered={hasAnswer}>{hasAnswer?"Respondida":"Sem resposta"}</span></span>
    <span className="refinement-card-title" title={question.text}>{question.text}</span><span className="refinement-card-preview">{question.answer.trim()||"Ainda não foi adicionada uma resposta."}</span>
    <span className="refinement-card-action">{hasAnswer?"Editar resposta":"Responder"}<span aria-hidden="true">→</span></span>
   </button></article>;
  })}</div>
  <footer className="refinement-complete-bar"><span>As respostas são opcionais e ficam guardadas neste navegador.</span><button type="button" className="app-action" onClick={complete}>Concluído</button></footer>
  {edited&&<QuestionAnswerDialog key={edited.text} question={edited.text} index={editedIndex} answer={edited.answer} onCancel={()=>setEditingQuestion(null)} onSave={answer=>{c.answerDraftQuestion(entry.story.id,editedIndex,answer);setEditingQuestion(null);}}/>}
 </div>;
}
export default function RefinementPage(){
 const c=useAppContext();const entry=c.drafts.find(d=>d.story.id===c.selectedStory?.id);
 if(!entry)return <section className="panel"><h1>Questões Refinment</h1><p>Abre uma User Story guardada para consultar as questões.</p><button type="button" className="app-action" onClick={()=>c.setScreen("library")}>User Storys</button></section>;
 return <RefinementWorkspace key={entry.story.id} entry={entry}/>;
}
