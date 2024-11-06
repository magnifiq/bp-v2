import { IChangeHistory } from "../types";
import mongoose, { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const historyChangesSchema = new Schema<IChangeHistory>({
  uuid: { type: String, required: true, unique: true, default: uuidv4 },
  documentId: { type: String, required: true },
  collectionName: { type: String, required: true },
  changes: { type: Object, required: true },
  modifiedAt: { type: Date, default: Date.now },
  modifiedBy: { type: String },
});

const HistoryChanges = mongoose.model<IChangeHistory>(
  "HistoryChanges",
  historyChangesSchema
);

export default HistoryChanges;
