// Existing legacy summary forms store fiscal_year as calendar Buddhist year.
export function reviewFiscalYear(item:Record<string,unknown>):number|null {
 let period: string|null=null;
 for(const key of ['audit_month','audit_date','record_date','incident_date','fall_date','wound_found_date','admit_date','admitted_date']){const v=item[key];if(typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])(?:-|$)/.test(v)){period=v;break;}}
 if(!period&&typeof item.month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month))period=item.month;
 if(!period&&item.fiscal_year!=null&&item.month!=null){const y=Number(item.fiscal_year),m=Number(item.month);if(Number.isInteger(y)&&Number.isInteger(m)&&m>=1&&m<=12)return (y>=2400?y:y+543)+(m>=10?1:0);}
 if(!period)return null;const [year,month]=period.split('-').map(Number);return (year>=2400?year:year+543)+(month>=10?1:0);
}
export function requiresReview(item:Record<string,unknown>){const year=reviewFiscalYear(item);return year!==null&&year>=2570;}

export function reviewMonth(item:Record<string,unknown>):string|null {
 for(const key of ['audit_month','month','audit_date','record_date','incident_date','fall_date','wound_found_date','admit_date']){const value=item[key];if(typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])(?:-|$)/.test(value))return value.slice(0,7);}
 const year=Number(item.fiscal_year),month=Number(item.month);if(Number.isInteger(year)&&year>0&&Number.isInteger(month)&&month>=1&&month<=12)return `${year>=2400?year-543:year}-${String(month).padStart(2,'0')}`;
 return null;
}
