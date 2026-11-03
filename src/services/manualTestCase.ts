import type {TestCase} from "../models/types.js";

export function createManualTestCase():TestCase {
  return {localId:`manual-${crypto.randomUUID()}`,title:"",description:"",priority:2,testType:"Funcional",
    automationStatus:"Manual",testedComponent:"",preconditions:"",testData:"",reviewStatus:"draft",
    steps:[{action:"",expectedResult:""}]};
}
export function appendManualTestCase(cases:TestCase[],item:TestCase):TestCase[] {
  if(cases.some(tc=>tc.localId===item.localId))throw new Error("Este caso já está na lista.");
  return [...cases,structuredClone(item)];
}
