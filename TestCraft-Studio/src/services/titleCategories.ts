export const TITLE_CATEGORIES_KEY="testcraft-demo-title-categories-v1";
export const BASE_TITLE_CATEGORIES=["UI","UX/UI","API"];
export function normalizeTitleCategory(value:string):string {
 const cleaned=value.trim().replace(/\s+/g," ");
 if(!cleaned||cleaned.length>40||/[\r\n]/.test(value)||cleaned.includes(" - ")||cleaned==="__other__")throw new Error("Escreve uma categoria entre 1 e 40 caracteres, sem quebras de linha nem o separador « - ».");
 return cleaned;
}
export function loadTitleCategories():string[]{
 try{const data:unknown=JSON.parse(localStorage.getItem(TITLE_CATEGORIES_KEY)??"[]");if(!Array.isArray(data))return [];return data.filter((value):value is string=>typeof value==="string").flatMap(value=>{try{return [normalizeTitleCategory(value)];}catch{return [];}});}catch{return [];}
}
export function addTitleCategory(current:string[],value:string):{categories:string[];selected:string}{
 const name=normalizeTitleCategory(value);const existing=[...BASE_TITLE_CATEGORIES,...current].find(item=>item.toLocaleLowerCase()===name.toLocaleLowerCase());
 return {categories:existing?current:[...current,name],selected:existing??name};
}

export function removeTitleCategory(current:string[],value:string):string[]{
 if(BASE_TITLE_CATEGORIES.includes(value))return current;
 return current.filter(item=>item.toLocaleLowerCase()!==value.toLocaleLowerCase());
}
