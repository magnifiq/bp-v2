import { Document } from "mongoose";

export interface IReference extends Document {
  uuid: string;
  name: string;
  fasta: string;
  dbsnp: string;
  gencode: string;
  gnomad: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IReference>;
}
