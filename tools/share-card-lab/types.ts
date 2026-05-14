export interface EventInput {
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

export interface GeneratorOutput {
  buffer: Buffer;
  estimatedCost: number; // USD per image
  metadata?: Record<string, unknown>;
}

export interface Generator {
  name: string;
  label: string;
  /** env vars required, e.g. ["OPENAI_API_KEY"] */
  requires: string[];
  run: (event: EventInput) => Promise<GeneratorOutput>;
}
