"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, claims, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!claims?.admin) {
      router.replace("/dashboard");
    }
  }, [user, claims, loading, router]);

  if (loading || !user || !claims?.admin) {
    return (
      <main className="p-10 text-center text-(--color-moss)" aria-live="polite">
        טוען...
      </main>
    );
  }

  return <>{children}</>;
}
