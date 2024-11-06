import { IRun } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const runSchema = new Schema<IRun>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    name: { type: String, required: true },
    accessId: { type: String, required: true },
    userId: { type: String, required: true },
    runtime: { type: String, required: true },
    config: { type: Object, required: true },
    status: {
      type: String,
      enum: ["started", "interrupted", "finished", "failed"],
      required: true,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

runSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const Runs = mongoose.model<IRun>("Runs", runSchema);

export default Runs;
