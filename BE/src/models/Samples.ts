import { ISample } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const sampleSchema = new Schema<ISample>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    projectId: { type: String, required: true },
    name: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sampleSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const Samples = mongoose.model<ISample>("Samples", sampleSchema);

export default Samples;
