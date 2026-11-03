import {useEffect,useRef,useState} from "react";
export default function TitleCategoryDialog({onCancel,onSave}:Readonly<{onCancel:()=>void;onSave:(value:string)=>void}>){
 const ref=useRef<HTMLDialogElement>(null);const [value,setValue]=useState("");const [error,setError]=useState("");
 useEffect(()=>{const element=ref.current;const previous=document.activeElement;if(element&&!element.open)element.showModal();return()=>{element?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} aria-labelledby="other-category-title" onCancel={event=>{event.preventDefault();onCancel();}} style={{width:"min(480px,calc(100vw - 32px))",padding:24,border:"1px solid #ddd",borderRadius:14,boxShadow:"0 16px 70px #0005"}}>
  <form onSubmit={event=>{event.preventDefault();try{onSave(value);}catch(cause){setError(cause instanceof Error?cause.message:"Não foi possível adicionar a categoria.");}}}>
   <h2 id="other-category-title" style={{marginTop:0}}>Outra</h2><label htmlFor="other-title-category">Nova categoria</label><input id="other-title-category" value={value} onChange={event=>setValue(event.target.value)} maxLength={40} autoFocus/>
   {error&&<p role="alert">{error}</p>}<div style={{display:"flex",gap:12,justifyContent:"flex-end",flexWrap:"wrap",marginTop:20}}><button type="button" className="app-action" style={{background:"#eee"}} onClick={onCancel}>Cancelar</button><button type="submit" className="app-action">Adicionar</button></div>
  </form>
 </dialog>;
}
