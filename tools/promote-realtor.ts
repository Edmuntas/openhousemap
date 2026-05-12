/**
 * Promote a user to verified realtor (or admin).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./.serviceAccountKey.json npx tsx tools/promote-realtor.ts <email> [--admin]
 *
 * If user doesn't exist yet in Firebase Auth, this prints a hint and exits.
 * The user should first log in via Google in the app, then re-run this tool.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "openhousemap",
  });
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"));
  const isAdmin = args.includes("--admin");
  if (!email) {
    console.error(
      "Usage: npx tsx tools/promote-realtor.ts <email> [--admin]"
    );
    process.exit(1);
  }

  const auth = getAuth();
  const db = getFirestore();

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code: string }).code === "auth/user-not-found"
    ) {
      console.error(
        `User ${email} not found in Firebase Auth. Have them log in once via Google first, then re-run.`
      );
      process.exit(2);
    }
    throw e;
  }

  const claims = isAdmin
    ? { admin: true, role: "admin" as const, verified: true }
    : { role: "realtor" as const, verified: true };
  await auth.setCustomUserClaims(user.uid, claims);

  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      name: user.displayName?.split(" ")[0] ?? "",
      surname: user.displayName?.split(" ").slice(1).join(" ") ?? "",
      officeName: "OpenHouse Map Test",
      licenseNumber: "00000",
      role: claims.role,
      verified: true,
      verificationStatus: "verified",
      licenseVerifiedAt: FieldValue.serverTimestamp(),
      language: "he",
      emailOptIn: false,
      digestOptIn: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`✅ Promoted ${email} (uid ${user.uid}) to ${isAdmin ? "admin" : "verified realtor"}`);
  console.log("They must log out and log back in for claims to take effect.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
