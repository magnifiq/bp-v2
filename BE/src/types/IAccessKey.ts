import { Document } from "mongoose";

export interface IAccessKey extends Document {
  uuid: string;
  name: string;
  organizationId: string;
  licenseType: string;
  expireAt: Date;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IAccessKey>;
}
