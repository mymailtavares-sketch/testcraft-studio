import type {TestCase} from "../models/types.js";
import type {RefinementEntry,RefinementQuestion} from "../models/refinement.js";
export function questionsWithAnswers(texts:string[],previous:RefinementQuestion[]):RefinementQuestion[]{
 return texts.map(text=>{const existing=previous.find(question=>question.text===text);return {...existing,text,answer:existing?.answer??""};});
}
export function syncReviewDrafts(current:RefinementEntry[],storyId:number,cases:TestCase[],texts:string[]):RefinementEntry[]{
 return current.map(entry=>{
  if(entry.story.id!==storyId)return entry;
  return {...entry,cases,questions:questionsWithAnswers(texts,entry.questions),updatedAt:new Date().toISOString()};
 });
}
