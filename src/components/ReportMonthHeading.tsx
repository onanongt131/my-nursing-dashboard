const monthLabels=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/** Shared month-heading style for fiscal-year report tables. */
export default function ReportMonthHeading({month,className=''}:{month:number|string;className?:string}){
 const value=String(month);
 const index=/^\d{4}-(0[1-9]|1[0-2])$/.test(value)?Number(value.slice(5,7))-1:Number(value)-1;
 const label=monthLabels[index]||value.toUpperCase();
 return <th scope="col" className={'whitespace-nowrap bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-500 '+className}>{label}</th>;
}
