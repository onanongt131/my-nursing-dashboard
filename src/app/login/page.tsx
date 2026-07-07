"use client";

import { loginAction } from "./actions";
import { useActionState } from "react"; // ตรวจสอบว่าใช้ React 19 หรือใช้ useFormState ในรุ่นเก่ากว่า

export default function LoginPage() {
  // รับค่าสถานะการ login
  const [state, action, isPending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4 max-w-sm mx-auto mt-20">
      <h1 className="text-xl font-bold">เข้าสู่ระบบ</h1>
      
      {state?.error && (
        <p className="text-red-500 text-sm">{state.error}</p>
      )}

      <input name="email" type="email" placeholder="อีเมล" required className="p-2 border rounded" />
      <input name="password" type="password" placeholder="รหัสผ่าน" required className="p-2 border rounded" />
      
      <button 
        type="submit" 
        disabled={isPending}
        className="bg-blue-600 text-white p-2 rounded disabled:bg-gray-400"
      >
        {isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}