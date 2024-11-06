import { ISampleMetadata } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const sampleMetadataSchema = new Schema<ISampleMetadata>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    sampleId: { type: String, required: true },
    age: { type: Number, required: true },
    deceasedAt: { type: Date, default: null },
    smoker: { type: Boolean, required: true },
    genes: { type: [String], required: true },
    diseaseStage: { type: String, required: true },
    other: { type: Object, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sampleMetadataSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const SampleMetadatas = mongoose.model<ISampleMetadata>(
  "SampleMetadatas",
  sampleMetadataSchema
);

export default SampleMetadatas;
