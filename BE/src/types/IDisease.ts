import { Document } from "mongoose";

export interface IDisease extends Document {
  uuid: string;
  name: string;
  organ: string;
  genes: string[];
  mutations: string[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IDisease>;
}
