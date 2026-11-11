/** Report-only view: manager columns use saved head-form entries, never RN allocations. */
export function dailyReportView(report:any){
 const heads=new Set<string>(report.staff.filter((person:any)=>person.headEligible||person.manager).map((person:any)=>person.name));
 const roles=Object.fromEntries(report.staff.filter((person:any)=>heads.has(person.name)).map((person:any)=>[person.name,(person.manager?.role||person.suggestedRole)==='HEAD'?'HW':'Subhead']));
 return {...report,dailyHeadNames:[...heads],dailyHeadRoles:roles,
  dailyHeadMissing:report.staff.filter((person:any)=>heads.has(person.name)&&!person.manager).map((person:any)=>person.name),
  blocks:report.blocks.map((block:any)=>{
   const lines=block.lines.map((line:any)=>({...line,recipients:line.recipients.filter((name:string)=>line.head?heads.has(name):!heads.has(name))})).filter((line:any)=>line.recipients.length);
   return {...block,lines,names:[...new Set(lines.flatMap((line:any)=>line.recipients))]};
  }),
 };
}

/** Keep each page in normal document flow; CSS zoom changes print layout as well as appearance. */
export function dailyMatrixFitScript(){return `<script>
(function(){
 function fit(){document.querySelectorAll('.dailyMatrixPage,.headMatrix,.headSummary,.supportPersonal,.supportSummary').forEach(function(page){
  var content=page.querySelector('.p4pFitContent');if(!content)return;
  var fitWidth=page.getBoundingClientRect().width.toFixed(2),fontStatus=document.fonts?document.fonts.status:'ready';
  var media=window.matchMedia&&window.matchMedia('print').matches?'print':'screen';
  if(page.dataset.fitWidth===fitWidth&&page.dataset.fitFonts===fontStatus&&page.dataset.fitMedia===media)return;
  content.style.position='static';content.style.transform='none';content.style.zoom='1';content.style.width='100%';content.style.margin='0';
  page.style.height='auto';page.style.minHeight='0';
  var table=content.querySelector('table'),rows=table?Array.from(table.querySelectorAll('tbody > tr:not(.matrixSection):not(.matrixInfo):not(.headCategory):not(.headTotal):not(.supportSection):not(.supportShifts):not(.supportGrandTotal)')):[];
  rows.forEach(function(row){row.style.height='';});
  var gauge=document.createElement('div');gauge.style.cssText='position:absolute;visibility:hidden;width:'+(page.dataset.fitWidthMm||285)+'mm;height:'+(page.dataset.fitHeightMm||196)+'mm';page.appendChild(gauge);
  var maxHeight=gauge.getBoundingClientRect().height,maxWidth=Math.min(gauge.getBoundingClientRect().width,page.getBoundingClientRect().width);gauge.remove();
  if(page.dataset.fillPage==='true'&&rows.length){
   var natural=content.getBoundingClientRect().height,extra=Math.max(0,maxHeight-natural-2)/rows.length;
   var heights=rows.map(function(row){return row.getBoundingClientRect().height;});
   if(extra>0)rows.forEach(function(row,index){row.style.height=(heights[index]+extra)+'px';});
  }
  var box=content.getBoundingClientRect(),scale=Math.min(1,maxHeight/Math.max(1,box.height),maxWidth/Math.max(1,box.width));
  content.style.width=box.width+'px';content.style.zoom=String(scale);
  // Recheck rounding after zoom, leaving physical space between separately paginated tables.
  for(var attempt=0;attempt<2;attempt++){
   var actual=content.getBoundingClientRect().height;if(actual<=maxHeight)break;
   scale*=Math.max(0.01,(maxHeight-1)/actual);content.style.zoom=String(scale);
  }
  page.style.minHeight=maxHeight+'px';
  page.dataset.fitScale=String(scale);page.dataset.fitWidth=fitWidth;page.dataset.fitFonts=fontStatus;page.dataset.fitMedia=media;
 });}
 window.p4pFitDailyPages=fit;
 window.addEventListener('load',function(){(document.fonts?document.fonts.ready:Promise.resolve()).then(fit);});
 window.addEventListener('beforeprint',fit);
})();
</script>`;}
