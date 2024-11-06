import { Document } from "mongoose";

export interface IRunStats extends Document {
  uuid: string;
  runId: string;
  cpuTotal: number;
  cpuCores: object;
  gpuTotal: number;
  gpuCores: object;
  memTotal: number;
  memFree: number;
  diskRd: number;
  diskWr: number;
  time: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  softDelete: () => Promise<IRunStats>;
}
