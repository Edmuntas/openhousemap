/**
 * Admin-only callable: approve or reject a pending realtor.
 *
 * Approve  → custom claim {role:'realtor', verified:true} + status='verified'
 * Reject   → status='rejected'; verified stays false; reason saved for audit.
 *
 * Auth: requires the caller's token to carry `admin: true`.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

interface Payload {
  uid: string;
  action: "approve" | "reject";
  reason?: string;
}

export const adminVerifyRealtor = onCall<Payload>(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "Admin only");
    }
    const { uid, action } = request.data ?? {};
    const reason = request.data?.reason?.trim() ?? "";
    if (!uid || (action !== "approve" && action !== "reject")) {
      throw new HttpsError("invalid-argument", "uid + action required");
    }

    const auth = getAuth();
    const db = getFirestore();
    const userRef = db.doc(`users/${uid}`);
    const snap = await userRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", `user ${uid} not found`);
    }

    if (action === "approve") {
      // Preserve any other claims (admin if cross-promoting; rare)
      const existing = (await auth.getUser(uid)).customClaims ?? {};
      await auth.setCustomUserClaims(uid, {
        ...existing,
        role: "realtor",
        verified: true,
      });
      await userRef.set(
        {
          verified: true,
          verificationStatus: "verified",
          verifiedByAdmin: request.auth.uid,
          licenseVerifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true, status: "verified" };
    }

    // reject
    const existing = (await auth.getUser(uid)).customClaims ?? {};
    await auth.setCustomUserClaims(uid, {
      ...existing,
      role: "realtor",
      verified: false,
    });
    await userRef.set(
      {
        verified: false,
        verificationStatus: "rejected",
        rejectedByAdmin: request.auth.uid,
        rejectionReason: reason,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true, status: "rejected" };
  }
);
