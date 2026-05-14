"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

/** Custom claims we set on the Firebase Auth token via the verifyLicense
 *  Cloud Function. Keep this in sync with functions/src/auth.ts. */
export interface CustomClaims {
  role?: "realtor" | "admin";
  verified?: boolean;
  admin?: boolean;
}

export interface AuthState {
  user: User | null;
  claims: CustomClaims | null;
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
      // Single cast at the boundary — downstream code reads typed fields.
      const claims = tokenResult.claims as CustomClaims;
      setState({
        user,
        claims: {
          role: claims.role,
          verified: claims.verified,
          admin: claims.admin,
        },
        loading: false,
      });
    });
    return () => unsub();
  }, []);

  return state;
}
