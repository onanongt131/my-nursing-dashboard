/** Fetch only printable HTML: no repeated monthly reads and no Excel data in the response. */
export async function fetchReportHtml(url:string){
 const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});
 if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.error||'ออกรายงาน P4P ไม่สำเร็จ');}
 return response.text();
}

export function printReportHtml(html:string):Promise<void>{
 return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');
  // A real layout viewport avoids measuring the whole report inside a 1px frame.
  frame.style.cssText='position:fixed;left:-10000px;top:0;width:1200px;height:900px;border:0';
  frame.title='พิมพ์รายงาน P4P';
  let cleanupTimer:ReturnType<typeof setTimeout>|undefined;
  const cleanup=()=>{if(cleanupTimer)clearTimeout(cleanupTimer);frame.remove();};
  frame.onerror=()=>{cleanup();reject(new Error('เปิดหน้าพิมพ์ไม่สำเร็จ'));};
  frame.onload=async()=>{try{
   const view=frame.contentWindow as (Window&{p4pFitDailyPages?:()=>void})|null;
   if(!view)throw new Error('เปิดหน้าพิมพ์ไม่สำเร็จ');
   if(view.document.fonts)await view.document.fonts.ready;
   await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));
   view.p4pFitDailyPages?.();
   view.addEventListener('afterprint',cleanup,{once:true});
   cleanupTimer=setTimeout(cleanup,10*60*1000);
   view.focus();view.print();resolve();
  }catch(error){cleanup();reject(error);}};
  frame.srcdoc=html;document.body.appendChild(frame);
 });
}
