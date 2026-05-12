import { getAuth } from "firebase-admin/auth";

export async function setRealtorClaim(uid: string, verified = true) {
  await getAuth().setCustomUserClaims(uid, { role: "realtor", verified });
}

export async function setAdminClaim(uid: string) {
  await getAuth().setCustomUserClaims(uid, { admin: true });
}
