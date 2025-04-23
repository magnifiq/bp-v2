import { Response } from "express";
import { ValidateAccessKeyRequest } from "../../../middlewares/validateAccessKeyMiddleware";
import RunStages from "../../../models/RunStages";

export const sendStageUpdate = async (
  req: ValidateAccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const { access_key, run_id, stage_id, update_type, message } = req.body;

    if (!access_key || !run_id || !stage_id || !update_type || !message) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const existingStage = await RunStages.findOne({
      runId: run_id,
      stageId: stage_id,
      deletedAt: null,
    });

    if (!existingStage) {
      res.status(414).json({ message: "No existing stage" });
      return;
    }

    existingStage.status = update_type;
    await existingStage.save();

    res.status(200).json({
      run_id,
      stage_id,
      message: "Stage update recorded successfully",
    });
  } catch (error) {
    console.error("Error recording stage update:", error);
    res.status(500).json({ message: "Error recording stage update" });
    return;
  }
};
