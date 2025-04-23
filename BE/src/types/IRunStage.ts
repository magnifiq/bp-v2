import { Document } from "mongoose";

export interface IRunStage extends Document {
  uuid: string;
  runId: string;
  stageId: string;
  status: "started" | "interrupted" | "finished" | "failed" | "pending";
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IRunStage>;
}
