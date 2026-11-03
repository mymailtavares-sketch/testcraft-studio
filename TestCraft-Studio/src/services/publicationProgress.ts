import type {TestCase} from "../models/types.js";
import type {RefinementEntry} from "../models/refinement.js";
import type {CasePublicationResult} from "./casePublication.js";
export function recordPublication(entry:RefinementEntry,result:CasePublicationResult):RefinementEntry {
 const item=entry.cases.find(tc=>tc.localId===result.localId);if(!item)return entry;
 if(result.status==="notProcessed"&&item.publicationAttempt?.status==="needsReview")return entry;
 const confirmed=result.status==="suiteLinked"&&result.storyLinked===true&&Boolean(result.azureDevOpsId);
 const updated:TestCase={...item,...(result.azureDevOpsId?{azureDevOpsId:result.azureDevOpsId,publishedPlanId:result.destination.planId,publishedSuiteId:result.destination.suiteId}:{})};
 if(confirmed)delete updated.publicationAttempt;
 else updated.publicationAttempt={status:result.status==="suiteLinked"?"needsReview":result.status,...(result.error?{error:result.error}:{}),at:new Date().toISOString()};
 if(!confirmed)return {...entry,cases:entry.cases.map(tc=>tc.localId===item.localId?updated:tc),updatedAt:new Date().toISOString()};
 return {...entry,cases:entry.cases.filter(tc=>tc.localId!==item.localId),publishedCases:[...(entry.publishedCases??[]).filter(tc=>tc.localId!==item.localId),{localId:updated.localId,title:updated.title,azureDevOpsId:updated.azureDevOpsId,publishedPlanId:updated.publishedPlanId,publishedSuiteId:updated.publishedSuiteId}],updatedAt:new Date().toISOString()};
}
