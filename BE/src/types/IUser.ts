import { Document } from "mongoose";

export enum UserRole {
  Admin = "admin",
  Organization = "organization",
  User = "user",
}

export interface IUser extends Document {
  uuid: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  passwordHash: string;
  user_role: UserRole;
  organizationId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IUser>;
}
