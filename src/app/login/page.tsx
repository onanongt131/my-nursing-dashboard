// src/app/login/page.tsx
import { redirect } from 'next/navigation';
import { signIn } from "@/auth";
import Link from 'next/link';
import { SubmitButton } from "@/components/SubmitButton"; // import ปุ่มที่เราสร้างใหม่

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">เข้าสู่ระบบ Dashboard พยาบาล</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg w-full max-w-sm text-center text-sm">
          อีเมลหรือรหัสผ่านไม่ถูกต้อง
        </div>
      )}

      <form
        action={async (formData) => {
          "use server";
          try {
            await signIn("credentials", formData, { redirectTo: "/" });
          } catch (error: any) {
            // **ส่วนนี้สำคัญมาก**
            // Auth.js จะโยน error ชนิดหนึ่งเพื่อสั่ง Redirect
            // เราต้องเช็คก่อนว่าใช่ error การ Redirect หรือไม่
            if (error?.type === "CredentialsSignin") {
              return redirect("/login?error=true");
            }
            
            // ถ้าเป็น redirect error (ซึ่งไม่ใช่ error จริงๆ) ให้ re-throw ให้ระบบทำงานต่อ
            if (error instanceof Error && error.message === "NEXT_REDIRECT") {
              throw error;
            }
            
            // ถ้าเป็น error อื่นๆ ให้ throw
            throw error;
          }
        }}
        className="flex flex-col gap-4 w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border"
      >
        <input 
          name="email" 
          type="email" 
          placeholder="อีเมล" 
          required 
          className="p-3 border rounded-xl"
        />
        <input 
          name="password" 
          type="password" 
          placeholder="รหัสผ่าน" 
          required 
          className="p-3 border rounded-xl"
        />
        
        {/* ใช้ SubmitButton แทนปุ่มแบบเดิม */}
        <SubmitButton />
        
        {/* ลิงก์ลืมรหัสผ่าน */}
        <Link href="/forgot-password" className="text-sm text-blue-600 text-center hover:underline">
          ลืมรหัสผ่าน?
        </Link>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          ยังไม่มีบัญชี? {' '}
          <Link href="/register" className="text-blue-600 font-bold hover:underline">
            สมัครสมาชิกที่นี่
          </Link>
        </p>
      </div>
    </div>
  );
}