import type { Timestamp } from "firebase/firestore";

export type EventVisibility = "public" | "mixed" | "colleagues";
export type EventStatus = "active" | "cancelled" | "completed";
export type EventArchiveStatus = "active" | "archived";
export type PropertyType =
  | "apartment"
  | "garden_apartment"
  | "penthouse"
  | "duplex"
  | "house"
  | "land"
  | "commercial";

export const RESIDENTIAL_TYPES: PropertyType[] = [
  "apartment",
  "garden_apartment",
  "penthouse",
  "duplex",
  "house",
];

export const APARTMENT_LIKE_TYPES: PropertyType[] = [
  "apartment",
  "garden_apartment",
  "penthouse",
  "duplex",
];

export interface PhotoSet {
  thumb: string;
  medium: string;
  full: string;
}

export interface RealtorSnapshot {
  name: string;
  surname: string;
  officeName: string;
  licenseNumber: string;
  // Office branding — denormalized at event creation so reads don't need
  // to JOIN the users collection. If realtor updates logo later, older
  // events keep the old snapshot until re-published.
  logoUrl?: string | null;
  officeBrandColor?: string | null;
}

export interface OpenHouseEvent {
  ownerId: string;

  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  geohash: string;

  propertyType: PropertyType;
  price: number;

  rooms?: number;
  bathrooms?: number;
  size?: number;
  floor?: number;
  totalFloors?: number;

  plotSize?: number;
  gardenSize?: number;
  roofTerraceSize?: number;

  parking: boolean;
  mamad: boolean;
  mirpeset: boolean;
  elevator: boolean;
  ac: boolean;
  renovated: boolean;
  garden: boolean;
  pool: boolean;

  photos: PhotoSet[];

  date: string;
  startTime: string;
  endTime: string;

  visibility: EventVisibility;
  description: { he: string; en: string; ru: string };
  realtorInputText?: string;

  status: EventStatus;
  archiveStatus: EventArchiveStatus;

  cancelledAt?: Timestamp | null;
  completedAt?: Timestamp | null;
  archivedAt?: Timestamp | null;

  ownerBrief?: string;
  attendeesCount?: number;
  feedbackRequested: boolean;
  mapVisible: boolean;

  realtorSnapshot: RealtorSnapshot;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
