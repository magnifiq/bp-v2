import { IRunFiles } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const runFilesSchema = new Schema<IRunFiles>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    runId: { type: String, required: true },
    fileId: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

runFilesSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const RunFiles = mongoose.model<IRunFiles>("RunFiles", runFilesSchema);

export default RunFiles;
