import { Document } from "mongoose";

export interface ISample extends Document {
  uuid: string;
  projectId: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<ISample>;
}
