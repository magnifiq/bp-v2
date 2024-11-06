import { Document } from "mongoose";

export interface IFile extends Document {
  uuid: string;
  sampleId: string;
  referenceId?: string;
  stageId: string;
  name: string;
  path: string;
  ext: string;
  type: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IFile>;
}
