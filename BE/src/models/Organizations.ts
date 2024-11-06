import { IOrganization } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const organizationSchema = new Schema<IOrganization>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    name: { type: String, required: true },
    description: { type: String },
    email: { type: String, required: true, unique: true },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    postCode: { type: Number },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

organizationSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const Organizations = mongoose.model<IOrganization>(
  "Organizations",
  organizationSchema
);
export default Organizations;
