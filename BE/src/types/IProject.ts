import { Document } from "mongoose";

export interface IProject extends Document {
  uuid: string;
  diseaseId: string;
  organizationId: string;
  name: string;
  description: string;
  doi: string;
  link: string;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IProject>;
}
