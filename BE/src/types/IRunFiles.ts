import { Document } from "mongoose";

export interface IRunFiles extends Document {
  uuid: string;
  runId: string;
  fileId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IRunFiles>;
}
