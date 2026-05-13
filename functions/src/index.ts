import { initializeApp } from "firebase-admin/app";

initializeApp();

export { verifyLicense } from "./verifyLicense";
export { generateDescription } from "./generateDescription";
export { generateSocialPost } from "./generateSocialPost";
export {
  onEventUpdated,
  sendPostEventFeedback,
  sendDigest,
} from "./sendEmail";
export {
  completeFinishedEvents,
  hideCancelledPins,
  cleanupArchivePhotos,
} from "./scheduler";
