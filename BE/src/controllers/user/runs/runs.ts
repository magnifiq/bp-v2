import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import { checkUserRole } from "../../../utils/user";
import { Response } from "express";
import Runs from "../../../models/Runs";
import Stages from "../../../models/Stages";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import RunFiles from "../../../models/RunFiles";
import RunStages from "../../../models/RunStages";

export const findRunById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: run_id } = req.params;
    const { id: user_id } = checkUserRole(req);

    const run = await Runs.findOne({
      uuid: run_id,
      userId: user_id,
      deletedAt: null,
    });

    if (!run) {
      res.status(404).json("Run isn't found");
      return;
    }

    res.status(200).json(run);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'user' role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the 'user' role" });
      }
    } else {
      console.error("Error when fetching run by ID:", error);
      res.status(500).json({ message: "Error when fetching run by ID" });
    }
  }
};

export const deleteUserRun = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: run_id } = req.params;

    const { id: user_id } = checkUserRole(req);

    const run = await Runs.findOne({
      uuid: run_id,
      userId: user_id,
      deletedAt: null,
    });

    if (!run) {
      res.status(404).json("Run isn't found");
      return;
    }
    await run.softDelete();
    res.status(200).json({ run_id, deleted_at: run.deletedAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'user' role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the 'user' role" });
      } else {
        console.error("Error when deleting run by ID:", error);
        res.status(500).json({ message: "Error when deleting run by ID" });
      }
    } else {
      console.error("Unknown error when deleting run by ID:", error);
      res
        .status(500)
        .json({ message: "Unknown error when deleting run by ID" });
    }
  }
};

interface queryProps {
  name?: { $regex: string; $options: string };
  start_at?: string;
  end_at?: string;
  status?: string;
  user_name?: string;
  sample?: string;
  stage?: string;
  uuid?: { $in: string[] };
  userId?: string;
  createdAt?: { $gte?: Date; $lte?: Date };
  deletedAt: null;
}

export const queryRuns = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: user_id } = checkUserRole(req);
    const {
      name,
      start_at,
      end_at,
      status,
      sample,
      stage,
      id: run_id,
    } = req.query;

    if (run_id) {
      const run = await Runs.findOne({
        uuid: run_id,
        userId: user_id,
        deletedAt: null,
      });
      if (!run) {
        res.status(406).json("Run isn't found");
        return;
      }

      res.status(200).json(run);
      return;
    }
    const query: queryProps = { userId: user_id, deletedAt: null };

    if (name) {
      query.name = { $regex: name as string, $options: "i" };
    }
    if (start_at) {
      query.createdAt = { $gte: new Date(start_at as string) };
    }
    if (end_at) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = new Date(end_at as string);
    }
    if (status) {
      query.status = status as string;
    }

    if (sample) {
      const samples = await Samples.find({
        name: { $regex: sample, $options: "i" },
        deletedAt: null,
      });
      const sampleIds = samples.map((sample) => sample.uuid);
      const files = await Files.find({
        sampleId: { $in: sampleIds },
        deletedAt: null,
      });
      const fileIds = files.map((file) => file.uuid);
      const pairs = await RunFiles.find({
        fileId: { $in: fileIds },
        deletedAt: null,
      });
      const runIds = pairs.map((pair) => pair.runId);
      query.uuid = { $in: runIds };
    }
    if (stage) {
      const stages = await Stages.find({
        name: { $regex: stage, $options: "i" },
        deletedAt: null,
      });
      const stageIds = stages.map((stage) => stage.uuid);
      const pairs = await RunStages.find({
        stageId: { $in: stageIds },
        deletedAt: null,
      });
      const runIds = pairs.map((pair) => pair.runId);

      if (query.uuid) {
        query.uuid.$in = query.uuid.$in.filter((runId: string) =>
          runIds.includes(runId)
        );
      } else {
        query.uuid = { $in: runIds };
      }
    }

    const runs = await Runs.find(query);

    res.status(200).json(runs);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'user' role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the 'user' role" });
      } else {
        console.error("Error when fetching run with query params:", error);
        res
          .status(500)
          .json({ message: "Error when fetching run with query params" });
      }
    } else {
      console.error("Error when querying runs:", error);
      res.status(500).json({ message: "Error when querying runs" });
    }
  }
};
