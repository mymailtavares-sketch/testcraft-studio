import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHostedApp} from "../server/hosting.js";
test("alojamento serve interface e API na mesma origem sem expor fontes",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"testcraft-host-"));await writeFile(join(dir,"index.html"),"<h1>TestCraft demo</h1>");
 const server=createHostedApp(dir).listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));const address=server.address();assert.ok(address&&typeof address!=="string");const base=`http://127.0.0.1:${address.port}`;
 try{assert.match(await (await fetch(base)).text(),/TestCraft demo/);assert.equal((await (await fetch(base+"/api/health")).json()).mode,"demo");assert.equal((await fetch(base+"/server/app.ts")).status,404);assert.equal((await fetch(base+"/api/unknown")).status,404);}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(dir,{recursive:true,force:true});}
});
