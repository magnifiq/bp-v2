import { IRunStage } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const runStageSchema = new Schema<IRunStage>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    runId: { type: String, required: true },
    stageId: { type: String, required: true },
    status: {
      type: String,
      enum: ["started", "interrupted", "finished", "failed", "pending"],
      required: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

runStageSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const RunStages = mongoose.model<IRunStage>("RunStages", runStageSchema);

export default RunStages;
