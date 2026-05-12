import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const RESOURCE_ID =
  process.env.DATA_GOV_IL_REALTOR_RESOURCE_ID ??
  "a0f56034-88db-4132-8803-854bcdb01ca1";

interface VerifyLicensePayload {
  licenseNumber: string;
}

interface DataGovRecord {
  [key: string]: unknown;
}

export const verifyLicense = onCall<VerifyLicensePayload>(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }

    const licenseNumber = String(request.data?.licenseNumber ?? "").trim();
    if (!licenseNumber) {
      throw new HttpsError("invalid-argument", "licenseNumber required");
    }

    const url =
      `https://data.gov.il/api/3/action/datastore_search` +
      `?resource_id=${RESOURCE_ID}` +
      `&q=${encodeURIComponent(licenseNumber)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new HttpsError("unavailable", "data.gov.il unavailable");
    }
    const data = (await response.json()) as {
      result?: { records?: DataGovRecord[] };
    };
    const records = data.result?.records ?? [];
    const found = records.length > 0;
    const db = getFirestore();

    if (found) {
      await getAuth().setCustomUserClaims(uid, {
        role: "realtor",
        verified: true,
      });
      await db.doc(`users/${uid}`).set(
        {
          verified: true,
          verificationStatus: "verified",
          licenseData: records[0],
          licenseVerifiedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { verified: true, record: records[0] };
    }

    await db.doc(`users/${uid}`).set(
      {
        verified: false,
        verificationStatus: "pending",
        licenseNumber,
        licenseSubmittedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { verified: false };
  }
);
