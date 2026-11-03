const defaults:Record<number,string>={101:"Storefront",102:"Accounts"};
export function defaultLibraryComponent(planId:number,components:string[]):string{return components.find(value=>value===defaults[planId])??"";}
