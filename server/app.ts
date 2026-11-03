import express from "express";
export const plans=[{id:101,name:"Demo Store"},{id:102,name:"Demo Accounts"}];
export const components=["Storefront","Accounts","Checkout","Notifications"];
export function createDemoApp(){
 const app=express();app.disable("x-powered-by");app.use(express.json({limit:"1mb"}));
 let nextId=9001;const saved=new Map<string,number>();
 app.get("/api/health",(_req,res)=>{res.json({mode:"demo",externalConnections:false});});
 app.get("/api/testplans",(_req,res)=>{res.json({plans});});
 app.get("/api/testcases/components",(_req,res)=>{res.json({components});});
 app.get("/api/testplans/:id/suites",(req,res)=>{
  const id=Number(req.params.id);if(!plans.some(plan=>plan.id===id)){res.status(404).json({error:"Biblioteca de demonstração inexistente."});return;}
  res.json({planId:id,suites:[{id:id*10,name:"Test library",suiteType:"StaticTestSuite",children:[{id:id*10+1,name:"Smoke tests",suiteType:"StaticTestSuite"},{id:id*10+2,name:"Regression",suiteType:"StaticTestSuite"}]}]});
 });
 app.get("/api/workitems/:id",(req,res)=>{
  const id=Number(req.params.id);if(![1001,1002].includes(id)){res.status(404).json({error:"Nesta demo, importa a US 1001 ou 1002."});return;}
  res.json({id,title:id===1001?"Loja de exemplo | Carrinho de compras":"Contas de exemplo | Recuperar acesso",state:"Active",workItemType:"User Story",description:id===1001?"Como cliente, quero adicionar produtos ao carrinho para preparar uma compra.":"Como utilizador, quero recuperar o acesso à minha conta.",acceptanceCriteria:"Validar os dados; apresentar feedback claro; preservar os dados válidos."});
 });
 app.post(["/api/testcases/validate-fields","/api/testcases/validate-publication","/api/testcases/publish"],(req,res)=>{
  const {storyId,planId,suiteId,cases}=req.body??{};
  const valid=[1001,1002].includes(storyId)&&plans.some(plan=>plan.id===planId)&&[planId*10,planId*10+1,planId*10+2].includes(suiteId)&&Array.isArray(cases)&&cases.length>0&&cases.length<=20&&cases.every(item=>item&&typeof item.localId==="string"&&typeof item.title==="string"&&item.title.trim()&&components.includes(item.testedComponent)&&Array.isArray(item.steps)&&item.steps.length>0&&item.steps.every((step:{action?:string;expectedResult?:string})=>typeof step.action==="string"&&step.action.trim()&&typeof step.expectedResult==="string"&&step.expectedResult.trim()));
  if(!valid){res.status(400).json({error:"Dados de demonstração inválidos. Revê os passos, o componente e o destino."});return;}
  if(!req.path.endsWith("/publish")){res.json({validated:true,dryRun:true,published:false,planId,suiteId,suiteType:"StaticTestSuite"});return;}
  const results=cases.map((item:{localId:string})=>{const key=JSON.stringify([storyId,planId,suiteId,item.localId]);let id=saved.get(key);if(!id){id=nextId++;saved.set(key,id);}return {localId:item.localId,status:"storyLinked",azureDevOpsId:id,suiteLinked:true,storyLinked:true};});
  res.json({published:true,simulated:true,results});
 });
 app.use("/api",(_req,res)=>{res.status(404).json({error:"Rota de demonstração inexistente."});});
 return app;
}
