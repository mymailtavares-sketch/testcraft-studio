import {ACTIVITY_KEY,loadActivity,migrateActivity,addActivities,caseActivity,savedActivity} from "./dashboardActivity";
import type {DashboardActivity} from "./dashboardActivity";
import {recordPublication} from "./publicationProgress";
import type {CasePublicationResult} from "./casePublication";
import {syncReviewDrafts} from "./reviewDraftState";
import {needsStoryRefresh,relevantAnswerSignature,mergeRefreshedStory} from "./storyRefresh";
import allowedTestTypes from "../utils/testTypes.json";
import {parseCombinedResponse, mergeRefinementQuestions, withAnsweredNotes} from "./combinedWorkflow";
import {appendManualTestCase} from "./manualTestCase";
import { useEffect, useRef, useState } from "react";
import type { WorkItem, TestCase, TestStep } from "../models/types";
import {
  buildAssistantPrompt,
  DEFAULT_PROMPT,
  loadPromptInstructions,
  PROMPT_STORAGE_KEY,
  loadQuestionPromptInstructions, QUESTION_PROMPT_STORAGE_KEY,
} from "./promptService";

import type {
  RefinementEntry,
  PublishedEntry,
  RefinementStatus,
  RefinementQuestion,
} from "../models/refinement";
import {
  loadDrafts,
  loadPublished,
  saveDrafts,
  savePublished,
} from "./refinementStorage";

export function useAppController() {
  const [userStoryId, setUserStoryId] = useState("");
  const [selectedStory, setSelectedStory] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptInstructions, setPromptInstructions] = useState<string>(() => {
    try {
      return loadPromptInstructions();
    } catch {
      return DEFAULT_PROMPT;
    }
  });
  const [workflowMode, setWorkflowMode] = useState<"questions" | "testCases" | null>(null);
  const [questionPromptInstructions, setQuestionPromptInstructions] = useState(loadQuestionPromptInstructions);
  const [selectedTestTypes, setSelectedTestTypes] = useState<string[]>([]);
  const [testTypesOpen, setTestTypesOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const responseInputs = useRef<Record<number,string>>({});
  const [cases, setCases] = useState<TestCase[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [jsonError, setJsonError] = useState("");
  const [jsonMessage, setJsonMessage] = useState("");
  const [openCase, setOpenCase] = useState<string | null>(null);
  const [screen, setScreen] = useState<
    "dashboard" | "import" | "refinement" | "review" | "library" | "history" | "pending"
  >("dashboard");
  const [reviewResumeRequest,setReviewResumeRequest]=useState<{storyId:number;localId:string}|null>(null);
  const [drafts, setDrafts] = useState<RefinementEntry[]>(loadDrafts);
  const draftsRef=useRef(drafts);draftsRef.current=drafts;
  const selectedStoryRef=useRef(selectedStory?.id);selectedStoryRef.current=selectedStory?.id;
  const refreshLock=useRef(false);
  const [refreshingStoryId,setRefreshingStoryId]=useState<number|null>(null);
  const [storyRefreshFeedback,setStoryRefreshFeedback]=useState<{storyId:number;message:string;error:boolean}|null>(null);
  const [published, setPublished] = useState<PublishedEntry[]>(loadPublished);
  const [activityStorageError,setActivityStorageError]=useState("");
  const [activity,setActivity]=useState<DashboardActivity[]>(()=>{try{return loadActivity(drafts,published);}catch{return migrateActivity(drafts,published);}});
  const activityRef=useRef(activity);activityRef.current=activity;
  const activityWritable=useRef(true);
  useEffect(()=>{
    try{loadActivity(drafts,published);}catch(error){activityWritable.current=false;setActivityStorageError(error instanceof Error?error.message:"Não foi possível ler o histórico de atividade.");}
    // Apenas o novo histórico é persistido; os rascunhos existentes não são migrados nem substituídos.
    try{if(activityWritable.current){
      const previous=localStorage.getItem(ACTIVITY_KEY);const backupKey=ACTIVITY_KEY+"-legacy-backup";
      if(previous&&activityRef.current.some(event=>event.sprint)&&localStorage.getItem(backupKey)===null)localStorage.setItem(backupKey,previous);
      localStorage.setItem(ACTIVITY_KEY,JSON.stringify(activityRef.current));
    }}catch{setActivityStorageError("Não foi possível guardar as métricas neste navegador.");}
  },[]);
  function recordActivity(incoming:DashboardActivity[]){
    const known=new Set(activityRef.current.map(event=>event.id));
    const next=addActivities(activityRef.current,incoming.filter(event=>!known.has(event.id)));activityRef.current=next;setActivity(next);
    try{if(activityWritable.current)localStorage.setItem(ACTIVITY_KEY,JSON.stringify(next));}catch{setActivityStorageError("Não foi possível guardar as métricas neste navegador.");}
  }
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);
  useEffect(() => {
    savePublished(published);
  }, [published]);
  // Sincroniza as edições do ecrã de revisão com a US guardada.
  useEffect(() => {
    if (screen !== "review" || activeDraftId === null) return;
    setDrafts(current=>syncReviewDrafts(current,activeDraftId,cases,questions));
  }, [cases, questions, screen, activeDraftId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROMPT_STORAGE_KEY, promptInstructions);
    } catch {
      /* Armazenamento local indisponível; edição continua nesta sessão. */
    }
  }, [promptInstructions]);

  useEffect(() => {
    try {window.localStorage.setItem(QUESTION_PROMPT_STORAGE_KEY, questionPromptInstructions);}
    catch { /* A edição permanece nesta sessão. */ }
  }, [questionPromptInstructions]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen]);

  useEffect(() => {
    if (screen !== "review" || !openCase) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`case-header-${openCase}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openCase, screen]);

  const isValid =
    /^[1-9]\d{0,9}$/.test(userStoryId) && Number(userStoryId) <= 2147483647;

  async function handleImport() {
    if (!isValid || loading) return;
    setLoading(true);
    setError("");
    setCopyMessage("");
    setShowPrompt(false);
    if(selectedStory) responseInputs.current[selectedStory.id]=jsonInput;

    try {
      const response = await fetch(`/api/workitems/${userStoryId}`);
      if (!response.ok) {
        const detail=await response.json().catch(()=>null);
        throw new Error(typeof detail?.error==="string"?detail.error:`Não foi possível importar a User Story (HTTP ${response.status}).`);
      }
      const data: WorkItem = await response.json();
      if (!data.id || !data.title) {
        throw new Error("A resposta da demonstração DevOps está incompleta.");
      }
      const existing=drafts.find(d=>d.story.id===data.id);
      const story=withAnsweredNotes({...data,refinementNotes:existing?.story.refinementNotes??[]},existing?.questions??[]);
      const entry:RefinementEntry={...existing,story,cases:existing?.cases??[],questions:existing?.questions??[],status:existing?.status??"Por refinar",updatedAt:new Date().toISOString()};
      persistWorkflowEntry(entry);
      if(!existing)recordActivity([{id:`imported:${story.id}`,storyId:story.id,kind:"imported",at:new Date().toISOString()}]);
      setSelectedStory(story);setCases(structuredClone(entry.cases));setQuestions(entry.questions.map(q=>q.text));
      setJsonInput(responseInputs.current[data.id]??"");setJsonError("");setJsonMessage("");setOpenCase(null);
      setWorkflowMode("testCases");
      setUserStoryId("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao importar a User Story.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetResponse() {
    setCases([]);
    setQuestions([]);
    setJsonInput("");
    setJsonError("");
    setJsonMessage("");
    setOpenCase(null);
    setScreen("import");
  }

  function persistWorkflowEntry(entry:RefinementEntry) {
    const next=[...drafts.filter(d=>d.story.id!==entry.story.id),entry];
    saveDrafts(next);setDrafts(next);setActiveDraftId(entry.story.id);
  }

  function addManualCase(item:TestCase) {
    if(!selectedStory)throw new Error("Importa uma User Story antes de acrescentar um caso.");
    const existing=drafts.find(d=>d.story.id===selectedStory.id);
    const nextCases=appendManualTestCase(activeDraftId===selectedStory.id?cases:(existing?.cases??cases),item);
    const entry:RefinementEntry={...existing,story:selectedStory,cases:nextCases,
      questions:activeDraftId!==selectedStory.id&&existing?existing.questions:questions.map(text=>({...existing?.questions.find(q=>q.text===text),text,answer:existing?.questions.find(q=>q.text===text)?.answer??""})),
      status:existing?.status??"Por refinar",updatedAt:new Date().toISOString()};
    persistWorkflowEntry(entry);recordActivity([caseActivity(selectedStory.id,item.localId,new Date().toISOString())]);setCases(nextCases);setQuestions(entry.questions.map(q=>q.text));
  }

  function chooseWorkflow(mode:"questions"|"testCases") {
    setWorkflowMode(mode);setJsonInput("");setJsonError("");setJsonMessage("");setCopyMessage("");setShowPrompt(false);
  }

  function handleParseResponse() {
    setJsonError("");setJsonMessage("");
    if(!selectedStory) {setJsonError("Importa a User Story primeiro.");return;}
    try {
      const existing=drafts.find(d=>d.story.id===selectedStory.id);
      const parsed=parseCombinedResponse(jsonInput,allowedTestTypes);
      const nextQuestions=mergeRefinementQuestions(parsed.questions,existing?.questions??[]);
      const entry:RefinementEntry={...existing,story:selectedStory,cases:parsed.testCases,questions:nextQuestions,
        status:nextQuestions.some(q=>!q.answer.trim()&&!q.notApplicable)?"Por refinar":"Refinada",
        workflowMode:"testCases",testsOutdated:false,updatedAt:new Date().toISOString()};
      persistWorkflowEntry(entry);recordActivity(entry.cases.map(tc=>caseActivity(selectedStory.id,tc.localId,new Date().toISOString())));setCases(entry.cases);setQuestions(entry.questions.map(q=>q.text));
      setOpenCase(null);setScreen("review");
    } catch(error) {setJsonError(error instanceof Error?error.message:"Não foi possível interpretar a resposta.");}
  }

  function openRefinement(storyId:number) {
    setJsonInput("");setJsonError("");setJsonMessage("");setCopyMessage("");setShowPrompt(false);
    const entry=drafts.find(d=>d.story.id===storyId);if(!entry)return;
    setSelectedStory(entry.story);setUserStoryId(String(storyId));setCases(structuredClone(entry.cases));
    setQuestions(entry.questions.map(q=>q.text));setActiveDraftId(storyId);setWorkflowMode("questions");setScreen("refinement");
  }

  function completeRefinement(storyId:number) {
    const entry=drafts.find(d=>d.story.id===storyId);if(!entry)throw new Error("Rascunho não encontrado.");
    const story=withAnsweredNotes(entry.story,entry.questions);
    persistWorkflowEntry({...entry,story,status:"Refinada",questionsCompleted:true,workflowMode:"testCases",updatedAt:new Date().toISOString()});
    setSelectedStory(story);setWorkflowMode("testCases");setScreen("library");
  }

  function updateQuestionOptions(storyId:number,index:number,patch:Pick<RefinementQuestion,"notApplicable"|"includeInStory"|"affectsStory">) {
    setStoryRefreshFeedback(null);
    setDrafts(current=>current.map(entry=>{
      if(entry.story.id!==storyId)return entry;
      const questions=entry.questions.map((q,i)=>i===index?{...q,...patch}:q);
      return {...entry,questions,questionsCompleted:false,testsOutdated:entry.testsOutdated===true||needsStoryRefresh({...entry,questions}),status:"Por refinar",updatedAt:new Date().toISOString()};
    }));
  }

  async function refreshStory(storyId:number) {
    const entry=draftsRef.current.find(d=>d.story.id===storyId);
    if(!entry||!needsStoryRefresh(entry)||refreshLock.current)return;
    const signature=relevantAnswerSignature(entry.questions);
    refreshLock.current=true;setRefreshingStoryId(storyId);setStoryRefreshFeedback(null);
    try {
      const response=await fetch(`/api/workitems/${storyId}`);
      if(!response.ok)throw new Error(`Não foi possível atualizar a US #${storyId} (HTTP ${response.status}).`);
      const remote:WorkItem=await response.json();
      const latest=draftsRef.current.find(d=>d.story.id===storyId);
      if(!latest)return;
      const updated=mergeRefreshedStory(latest,remote,signature);
      const next=draftsRef.current.map(d=>d.story.id===storyId?updated:d);
      saveDrafts(next);draftsRef.current=next;setDrafts(next);
      if(selectedStoryRef.current===storyId)setSelectedStory(updated.story);
      setStoryRefreshFeedback({storyId,message:`US #${storyId} — atualização efetuada com sucesso.`,error:false});
    }catch(error){setStoryRefreshFeedback({storyId,message:error instanceof Error?error.message:"Não foi possível atualizar a US.",error:true});}
    finally{refreshLock.current=false;setRefreshingStoryId(null);}
  }

  function deletePendingCase(storyId:number,localId:string) {
    const current=draftsRef.current;
    if(!current.some(entry=>entry.story.id===storyId&&entry.cases.some(item=>item.localId===localId)))return;
    const next=current.map(entry=>entry.story.id===storyId?{...entry,cases:entry.cases.filter(item=>item.localId!==localId),updatedAt:new Date().toISOString()}:entry);
    saveDrafts(next);draftsRef.current=next;setDrafts(next);
    if(selectedStoryRef.current===storyId)setCases(next.find(entry=>entry.story.id===storyId)?.cases??[]);
  }

  function savePublicationResult(storyId:number,result:CasePublicationResult) {
    const next=draftsRef.current.map(entry=>entry.story.id===storyId?recordPublication(entry,result):entry);
    saveDrafts(next);draftsRef.current=next;setDrafts(next);
    if(result.status==="suiteLinked"&&result.storyLinked===true&&result.azureDevOpsId)recordActivity([savedActivity(storyId,result.azureDevOpsId,new Date().toISOString())]);
    if(selectedStoryRef.current===storyId){const entry=next.find(entry=>entry.story.id===storyId);if(entry)setCases(entry.cases);}
  }

  function updateCase(localId: string, patch: Partial<TestCase>) {
    setCases((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    );
  }

  function updateStep(
    localId: string,
    index: number,
    key: keyof TestStep,
    value: string,
  ) {
    setCases((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              steps: item.steps.map((step, j) =>
                j === index ? { ...step, [key]: value } : step,
              ),
            }
          : item,
      ),
    );
  }

  function saveForRefinement() {
    if (!selectedStory) return;
    if (published.some((item) => item.storyId === selectedStory.id)) {
      window.alert("Esta US já consta do histórico de publicação.");
      return;
    }
    const now = new Date().toISOString();
    const existing = drafts.find((item) => item.story.id === selectedStory.id);
    const entry: RefinementEntry = {
      ...existing,
      story: selectedStory,
      cases: structuredClone(cases),
      questions: questions.map((text) => ({
        ...existing?.questions.find((q) => q.text === text),
        text,
        answer: existing?.questions.find((q) => q.text === text)?.answer ?? "",
      })),
      status: existing?.status ?? "Por refinar",
      updatedAt: now,
    };
    const next = [
      ...drafts.filter((item) => item.story.id !== selectedStory.id),
      entry,
    ];
    try {
      saveDrafts(next);
      setDrafts(next);
      setActiveDraftId(selectedStory.id);
      setScreen("library");
    } catch {
      window.alert(
        "Não foi possível guardar a US no navegador. Exporta os dados antes de continuar.",
      );
    }
  }

  function openDraft(storyId: number) {
    const entry = drafts.find((item) => item.story.id === storyId);
    if (!entry) return;
    setJsonInput("");setJsonError("");setJsonMessage("");setCopyMessage("");setShowPrompt(false);
    setSelectedStory(entry.story);
    setUserStoryId(String(entry.story.id));
    setCases(structuredClone(entry.cases));
    setQuestions(entry.questions.map((q) => q.text));
    setOpenCase(null);
    setActiveDraftId(storyId);
    setWorkflowMode("testCases");
    setSelectedTestTypes(current=>current.length?current:[...new Set(entry.cases.map(tc=>tc.testType))]);
    setScreen(entry.cases.length ? "review" : "refinement");
  }

  function deleteDraft(storyId: number) {
    const next = drafts.filter((item) => item.story.id !== storyId);
    if (next.length === drafts.length) return;
    // Persistir antes de atualizar o estado: não eliminar da interface se falhar.
    saveDrafts(next);
    setDrafts(next);
    delete responseInputs.current[storyId];
    if (activeDraftId === storyId || selectedStory?.id === storyId) {
      setJsonInput("");setJsonError("");setJsonMessage("");setCopyMessage("");setShowPrompt(false);
      setActiveDraftId(null);
      setSelectedStory(null);
      setCases([]);
      setQuestions([]);
    }
  }

  function updateDraftQuestion(storyId: number, index: number, text: string) {
    setDrafts((current) =>
      current.map((entry) =>
        entry.story.id === storyId
          ? {
              ...entry,
              questions: entry.questions.map((q, i) =>
                i === index ? { ...q, text } : q,
              ),
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
  }

  function deleteDraftQuestion(storyId: number, index: number) {
    setDrafts((current) =>
      current.map((entry) =>
        entry.story.id === storyId
          ? {
              ...entry,
              questions: entry.questions.filter((_, i) => i !== index),
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
  }

  function answerDraftQuestion(storyId: number, index: number, answer: string) {
    setStoryRefreshFeedback(null);
    setDrafts((current) =>
      current.map((entry) =>
        entry.story.id === storyId
          ? {
              ...entry,
              questions: entry.questions.map((q, i) =>
                i === index ? { ...q, answer, notApplicable:false, includeInStory:true } : q,
              ),
              questionsCompleted:false,
              testsOutdated:entry.testsOutdated===true || (Boolean(answer.trim()) && entry.questions[index]?.answer !== answer),
              status:"Por refinar",
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
  }

  function changeDraftStatus(storyId: number, status: RefinementStatus) {
    setDrafts((current) =>
      current.map((entry) =>
        entry.story.id === storyId
          ? { ...entry, status, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
  }

  function confirmPublication(storyId: number, testCaseIds: number[]) {
    const entry = drafts.find((item) => item.story.id === storyId);
    if (!entry) throw new Error("User Story não encontrada nos rascunhos.");
    if (published.some((item) => item.storyId === storyId)) {
      throw new Error("Esta User Story já consta do histórico.");
    }
    if (entry.status !== "Refinada")
      throw new Error("A US ainda não está refinada.");
    if (entry.questions.some((q) => !q.notApplicable && !q.answer.trim())) {
      throw new Error("Existem questões de Refinement sem resposta.");
    }
    if (
      entry.cases.length === 0 ||
      testCaseIds.length !== entry.cases.length ||
      testCaseIds.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
      new Set(testCaseIds).size !== testCaseIds.length
    ) {
      throw new Error(
        "É necessário indicar um ID válido e distinto por Test Case.",
      );
    }
    const history: PublishedEntry = {
      storyId,
      storyTitle: entry.story.title,
      testCaseIds: [...testCaseIds],
      publishedAt: new Date().toISOString(),
    };
    const nextPublished = [...published, history];
    const nextDrafts = drafts.filter((item) => item.story.id !== storyId);
    // Primeiro persiste o histórico; só depois remove a US dos pendentes.
    savePublished(nextPublished);
    saveDrafts(nextDrafts);
    recordActivity(testCaseIds.map(id=>savedActivity(storyId,id,history.publishedAt)));
    setPublished(nextPublished);
    setDrafts(nextDrafts);
    if (activeDraftId === storyId) setActiveDraftId(null);
  }

  const activeEntry=drafts.find(d=>d.story.id===selectedStory?.id);
  const testsOutdated=activeEntry?.testsOutdated===true;
  const hasPendingStoryRefresh=drafts.some(needsStoryRefresh);
  const storyNeedsRefresh=Boolean(activeEntry&&needsStoryRefresh(activeEntry));
  const preparedPrompt = selectedStory
    ? buildAssistantPrompt(withAnsweredNotes(selectedStory,activeEntry?.questions??[]),allowedTestTypes,promptInstructions,true) : "";

  function selectImportStory(storyId:number) {
    const entry=drafts.find(d=>d.story.id===storyId);if(!entry)return;
    if(selectedStory)responseInputs.current[selectedStory.id]=jsonInput;
    setSelectedStory(entry.story);setCases(structuredClone(entry.cases));setQuestions(entry.questions.map(q=>q.text));
    setActiveDraftId(storyId);setJsonInput(storyId===selectedStory?.id?jsonInput:responseInputs.current[storyId]??"");
    setJsonError("");setJsonMessage("");setCopyMessage("");setShowPrompt(false);setWorkflowMode("testCases");
  }
  async function copyImportedStory(storyId:number) {
    const entry=drafts.find(d=>d.story.id===storyId);if(!entry)return;
    selectImportStory(storyId);
    const prompt=buildAssistantPrompt(withAnsweredNotes(entry.story,entry.questions),allowedTestTypes,promptInstructions,true);
    try {await navigator.clipboard.writeText(prompt);setCopyMessage("Pedido copiado para assistente de IA.");}
    catch {setShowPrompt(true);setCopyMessage("Seleciona e copia o pedido apresentado abaixo.");}
  }

  async function handleCopyPrompt() {
    if(!preparedPrompt)return;
    try {await navigator.clipboard.writeText(preparedPrompt);setCopyMessage("Pedido copiado para colar no assistente de IA.");}
    catch {setShowPrompt(true);setCopyMessage("Seleciona e copia o pedido apresentado abaixo.");}
  }

  return {
    deletePendingCase,reviewResumeRequest,setReviewResumeRequest,
    resumePendingCase:(storyId:number,localId:string)=>{selectImportStory(storyId);setReviewResumeRequest({storyId,localId});setScreen("review");},
    activity,activityStorageError,hasPendingStoryRefresh,storyNeedsRefresh,needsStoryRefresh,refreshStory,refreshingStoryId,storyRefreshFeedback,selectImportStory,copyImportedStory,testsOutdated,workflowMode,chooseWorkflow,questionPromptInstructions,setQuestionPromptInstructions,preparedPrompt,
    addManualCase,openRefinement,completeRefinement,updateQuestionOptions,
    drafts,
    published,
    saveForRefinement,
    openDraft,
    deleteDraft,
    updateDraftQuestion,
    deleteDraftQuestion,
    answerDraftQuestion,
    changeDraftStatus,
    confirmPublication,
    userStoryId,
    setUserStoryId,
    selectedStory,
    setSelectedStory,
    loading,
    error,
    setError,
    copyMessage,
    setCopyMessage,
    showPrompt,
    setShowPrompt,
    promptInstructions,
    setPromptInstructions,
    selectedTestTypes,
    setSelectedTestTypes,
    testTypesOpen,
    setTestTypesOpen,
    jsonInput,
    setJsonInput,
    cases,
    setCases,
    questions,
    setQuestions,
    jsonError,
    jsonMessage,
    openCase,
    setOpenCase,
    screen,
    setScreen,
    isValid,
    handleImport,
    resetResponse,
    handleParseResponse,
    updateCase,savePublicationResult,
    updateStep,
    handleCopyPrompt,
  };
}


