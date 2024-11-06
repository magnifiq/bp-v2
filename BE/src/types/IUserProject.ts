import { Document } from "mongoose";

export interface IUserProject extends Document {
  uuid: string;
  userId: string;
  projectId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IUserProject>;
}
