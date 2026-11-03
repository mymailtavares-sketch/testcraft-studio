import {useEffect,useId,useRef,useState} from "react";
export type SprintChartRow={start:string;number?:number;imported:number;generated:number;saved:number};
const dayLabel=(day:string)=>`${day.slice(8,10)}/${day.slice(5,7)}`;
export default function SprintActivityChart({rows,kind}:Readonly<{rows:SprintChartRow[];kind:"stories"|"cases"}>){
 const ref=useRef<HTMLDivElement>(null);const [width,setWidth]=useState(500);const titleId=useId();
 useEffect(()=>{const element=ref.current;if(!element)return;const resize=new ResizeObserver(entries=>{const value=entries[0]?.contentRect.width;if(value)setWidth(Math.max(260,value));});resize.observe(element);return()=>resize.disconnect();},[]);
 const height=245,left=40,right=18,top=24,bottom=42;
 const max=Math.max(1,...rows.map(row=>kind==="stories"?row.imported:Math.max(row.generated,row.saved)));
 const step=Math.max(1,Math.ceil(max/4));const ceiling=Math.ceil(max/step)*step;const ticks=Array.from({length:Math.round(ceiling/step)+1},(_,index)=>index*step);const plotWidth=width-left-right;const plotHeight=height-top-bottom;
 const x=(index:number)=>left+(index+.5)*plotWidth/Math.max(1,rows.length);
 const y=(value:number)=>top+plotHeight*(1-value/ceiling);
 const barWidth=Math.min(32,plotWidth/Math.max(1,rows.length)*.25);const gap=6;
 const summary=rows.map(row=>`Sprint ${row.number??""}, ${dayLabel(row.start)}: ${kind==="stories"?`${row.imported} US`:`${row.generated} gerados e ${row.saved} gravados`}`).join("; ");
 return <div ref={ref} className="sprint-chart">
  <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId}>
   <title id={titleId}>{kind==="stories"?"US importadas por sprint":"Casos gerados e gravados por sprint"}. {summary}</title>
   {ticks.map(value=><g key={value}><line className="sprint-chart-grid" x1={left} x2={width-right} y1={y(value)} y2={y(value)}/><text className="sprint-chart-axis" x={left-10} y={y(value)+4} textAnchor="end">{value}</text></g>)}
   {rows.map((row,index)=>{
    const values=kind==="stories"?[{key:"imported",value:row.imported,label:"US importadas",center:x(index)}]:[{key:"generated",value:row.generated,label:"Casos gerados",center:x(index)-(barWidth+gap)/2},{key:"saved",value:row.saved,label:"Gravados na demo",center:x(index)+(barWidth+gap)/2}];
    return <g key={row.start}>{values.map(value=><g key={value.key} data-series={value.key} data-value={value.value}><rect className={value.key==="saved"?"sprint-chart-saved-bar":"sprint-chart-bar"} x={value.center-barWidth/2} y={y(value.value)} width={barWidth} height={Math.max(0,y(0)-y(value.value))}><title>Sprint {row.number}: {value.value} {value.label}</title></rect><text className="sprint-chart-value" textAnchor="middle" x={value.center} y={y(value.value)-8}>{value.value}</text></g>)}<text className="sprint-chart-axis" textAnchor="middle" x={x(index)} y={height-24}>S{row.number}</text><text className="sprint-chart-axis" textAnchor="middle" x={x(index)} y={height-9}>{dayLabel(row.start)}</text></g>;
   })}
  </svg>
  <div className="sprint-chart-legend"><span><i className="sprint-chart-bar-key"/>{kind==="stories"?"US importadas":"Casos gerados"}</span>{kind==="cases"&&<span><i className="sprint-chart-saved-key"/>Gravados na demo</span>}</div>
 </div>;
}
