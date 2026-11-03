import type {RefinementEntry,RefinementQuestion} from "../models/refinement.js";
import type {WorkItem} from "../models/types.js";
import {withAnsweredNotes} from "./combinedWorkflow.js";
export function relevantAnswerSignature(questions:RefinementQuestion[]):string {
 return JSON.stringify(questions.filter(q=>!q.notApplicable&&q.answer.trim()).map(q=>[q.text,q.answer.trim()]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
export function needsStoryRefresh(entry:RefinementEntry):boolean {
 const signature=relevantAnswerSignature(entry.questions);
 return signature!=="[]"&&signature!==(entry.storyRefreshSignature??"[]");
}
export function mergeRefreshedStory(entry:RefinementEntry,remote:WorkItem,signature:string):RefinementEntry {
 if(remote.id!==entry.story.id||typeof remote.title!=="string"||!remote.title.trim()||remote.workItemType!=="User Story")throw new Error("A resposta da demonstração não corresponde à User Story pedida.");
 return {...entry,story:withAnsweredNotes({...remote,refinementNotes:entry.story.refinementNotes??[]},entry.questions),storyRefreshSignature:signature,updatedAt:new Date().toISOString()};
}
