import { Document } from "mongoose";

export interface ISampleMetadata extends Document {
  uuid: string;
  sampleId: string;
  age: number;
  deceasedAt: Date;
  smoker: boolean;
  genes: string[];
  diseaseStage: string;
  other: object;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<ISampleMetadata>;
}
