import { Document } from "mongoose";

export interface IOrganization extends Document {
  uuid: string;
  name: string;
  description: string;
  email: string;
  address: string;
  city: string;
  country: string;
  postCode: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IOrganization>;
}
