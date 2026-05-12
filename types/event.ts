import type { Timestamp } from "firebase/firestore";

export type EventVisibility = "public" | "mixed" | "colleagues";
export type EventStatus = "active" | "cancelled" | "completed";
export type EventArchiveStatus = "active" | "archived";
export type PropertyType =
  | "apartment"
  | "house"
  | "penthouse"
  | "land"
  | "commercial";

export interface PhotoSet {
  thumb: string; // 400x300
  medium: string; // 800x600
  full: string; // 1600x1200
}

export interface RealtorSnapshot {
  name: string;
  surname: string;
  officeName: string;
  licenseNumber: string;
}

export interface OpenHouseEvent {
  ownerId: string;

  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  geohash: string;

  propertyType: PropertyType;
  price: number; // ILS, must be > 0
  rooms: number;
  bathrooms: number;
  size: number; // m²
  floor?: number;
  totalFloors?: number;
  parking: boolean;
  mamad: boolean; // mamad / safe room
  mirpeset: boolean; // balcony

  photos: PhotoSet[]; // max 10

  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM

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
