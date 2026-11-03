import {createServer} from "vite";
import {createDemoApp} from "../server/app.ts";
const api=createDemoApp().listen(3001,"127.0.0.1");
const ui=await createServer({server:{host:"127.0.0.1",port:5173,strictPort:true}});
let closing=false;async function close(){if(closing)return;closing=true;await ui.close();api.closeAllConnections();await new Promise(resolve=>api.close(resolve));}
process.once("SIGINT",()=>{void close();});process.once("SIGTERM",()=>{void close();});
try{await ui.listen();ui.printUrls();}catch(error){console.error(error);await close();process.exitCode=1;}
