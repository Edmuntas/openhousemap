import { Suspense } from "react";
import LoginClient from "@/components/auth/LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-(--color-moss)">טוען...</main>}>
      <LoginClient />
    </Suspense>
  );
}
