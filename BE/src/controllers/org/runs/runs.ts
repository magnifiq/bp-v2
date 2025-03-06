import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import { findUsersInOrg, checkOrganizationRole } from "../../../utils/org";
import { Response } from "express";
import Users from "../../../models/Users";
import Runs from "../../../models/Runs";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import RunFiles from "../../../models/RunFiles";
import Stages from "../../../models/Stages";
import RunStages from "../../../models/RunStages";

export const findRunById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: run_id } = req.params;

    const orgInfo = checkOrganizationRole(req);

    const { id } = orgInfo;
    const run = await Runs.findOne({ uuid: run_id });

    if (!run) {
      res.status(404).json("Run isn't found");
      return;
    }
    const userIds = await findUsersInOrg(id);

    const runBelongsToOrg = await Runs.findOne({
      uuid: run_id,
      userId: { $in: userIds },
    });

    if (!runBelongsToOrg) {
      res.status(404).json("Run doesn't belong to this organization");
      return;
    }

    res.status(200).json(runBelongsToOrg);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized access") {
        res.status(401).json({ message: "Unauthorized access" });
      } else if (
        error.message === "The user doesn't have the organization role"
      ) {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      } else {
        console.error("Error when fetching run by ID:", error);
        res.status(500).json({ message: "Error when fetching run by ID" });
      }
    }
  }
};
export const deleteRunFromOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: run_id } = req.params;

    const orgInfo = checkOrganizationRole(req);

    const { id } = orgInfo;
    const run = await Runs.findOne({ uuid: run_id });

    if (!run) {
      res.status(404).json("Run isn't found");
      return;
    }

    const userIds = await findUsersInOrg(id);

    const runBelongsToOrg = await Runs.findOne({
      uuid: run_id,
      userId: { $in: userIds },
    });

    if (!runBelongsToOrg) {
      res.status(404).json("Run doesn't belong to this organization");
      return;
    }

    await Runs.deleteOne({ uuid: run_id });
    res.status(200).json({ run_id: run_id, deleted_at: run.deletedAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized access") {
        res.status(401).json({ message: "Unauthorized access" });
      } else if (
        error.message === "The user doesn't have the organization role"
      ) {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
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
  userId?: { $in: string[] };
  createdAt?: { $gte?: Date; $lte?: Date };
}

export const queryRuns = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const orgInfo = checkOrganizationRole(req);

    const { id } = orgInfo;

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

    const userIds = await findUsersInOrg(id);

    if (run_id) {
      const run = await Runs.findOne({ uuid: run_id as string });
      if (!run) {
        res.status(406).json("Run isn't found");
        return;
      }

      const runBelongsToOrg = await Runs.findOne({
        uuid: run_id as string,
        userId: { $in: userIds },
      });

      if (!runBelongsToOrg) {
        res.status(404).json("Run doesn't belong to this organization");
        return;
      }

      res.status(200).json(runBelongsToOrg);
      return;
    }
    const query: queryProps = { userId: { $in: userIds } };

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
        organizationId: id,
        username: { $regex: user_name, $options: "i" },
      });

      const userIds = users.map((user) => user.uuid);
      query.userId = { $in: userIds };
    }
    if (sample) {
      const samples = await Samples.find({
        name: { $regex: sample, $options: "i" },
      });
      const sampleIds = samples.map((sample) => sample.uuid);
      const files = await Files.find({ sampleId: { $in: sampleIds } });
      const fileIds = files.map((file) => file.uuid);
      const pairs = await RunFiles.find({ fileId: { $in: fileIds } });
      const runIds = pairs.map((pair) => pair.runId);
      query.uuid = { $in: runIds };
    }
    if (stage) {
      const stages = await Stages.find({
        name: { $regex: stage, $options: "i" },
      });
      const stageIds = stages.map((stage) => stage.uuid);
      const pairs = await RunStages.find({ stageId: { $in: stageIds } });
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
      if (error.message === "Unauthorized access") {
        res.status(401).json({ message: "Unauthorized access" });
      } else if (
        error.message === "The user doesn't have the organization role"
      ) {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      } else {
        console.error("Error when fetching run by ID:", error);
        res.status(500).json({ message: "Error when fetching run by ID" });
      }
    } else {
      console.error("Error when querying runs:", error);
      res.status(500).json({ message: "Error when querying runs" });
    }
  }
};
