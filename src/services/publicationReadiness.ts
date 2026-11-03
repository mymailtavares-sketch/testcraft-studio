import type {TestCase} from "../models/types.js";
import {formatTestCaseTitle} from "./testCaseTitles.js";
import {validateReviewedCase} from "./refinementWorkflow.js";
export type PublicationIssue={localId:string;title:string;action:"edit"|"destination";message:string};
export function publicationReadiness(cases:TestCase[],components:string[]):PublicationIssue[] {
  const issues:PublicationIssue[]=[];
  for(const item of cases) {
    const add=(message:string,action:PublicationIssue["action"]="edit")=>issues.push({localId:item.localId,title:item.title||"Sem título",message,action});
    if(!components.includes(item.testedComponent))add(item.testedComponent?`Tested Component «${item.testedComponent}» não está na lista permitida.`:"Falta escolher o Tested Component no destino.","destination");
    const d=item.publicationDestination;
    if(!d||!Number.isInteger(d.planId)||d.planId<=0||!Number.isInteger(d.suiteId)||d.suiteId<=0)add("Falta confirmar a biblioteca e a suite.","destination");
    else if(item.title!==formatTestCaseTitle(item).title)add("O título ainda não está no novo formato. Volta a aplicar o destino ou revê o nome do caso.","destination");
    const invalid=validateReviewedCase(item);if(invalid)add(invalid);
  }
  return issues;
}
