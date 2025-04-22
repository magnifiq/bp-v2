import { Response } from "express";
import { ValidateAccessKeyRequest } from "../../../middlewares/validateAccessKeyMiddleware";
import Runs from "../../../models/Runs";

export const updateRun = async (
  req: ValidateAccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const { run_id } = req.params;
    const { access_key, update_type, message } = req.body;
    if (!access_key || !update_type || !message) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    const run = await Runs.findOne({ uuid: run_id, deletedAt: null });
    if (!run) {
      res.status(404).json({ message: "Run not found" });
      return;
    }

    let updateFields: any = { status: update_type };
    if (update_type === "finished") {
      const now = new Date();
      const createdAt = run.createdAt;
      if (!createdAt) return;
      const durationInSeconds = Math.floor(
        (now.getTime() - createdAt.getTime()) / 1000
      ); // Calculate duration in seconds
      updateFields.duration = durationInSeconds;
    }

    const updatedRun = await Runs.findOneAndUpdate(
      { uuid: run_id, deletedAt: null },
      updateFields,
      { new: true }
    );

    if (!updatedRun) {
      res.status(404).json({ message: "Run not found" });
      return;
    }

    res.status(200).json({ run_id: updatedRun.uuid });
  } catch (error) {
    console.error("Error updating run:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
