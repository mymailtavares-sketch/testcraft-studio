import type {RefinementEntry,PublishedEntry} from "../models/refinement.js";
export type ActivityKind="imported"|"generated"|"saved";
export type DashboardActivity={id:string;storyId:number;kind:ActivityKind;at:string|null;sprint?:string};
export const ACTIVITY_KEY="testcraft-demo-dashboard-activity-v1";
export const SPRINT_NUMBER_KEY="testcraft-demo-sprint-number-v1";
export const SPRINT_KEY="testcraft-demo-sprint-start-v1";
export function addActivities(current:DashboardActivity[],incoming:DashboardActivity[]):DashboardActivity[]{
 const events=new Map(current.map(event=>[event.id,event]));
 for(const event of incoming){const old=events.get(event.id);if(!old||(!old.at&&event.at))events.set(event.id,event);}
 return [...events.values()];
}
export function caseActivity(storyId:number,localId:string,at:string|null):DashboardActivity{return {id:`generated:${storyId}:${localId}`,storyId,kind:"generated",at};}
export function savedActivity(storyId:number,id:number,at:string|null):DashboardActivity{return {id:`saved:${storyId}:${id}`,storyId,kind:"saved",at};}
export function migrateActivity(drafts:RefinementEntry[],history:PublishedEntry[]):DashboardActivity[]{
 let events:DashboardActivity[]=[];const knownAzure=new Set<string>();
 for(const entry of drafts){
  const storyId=entry.story.id;events.push({id:`imported:${storyId}`,storyId,kind:"imported",at:null});
  for(const tc of entry.cases)events.push(caseActivity(storyId,tc.localId,null));
  for(const tc of entry.publishedCases??[]){
   const id=tc.azureDevOpsId;if(!Number.isSafeInteger(id)||!id||id<=0)continue;
   const key=`${storyId}:${id}`;if(knownAzure.has(key))continue;knownAzure.add(key);
   events.push(caseActivity(storyId,tc.localId,null),savedActivity(storyId,id,null));
  }
 }
 for(const entry of history){
  const storyId=entry.storyId;events.push({id:`imported:${storyId}`,storyId,kind:"imported",at:null});
  const at=Number.isFinite(Date.parse(entry.publishedAt))?entry.publishedAt:null;
  for(const id of new Set(entry.testCaseIds))if(Number.isSafeInteger(id)&&id>0){
   if(!knownAzure.has(`${storyId}:${id}`)){events.push(caseActivity(storyId,`legacy-${id}`,null));knownAzure.add(`${storyId}:${id}`);}
   events.push(savedActivity(storyId,id,at));
  }
 }
 events=addActivities([],events);return events;
}
export function assignConfirmedLegacySprint(events:DashboardActivity[]):DashboardActivity[]{return events;}
export function loadActivity(drafts:RefinementEntry[],history:PublishedEntry[]):DashboardActivity[]{
 const raw=localStorage.getItem(ACTIVITY_KEY);if(raw===null)return assignConfirmedLegacySprint(migrateActivity(drafts,history));
 const data:unknown=JSON.parse(raw);
 if(!Array.isArray(data)||!data.every(event=>event&&typeof event.id==="string"&&Number.isSafeInteger(event.storyId)&&event.storyId>0&&["imported","generated","saved"].includes(event.kind)&&(event.at===null||(typeof event.at==="string"&&Number.isFinite(Date.parse(event.at))))&&(event.sprint===undefined||(typeof event.sprint==="string"&&validDay(event.sprint)))))throw new Error("Histórico de atividade inválido. Os dados originais foram mantidos.");
 return assignConfirmedLegacySprint(addActivities([],data as DashboardActivity[]));
}
export function localDay(iso:string):string {
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(iso));
 return ["year","month","day"].map(type=>parts.find(part=>part.type===type)!.value).join("-");
}
const DAY=86400000;
export function validDay(value:string):boolean {return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function sprintStart(day:string,anchor:string):string {
 const dayMs=Date.parse(day);const anchorMs=Date.parse(anchor);return new Date(anchorMs+Math.floor((dayMs-anchorMs)/(15*DAY))*15*DAY).toISOString().slice(0,10);
}
export function sprintEnd(start:string):string{return new Date(Date.parse(start)+14*DAY).toISOString().slice(0,10);}
export function sprintNumber(start:string,anchor:string,referenceNumber=21):number {
 const startMs=Date.parse(start);const anchorMs=Date.parse(anchor);
 if(start.slice(0,4)===anchor.slice(0,4))return referenceNumber+Math.round((startMs-anchorMs)/(15*DAY));
 const january=`${start.slice(0,4)}-01-01`;let first=sprintStart(january,anchor);
 if(first<january)first=new Date(Date.parse(first)+15*DAY).toISOString().slice(0,10);
 return Math.round((startMs-Date.parse(first))/(15*DAY))+1;
}
export function sprintReport(events:DashboardActivity[],anchor:string,selection="all",now=new Date().toISOString()){
 const configured=validDay(anchor);const buckets=new Map<string,{start:string;imported:number;generated:number;saved:number}>();
 const unknown={imported:0,generated:0,saved:0};const totals={imported:0,generated:0,saved:0};const stories=new Map<number,{storyId:number;imported:number;generated:number;saved:number}>();
 for(const event of addActivities([],events)){
  const day=event.at?localDay(event.at):event.sprint??null;const start=day&&configured?sprintStart(day,anchor):null;
  if(event.at===null&&!event.sprint)unknown[event.kind]++;
  if(start){let row=buckets.get(start);if(!row){row={start,imported:0,generated:0,saved:0};buckets.set(start,row);}row[event.kind]++;}
  if(selection!=="all"&&(selection==="unknown"?(event.at!==null||Boolean(event.sprint)):start!==selection))continue;
  totals[event.kind]++;let story=stories.get(event.storyId);if(!story){story={storyId:event.storyId,imported:0,generated:0,saved:0};stories.set(event.storyId,story);}story[event.kind]++;
 }
 if(configured){const current=sprintStart(localDay(now),anchor);for(let index=0;index<6;index++){const start=new Date(Date.parse(current)-index*15*DAY).toISOString().slice(0,10);if(!buckets.has(start))buckets.set(start,{start,imported:0,generated:0,saved:0});}}
 const sprints=[...buckets.values()].sort((a,b)=>a.start.localeCompare(b.start));
 return {configured,totals,unknown,sprints,stories:[...stories.values()].sort((a,b)=>b.storyId-a.storyId)};
}

export function recentSprintRows(rows:{start:string;imported:number;generated:number;saved:number}[],anchor:string,selection="all",now=new Date().toISOString()){
 if(!validDay(anchor)||selection==="unknown")return [];
 const end=validDay(selection)?selection:sprintStart(localDay(now),anchor);
 const byStart=new Map(rows.map(row=>[row.start,row]));
 return [2,1,0].map(offset=>{const start=new Date(Date.parse(end)-offset*15*DAY).toISOString().slice(0,10);return byStart.get(start)??{start,imported:0,generated:0,saved:0};});
}

// O painel começa na sprint atual e mostra também as duas seguintes.
export function upcomingSprintRows(rows:{start:string;imported:number;generated:number;saved:number}[],anchor:string,selection="all",now=new Date().toISOString()){
 if(!validDay(anchor))return [];
 const current=sprintStart(localDay(now),anchor);
 const first=validDay(selection)?selection:(current<anchor?anchor:current);
 const byStart=new Map(rows.map(row=>[row.start,row]));
 return [0,1,2].map(offset=>{const start=new Date(Date.parse(first)+offset*15*DAY).toISOString().slice(0,10);return byStart.get(start)??{start,imported:0,generated:0,saved:0};});
}
export function selectableSprintStarts(anchor:string,now=new Date().toISOString()):string[]{
 if(!validDay(anchor))return [];
 const current=sprintStart(localDay(now),anchor);
 const last=Math.max(Date.parse(anchor),Date.parse(current))+30*DAY;
 const starts:string[]=[];
 for(let time=Date.parse(anchor);time<=last;time+=15*DAY)starts.push(new Date(time).toISOString().slice(0,10));
 return starts;
}
