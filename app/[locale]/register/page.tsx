import { Suspense } from "react";
import RegisterClient from "@/components/auth/RegisterClient";

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-(--color-moss)">טוען...</main>}>
      <RegisterClient />
    </Suspense>
  );
}
