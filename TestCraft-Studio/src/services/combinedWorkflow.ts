import {parseAssistantResponse} from "../utils/jsonParser.js";
import type {RefinementQuestion} from "../models/refinement.js";
import type {WorkItem} from "../models/types.js";

export function parseCombinedResponse(input:string,types:string[]) {
  const parsed=parseAssistantResponse(input);
  if(parsed.testCases.some(tc=>!types.includes(tc.testType)))throw new Error("A resposta contém um Test Type não permitido.");
  if(parsed.questions.some(q=>!q.trim()))throw new Error("As questões não podem estar vazias.");
  return {testCases:parsed.testCases.map(tc=>({...tc,reviewStatus:"draft" as const})),questions:[...new Set(parsed.questions.map(q=>q.trim()))]};
}
export function mergeRefinementQuestions(texts:string[],previous:RefinementQuestion[]):RefinementQuestion[] {
  const next=texts.map(text=>({...previous.find(q=>q.text===text),text,answer:previous.find(q=>q.text===text)?.answer??""}));
  // Preserve prior answers even when the AI no longer repeats their question.
  return [...next,...previous.filter(q=>!texts.includes(q.text)&&q.answer.trim())];
}
export function withAnsweredNotes(story:WorkItem,questions:RefinementQuestion[]):WorkItem {
  const current=new Set(questions.map(q=>q.text));
  return {...story,refinementNotes:[...(story.refinementNotes??[]).filter(q=>!current.has(q.question)),
    ...questions.filter(q=>q.answer.trim()&&!q.notApplicable&&q.includeInStory!==false).map(q=>({question:q.text,answer:q.answer.trim()}))]};
}
