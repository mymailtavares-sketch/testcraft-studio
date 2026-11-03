import {getCatalogPlans,getCatalogComponents} from "../services/azureCatalogs";
import {selectedPublicationGroups,allCasesSelected,canValidateSelection,publicationSummaryMessage,publicationResultMessage} from "../services/reviewPresentation";
import PublicationLoader from "./PublicationLoader";
import {publicationReadiness} from "../services/publicationReadiness";
import {assignDestination,formatTestCaseTitle} from "../services/testCaseTitles";
import {createManualTestCase} from "../services/manualTestCase";
import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext";
import type { TestCase } from "../models/types";
import TestCaseEditDialog from "./TestCaseEditDialog";

import TestCaseDestinationDialog from "./TestCaseDestinationDialog";
import type {CasePublicationResult} from "../services/casePublication";
import type { PlanOption } from "./TestCaseDestinationDialog";
import { groupCasesByDestination, validatePublicationGroups, publishPublicationGroups } from "../services/casePublication";

function PublicationSummaryDialog({results,onClose}:Readonly<{results:CasePublicationResult[];onClose:()=>void}>){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;const previous=document.activeElement;
  if(dialog&&!dialog.open)dialog.showModal();
  return()=>{dialog?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[]);
 return <dialog ref={ref} className="story-description-dialog" aria-labelledby="publication-summary-title" onCancel={event=>{event.preventDefault();onClose();}}>
  <header><h2 id="publication-summary-title">Casos de teste gravados</h2></header>
  <div className="story-description-content">
   <p role="status" className="story-refresh-success">{results.length===1?"Caso de teste gravado com sucesso.":"Casos de teste gravados com sucesso."}</p>
   <ul>{results.map(result=><li key={result.localId} style={{marginBottom:12}}><strong>#{result.azureDevOpsId}</strong> — {result.title} — {result.destination.planName}</li>)}</ul>
  </div>
  <footer><button className="app-action" type="button" onClick={onClose} autoFocus>Fechar</button></footer>
 </dialog>;
}

export default function ReviewPage() {
  const {
    selectedStory,drafts,selectImportStory,reviewResumeRequest,setReviewResumeRequest,
    cases,
    setCases,
    saveForRefinement,
    updateCase,savePublicationResult,addManualCase,storyNeedsRefresh,setScreen,
  } = useAppContext();
  const [catalogReload,setCatalogReload]=useState(0);
  const [newCase,setNewCase]=useState<TestCase|null>(null);
  const [manualError,setManualError]=useState("");
  const [editingId,setEditingId]=useState<string|null>(null);
  const editingCase=cases.find(tc=>tc.localId===editingId);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const selectedCases = cases.filter((item) => selectedCaseIds.includes(String(item.localId)));
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [destinationError, setDestinationError] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [validatingPublication, setValidatingPublication] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [validatedSignature, setValidatedSignature] = useState("");
  const [publishing, setPublishing] = useState(false);
  const publishingRef = useRef(false);
  const [publicationUncertain, setPublicationUncertain] = useState(false);
  const [testedComponents, setTestedComponents] = useState<string[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(true);
  const [componentsError, setComponentsError] = useState("");
  const [publishOutcome, setPublishOutcome] = useState<Awaited<ReturnType<typeof publishPublicationGroups>> | null>(null);
  const [confirmedResults,setConfirmedResults]=useState<CasePublicationResult[]>([]);
  const [configuringIds,setConfiguringIds]=useState<string[]>([]);
  const configuringCases=cases.filter(item=>configuringIds.includes(item.localId));
  const allSelected=allCasesSelected(cases,selectedCaseIds);
  const storyRef = useRef(selectedStory?.id);
  storyRef.current = selectedStory?.id;
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadComponents() {
      setLoadingComponents(true);setComponentsError("");
      try {
        const components=await getCatalogComponents();
        if(active)setTestedComponents(components);
      } catch (error) {
        if (active) setComponentsError(error instanceof Error ? error.message : "Erro ao carregar componentes.");
      } finally { if (active) setLoadingComponents(false); }
    }
    void loadComponents();
    return () => { active = false; };
  }, [catalogReload]);

  useEffect(() => {
    let active = true;
    async function loadPlans() {
      setLoadingPlans(true);setDestinationError("");
      try {
        const plans=await getCatalogPlans();
        if(active)setPlans(plans);
      } catch (error) {
        if (active) setDestinationError(error instanceof Error ? error.message : "Erro ao carregar bibliotecas.");
      } finally {
        if (active) setLoadingPlans(false);
      }
    }
    void loadPlans();
    return () => { active = false; };
  }, [catalogReload]);

  useEffect(() => {
    setNewCase(null);setManualError("");setSelectedCaseIds([]); setConfiguringIds([]); setEditingId(null); setShowValidation(false);
    setValidatedSignature(""); setValidationError(""); setPublishOutcome(null);
    setConfirmedResults([]);setPublishError(""); setPublicationUncertain(false); setPublishing(false); setValidatingPublication(false);
  }, [selectedStory?.id]);

  useEffect(()=>{
    if(reviewResumeRequest?.storyId!==selectedStory?.id||!reviewResumeRequest)return;
    setSelectedCaseIds([reviewResumeRequest.localId]);
    setReviewResumeRequest(null);
  },[reviewResumeRequest,selectedStory?.id,setReviewResumeRequest]);

  const {groups:selectedGroups,error:selectionError}=selectedPublicationGroups(selectedCases);
  const readinessIssues=publicationReadiness(selectedCases,testedComponents);
  const canValidate = canValidateSelection(selectedStory,selectedGroups,selectionError,validatingPublication||publishing,loadingComponents,readinessIssues);
  const publicationSignature = JSON.stringify({storyId:selectedStory?.id,cases:selectedCases});

  async function validatePublication() {
    if (!selectedStory || !canValidate) return;
    const storyId = selectedStory.id;
    const signature = publicationSignature;
    setValidationError(""); setShowValidation(false); setValidatingPublication(true);
    setPublishOutcome(null); setPublishError("");
    try {
      await validatePublicationGroups(storyId, selectedGroups);
      if (storyRef.current === storyId) {setValidatedSignature(signature);setShowValidation(true);}
    } catch (error) {
      if (storyRef.current === storyId) setValidationError(error instanceof Error ? error.message : "Não foi possível validar os casos.");
    } finally { if (storyRef.current === storyId) setValidatingPublication(false); }
  }

  async function publishSelectedCases() {
    if (!selectedStory || !showValidation || validatedSignature !== publicationSignature || publishingRef.current || publishing) return;
    const groups = groupCasesByDestination(selectedCases);
    const storyId = selectedStory.id;
    publishingRef.current = true;
    setConfirmedResults([]);setPublishing(true); setPublishError(""); setPublishOutcome(null);
    try {
      const result = await publishPublicationGroups(storyId, groups,fetch,result=>savePublicationResult(storyId,result));
      if (storyRef.current === storyId) {
        setPublishOutcome(result);
        setConfirmedResults(result.results.filter(item=>item.status==="suiteLinked"&&item.storyLinked===true&&Boolean(item.azureDevOpsId)));
        setPublicationUncertain(result.results.some(r => r.status === "needsReview"));
        setShowValidation(false);setValidatedSignature("");
      }
    } catch (error) {
      if (storyRef.current === storyId) {
        setPublishError(error instanceof Error ? error.message : "Não foi possível confirmar a gravação na demonstração.");
        setPublicationUncertain(true);
      }
    } finally { publishingRef.current = false; if (storyRef.current === storyId) setPublishing(false); }
  }

  function toggleCaseSelection(localId:string) {
    setShowValidation(false);setValidatedSignature("");
    setSelectedCaseIds(current=>current.includes(localId)?current.filter(id=>id!==localId):[...current,localId]);
  }

  if (!selectedStory) return <section className="panel" aria-labelledby="choose-review-story-title">
    <h2 id="choose-review-story-title">Casos de teste</h2>
    {drafts.length>0?<>
      <p>Escolhe uma das User Stories guardadas para consultar os seus casos de teste.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,340px))",gap:16,marginTop:20}}>
        {drafts.map(entry=><article key={entry.story.id} className="review-story-card" style={{background:"white",border:"1px solid #e2e4e8",borderRadius:14,padding:20,display:"flex",flexDirection:"column",gap:12}}>
          <strong>US #{entry.story.id}</strong>
          <h3 style={{margin:0,fontSize:16,lineHeight:1.5}}>{entry.story.title}</h3>
          <p className="note" style={{margin:0}}>{entry.cases.length} casos de teste · {entry.publishedCases?.length??0} gravados na demonstração</p>
          <button type="button" className="app-action" style={{marginTop:"auto"}} aria-label={`Consultar casos da US ${entry.story.id}`} onClick={()=>{selectImportStory(entry.story.id);setScreen("review");}}>Consultar casos</button>
        </article>)}
      </div>
    </>:<><p>Ainda não tens User Stories guardadas. Importa uma US para começar.</p><button type="button" className="app-action" onClick={()=>setScreen("import")}>Importar US</button></>}
  </section>;

  return (
    <fieldset disabled={publishing || validatingPublication} style={{border:0,padding:0,margin:0,minWidth:0}}>
      {publishing && <PublicationLoader />}
      <section className="panel">
        <h2>Revisão dos casos de teste</h2>
        {(destinationError||componentsError)&&<div role="alert"><p>{destinationError||componentsError}</p><button type="button" className="issue-link" disabled={loadingPlans||loadingComponents} onClick={()=>setCatalogReload(value=>value+1)}>Tentar carregar bibliotecas e componentes</button></div>}
        {storyNeedsRefresh&&<output className="outdated-notice">Há novas respostas de refinement. Podes atualizar a US no respetivo card; este aviso não impede a gravação dos testes. <button type="button" className="issue-link" onClick={()=>setScreen("import")}>Ver cards das US</button></output>}
        <button className="app-action" type="button" disabled={!selectedStory} onClick={()=>{setManualError("");setNewCase(createManualTestCase());}}>Adicionar caso de teste</button>
        {manualError&&<p role="alert">{manualError}</p>}
        <button className="app-action"
          type="button"
          disabled={!selectedStory || cases.length === 0}
          onClick={saveForRefinement}
        >
          Guardar US em User Storys
        </button>
        <p className="note">
          {selectedStory ? `User Story #${selectedStory.id} · ` : ""}
          {cases.length} casos de teste. Guarda a US para
          manteres o trabalho entre sessões.
        </p>
      </section>
      {cases.length > 0 && (
        <section className="panel">
          <h2>Casos de teste ({cases.length})</h2>
          <p className="note">
            Abre um caso para o rever numa janela. A revisão é opcional. Escolhe o destino para gravar.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <label style={{display:"flex",alignItems:"center",gap:8,margin:0}}>
              <input type="checkbox" checked={allSelected} aria-label="Selecionar todos os casos" style={{width:18,height:18}} onChange={()=>{setShowValidation(false);setValidatedSignature("");setSelectedCaseIds(allSelected?[]:cases.map(tc=>tc.localId));}}/>
              <span>Selecionar todos</span>
            </label>
            <button className="app-action" type="button" disabled={selectedCases.length===0} onClick={()=>{setShowValidation(false);setConfiguringIds(selectedCases.map(tc=>tc.localId));}}>Destino dos selecionados</button>
            <strong>{selectedCases.length} de {cases.length} selecionados</strong>
          </div>
          {selectedCases.some(tc=>tc.publicationDestination&&tc.title!==formatTestCaseTitle(tc).title)&&<output>Revê os títulos ou volta a aplicar o destino para os adaptar ao novo formato antes de publicar.</output>}
          <div className="review-cards">
          {cases.map((item, i) => (
            <article
              key={item.localId}
              className={`review-card${selectedCaseIds.includes(item.localId)?" is-selected":""}`}
            >
              <div className="review-card-header">
                <input
                  type="checkbox"
                  aria-label={`Selecionar caso de teste ${i + 1}: ${item.title}`}
                  checked={selectedCaseIds.includes(String(item.localId))}
                  onChange={() => toggleCaseSelection(String(item.localId))}
                  style={{ width: 18, height: 18, flexShrink: 0, marginTop: 4 }}
                />
              <button
                id={`case-header-${item.localId}`}
                type="button"
                onClick={() => setEditingId(item.localId)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  color: "inherit",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                <strong>
                  ✎ {i + 1}. {item.title}
                </strong>
                <div style={{ fontSize: 13, marginTop: 5 }}>
                  {" "}
                  {item.testType} · Priority {item.priority} ·{" "}
                  {item.automationStatus}
                </div>
              </button>
              </div>
              <div className="review-card-body">
                <div><strong>Tested Component:</strong> {item.testedComponent||"Por escolher no destino"}</div>
                {item.publicationDestination ? <>
                  <div><strong>Biblioteca:</strong> {item.publicationDestination.planName}</div>
                  <div><strong>Suite:</strong> {item.publicationDestination.suitePath}</div>
                </> : <span style={{color:"#667085"}}>Biblioteca e suite por escolher.</span>}
                <div className="case-review-status" data-reviewed={item.reviewStatus==="reviewed"}><strong>Revisão:</strong> {item.reviewStatus==="reviewed"?"Concluída":"Por rever"}</div>
              </div>
              <div className="review-card-footer">
                <button className="app-action" type="button" onClick={()=>{setShowValidation(false);setConfiguringIds([item.localId]);}}
                  style={{background:"#f2f3f5",color:"#222"}}>
                  {item.publicationDestination ? "Alterar destino" : "Adicionar destino"}
                </button>
              </div>

            </article>
          ))}
          </div>
        </section>
      )}

      {cases.length > 0 && <section className="panel">
        <h2>Gravar os casos selecionados</h2>
        <p>Cada caso segue para a biblioteca e a suite escolhidas na sua popup.</p>
        <p><strong>User Story:</strong> {selectedStory ? `#${selectedStory.id}` : "Não selecionada"} · {selectedCases.length} caso(s) selecionado(s).</p>
        {selectedCases.length===0&&<output>Seleciona pelo menos um caso na checkbox. Depois confirma o destino.</output>}
        {loadingComponents&&<output>A carregar os Tested Components permitidos...</output>}
        {!loadingComponents&&readinessIssues.length>0&&<section aria-live="polite" style={{marginTop:12}}>
          <strong>O que falta para desbloquear a validação</strong>
          <ul className="publication-alerts">{selectedCases.map(item=>{
            const issues=readinessIssues.filter(issue=>issue.localId===item.localId);
            if(issues.length===0)return null;
            return <li key={item.localId}>
              <strong>{item.title||"Sem título"}</strong>
              <ul>{Array.from(new Set(issues.map(issue=>issue.message))).map(message=><li key={message}>{message}</li>)}</ul>
              <div className="publication-alert-links">
                {issues.some(issue=>issue.action==="edit")&&<button type="button" className="issue-link" onClick={()=>{setShowValidation(false);setEditingId(item.localId);}}>Rever caso de teste</button>}
                {issues.some(issue=>issue.action==="destination")&&<button type="button" className="issue-link" onClick={()=>{setShowValidation(false);setConfiguringIds([item.localId]);}}>Selecionar destino</button>}
              </div>
            </li>;
          })}</ul>
        </section>}
        {selectionError && readinessIssues.length===0 && <p role="alert">{selectionError}</p>}
        {componentsError && <p role="alert">{componentsError}</p>}
        {destinationError && <p role="alert">{destinationError}</p>}
        <p className="note">A validação verifica os casos e os destinos sem gravar nada. Ao clicar em Gravar, a criação e a associação começam imediatamente.</p>
        <button className="app-action" type="button" disabled={!canValidate} onClick={()=>{void validatePublication();}}>
          {validatingPublication ? "A validar casos e destinos..." : "Validar Test Cases"}
        </button>
        {validationError && <p role="alert" style={{color:"#b42318"}}>{validationError}</p>}
        {showValidation && validatedSignature === publicationSignature && <div style={{marginTop:16,padding:16,border:"1px solid #ddd",borderRadius:9,background:"#eef2ff"}}>
          <h3>Resumo por caso de teste</h3>
          <p>{publicationSummaryMessage(publishOutcome)}</p>
          <ul>{selectedCases.map(item=><li key={item.localId} style={{marginBottom:12}}>
            <strong>{item.title}</strong><br/>
            {item.testedComponent} · {item.publicationDestination!.planName} → {item.publicationDestination!.suitePath}
          </li>)}</ul>
          <button className="app-action" type="button" disabled={publishing || publishOutcome?.published === true} onClick={()=>{void publishSelectedCases();}}>
            {publishing ? "A gravar..." : "Gravar"}
          </button>
        </div>}
      </section>}

      {publishOutcome && !publishOutcome.published && <section className="panel" aria-live="polite">
        <strong>{publishOutcome.published ? "Test Cases confirmados nas suites e na User Story" : "Gravação incompleta — consultar os resultados por caso"}</strong>
        <ul>{publishOutcome.results.map(r=><li key={r.localId} style={{marginBottom:12}}>
          <strong>{r.title}</strong><br/>{r.destination.planName} → {r.destination.suitePath}<br/>
          {publicationResultMessage(r,selectedStory?.id)} {r.error ?? ""}
        </li>)}</ul>
        <p>A ligação à User Story é confirmada na demonstração após a gravação na suite.</p>
      </section>}
      {publishError && <p role="alert">{publishError}</p>}
      {publicationUncertain && <p role="alert">Há um resultado incerto. Reconciliar com o Azure antes de repetir a gravação.</p>}

      {confirmedResults.length>0&&<PublicationSummaryDialog results={confirmedResults} onClose={()=>setConfirmedResults([])}/>}

      {configuringCases.length>0 && <TestCaseDestinationDialog key={configuringIds.join(":")} items={configuringCases}
        components={testedComponents} plans={plans} loading={loadingPlans} error={destinationError} onCancel={()=>setConfiguringIds([])}
        onSave={(destination,component)=>{
          if(configuringCases.some(tc=>tc.azureDevOpsId && tc.testedComponent!==component))throw new Error("Um caso já criado na demonstração mantém o seu Tested Component. Conclui a associação antes de o alterar na demonstração.");
          const updated=assignDestination(cases,configuringIds,destination).map(tc=>configuringIds.includes(tc.localId)?{...tc,testedComponent:component,testedSubcomponent:""}:tc);
          setCases(updated);
          setSelectedCaseIds(current=>Array.from(new Set([...current,...configuringIds])));
          setShowValidation(false);setValidatedSignature("");setValidationError("");setConfiguringIds([]);
        }}/>} 

      {newCase&&<TestCaseEditDialog key={newCase.localId} item={newCase} saveError={manualError} onCancel={()=>setNewCase(null)}
        onSave={(updated)=>{
          try {addManualCase(updated);setNewCase(null);setShowValidation(false);setValidatedSignature("");
          }catch(error){setManualError(error instanceof Error?error.message:"Não foi possível guardar o caso.");}
        }}/>}

      {editingCase&&<TestCaseEditDialog key={editingCase.localId} item={editingCase} onCancel={()=>setEditingId(null)}
        onSave={(updated)=>{
          updateCase(updated.localId,updated);setShowValidation(false);setEditingId(null);
        }}/>} 
    </fieldset>
  );
}


