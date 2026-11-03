import TitleCategoryDialog from "./TitleCategoryDialog";
import {TITLE_CATEGORIES_KEY,BASE_TITLE_CATEGORIES,loadTitleCategories,addTitleCategory,removeTitleCategory} from "../services/titleCategories";
import {formatTestCaseTitle,titleParts} from "../services/testCaseTitles";
import {useEffect,useRef,useState} from "react";
import type {TestCase,TestStep} from "../models/types";
import testTypes from "../utils/testTypes.json";
import {validateReviewedCase} from "../services/refinementWorkflow";

type EditableStep=TestStep & {editorId:string};
type EditableCase=Omit<TestCase,"steps"> & {steps:EditableStep[]};
function editableStep(step:TestStep):EditableStep{return {...step,editorId:crypto.randomUUID()};}

export default function TestCaseEditDialog({item,onCancel,onSave,saveError}:Readonly<{saveError?:string;item:TestCase;onCancel:()=>void;onSave:(item:TestCase,complete:boolean)=>void}>){
  const ref=useRef<HTMLDialogElement>(null);
  const [draft,setDraft]=useState<EditableCase>(()=>{const formatted=formatTestCaseTitle({...structuredClone(item),automationStatus:"Manual"});return {...formatted,steps:formatted.steps.map(editableStep)};});
  const [error,setError]=useState("");
  const [customCategories,setCustomCategories]=useState(loadTitleCategories);const [addingCategory,setAddingCategory]=useState(false);
  const categories=Array.from(new Set([...BASE_TITLE_CATEGORIES,...customCategories,titleParts(draft).category]));
  useEffect(()=>{const element=ref.current;if(element&&!element.open)element.showModal();return()=>{if(element?.open)element.close();};},[]);
  const patch=(value:Partial<EditableCase>)=>setDraft(current=>({...current,...value}));
  const deleteCategory=()=>{
    const selected=titleParts(draft).category;
    try{
      const remaining=removeTitleCategory(customCategories,selected);
      localStorage.setItem(TITLE_CATEGORIES_KEY,JSON.stringify(remaining));
      setCustomCategories(remaining);
      patch({titleCategory:"UI",titleCategoryExplicit:true});
      setError("");
    }catch{setError("Não foi possível apagar a categoria. Tenta novamente.");}
  };
  const save=(complete:boolean)=>{
    const updated=formatTestCaseTitle({...draft,steps:draft.steps.map(step=>({action:step.action,expectedResult:step.expectedResult}))});
    if(complete){const message=validateReviewedCase(updated);if(message){setError(message);return;}}
    onSave({...updated,reviewStatus:complete?"reviewed":"draft"},complete);
  };
  const fieldStyle={width:"100%",boxSizing:"border-box" as const,padding:10,border:"1px solid #bbb",borderRadius:7};
  return <><dialog ref={ref} aria-labelledby="edit-case-title" onCancel={event=>{event.preventDefault();onCancel();}}
    style={{width:"min(900px,calc(100vw - 32px))",maxHeight:"88vh",padding:0,border:"1px solid #ddd",borderRadius:14,boxShadow:"0 16px 70px #0005"}}>
    <form onSubmit={event=>{event.preventDefault();save(true);}} style={{display:"flex",flexDirection:"column",maxHeight:"88vh"}}>
      <header style={{padding:"18px 24px",borderBottom:"1px solid #ddd"}}><h2 id="edit-case-title" style={{margin:0}}>Rever caso de teste</h2><p style={{marginBottom:0}}>Edita os dados e os passos. Conclui para guardar a revisão e fechar esta janela. O destino é escolhido no card.</p></header>
      <div style={{overflowY:"auto",padding:"0 24px 20px"}}>
        <label htmlFor="edit-test-title">Nome do caso de teste *</label><input id="edit-test-title" value={draft.titleName??draft.title} onChange={event=>patch({titleName:event.target.value})} style={fieldStyle}/>
        <label htmlFor="edit-title-outcome">OK/ NOT OK</label><select id="edit-title-outcome" style={fieldStyle} value={draft.titleOutcome??"OK"} onChange={event=>patch({titleOutcome:event.target.value as "OK"|"NOT OK"})}><option>OK</option><option>NOT OK</option></select>
        <><label htmlFor="edit-title-category">Categoria do título</label><select id="edit-title-category" style={fieldStyle} value={titleParts(draft).category} onChange={event=>{if(event.target.value==="__other__")setAddingCategory(true);else patch({titleCategory:event.target.value,titleCategoryExplicit:true});}}>{categories.map(value=><option key={value}>{value}</option>)}<option value="__other__">Outra</option></select></>
        {!BASE_TITLE_CATEGORIES.includes(titleParts(draft).category)&&<button type="button" className="issue-link" onClick={deleteCategory}>Apagar categoria «{titleParts(draft).category}»</button>}
        <p><strong>Título final:</strong> {draft.publicationDestination?formatTestCaseTitle(draft).title:`[Biblioteca por selecionar] - ${titleParts(draft).category} - ${draft.titleName??""} - ${draft.titleOutcome??"OK"}`}</p>
        <label htmlFor="edit-test-description">Description</label><textarea id="edit-test-description" rows={3} value={draft.description} onChange={event=>patch({description:event.target.value})} style={fieldStyle}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16}}>
          <div><label htmlFor="edit-test-priority">Priority</label><select id="edit-test-priority" value={draft.priority} onChange={event=>patch({priority:Number(event.target.value) as TestCase["priority"]})} style={fieldStyle}>{[1,2,3,4].map(p=><option key={p} value={p}>{p}</option>)}</select></div>
          <div><label htmlFor="edit-test-type">Test Type *</label><select id="edit-test-type" value={draft.testType} onChange={event=>patch({testType:event.target.value})} style={fieldStyle}>
            {!testTypes.includes(draft.testType)&&<option value={draft.testType}>{draft.testType||"Selecionar tipo"}</option>}{testTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></div>
          <div><label htmlFor="edit-test-automation">Automation Status</label><select id="edit-test-automation" value={draft.automationStatus} onChange={event=>patch({automationStatus:event.target.value as TestCase["automationStatus"]})} style={fieldStyle}>
            {["Manual","Automated","Planned"].map(status=><option key={status} value={status}>{status}</option>)}</select></div>
        </div>
        <label htmlFor="edit-test-preconditions">Preconditions</label><textarea id="edit-test-preconditions" rows={2} value={draft.preconditions} onChange={event=>patch({preconditions:event.target.value})} style={fieldStyle}/>
        <label htmlFor="edit-test-data">Test Data</label><textarea id="edit-test-data" rows={2} value={draft.testData} onChange={event=>patch({testData:event.target.value})} style={fieldStyle}/>

        <button className="issue-link" type="button" style={{marginBottom:14}} disabled={draft.steps.length>=100} onClick={()=>patch({steps:[editableStep({action:"",expectedResult:""}),...draft.steps]})}>Adicionar step no início</button>
        {draft.steps.map((step,i)=><section key={step.editorId} style={{padding:14,border:"1px solid #ddd",borderRadius:8,marginBottom:14}}>
          <strong>Step {i+1}</strong>
          <label htmlFor={`edit-step-action-${i}`}>Action *</label><textarea id={`edit-step-action-${i}`} rows={2} value={step.action} style={fieldStyle}
            onChange={event=>patch({steps:draft.steps.map((s,j)=>i===j?{...s,action:event.target.value}:s)})}/>
          <label htmlFor={`edit-step-expected-${i}`}>Expected Result *</label><textarea id={`edit-step-expected-${i}`} rows={2} value={step.expectedResult} style={fieldStyle}
            onChange={event=>patch({steps:draft.steps.map((s,j)=>i===j?{...s,expectedResult:event.target.value}:s)})}/>
          <button type="button" className="issue-link" aria-label={`Remover passo ${i+1}`} disabled={draft.steps.length===1} onClick={()=>patch({steps:draft.steps.filter((_,j)=>j!==i)})}>Remover passo</button>
        </section>)}
        <button className="issue-link" type="button" disabled={draft.steps.length>=100} onClick={()=>patch({steps:[...draft.steps,editableStep({action:"",expectedResult:""})]})}>Adicionar step</button>
        {(error||saveError)&&<p role="alert" style={{color:"#a11"}}>{error||saveError}</p>}
      </div>
      <footer style={{padding:"0 24px 18px",borderTop:"1px solid #ddd",display:"flex",justifyContent:"flex-end",gap:12,flexWrap:"wrap",flexShrink:0}}>
        <button className="app-action" type="button" style={{background:"#eee"}} onClick={onCancel}>Cancelar</button>

        <button className="app-action" type="submit">Concluído</button>
      </footer>
    </form>
  </dialog>{addingCategory&&<TitleCategoryDialog onCancel={()=>setAddingCategory(false)} onSave={value=>{const result=addTitleCategory(customCategories,value);localStorage.setItem(TITLE_CATEGORIES_KEY,JSON.stringify(result.categories));setCustomCategories(result.categories);patch({titleCategory:result.selected,titleCategoryExplicit:true});setAddingCategory(false);}}/>}</>;
}

