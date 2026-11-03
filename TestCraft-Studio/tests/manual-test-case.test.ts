import {test} from "node:test";
import assert from "node:assert/strict";
import {createManualTestCase,appendManualTestCase} from "../src/services/manualTestCase.js";
test("caso manual tem ID unico e campos vazios sem publicacao herdada",()=>{
  const first=createManualTestCase(),second=createManualTestCase();
  assert.notEqual(first.localId,second.localId);assert.equal(first.reviewStatus,"draft");
  assert.equal(first.title,"");assert.deepEqual(first.steps,[{action:"",expectedResult:""}]);
  assert.equal(first.publicationDestination,undefined);assert.equal(first.azureDevOpsId,undefined);
});
test("acrescentar conserva casos anteriores e isola os passos editados",()=>{
  const old=createManualTestCase();old.azureDevOpsId=696411;
  const next=createManualTestCase();const before=JSON.stringify(old);
  const result=appendManualTestCase([old],next);
  next.steps[0]!.action="Alterado fora da lista";
  assert.equal(result.length,2);assert.equal(JSON.stringify(result[0]),before);
  assert.equal(result[1]!.steps[0]!.action,"");
  assert.throws(()=>appendManualTestCase(result,next),/já está/);
});
