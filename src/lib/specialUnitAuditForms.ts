import { dialysisAuditGroups } from '@/lib/dialysisAuditCriteria';
import { erAuditGroups } from '@/lib/erAuditCriteria';
import { anesthesiaAuditGroups } from '@/lib/anesthesiaAuditCriteria';
import { hbotAuditGroups } from '@/lib/hbotAuditCriteria';
export type SpecialUnitFormType='dialysis'|'er'|'anesthesia'|'hbot';
type Item={id:string;label:string};
type Group={title:string;items:Item[]};
type Form={name:string;groups:Group[];headings:{id:string;title:string}[];scores:number[];allowNA:boolean;maxScore:number};
export const specialUnitAuditForms:Record<SpecialUnitFormType,Form>={
 dialysis:{name:'ไตเทียม',groups:dialysisAuditGroups.flatMap(g=>g.subgroups),headings:dialysisAuditGroups.map((g,i)=>({id:String(i+1),title:g.title})),scores:[1,2,3,4],allowNA:true,maxScore:4},
 er:{name:'ER',groups:erAuditGroups.map(g=>({title:g.title,items:g.items.map(i=>({id:i.id,label:`${i.code} ${i.label}`}))})),headings:[{id:'1',title:'1. การประเมินแรกรับ'},{id:'2',title:'2. การดูแลต่อเนื่อง'},{id:'3',title:'3. การจำหน่ายและส่งต่อ'}],scores:[1,2,3,4],allowNA:true,maxScore:4},
 anesthesia:{name:'วิสัญญี',groups:anesthesiaAuditGroups.map(g=>({title:g.title,items:g.items.map(i=>({id:i.id,label:`${i.number}. ${i.label}`}))})),headings:anesthesiaAuditGroups.map((g,i)=>({id:String(i+1),title:g.title})),scores:[1,2,3,4],allowNA:true,maxScore:4},
 hbot:{name:'เวชศาสตร์ใต้น้ำ',groups:hbotAuditGroups,headings:hbotAuditGroups.map((g,i)=>({id:String(i+1),title:g.title})),scores:[0,1],allowNA:false,maxScore:1},
};
export const groupSection=(title:string)=>title.match(/^(\d+)/)?.[1]||'1';
export function isSpecialUnitForm(value:unknown):value is SpecialUnitFormType{return typeof value==='string'&&Object.prototype.hasOwnProperty.call(specialUnitAuditForms,value);}
