import {useAppContext} from "../context/AppContext";
export default function PromptsPage(){
 const c=useAppContext();
 return <section className="panel"><h1>Prompt do assistente de IA</h1>
  <label htmlFor="prompt-editor">Prompt</label>
  <textarea id="prompt-editor" rows={24} value={c.promptInstructions} onChange={e=>{c.setPromptInstructions(e.target.value);c.setCopyMessage("");}} style={{width:"100%",boxSizing:"border-box",padding:12,fontFamily:"monospace"}}/>
 </section>;
}
