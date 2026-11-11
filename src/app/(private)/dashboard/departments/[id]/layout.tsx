import {currentUser} from '@/lib/audits/chartServer';
import {redirect} from 'next/navigation';
export default async function UnitAccessLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)redirect('/login');
 const {id}=await params;
 if(user.role==='staff'){
  if(!user.departmentId)return <div className="p-6 text-red-700">บัญชียังไม่ได้ผูกหน่วยงาน กรุณาติดต่อผู้ดูแลระบบ</div>;
  if(String(user.departmentId)!==id)redirect(`/dashboard/departments/${user.departmentId}`);
 }
 return children;
}
