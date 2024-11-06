import { Document } from "mongoose";

export interface IRunStage extends Document {
  uuid: string;
  runId: string;
  stageId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IRunStage>;
}
