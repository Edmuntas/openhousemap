import { initializeApp } from "firebase-admin/app";

initializeApp();

export { verifyLicense } from "./verifyLicense";
export { generateDescription } from "./generateDescription";
export { generateSocialPost } from "./generateSocialPost";
export { onEventCancelled, onEventUpdated, sendDigest } from "./sendEmail";
export {
  completeFinishedEvents,
  hideCancelledPins,
  cleanupArchivePhotos,
} from "./scheduler";
