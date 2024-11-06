import { IStage } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const stageSchema = new Schema<IStage>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    name: { type: String, required: true },
    method: { type: String, required: true },
    args: { type: Object, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

stageSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const Stages = mongoose.model<IStage>("Stages", stageSchema);

export const ensureDefaultStage = async () => {
  const defaultStage = await Stages.findOne({ name: "import" });
  if (!defaultStage) {
    const newDefaultStage = new Stages({
      name: "import",
      method: "import",
      args: {},
    });
    await newDefaultStage.save();
  }
};

export default Stages;
