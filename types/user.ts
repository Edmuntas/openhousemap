import type { Timestamp } from "firebase/firestore";

export type UserRole = "realtor" | "admin";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type Language = "he" | "en" | "ru" | "fr";

export interface UserProfile {
  uid: string;
  name: string;
  surname: string;
  // phone is NOT stored as plaintext — Firebase Auth holds the canonical value;
  // we only keep a reference via uid.
  officeName: string;
  licenseNumber: string;
  licenseData?: { name: string; city: string; status: string };
  role: UserRole;
  verificationStatus: VerificationStatus;
  verified: boolean;
  licenseVerifiedAt?: Timestamp;
  // Office branding — surfaces on event popup/detail and share cards.
  // Logo stored at /users/{uid}/logo in Firebase Storage; logoUrl is the
  // public download URL (medium variant from Resize Extension if available).
  logoUrl?: string | null;
  // Optional brand accent (hex like "#4A6E30") — used as outline / accent on
  // share cards. Falls back to --color-moss when null.
  officeBrandColor?: string | null;
  language: Language;
  emailOptIn: boolean;
  emailOptInDate?: Timestamp;
  digestOptIn: boolean;
  digestOptInDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
