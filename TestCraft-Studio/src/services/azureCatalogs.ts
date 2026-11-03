export type CatalogSuite={id:number;name:string;suiteType?:string;children?:CatalogSuite[]};
export type CatalogPlan={id:number;name:string};
type FetchCatalog=(url:string,init?:RequestInit)=>Promise<Pick<Response,"ok"|"status"|"json">>;
export function createCatalogReader(fetcher:FetchCatalog=fetch,now:()=>number=Date.now){
 const cached=new Map<string,{value:unknown;expires:number}>();
 const pending=new Map<string,Promise<unknown>>();
 return {
  invalidate:(url:string)=>cached.delete(url),
  async read<T>(url:string,parse:(value:unknown)=>T):Promise<T>{
   const entry=cached.get(url);if(entry&&entry.expires>now())return parse(entry.value);
   const existing=pending.get(url);if(existing)return parse(await existing);
   const request=(async()=>{
    const response=await fetcher(url,{signal:AbortSignal.timeout(45000)});
    if(!response.ok)throw new Error(`Não foi possível carregar os dados (HTTP ${response.status}). Tenta novamente.`);
    const value:unknown=await response.json();parse(value);
    cached.set(url,{value,expires:now()+60000});return value;
   })();
   pending.set(url,request);
   try{return parse(await request);}finally{if(pending.get(url)===request)pending.delete(url);}
  }
 };
}
export const azureCatalogs=createCatalogReader();
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Resposta do catálogo inválida.");return value as Record<string,unknown>;}
function validPlan(value:unknown):value is CatalogPlan {const item=record(value);return Number.isInteger(item.id)&&Number(item.id)>0&&typeof item.name==="string"&&Boolean(item.name.trim());}
function validSuite(value:unknown):value is CatalogSuite {const item=record(value);const children=item.children;return validPlan(item)&&(children===undefined||(Array.isArray(children)&&children.every(validSuite)));}
export function getCatalogPlans(){return azureCatalogs.read('/api/testplans',value=>{const items=record(value).plans;if(!Array.isArray(items)||!items.length||!items.every(validPlan))throw new Error("Resposta de bibliotecas inválida.");return items;});}
export function getCatalogComponents(){return azureCatalogs.read('/api/testcases/components',value=>{const items=record(value).components;if(!Array.isArray(items)||!items.length||!items.every((item):item is string=>typeof item==="string"&&Boolean(item.trim())))throw new Error("Resposta de componentes inválida.");return items;});}
export function getCatalogSuites(planId:number){return azureCatalogs.read(`/api/testplans/${planId}/suites`,value=>{const data=record(value);if(data.planId!==planId||!Array.isArray(data.suites)||!data.suites.every(validSuite))throw new Error("Resposta das suites inválida.");return data.suites;});}
