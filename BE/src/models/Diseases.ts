import { IDisease } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const diseaseSchema = new Schema<IDisease>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    name: { type: String, required: true },
    organ: { type: String, required: true },
    genes: { type: [String], required: true },
    mutations: { type: [String], required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

diseaseSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const Diseases = mongoose.model<IDisease>("Diseases", diseaseSchema);

export default Diseases;
