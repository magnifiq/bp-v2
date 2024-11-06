import { Document } from "mongoose";

export interface IAccessKey extends Document {
  uuid: string;
  name: string;
  organizationId: string;
  licenseType: string;
  expire: Date;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IAccessKey>;
}
