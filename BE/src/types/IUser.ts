import { Document } from "mongoose";

export interface IUser extends Document {
  uuid: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  passwordHash: string;
  roleId: string;
  organizationId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IUser>;
}
