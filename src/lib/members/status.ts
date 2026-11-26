export function isPendingMember(status:unknown){
 return status==null || (typeof status==='string' && ['', 'pending'].includes(status.trim().toLowerCase()));
}
