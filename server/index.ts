import {fileURLToPath} from "node:url";
import {createDemoApp} from "./app.js";
import {createHostedApp} from "./hosting.js";
const production=process.env.NODE_ENV==="production";
const port=Number(process.env.PORT??3001);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error("PORT inválida.");
const app=production?createHostedApp(fileURLToPath(new URL("../dist/",import.meta.url))):createDemoApp();
const server=app.listen(port,production?"0.0.0.0":"127.0.0.1",()=>console.log(`TestCraft Studio demo disponível na porta ${port}`));
process.once("SIGTERM",()=>server.close());
