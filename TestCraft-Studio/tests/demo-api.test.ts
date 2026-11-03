import {test} from "node:test";
import assert from "node:assert/strict";
import {createDemoApp} from "../server/app.js";
test("API demo valida dados, rejeita destinos externos e repete sem duplicar",async()=>{
 const server=createDemoApp().listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));const address=server.address();assert.ok(address&&typeof address!=="string");const base=`http://127.0.0.1:${address.port}`;
 try{
  assert.deepEqual(await (await fetch(base+"/api/health")).json(),{mode:"demo",externalConnections:false});
  assert.equal((await fetch(base+"/api/workitems/9999")).status,404);
  const body={storyId:1001,planId:101,suiteId:1011,cases:[{localId:"example",title:"Demo",testedComponent:"Storefront",steps:[{action:"Add",expectedResult:"Added"}]}]};
  const post=(value:unknown)=>fetch(base+"/api/testcases/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
  const first=await (await post(body)).json();const second=await (await post(body)).json();assert.equal(first.simulated,true);assert.equal(first.results[0].azureDevOpsId,second.results[0].azureDevOpsId);
  assert.equal((await post({...body,planId:9999})).status,400);
 }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
