import {useState} from "react";
import {useAppContext} from "../context/AppContext";
import {sprintReport,sprintEnd,upcomingSprintRows,selectableSprintStarts,validDay,sprintNumber,SPRINT_KEY,SPRINT_NUMBER_KEY} from "../services/dashboardActivity";
import SprintActivityChart from "./SprintActivityChart";
const dateLabel=(day:string)=>`${day.slice(8,10)}/${day.slice(5,7)}/${day.slice(0,4)}`;
export default function DashboardPage(){
 const {activity,activityStorageError,setScreen}=useAppContext();
 const [anchor,setAnchor]=useState(()=>{try{const value=localStorage.getItem(SPRINT_KEY)??"";return validDay(value)?value:new Date().toISOString().slice(0,10);}catch{return new Date().toISOString().slice(0,10);}});
 const [referenceNumber,setReferenceNumber]=useState(()=>{try{const value=Number(localStorage.getItem(SPRINT_NUMBER_KEY));return Number.isInteger(value)&&value>0?value:1;}catch{return 1;}});
 const [selection,setSelection]=useState("all");const [settingsError,setSettingsError]=useState("");
 const report=sprintReport(activity,anchor,selection);
 const chartRows=upcomingSprintRows(report.sprints,anchor,selection).map(row=>({...row,number:sprintNumber(row.start,anchor,referenceNumber)}));
 const setStart=(value:string)=>{setAnchor(value);setSelection("all");setSettingsError("");try{localStorage.setItem(SPRINT_KEY,value);}catch{setSettingsError("A data da sprint não ficou guardada neste navegador.");}};
 const periodLabel=(start:string)=>`Sprint ${sprintNumber(start,anchor,referenceNumber)} · ${dateLabel(start)} — ${dateLabel(sprintEnd(start))}`;
 const selectedLabel=selection==="all"?"Atividade":selection==="unknown"?"Histórico sem data":periodLabel(selection);
 return <div className="dashboard-page sprint-dashboard">
  <header className="dashboard-heading"><div><span className="sprint-eyebrow">PAINEL DE ATIVIDADE</span><h1>Dashboard</h1></div><button type="button" className="app-action" onClick={()=>setScreen("import")}>Importar nova US</button></header>
  <div className="sprint-toolbar"><label>Sprint<input type="date" value={anchor} onChange={event=>setStart(event.target.value)}/></label><label>Sprint nº<input type="number" min="1" max="1000" value={referenceNumber} onChange={event=>{const value=Number(event.target.value);if(Number.isInteger(value)&&value>0&&value<=1000){setReferenceNumber(value);try{localStorage.setItem(SPRINT_NUMBER_KEY,String(value));}catch{setSettingsError("O número da sprint não ficou guardado.");}}}}/></label><label>Período<select aria-label="Período" value={selection} onChange={event=>setSelection(event.target.value)}><option value="all">Atividade</option>{selectableSprintStarts(anchor).map(start=><option key={start} value={start}>{periodLabel(start)}</option>)}</select></label></div>
  {(activityStorageError||settingsError)&&<p role="alert">{activityStorageError||settingsError}</p>}
  <div className="sprint-period-heading"><h2>{selectedLabel}</h2></div>
  <dl className="dashboard-metrics sprint-metrics">
   <div><span className="sprint-metric-icon" aria-hidden="true">US</span><div><dt>US importadas</dt><dd>{report.totals.imported}</dd></div></div>
   <div><span className="sprint-metric-icon" aria-hidden="true">TC</span><div><dt>Casos de teste gerados</dt><dd>{report.totals.generated}</dd></div></div>
   <div><span className="sprint-metric-icon" aria-hidden="true">✓</span><div><dt>Gravados na demo</dt><dd>{report.totals.saved}</dd></div></div>
  </dl>
  <section className="sprint-production" aria-labelledby="sprint-production-title"><div className="dashboard-section-heading"><h2 id="sprint-production-title">Visão da produção</h2><span>Sprint selecionada e próximas 2</span></div>
   {!report.configured?<p className="dashboard-empty">Seleciona uma data em Sprint para mostrar os gráficos.</p>:selection==="unknown"?<p className="dashboard-empty">Este histórico não tem datas suficientes para construir um gráfico por sprint.</p>:<div className="sprint-charts"><section><h3>US importadas por sprint</h3><SprintActivityChart rows={chartRows} kind="stories"/></section><section><h3>Casos gerados e gravados na demonstração</h3><SprintActivityChart rows={chartRows} kind="cases"/></section></div>}
   {report.configured&&selection!=="unknown"&&<details className="sprint-chart-data"><summary>Consultar valores dos gráficos</summary><div className="dashboard-table-wrap"><table><thead><tr><th scope="col">Sprint</th><th scope="col">US</th><th scope="col">Gerados</th><th scope="col">Gravados</th></tr></thead><tbody>{chartRows.map(row=><tr key={row.start}><th scope="row">{periodLabel(row.start)}</th><td>{row.imported}</td><td>{row.generated}</td><td>{row.saved}</td></tr>)}</tbody></table></div></details>}
  </section>

 </div>;
}