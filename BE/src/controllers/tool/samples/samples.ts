import { Response } from "express";
import { ValidateAccessKeyRequest } from "../../../middlewares/validateAccessKeyMiddleware";
import RunFiles from "../../../models/RunFiles";
import Files from "../../../models/Files";
import Samples from "../../../models/Samples";

export const sendSampleUpdate = async (
  req: ValidateAccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const { access_key, run_id, sample_id, update_type, message, file_id } =
      req.body;

    if (!access_key || !run_id || !sample_id || !update_type || !message) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const file = await Files.findOne({
      uuid: sample_id, //file_id, in GenFlow it must be changed to from sample_id to file_id
      deletedAt: null,
    });
    const fileId = file?.uuid;
    const existingSample = await RunFiles.findOne({
      runId: run_id,
      fileId,
      deletedAt: null,
    });
    if (!existingSample) {
      res.status(414).json({ message: "No existing sample for this run" });
      return;
    }
    existingSample.status = update_type;
    await existingSample.save();

    res.status(200).json({
      run_id,
      file_id: fileId,
      message: "Sample update recorded successfully",
    });
  } catch (error) {
    console.error("Error recording sample update:", error);
    res.status(500).json({ message: "Error recording sample update" });
    return;
  }
};

export const addSample = async (
  req: ValidateAccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      access_key,
      run_id,
      sample_id,
      message,
      file_type,
      file_path,
      file_name,
      stage_id,
      file_ext,
    } = req.body;

    if (
      !access_key ||
      !run_id ||
      !sample_id ||
      !message ||
      !file_type ||
      !file_name ||
      !file_path ||
      !stage_id ||
      !file_ext
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    const sample = await Samples.findOne({
      uuid: sample_id,
      deletedAt: null,
    });

    if (!sample) {
      res.status(411).json({ message: "No existing sample" });
      return;
    }

    const file = await Files.create({
      stageId: stage_id,
      name: file_name,
      path: file_path,
      ext: file_ext,
      type: file_type,
      sampleId: sample.uuid,
    });

    const fileId = file?.uuid;
    await RunFiles.create({
      runId: run_id,
      fileId,
      status: "started",
    });

    res.status(200).json({
      run_id,
      file_id: fileId,
      message: "Sample update recorded successfully",
    });
  } catch (error) {
    console.error("Error recording sample update:", error);
    res.status(500).json({ message: "Error recording sample update" });
    return;
  }
};
