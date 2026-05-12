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
  language: Language;
  emailOptIn: boolean;
  emailOptInDate?: Timestamp;
  digestOptIn: boolean;
  digestOptInDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
