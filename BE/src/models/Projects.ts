import { IProject } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const projectSchema = new Schema<IProject>(
  {
    uuid: { type: String, required: true, unique: true, default: uuidv4 },
    diseaseId: { type: String, required: true },
    organizationId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    doi: { type: String, required: true },
    link: { type: String, required: true },
    source: { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

projectSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

const Projects = mongoose.model<IProject>("Projects", projectSchema);

export default Projects;
