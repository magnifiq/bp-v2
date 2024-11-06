import { IRole } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const roleSchema = new Schema<IRole>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    name: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Roles = mongoose.model<IRole>("Roles", roleSchema);

export default Roles;
