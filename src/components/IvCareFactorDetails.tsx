 'use client';
type Entry=Record<string,unknown>;
const record=(value:unknown):Entry|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Entry:null;
const text=(value:unknown)=>typeof value==='string'?value:'';
export default function IvCareFactorDetails({value,legacy}:{value:unknown;legacy:Entry}){
 let decoded=value;
 if(typeof decoded==='string'){try{decoded=JSON.parse(decoded);}catch{decoded=null;}}
 const root=record(decoded),groups=Array.isArray(root?.groups)?root.groups:[];
 const validGroups=groups.map(record).filter((g):g is Entry=>!!g&&Array.isArray(g.items)&&g.items.length>0);
 const oldFields=[['factor_drug','ยา'],['factor_fluid','สารน้ำ'],['factor_patient','ผู้ป่วย'],['factor_personnel','บุคลากร'],['detail','รายละเอียด']] as const;
 return <div className="space-y-3">{validGroups.map((group,index)=><section key={index} className="rounded-xl border border-teal-100 bg-teal-50/40 p-3"><h4 className="font-bold text-teal-900">{text(group.code)}. {text(group.label)}</h4><div className="mt-2 space-y-3">{(group.items as unknown[]).map((value,itemIndex)=>{const item=record(value);if(!item)return null;const causes=Array.isArray(item.causes)?item.causes:[];return <div key={itemIndex} className="rounded-lg border bg-white p-2"><p className="font-semibold text-slate-800">{text(item.code)}. {text(item.label)}</p>{causes.length>0&&<ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">{causes.map((value,causeIndex)=>{const cause=record(value);return cause?<li key={causeIndex}>{text(cause.code)}. {text(cause.label)}</li>:null;})}</ul>}<p className="mt-2 whitespace-pre-wrap break-words text-slate-700"><strong>{item.code==='BA'?'ชื่อยา':item.code==='BB'?'ชื่อสารน้ำ':item.code==='BC'?'ชื่อสารอาหาร':'รายละเอียด'}: </strong>{text(item.detail)||'—'}</p></div>;})}</div></section>)}
 {oldFields.some(([key])=>text(legacy[key]))&&<div className="space-y-1 whitespace-pre-wrap break-words">{validGroups.length>0&&<p className="font-semibold">ข้อมูลเดิม</p>}{oldFields.map(([key,label])=>text(legacy[key])?<p key={key}><strong>{label}: </strong>{text(legacy[key])}</p>:null)}</div>}
 {!validGroups.length&&!oldFields.some(([key])=>text(legacy[key]))&&<span>ไม่ได้ระบุปัจจัย</span>}
 </div>;
}
