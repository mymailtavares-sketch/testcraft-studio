import type {CasePublicationResult,PublicationGroup} from "./casePublication.js";
import {groupCasesByDestination} from "./casePublication.js";
import type {TestCase,WorkItem} from "../models/types.js";
import type {PublicationIssue} from "./publicationReadiness.js";
export function selectedPublicationGroups(cases:TestCase[]):{groups:PublicationGroup[];error:string}{
 if(cases.length===0)return {groups:[],error:""};
 try{return {groups:groupCasesByDestination(cases),error:""};}
 catch(error){return {groups:[],error:error instanceof Error?error.message:"Seleção inválida."};}
}
export function allCasesSelected(cases:TestCase[],ids:string[]):boolean{return cases.length>0&&cases.every(item=>ids.includes(item.localId));}
export function canValidateSelection(story:WorkItem|null,groups:PublicationGroup[],error:string,busy:boolean,loading:boolean,issues:PublicationIssue[]):boolean{
 return Boolean(story&&groups.length>0&&!error&&!busy&&!loading&&issues.length===0);
}
export function publicationSummaryMessage(outcome:{published:boolean}|null):string{
 if(!outcome)return "Casos e destinos validados. Ainda não foi feita nenhuma gravação nesta etapa.";
 if(outcome.published)return "Gravação concluída. Consulta os resultados por caso abaixo.";
 return "Consulta os resultados abaixo antes de continuar.";
}
export function publicationResultMessage(result:CasePublicationResult,storyId:number|undefined):string{
 if(result.status==="suiteLinked")return `Test Case #${result.azureDevOpsId} confirmado nesta suite e ligado à US #${storyId}.`;
 if(result.status==="notProcessed")return "Não processado.";
 if(result.status==="invalid")return "Dados inválidos.";
 const identifier=result.azureDevOpsId?" (#"+result.azureDevOpsId+")":"";
 return "Resultado por confirmar"+identifier+".";
}
