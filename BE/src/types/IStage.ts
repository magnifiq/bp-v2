import { Document } from "mongoose";

export interface IStage extends Document {
  uuid: string;
  name: string;
  method: string;
  args: object;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IStage>;
}
