import { IAccessKey } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const accessKeySchema = new Schema<IAccessKey>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    name: { type: String, required: true },
    organizationId: { type: String, required: true },
    licenseType: { type: String, required: true },
    expireAt: { type: Date, required: true },
    active: { type: Boolean, required: true, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

accessKeySchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const AccessKeys = mongoose.model<IAccessKey>("AccessKey", accessKeySchema);

export default AccessKeys;
