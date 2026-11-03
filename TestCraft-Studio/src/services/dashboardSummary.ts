import type {RefinementEntry,PublishedEntry} from "../models/refinement.js";
export function dashboardSummary(drafts:RefinementEntry[],history:PublishedEntry[]) {
 const rows=new Map<number,{storyId:number;title:string;savedIds:Set<number>;pending:number;canOpen:boolean}>();
 for(const entry of drafts){
  const savedIds=new Set((entry.publishedCases??[]).map(tc=>tc.azureDevOpsId).filter((id):id is number=>Number.isSafeInteger(id)&&Number(id)>0));
  rows.set(entry.story.id,{storyId:entry.story.id,title:entry.story.title,savedIds,pending:entry.cases.filter(tc=>!tc.azureDevOpsId||!savedIds.has(tc.azureDevOpsId)).length,canOpen:true});
 }
 for(const entry of history){
  let row=rows.get(entry.storyId);
  if(!row){row={storyId:entry.storyId,title:entry.storyTitle,savedIds:new Set(),pending:0,canOpen:false};rows.set(entry.storyId,row);}
  for(const id of entry.testCaseIds)if(Number.isSafeInteger(id)&&id>0)row.savedIds.add(id);
 }
 const stories=[...rows.values()].map(row=>({storyId:row.storyId,title:row.title,saved:row.savedIds.size,pending:(drafts.find(entry=>entry.story.id===row.storyId)?.cases??[]).filter(tc=>!tc.azureDevOpsId||!row.savedIds.has(tc.azureDevOpsId)).length,canOpen:row.canOpen})).sort((a,b)=>b.storyId-a.storyId);
 return {imported:stories.length,pending:stories.reduce((sum,row)=>sum+row.pending,0),stories};
}
