import {test} from "node:test";
import assert from "node:assert/strict";
import {upcomingSprintRows,selectableSprintStarts} from "../src/services/dashboardActivity.js";
import {compactDrafts} from "../src/services/refinementStorage.js";
import type {RefinementEntry} from "../src/models/refinement.js";
test("dashboard mostra sprint atual e duas futuras sem periodos anteriores a referencia",()=>{
 const now="2025-01-10T12:00:00Z";
 assert.deepEqual(upcomingSprintRows([],"2025-01-01","all",now).map(row=>row.start),["2025-01-01","2025-01-16","2025-01-31"]);
 assert.deepEqual(selectableSprintStarts("2025-01-01",now),["2025-01-01","2025-01-16","2025-01-31"]);
 assert.equal(upcomingSprintRows([],"2025-01-01","2025-01-16",now)[0]?.start,"2025-01-16");
});
test("arquivo compacto conserva IDs e rascunhos sem duplicar passos confirmados",()=>{
 const entry={story:{id:1},cases:[{localId:"draft",steps:[{action:"login"}]}],publishedCases:[{localId:"saved",title:"T",azureDevOpsId:2,publishedPlanId:3,publishedSuiteId:4,description:"large",steps:[{action:"large"}]}]} as unknown as RefinementEntry;
 const compact=compactDrafts([entry])[0]!;
 assert.equal(compact.cases,entry.cases);
 assert.equal(compact.publishedCases?.[0]?.azureDevOpsId,2);
 assert.equal("steps" in compact.publishedCases![0]!,false);
 assert.equal("description" in compact.publishedCases![0]!,false);
 assert.equal("steps" in entry.publishedCases![0]!,true);
});
