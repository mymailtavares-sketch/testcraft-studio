import {createServer} from "vite";
import {createDemoApp} from "../server/app.ts";
import {spawn} from "node:child_process";
import {once} from "node:events";
const api=createDemoApp().listen(3001,"127.0.0.1");
const ready=once(api,"listening");
const ui=await createServer({configFile:false,logLevel:"error",server:{host:"127.0.0.1",port:5198,strictPort:true,proxy:{"/api":{target:"http://127.0.0.1:3001",changeOrigin:false}}}});
try{
 await ready;await ui.listen();
 const child=spawn(process.execPath,["node_modules/@playwright/test/cli.js","test","--project=chromium",...process.argv.slice(2)],{stdio:"inherit",windowsHide:true});
 const [code]=await once(child,"exit");process.exitCode=code??1;
}finally{await ui.close();api.closeAllConnections();await new Promise(resolve=>api.close(resolve));}
