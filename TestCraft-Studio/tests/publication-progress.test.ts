import {test} from "node:test";
import assert from "node:assert/strict";
import {defaultLibraryComponent} from "../src/services/libraryComponents.js";
import {recordPublication} from "../src/services/publicationProgress.js";
import {groupCasesByDestination,publishPublicationGroups} from "../src/services/casePublication.js";
import type {TestCase} from "../src/models/types.js";
import type {RefinementEntry} from "../src/models/refinement.js";
const destination={planId:101,planName:"Demo Store",suiteId:1,suitePath:"Smoke"};
const make=(i:number):TestCase=>({localId:String(i),title:"Demo Store - UI - Adicionar produto - OK",testType:"Funcional",testedComponent:"Storefront",automationStatus:"Manual",priority:2,description:"",preconditions:"",testData:"",steps:[{action:"Abrir",expectedResult:"Aberto"}],publicationDestination:destination});
test("bibliotecas demo usam apenas componentes ficticios",()=>{
 assert.equal(defaultLibraryComponent(101,["Storefront","Accounts"]),"Storefront");
 assert.equal(defaultLibraryComponent(102,["Storefront","Accounts"]),"Accounts");
 assert.equal(defaultLibraryComponent(999,["Storefront"]),"");
});
test("cinco testes sao enviados individualmente e IDs persistidos antes do pedido seguinte",async()=>{
 let entry:RefinementEntry={story:{id:123,title:"US",state:"Active",workItemType:"User Story"},cases:Array.from({length:5},(_,i)=>make(i)),questions:[],status:"Por refinar",updatedAt:""};let calls=0;
 const result=await publishPublicationGroups(123,groupCasesByDestination(entry.cases),async(_url,init)=>{
  assert.equal(entry.publishedCases?.length??0,calls);const request=JSON.parse(String(init?.body));assert.equal(request.cases.length,1);calls++;
  return Response.json({results:[{localId:request.cases[0].localId,status:"storyLinked",storyLinked:true,suiteLinked:true,azureDevOpsId:800000+calls}]});
 },result=>{entry=JSON.parse(JSON.stringify(recordPublication(entry,result)));});
 assert.equal(result.published,true);assert.equal(calls,5);assert.equal(entry.cases.length,0);assert.deepEqual(entry.publishedCases?.map(tc=>tc.azureDevOpsId),[800001,800002,800003,800004,800005]);
});
test("resultado parcial guarda ID mas mantem card para reconciliacao",()=>{
 const entry:RefinementEntry={story:{id:1,title:"US",state:"",workItemType:"User Story"},cases:[make(1)],questions:[],status:"Por refinar",updatedAt:""};
 const partial=recordPublication(entry,{localId:"1",title:"T",destination,status:"needsReview",azureDevOpsId:12});assert.equal(partial.cases[0]?.azureDevOpsId,12);assert.equal(partial.publishedCases,undefined);
 const complete=recordPublication(partial,{localId:"1",title:"T",destination,status:"suiteLinked",storyLinked:true,azureDevOpsId:12});assert.equal(complete.cases.length,0);assert.equal(complete.publishedCases?.length,1);assert.deepEqual(recordPublication(complete,{localId:"1",title:"T",destination,status:"suiteLinked",azureDevOpsId:12}),complete);
});

test("falha sem ID fica guardada e sucesso so sai dos pendentes com ligacao a US confirmada",()=>{
 const entry:RefinementEntry={story:{id:1,title:"US",state:"",workItemType:"User Story"},cases:[make(1)],questions:[],status:"Por refinar",updatedAt:""};
 const failed=recordPublication(entry,{localId:"1",title:"T",destination,status:"needsReview",error:"HTTP 403"});
 const reloaded=JSON.parse(JSON.stringify(failed)) as RefinementEntry;
 assert.equal(reloaded.cases[0]?.publicationAttempt?.status,"needsReview");assert.equal(reloaded.cases[0]?.publicationAttempt?.error,"HTTP 403");
 assert.deepEqual(recordPublication(reloaded,{localId:"1",title:"T",destination,status:"notProcessed"}),reloaded);
 const notConfirmed=recordPublication(reloaded,{localId:"1",title:"T",destination,status:"suiteLinked",storyLinked:false,azureDevOpsId:12});assert.equal(notConfirmed.cases.length,1);
 const done=recordPublication(notConfirmed,{localId:"1",title:"T",destination,status:"suiteLinked",storyLinked:true,azureDevOpsId:12});assert.equal(done.cases.length,0);assert.equal("publicationAttempt" in done.publishedCases![0]!,false);
});
