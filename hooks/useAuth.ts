"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface AuthState {
  user: User | null;
  claims: { role?: string; verified?: boolean; admin?: boolean } | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    claims: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, claims: null, loading: false });
        return;
      }
      const tokenResult = await user.getIdTokenResult();
      setState({
        user,
        claims: {
          role: tokenResult.claims.role as string | undefined,
          verified: tokenResult.claims.verified as boolean | undefined,
          admin: tokenResult.claims.admin as boolean | undefined,
        },
        loading: false,
      });
    });
    return () => unsub();
  }, []);

  return state;
}
