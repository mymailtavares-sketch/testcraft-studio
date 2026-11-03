import type {WorkItem, TestCase} from "../models/types.js";
import type {RefinementQuestion} from "../models/refinement.js";
import {parseAssistantResponse} from "../utils/jsonParser.js";

function readJson(input:string):Record<string,unknown> {
  const text=input.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  const result:unknown=JSON.parse(text);
  if(!result || typeof result!=="object" || Array.isArray(result)) throw new Error("A resposta deve ser um objeto JSON.");
  return result as Record<string,unknown>;
}
export function parseQuestionsOnly(input:string):string[] {
  const result=readJson(input);
  if(result.testCases!==undefined && (!Array.isArray(result.testCases) || result.testCases.length>0)) throw new Error("Este percurso aceita apenas questões, sem casos de teste.");
  if(!Array.isArray(result.questions) || !result.questions.every(q=>typeof q==="string" && q.trim())) throw new Error("Esperado: questions com uma lista de questões não vazias.");
  const questions=(result.questions as string[]).map(q=>q.trim());
  if(new Set(questions).size!==questions.length) throw new Error("A resposta contém questões repetidas.");
  return questions;
}
export function parseTestsOnly(input:string):TestCase[] {
  const raw=readJson(input);
  if(raw.questions!==undefined && (!Array.isArray(raw.questions) || raw.questions.length>0)) throw new Error("Este percurso aceita apenas casos de teste. A prompt final não deve gerar questões.");
  return parseAssistantResponse(input).testCases.map(tc=>({...tc,reviewStatus:"draft"}));
}
export function enrichStory(story:WorkItem, questions:RefinementQuestion[]):WorkItem {
  if(questions.some(q=>!q.notApplicable && !q.answer.trim())) throw new Error("Responde às questões pendentes ou marca-as como não aplicáveis.");
  const currentTexts=new Set(questions.map(q=>q.text));
  const previous=(story.refinementNotes??[]).filter(q=>!currentTexts.has(q.question));
  const approved=questions.filter(q=>!q.notApplicable && q.includeInStory!==false && q.answer.trim()).map(q=>({question:q.text,answer:q.answer.trim()}));
  return {...story,refinementNotes:[...previous,...approved]};
}
export function validateReviewedCase(tc:TestCase):string {
  if(!tc.title.trim() || tc.title.length>255 || /[\r\n]/.test(tc.title))return "O título deve ter entre 1 e 255 caracteres, sem quebras de linha.";
  if(!tc.testType.trim())return "Seleciona o tipo de teste.";
  if(![1,2,3,4].includes(tc.priority))return "Seleciona uma prioridade entre 1 e 4.";
  if(!["Manual","Automated","Planned"].includes(tc.automationStatus))return "Seleciona um estado de automação válido.";
  if(tc.steps.length<1 || tc.steps.length>100 || tc.steps.some(s=>!s.action.trim() || !s.expectedResult.trim()))return "Preenche a ação e o resultado esperado de cada passo (1 a 100 passos).";
  return "";
}
