import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Users from "../../models/Users";
import dotenv from "dotenv";
import { AccessKeyRequest } from "../../middlewares/toolAuthMiddleware";
import Runs from "../../models/Runs";
import Samples from "../../models/Samples";
import Stages from "../../models/Stages";
import RunFiles from "../../models/RunFiles";
import RunStages from "../../models/RunStages";
import checkUserProjectAccess from "../../utils/common/checkUserProjectAccess";
import { ValidateAccessKeyRequest } from "../../middlewares/validateAccessKeyMiddleware";
import Files from "../../models/Files";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      user_role,
      organizationId,
    } = req.body;

    const user = await Users.findOne({ email, deletedAt: null });

    if (user) {
      throw new Error("User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new Users({
      firstName,
      lastName,
      username,
      email,
      passwordHash,
      user_role,
      organizationId,
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await Users.findOne({ email, deletedAt: null });

    if (!user) {
      throw new Error("User does not exist");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.uuid, role: user.user_role },
      JWT_SECRET as string,
      {
        expiresIn: JWT_EXPIRATION,
      }
    );

    res.status(200).json({ token, id: user.uuid, user_role: user.user_role });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

export const toolAuth = async (
  req: AccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const { user, accessKey } = req;

    if (!user || !accessKey) {
      res.status(400).json({ message: "User or access key not found." });
      return;
    }

    res.status(200).json({
      access_key: accessKey.uuid,
      username: user.username,
      user_id: user.id,
      user_role: user.user_role,
      organization_id: user.organizationId,
      organisation_name: user.organizationName || "Unknown",
      key_type: accessKey.licenseType,
      expire_at: accessKey.expireAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error." });
    }
  }
};

interface Sample {
  sample_name: string;
  file_name: string;
  file_path: string;
  file_ext: string;
  file_type: string;
}

export const me = async (
  req: ValidateAccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      access_key: access_key_id,
      user_id,
      run_name,
      config,
      glob,
      project_id,
      from_stage,
      stages,
      samples,
    } = req.body;

    if (
      !access_key_id ||
      !user_id ||
      !run_name ||
      !config ||
      !project_id ||
      !from_stage ||
      !stages ||
      !samples ||
      samples.length === 0
    ) {
      res
        .status(401)
        .json({ message: "Missing required fields in /me endpoint." });
      return;
    }

    checkUserProjectAccess(user_id, project_id);

    const newRun = new Runs({
      name: run_name,
      accessId: access_key_id,
      userId: user_id,
      runtime: 0,
      config,
      status: "started",
    });

    await newRun.save();

    const stageFromObject = await Stages.findOne({
      name: from_stage,
      deletedAt: null,
    });
    if (!stageFromObject) {
      res.status(404).json({ message: `Stage '${from_stage}' not found.` });
      return;
    }
    const stageFromId = stageFromObject.uuid;

    //after that we need to add stages to stages database and run_stages db
    const stageIds: string[] = [];
    for (const stage of stages) {
      const existingStage = await Stages.findOne({
        name: stage.name,
        method: stage.method,
        args: stage.args,
      });

      if (!existingStage) {
        const newStage = new Stages({
          name: stage.name,
          method: stage.method,
          args: stage.args,
        });

        await newStage.save();
        stageIds.push(newStage.uuid);
      } else {
        stageIds.push(existingStage.uuid);
      }
    }
    // Add to run_stages
    const runStages = stageIds.map((stageId) => ({
      runId: newRun.uuid,
      stageId: stageId,
      status: "pending",
    }));
    await RunStages.insertMany(runStages);

    const filteredStages = await Promise.all(
      runStages.map(async (runStage) => {
        const stage = await Stages.findOne({
          uuid: runStage.stageId,
          deletedAt: null,
        });
        return {
          stage_id: runStage.stageId,
          stage_name: stage ? stage.name : "Unknown",
        };
      })
    );

    const processedSamples = await Promise.all(
      samples.map(async (sample: Sample) => {
        const patient = new Samples({
          projectId: project_id,
          name: sample.sample_name,
        });
        await patient.save();
        const file = await Files.create({
          stageId: stageFromId,
          name: sample.file_name,
          path: sample.file_path,
          ext: sample.file_ext,
          type: sample.file_type,
          sampleId: patient.uuid,
        });

        return {
          sampleId: patient.uuid,
          fileId: file.uuid,
          sampleName: sample.file_name,
          filePath: sample.file_path,
          fileExt: sample.file_ext,
          fileType: sample.file_type,
        };
      })
    );

    const runFiles = processedSamples.map((processedSample) => ({
      runId: newRun.uuid,
      fileId: processedSample.fileId,
      status: "finished",
    }));

    await RunFiles.insertMany(runFiles);

    const resultSamples = processedSamples.map((sample) => {
      return {
        sample_path: sample.filePath,
        sample_name: sample.sampleName,
        sample_type: sample.fileType,
        sample_id: sample.sampleId,
      };
    });

    res.status(200).json({
      run_id: newRun.uuid,
      run_name: newRun.name,
      stages: filteredStages,
      samples: resultSamples,
      created_at: newRun.createdAt,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error." });
    }
  }
};
