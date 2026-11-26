// Only local dashboard routes are accepted; never redirect credentials to another host.
export function dashboardReturnPath(value:unknown):string {
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020\u007f]/.test(value))return '/dashboard';
 try {
  if(/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value)))return '/dashboard';
  const url=new URL(value,'https://local.invalid');
  if(url.origin!=='https://local.invalid'||!(url.pathname==='/dashboard'||url.pathname.startsWith('/dashboard/')))return '/dashboard';
  return url.pathname+url.search;
 }catch{return '/dashboard';}
}
export function isRedirectSignal(error:unknown):boolean {
 if(!error||typeof error!=='object')return false;
 const digest=(error as {digest?:unknown}).digest;
 return typeof digest==='string'&&digest.startsWith('NEXT_REDIRECT;');
}
