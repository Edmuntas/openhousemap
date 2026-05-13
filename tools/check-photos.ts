import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: "openhousemap" });
}
const db = getFirestore();

(async () => {
  const snap = await db.collection("events").get();
  let withPhotos = 0, without = 0;
  for (const d of snap.docs) {
    const photos = d.data().photos ?? [];
    if (photos.length > 0) withPhotos++;
    else {
      without++;
      console.log("NO PHOTOS:", d.id, "—", d.data().address, "status:", d.data().status, "mapVisible:", d.data().mapVisible);
    }
  }
  console.log(`with photos: ${withPhotos}, without: ${without}`);
})();
