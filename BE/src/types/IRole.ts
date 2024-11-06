import { Document } from "mongoose";

export interface IRole extends Document {
  uuid: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
