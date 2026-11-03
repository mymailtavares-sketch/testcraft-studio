import {azureCatalogs,getCatalogSuites} from "../services/azureCatalogs";
import {defaultLibraryComponent} from "../services/libraryComponents";
import {formatTestCaseTitle} from "../services/testCaseTitles";
import { useEffect, useRef, useState } from "react";
import type { PublicationDestination, TestCase } from "../models/types";

export type PlanOption = {id:number;name:string};
type Suite = {id:number;name:string;suiteType?:string;children?:Suite[]};
type SuiteOption = {id:number;path:string;selectable:boolean};
function suiteOptions(nodes:Suite[], parent=""): SuiteOption[] {
  return nodes.filter(node=>!/obsolet/i.test(node.name)).flatMap(node=> {
    const path=parent?`${parent} → ${node.name}`:node.name;
    return [{id:node.id,path,selectable:typeof node.suiteType === "string" && /^(StaticTestSuite|Static)$/i.test(node.suiteType)},...suiteOptions(node.children??[],path)];
  });
}

export default function TestCaseDestinationDialog({items,plans,loading,error,components,onCancel,onSave}: {
  items:TestCase[]; components:string[]; plans:PlanOption[]; loading:boolean; error:string;
  onCancel:()=>void; onSave:(destination:PublicationDestination,component:string)=>void;
}) {
  const item=items[0]!;
  const initial=items.every(tc=>tc.publicationDestination?.planId===item.publicationDestination?.planId && tc.publicationDestination?.suiteId===item.publicationDestination?.suiteId)?item.publicationDestination:undefined;
  const dialog=useRef<HTMLDialogElement>(null);
  const [component,setComponent]=useState(item.testedComponent);
  const [saveError,setSaveError]=useState("");
  const [planId,setPlanId]=useState(initial?String(initial.planId):"");
  const [suiteTreeOpen,setSuiteTreeOpen]=useState(!initial);
  const [suiteId,setSuiteId]=useState(initial?String(initial.suiteId):"");
  const [suites,setSuites]=useState<SuiteOption[]>([]);
  const [tree,setTree]=useState<Suite[]>([]);
  const [expanded,setExpanded]=useState<Set<number>>(new Set());
  const [loadingSuites,setLoadingSuites]=useState(false);
  const [suiteError,setSuiteError]=useState("");
  const [suiteReload,setSuiteReload]=useState(0);
  const plan=plans.find(p=>String(p.id)===planId);
  const suite=suites.find(s=>String(s.id)===suiteId && s.selectable);
  useEffect(()=> {
    const element=dialog.current;
    if (element && !element.open) element.showModal();
    return ()=>{if(element?.open)element.close();};
  },[]);
  useEffect(()=> {
    let active=true;
    setSuites([]); setTree([]); setExpanded(new Set()); setSuiteError(""); setLoadingSuites(Boolean(planId));
    if (planId) void (async()=> {
      try {
        const nodes=await getCatalogSuites(Number(planId));
        if(active){
          setSuites(suiteOptions(nodes));setTree(nodes);
          const opened=new Set<number>();
          const reveal=(items:Suite[]):boolean=>items.some(node=>{
            const child=reveal(node.children??[]);
            if(child)opened.add(node.id);
            return child||String(node.id)===String(initial?.suiteId);
          });
          reveal(nodes); nodes.forEach(node=>opened.add(node.id));setExpanded(opened);
        }
      } catch(e) {if(active)setSuiteError(e instanceof Error?e.message:"Erro ao carregar suites.");}
      finally {if(active)setLoadingSuites(false);}
    })();
    return ()=>{active=false;};
  },[planId,suiteReload]);
  const renderNodes=(nodes:Suite[],depth=0):React.ReactNode=>nodes.filter(node=>!/obsolet/i.test(node.name)).map(node=>{
    const children=(node.children??[]).filter(child=>!/obsolet/i.test(child.name));
    const open=expanded.has(node.id);
    const selectable=suites.some(s=>s.id===node.id&&s.selectable);
    const selected=String(node.id)===suiteId;
    return <div key={node.id}>
      <div style={{display:"flex",alignItems:"center",paddingLeft:depth*18,background:selected?"#eef2ff":"transparent",borderRadius:5}}>
        {children.length>0 ? <button type="button" aria-label={`${open?"Recolher":"Expandir"} ${node.name}`} aria-expanded={open}
          onClick={()=>setExpanded(current=>{const next=new Set(current);if(next.has(node.id))next.delete(node.id);else next.add(node.id);return next;})}
          style={{background:"transparent",color:"#333",padding:8,minWidth:32,margin:0,border:0}}>{open?"▾":"▸"}</button> : <span style={{width:32,flexShrink:0}}/>}
        <button type="button" aria-pressed={selectable?selected:undefined} onClick={()=>{
          if(selectable)setSuiteId(String(node.id));if(children.length)setExpanded(current=>new Set([...current,node.id]));
        }} onDoubleClick={()=>{if(selectable){setSuiteId(String(node.id));setSuiteTreeOpen(false);}}} style={{flex:1,textAlign:"left",background:"transparent",color:selectable?"#222":"#777",padding:"10px 4px",fontWeight:selected?700:400,margin:0,border:0}}>
          📁 {node.name}{!selectable?" (apenas navegação)":""}
        </button>
      </div>
      {open&&renderNodes(children,depth+1)}
    </div>;
  });
  useEffect(()=>{if(planId)setComponent(defaultLibraryComponent(Number(planId),components));},[planId,components]);
  const canSave=Boolean(components.includes(component) && !loading && !loadingSuites && !error && !suiteError && plan && suite);
  const fieldStyle={width:"100%",padding:10,border:"1px solid #bbb",borderRadius:8,boxSizing:"border-box" as const};
  return <dialog ref={dialog} aria-labelledby="case-destination-title" onCancel={event=>{event.preventDefault();onCancel();}}
    style={{width:"min(620px, calc(100vw - 32px))",maxHeight:"85vh",overflowY:"auto",padding:24,border:"1px solid #ddd",borderRadius:14,boxShadow:"0 16px 70px #0005"}}>
    <h2 id="case-destination-title" style={{marginTop:0}}>Destino {items.length===1?"do caso de teste":`de ${items.length} casos de teste`}</h2>
    <p style={{lineHeight:1.5}}>{items.length===1?item.title:`Aplicar a mesma biblioteca e suite aos ${items.length} casos selecionados.`}</p>
    <p style={{color:"#555",fontSize:14}}>O destino e o Tested Component serão aplicados aos casos selecionados.</p>
    <form onSubmit={event=>{event.preventDefault();setSaveError("");if(canSave && plan && suite){
      try{onSave({planId:plan.id,planName:plan.name,suiteId:suite.id,suitePath:suite.path},component);}
      catch(e){setSaveError(e instanceof Error?e.message:"Não foi possível aplicar o destino.");}
    }}}>
      <label htmlFor="case-destination-plan">Biblioteca de testes *</label>
      <select id="case-destination-plan" style={fieldStyle} value={planId} disabled={loading} onChange={event=>{setPlanId(event.target.value);setSuiteId("");setSuiteTreeOpen(true);}} required>
        <option value="">{loading?"A carregar bibliotecas...":"Selecionar biblioteca"}</option>
        {plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <p id="suite-tree-label" style={{marginBottom:8}}>Test Suite *</p>
      {!plan ? <p>Seleciona primeiro a biblioteca.</p> : loadingSuites ? <p role="status">A carregar suites...</p> :
        <div hidden={!suiteTreeOpen} role="group" aria-labelledby="suite-tree-label" style={{border:"1px solid #bbb",borderRadius:8,maxHeight:300,overflowY:"auto",padding:8}}>
          {renderNodes(tree)}
        </div>}
      {plan&&<button type="button" className="issue-link" disabled={loadingSuites} onClick={()=>{azureCatalogs.invalidate(`/api/testplans/${planId}/suites`);setSuiteReload(value=>value+1);}}>Atualizar suites</button>}
      {suiteTreeOpen && plan && !loadingSuites && <p className="note">Faz duplo clique na suite para recolher a árvore.</p>}
      {suite && <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",margin:"12px 0"}}>
        <strong title={suite.path}>📁 {suite.path.split(" → ").at(-1)}</strong>
        <button type="button" className="issue-link" aria-expanded={suiteTreeOpen} onClick={()=>setSuiteTreeOpen(current=>!current)}>{suiteTreeOpen?"Usar suite selecionada":"Alterar suite"}</button>
      </div>}
      {suite&&<><label htmlFor="destination-component">Tested Component *</label><select id="destination-component" value={component} onChange={event=>setComponent(event.target.value)} style={fieldStyle} required><option value="">Selecionar Tested Component</option>{components.map(value=><option key={value}>{value}</option>)}</select></>}
      {plan&&suite&&<details><summary>Títulos após aplicar o destino</summary><ul>{items.map(tc=><li key={tc.localId}>{formatTestCaseTitle({...tc,publicationDestination:{planId:plan.id,planName:plan.name,suiteId:suite.id,suitePath:suite.path}}).title}</li>)}</ul></details>}
      {(saveError||error||suiteError) && <p role="alert" style={{color:"#a11"}}>{saveError||error||suiteError}</p>}
      {plan && !loadingSuites && !suiteError && suites.length===0 && <p>Esta biblioteca não devolveu suites disponíveis.</p>}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end",flexWrap:"wrap",marginTop:20}}>
        <button className="app-action" type="button" onClick={onCancel} style={{background:"#eee",color:"#222"}}>Cancelar</button>
        <button className="app-action" type="submit" disabled={!canSave}>Confirmar destino</button>
      </div>
    </form>
  </dialog>;
}