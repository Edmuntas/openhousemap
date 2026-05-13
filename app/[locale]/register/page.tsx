import { Suspense } from "react";
import RegisterClient from "@/components/auth/RegisterClient";
import Footer from "@/components/layout/Footer";

export default function RegisterPage() {
  return (
    <>
      <Suspense fallback={<main className="p-8 text-center text-(--color-moss)">טוען...</main>}>
        <RegisterClient />
      </Suspense>
      <Footer variant="compact" />
    </>
  );
}
