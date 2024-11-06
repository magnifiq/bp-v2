import { Document } from "mongoose";

export interface IRun extends Document {
  uuid: string;
  name: string;
  accessId: string;
  userId: string;
  runtime: string;
  config: object;
  status: "started" | "interrupted" | "finished" | "failed";
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IRun>;
}
