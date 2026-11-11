import LoginForm from './LoginForm';
import {dashboardReturnPath} from '@/lib/auth/returnPath';
export default async function LoginPage({searchParams}:{searchParams:Promise<{callbackUrl?:string|string[]}>}) {
 const query=await searchParams;
 return <LoginForm callbackUrl={dashboardReturnPath(query.callbackUrl)}/>;
}
