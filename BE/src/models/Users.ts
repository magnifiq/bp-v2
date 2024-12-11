import { IUser, UserRole } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userSchema = new Schema<IUser>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    user_role: { type: String, enum: Object.values(UserRole), required: true },
    organizationId: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const Users = mongoose.model<IUser>("Users", userSchema);

export default Users;
