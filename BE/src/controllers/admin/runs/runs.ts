import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import { Response } from "express";
import Users from "../../../models/Users";
import Runs from "../../../models/Runs";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import RunFiles from "../../../models/RunFiles";
import Stages from "../../../models/Stages";
import RunStages from "../../../models/RunStages";
import { checkAdminRole } from "../../../utils/admin";

export const findRunById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: run_id } = req.params;

    checkAdminRole(req);
    const run = await Runs.findOne({ uuid: run_id, deletedAt: null });

    if (!run) {
      res.status(404).json("Run isn't found");
      return;
    }

    res.status(200).json(run);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when fetching organization by admin",
        });
      }
    } else {
      console.error("Unknown error when searching run by ID by admin:", error);
      res
        .status(500)
        .json({ message: "Unknown error when searching run by ID by admin" });
    }
  }
};
export const deleteRun = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: run_id } = req.params;

    checkAdminRole(req);
    const run = await Runs.findOne({ uuid: run_id, deletedAt: null });
    if (!run) {
      res.status(404).json("Run isn't found");
      return;
    }

    await run.softDelete();

    res.status(200).json({ run_id, deleted_at: run.deletedAt });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when deleting a run by admin",
        });
      }
    } else {
      console.error("Unknown error when deleting run by ID by admin:", err);
      res
        .status(500)
        .json({ message: "Unknown error when deleting run by ID by admin" });
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
  userId?: { $in: string[] };
  createdAt?: { $gte?: Date; $lte?: Date };
  deletedAt: null;
}

export const queryRuns = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);

    const {
      name,
      start_at,
      end_at,
      status,
      user_name,
      sample,
      stage,
      id: run_id,
    } = req.query;

    if (run_id) {
      const run = await Runs.findOne({ uuid: run_id, deletedAt: null });
      if (!run) {
        res.status(406).json("Run isn't found");
        return;
      }

      res.status(200).json(run);
      return;
    }
    const query: queryProps = { deletedAt: null };

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
    if (user_name) {
      const users = await Users.find({
        deletedAt: null,
        username: { $regex: user_name, $options: "i" },
      });

      const userIds = users.map((user) => user.uuid);
      query.userId = { $in: userIds };
    }
    if (sample) {
      const samples = await Samples.find({
        deletedAt: null,
        name: { $regex: sample, $options: "i" },
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
      if (error.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when querying runs by admin",
        });
      }
    } else {
      console.error("Error when querying runs:", error);
      res.status(500).json({ message: "Error when querying runs" });
    }
  }
};
