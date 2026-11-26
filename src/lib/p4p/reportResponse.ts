import 'server-only';
import {gzipSync} from 'node:zlib';

/** Compress HTML once instead of returning HTML, fonts, and workbook rows in a JSON envelope. */
export function reportHtmlResponse(html:string,acceptEncoding:string|null){
 const gzip=(acceptEncoding||'').split(',').some(item=>{
  const [name,...params]=item.trim().toLowerCase().split(';');
  const quality=params.find(param=>param.trim().startsWith('q='));
  return name==='gzip'&&(!quality||Number(quality.trim().slice(2))>0);
 });
 const headers:Record<string,string>={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Accept-Encoding'};
 if(gzip){headers['Content-Encoding']='gzip';return new Response(new Uint8Array(gzipSync(html,{level:1})),{headers});}
 return new Response(html,{headers});
}
