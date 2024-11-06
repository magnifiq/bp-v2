import { IReference } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const referenceSchema = new Schema<IReference>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    name: { type: String, required: true },
    fasta: { type: String, required: true },
    dbsnp: { type: String, required: true },
    gencode: { type: String, required: true },
    gnomad: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

referenceSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const References = mongoose.model<IReference>("References", referenceSchema);

export default References;
