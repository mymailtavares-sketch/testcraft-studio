import type {PublicationDestination,TestCase} from "../models/types.js";
export type TitleCategory=string;
export function mappedTitleCategory(testType:string):TitleCategory|undefined {
  const key=testType.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
  if(key==="funcional")return "UI";
  if(["ux/ui","design","design system"].includes(key))return "UX/UI";
  if(["integracao","api"].includes(key))return "API";
  return undefined;
}
const titlePrefix=/^(.+?)\s+-\s+(UI|UX\/UI|API|Funcional|Integração|Design|Design System|Aceitação|Acessibilidade|Compatibilidade|Estático|Exploratório|Fiabilidade\/Disponibilidade|Regressão|Segurança)\s+-\s+(.+)$/i;
function cleanTitleName(value:string,category?:string):string {
  let name=value.trim().replace(/\s+-\s+(NOT OK|OK)$/i,"").trim();
  if(category){const parts=name.split(" - ");if(parts.length>=3&&parts[1]?.toLocaleLowerCase()===category.toLocaleLowerCase())name=parts.slice(2).join(" - ");}
  let match=titlePrefix.exec(name);
  while(match){name=match[3]!.trim();match=titlePrefix.exec(name);}
  return name;
}
export function titleParts(tc:TestCase) {
  const match=titlePrefix.exec(tc.title.trim());
  const suffix=tc.title.trim().match(/\s+-\s+(NOT OK|OK)$/i);
  const category=tc.titleCategoryExplicit?tc.titleCategory: mappedTitleCategory(tc.testType)??tc.titleCategory??mappedTitleCategory(match?.[2]??"");
  return {name:cleanTitleName(tc.titleName??tc.title,category),
    outcome:tc.titleOutcome??(suffix?.[1]?.toUpperCase()==="NOT OK"?"NOT OK":"OK") as "OK"|"NOT OK",
    category:category??"UI"};
}
export function libraryTitleName(planName:string):string {
  const name=planName.replace(/^biblioteca\s+(?:de\s+)?testes\s*[-–:]\s*/i,"").trim();
  return name;
}
export function formatTestCaseTitle(tc:TestCase):TestCase {
  const {name,outcome,category}=titleParts(tc);
  const library=tc.publicationDestination?libraryTitleName(tc.publicationDestination.planName):"";
  const title=library?`${library} - ${category} - ${name} - ${outcome}`:name;
  return {...tc,title,titleName:name,titleOutcome:outcome,titleCategory:category};
}
export function assignDestination(cases:TestCase[],ids:string[],destination:PublicationDestination):TestCase[] {
  if(!Number.isInteger(destination.planId)||destination.planId<=0||!Number.isInteger(destination.suiteId)||destination.suiteId<=0||!destination.planName.trim()||!destination.suitePath.trim())throw new Error("Destino inválido.");
  const wanted=new Set(ids);
  if(!wanted.size || wanted.size!==ids.length || ids.some(id=>!cases.some(tc=>tc.localId===id)))throw new Error("Seleção de casos inválida.");
  const replacements=new Map<string,TestCase>();
  for(const tc of cases.filter(tc=>wanted.has(tc.localId))) {
    const updated=formatTestCaseTitle({...tc,publicationDestination:{...destination}});
    if(!updated.titleName?.trim())throw new Error(`Preenche o nome do caso «${tc.title||"Sem título"}» antes de escolher o destino.`);
    if(updated.title.length>255)throw new Error(`O título de «${updated.titleName}» ultrapassa 255 caracteres. Encurta o nome do caso.`);
    if((tc.azureDevOpsId||tc.publishedPlanId) && (tc.title!==updated.title||tc.publicationDestination?.planId!==destination.planId||tc.publicationDestination?.suiteId!==destination.suiteId))
      throw new Error(`«${tc.title}» já tem publicação registada. Esta operação não altera títulos nem destinos na demonstração.`);
    replacements.set(tc.localId,updated);
  }
  return cases.map(tc=>replacements.get(tc.localId)??tc);
}
