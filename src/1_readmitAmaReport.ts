// Re-admit / AMA monthly report. Incidents count in the month of admit_date (Re-admit) or
// incident_date (AMA); denominators come from the monthly summaries, whose fiscal_year column
// holds the calendar Buddhist year (same as the existing forms).
export type ReportKind='readmit'|'ama';
export type Status='approved'|'pending';
export type Incident={id:string|number;department_id:string|number;status:string;date:string;hn?:string;an?:string;detail?:string;extra?:string};
export type Summary={department_id:string|number;fiscal_year:number|string;month:number|string;status?:string|null;denominator:number|string|null};
export type Cell={department_id:string;month:string;approved:number;pending:number;denominator:number|null;denominatorPending:boolean;rate:number|null};

export const FISCAL_MONTHS=[10,11,12,1,2,3,4,5,6,7,8,9];
/** Calendar months (yyyy-MM, Christian era) of a Buddhist fiscal year, Oct..Sep. */
export function fiscalMonths(fiscalYearBE:number){const start=fiscalYearBE-544;return FISCAL_MONTHS.map(m=>`${m>=10?start:start+1}-${String(m).padStart(2,'0')}`);}
export function fiscalRange(fiscalYearBE:number){const start=fiscalYearBE-544;return{from:`${start}-10-01`,to:`${start+1}-10-01`};}
export const summaryMonth=(s:Summary)=>{const y=Number(s.fiscal_year),m=Number(s.month);if(!Number.isInteger(y)||!Number.isInteger(m)||m<1||m>12)return null;return `${y>=2400?y-543:y}-${String(m).padStart(2,'0')}`;};
const counted=(status:string,includePending:boolean)=>status==='approved'||(includePending&&status==='pending');

export function rate(numerator:number,denominator:number|null){return denominator&&denominator>0?numerator/denominator*100:null;}

/** One cell per department and month of the fiscal year. */
export function buildCells(fiscalYearBE:number,departmentIds:(string|number)[],incidents:Incident[],summaries:Summary[],includePending:boolean):Cell[]{
 const months=fiscalMonths(fiscalYearBE),cells=new Map<string,Cell>();
 for(const d of departmentIds)for(const month of months)cells.set(String(d)+'|'+month,{department_id:String(d),month,approved:0,pending:0,denominator:null,denominatorPending:false,rate:null});
 for(const i of incidents){const c=cells.get(String(i.department_id)+'|'+String(i.date||'').slice(0,7));if(!c)continue;if(i.status==='approved')c.approved++;else if(i.status==='pending')c.pending++;}
 for(const s of summaries){const month=summaryMonth(s),c=month&&cells.get(String(s.department_id)+'|'+month);if(!c)continue;const status=String(s.status||'approved');if(!counted(status,includePending))continue;const n=Number(s.denominator);if(!Number.isFinite(n)||n<0)continue;
  // Prefer an approved summary over a pending one for the same month.
  if(c.denominator!==null&&!c.denominatorPending&&status!=='approved')continue;c.denominator=n;c.denominatorPending=status!=='approved';}
 for(const c of cells.values())c.rate=rate(c.approved+(includePending?c.pending:0),c.denominator);
 return [...cells.values()];
}

/** Totals for a department over the year (or the whole report when id is omitted). */
export function total(cells:Cell[],includePending:boolean,departmentId?:string){
 const list=departmentId?cells.filter(c=>c.department_id===departmentId):cells;
 const count=list.reduce((n,c)=>n+c.approved+(includePending?c.pending:0),0),pending=list.reduce((n,c)=>n+c.pending,0);
 const withDenominator=list.filter(c=>c.denominator!==null),denominator=withDenominator.length?withDenominator.reduce((n,c)=>n+Number(c.denominator),0):null;
 // Only months with a denominator contribute to the rate, so missing summaries do not lower it.
 const rated=withDenominator.reduce((n,c)=>n+c.approved+(includePending?c.pending:0),0);
 return{count,pending,denominator,rate:rate(rated,denominator),missingDenominator:list.filter(c=>c.denominator===null&&(c.approved+c.pending)>0).length};
}
