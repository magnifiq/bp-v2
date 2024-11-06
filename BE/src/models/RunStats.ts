import { IRunStats } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const runStatsSchema = new Schema<IRunStats>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    runId: { type: String, required: true },
    cpuTotal: { type: Number, required: true },
    cpuCores: { type: Object, required: true },
    gpuTotal: { type: Number, required: true },
    gpuCores: { type: Object, required: true },
    memTotal: { type: Number, required: true },
    memFree: { type: Number, required: true },
    diskRd: { type: Number, required: true },
    diskWr: { type: Number, required: true },
    time: { type: Date, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

runStatsSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const RunStats = mongoose.model<IRunStats>("RunStats", runStatsSchema);

export default RunStats;
