import { Response } from "express";
import { ValidateAccessKeyRequest } from "../../../middlewares/validateAccessKeyMiddleware";
import RunStats from "../../../models/RunStats";

export const updateSystemStatus = async (
  req: ValidateAccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      access_key,
      run_timestamp,
      cpu_util,
      gpu_util,
      ram_used,
      ram_available,
      ram_swap,
      disk_io,
    } = req.body;
    const { run_id } = req.params;
    if (
      !access_key ||
      !run_id ||
      !run_timestamp ||
      !cpu_util ||
      !gpu_util ||
      ram_used === undefined ||
      ram_available === undefined ||
      ram_swap === undefined ||
      !disk_io
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const runStatus = new RunStats({
      runId: run_id,
      time: run_timestamp,
      cpuTotal: cpu_util[0],
      cpuCores: cpu_util.slice(1),
      gpuTotal: gpu_util.reduce((sum: number, val: number) => sum + val, 0),
      gpuCores: gpu_util,
      memTotal: ram_used + ram_swap,
      memFree: ram_available,
      diskRd: disk_io[0],
      diskWr: disk_io[1],
    });

    await runStatus.save();

    res.status(200).json({
      run_id,
      run_timestamp,
      message: "Status update recorded successfully",
    });
  } catch (error) {
    console.error("Error updating system status:", error);
    res.status(500).json({ message: "Error updating system status" });
  }
};
