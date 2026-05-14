export type CardFormat = "square" | "story" | "og";

export const FORMAT_SIZE: Record<CardFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
};

export interface CardEvent {
  id: string;
  address: string;
  city: string;
  price: number;
  rooms: number | null;
  size: number | null;
  date: string;
  startTime: string;
  endTime: string;
  photoUrl: string | null;
  realtor: {
    name: string;
    office: string;
    logoUrl: string | null;
    brandColor: string | null;
  };
}
