import { Document } from "mongoose";

export interface IChangeHistory extends Document {
  uuid: string;
  documentId: string;
  collectionName: string;
  changes: object;
  modifiedAt: Date;
  modifiedBy: string;
}
