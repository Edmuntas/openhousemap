/**
 * Drop events that have no photos AND status=completed (they are throwaway
 * test docs left over from early development). Future events created via the
 * /create form will have at least one photo enforced client-side.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: "openhousemap" });
}
const db = getFirestore();

(async () => {
  const snap = await db.collection("events").get();
  let removed = 0;
  for (const d of snap.docs) {
    const photos = d.data().photos ?? [];
    const status = d.data().status;
    if (photos.length === 0) {
      console.log(`removing ${d.id} — ${d.data().address} (status: ${status})`);
      await d.ref.delete();
      removed++;
    }
  }
  console.log(`done — removed ${removed}`);
})();
