export type RadarImageResponse = {
  readonly imageUrl: string;
  readonly timestamp: Date;
  readonly location: string;
};

export type RadarImageOptions = {
  readonly location?: string;
  readonly timestamp?: Date; // If not provided, gets latest
};
