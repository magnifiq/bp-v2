import { IUserProject } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userProjectSchema = new Schema<IUserProject>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    userId: { type: String, required: true },
    projectId: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userProjectSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};
const UserProjects = mongoose.model<IUserProject>(
  "UserProjects",
  userProjectSchema
);

export default UserProjects;
