import { IFile } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const fileSchema = new Schema<IFile>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    sampleId: { type: String, required: true },
    referenceId: { type: String, required: false },
    stageId: { type: String, required: true },
    name: { type: String, required: true },
    path: { type: String, required: true },
    ext: { type: String, required: true },
    type: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

fileSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const Files = mongoose.model<IFile>("Files", fileSchema);

export default Files;
