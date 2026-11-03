import type { PublicationDestination, TestCase } from "../models/types.js";

export type PublicationGroup = {destination: PublicationDestination; cases: TestCase[]};
export type CasePublicationResult = {
  localId: string;
  title: string;
  destination: PublicationDestination;
  status: "suiteLinked" | "needsReview" | "invalid" | "notProcessed";
  azureDevOpsId?: number;
  storyLinked?: boolean;
  error?: string;
};
export type PublicationFetch = (url: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;
const fieldValidationTimes=new Map<string,number>();
function fieldValidationKey(storyId:number,destination:PublicationDestination,item:TestCase){return `${storyId}:${destination.planId}:${destination.suiteId}:${item.localId}`;}
function markFieldValidation(storyId:number,group:PublicationGroup){
 for(const item of group.cases)fieldValidationTimes.set(fieldValidationKey(storyId,group.destination,item),Date.now());
 while(fieldValidationTimes.size>512)fieldValidationTimes.delete(fieldValidationTimes.keys().next().value!);
}
async function refreshPendingFields(storyId:number,group:PublicationGroup,fetcher:PublicationFetch){
 const {planId,suiteId}=group.destination;
 const {response,data}=await post(fetcher,"/api/testcases/validate-fields",{storyId,planId,suiteId,cases:group.cases});
 if(!response.ok||data.validated!==true||data.dryRun!==true||data.published!==false)throw new Error(String(data.error??"Não foi possível renovar a validação dos casos pendentes."));
 markFieldValidation(storyId,group);
}


export function groupCasesByDestination(cases: TestCase[]): PublicationGroup[] {
  if (cases.length < 1) throw new Error("Seleciona pelo menos um caso para gravar.");
  const ids = new Set<string>();
  const groups = new Map<string, PublicationGroup>();
  for (const item of cases) {
    if (!item.localId || ids.has(item.localId)) throw new Error("A seleção contém casos repetidos ou sem identificação.");
    ids.add(item.localId);
    if(!item.testedComponent.trim())throw new Error(`Escolhe o Tested Component na modal de «${item.title}».`);
    const d = item.publicationDestination;
    if (!d || !Number.isInteger(d.planId) || d.planId <= 0 || !Number.isInteger(d.suiteId) || d.suiteId <= 0) {
      throw new Error(`Escolhe a biblioteca e a suite de «${item.title}».`);
    }
    const key = `${d.planId}:${d.suiteId}`;
    let group = groups.get(key);
    if (!group) { group = {destination:{...d},cases:[]}; groups.set(key, group); }
    group.cases.push(item);
  }
  return [...groups.values()].flatMap(group=>{const packets:PublicationGroup[]=[];for(let index=0;index<group.cases.length;index+=20)packets.push({destination:{...group.destination},cases:group.cases.slice(index,index+20)});return packets;});
}

async function post(fetcher: PublicationFetch, route: string, body: unknown) {
  const response = await fetcher(route, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("O servidor devolveu uma resposta inesperada.");
  return {response,data:data as Record<string, unknown>};
}

export async function validatePublicationGroups(storyId: number, groups: PublicationGroup[], fetcher: PublicationFetch = fetch) {
  for (const group of groups) {
    const {planId,suiteId,planName} = group.destination;
    const body = {storyId,planId,suiteId,cases:group.cases};
    for (const route of ["/api/testcases/validate-publication", "/api/testcases/validate-fields"]) {
      const {response,data} = await post(fetcher, route, body);
      if (!response.ok || data.validated !== true || data.dryRun !== true || data.published !== false) {
        throw new Error(`${planName}: ${String(data.error ?? "Não foi possível validar os casos e o destino.").split("allowedValues:")[0]!.trim()}`);
      }
      if (route.endsWith("validate-publication") && (data.planId !== planId || data.suiteId !== suiteId || typeof data.suiteType !== "string" || !/^(StaticTestSuite|Static)$/i.test(data.suiteType))) {
        throw new Error(`${planName}: escolhe uma Test Suite estática válida.`);
      }
      if(route.endsWith("validate-fields"))markFieldValidation(storyId,group);
    }
  }
}

export async function publishPublicationGroups(storyId: number, groups: PublicationGroup[], fetcher: PublicationFetch = fetch, onResult?:(result:CasePublicationResult)=>void) {
  const results: CasePublicationResult[] = [];
  let stopped = false;
  const startedAt=Date.now();
  const requests=groups.flatMap(group=>group.cases.map(item=>({...group,cases:[item]})));
  for(let index=0;index<requests.length;index++){
    const group=requests[index]!;
    if (stopped) {
      const skipped=group.cases.map(item => ({localId:item.localId,title:item.title,destination:{...group.destination},status:"notProcessed" as const,error:"Não processado porque a gravação anterior não foi concluída."}));
      results.push(...skipped);for(const result of skipped)onResult?.(result);
      continue;
    }
    const validatedAt=fieldValidationTimes.get(fieldValidationKey(storyId,group.destination,group.cases[0]!))??startedAt;
    if(Date.now()-validatedAt>=240000){
      const remaining=requests.slice(index).filter(item=>item.destination.planId===group.destination.planId&&item.destination.suiteId===group.destination.suiteId).flatMap(item=>item.cases).slice(0,20);
      try{await refreshPendingFields(storyId,{destination:group.destination,cases:remaining},fetcher);}
      catch(error){
        const item=group.cases[0]!;
        const failed:CasePublicationResult={localId:item.localId,title:item.title,destination:{...group.destination},status:"invalid",error:`Validação não renovada. Este caso não foi enviado para criação. ${error instanceof Error?error.message:"Tenta validar novamente."}`};
        results.push(failed);onResult?.(failed);stopped=true;continue;
      }
    }
    try {
      const {planId,suiteId} = group.destination;
      const {response,data} = await post(fetcher,"/api/testcases/publish",{storyId,planId,suiteId,cases:group.cases,confirm:"PUBLICAR_NA_SUITE",addToSuite:true,linkToStory:true});
      if (!response.ok && response.status !== 207) throw new Error(String(data.error ?? `Erro HTTP ${response.status}.`));
      if (!Array.isArray(data.results)) throw new Error("A resposta de gravação não contém resultados por caso.");
      const allowedIds = new Set(group.cases.map(item => item.localId));
      const byId = new Map<string, Record<string,unknown>>();
      for (const value of data.results as unknown[]) {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Resultado de gravação inválido.");
        const r = value as Record<string,unknown>;
        if (typeof r.localId !== "string" || !allowedIds.has(r.localId) || byId.has(r.localId)) throw new Error("O servidor devolveu IDs locais inesperados ou repetidos.");
        byId.set(r.localId,r);
      }
      let groupIncomplete = false;
      const groupResults: CasePublicationResult[] = [];
      for (const item of group.cases) {
        const r = byId.get(item.localId);
        let status: CasePublicationResult["status"];
        let error = typeof r?.error === "string" ? r.error : undefined;
        const validId = typeof r?.azureDevOpsId === "number" && Number.isInteger(r.azureDevOpsId) && r.azureDevOpsId > 0;
        if (r?.status === "storyLinked" && r.storyLinked === true && r.suiteLinked === true && validId) status="suiteLinked";
        else if (r?.status === "invalid") {status="invalid";groupIncomplete=true;}
        else if (!r && groupIncomplete) {status="notProcessed";error="O servidor interrompeu este destino antes de processar o caso.";}
        else {status="needsReview";groupIncomplete=true;error ??= "Não foi possível confirmar a suite e a ligação deste caso à US. Reconciliar antes de repetir.";}
        groupResults.push({localId:item.localId,title:item.title,destination:{...group.destination},status,storyLinked:status==="suiteLinked",
          ...(validId ? {azureDevOpsId:r!.azureDevOpsId as number} : {}), ...(error ? {error} : {})});
      }
      results.push(...groupResults);
      for(const result of groupResults)onResult?.(result);
      stopped = groupIncomplete;
    } catch (error) {
      const failed=group.cases.map(item => ({localId:item.localId,title:item.title,destination:{...group.destination},status:"needsReview" as const,
        error:(error instanceof Error ? error.message : "Erro de gravação.") + " Resultado incerto: reconciliar antes de repetir."}));
      results.push(...failed);for(const result of failed)onResult?.(result);
      stopped = true;
    }
  }
  return {published:results.length > 0 && results.every(r => r.status === "suiteLinked"), results};
}
