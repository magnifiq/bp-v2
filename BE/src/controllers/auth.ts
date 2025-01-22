import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Users from "../models/Users";
import dotenv from "dotenv";
import { AccessKeyRequest } from "../middlewares/toolAuthMiddleware";
import Organizations from "../models/Organizations";
import AccessKeys from "../models/AccessKeys";
import Runs from "../models/Runs";
import Samples from "../models/Samples";
import Stages from "../models/Stages";
import RunFiles from "../models/RunFiles";
import RunStages from "../models/RunStages";
import checkUserProjectAccess from "../utils/checkUserProjectAccess";
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

    const user = await Users.findOne({ email });

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

    const user = await Users.findOne({ email });

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

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      access_key_id,
      user_id,
      run_name,
      config,
      glob,
      project_id,
      from_stage,
      stages,
    } = req.body;

    if (
      !access_key_id ||
      !user_id ||
      !run_name ||
      !config ||
      !project_id ||
      !from_stage ||
      !stages ||
      !glob
    ) {
      res
        .status(400)
        .json({ message: "Missing required fields in /me endpoint." });
    }

    const foundUser = await Users.findById(user_id);

    if (!foundUser) {
      res.status(401).json({ message: "User isn't found" });
      return;
    }

    const foundOrganization = await Organizations.findOne({
      uuid: foundUser.organizationId,
    });

    if (!foundOrganization) {
      res
        .status(401)
        .json({ message: "Organization not found for this user." });
      return;
    }

    const organizationAccessKey = await AccessKeys.findById({
      foundOrganization,
    });

    if (!organizationAccessKey) {
      res
        .status(401)
        .json({ message: "Access key not found for organization." });
      return;
    }

    if (organizationAccessKey !== access_key_id) {
      res.status(401).json({
        message:
          "Invalid access key. No match with the access key from the database.",
      });
      return;
    }

    const currentDate = new Date();
    if (
      organizationAccessKey.expireAt &&
      currentDate > organizationAccessKey.expireAt
    ) {
      res.status(401).json({
        message: "Access key is expired.",
        key_details: {
          accessKeyId: organizationAccessKey.uuid,
          expireAt: organizationAccessKey.expireAt,
        },
      });
      return;
    }

    //checkUserProjectAccess(user_id, project_id, foundUser.user_role);

    const newRun = new Runs({
      name: run_name,
      accessId: access_key_id,
      userId: user_id,
      runtime: 0,
      config,
      status: "started",
    });

    await newRun.save();

    const sampleNamesGlob = glob.split(".")[0];
    const fileTypeGlob = glob.split(".")[1];
    const stageFromObject = await Stages.findOne({ name: from_stage });

    if (!stageFromObject) {
      res.status(404).json({ message: `Stage '${from_stage}' not found.` });
      return;
    }

    const stageFromId = stageFromObject.uuid;
    // I need to pass specific samples(patients) to the run
    // There I filter samples by project_id and samples names
    const filteredSamples = await Samples.aggregate([
      { $match: { project_id } },
      {
        $match: {
          $name: { $regex: sampleNamesGlob, $options: "" },
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "uuid",
          foreignField: "sample_id",
          as: "files",
        },
      },
      {
        $unwind: "$files",
      },
      {
        $addFields: {
          // file type is odbor cancer/normal so we need to take file ext from file name
          file_extension: {
            $arrayElemAt: [{ $split: ["$files.path", "."] }, -1],
          },
        },
      },
      {
        $match: {
          $and: [
            { file_extension: { $regex: fileTypeGlob, $options: "" } },
            { "files.stage_id": stageFromId },
          ],
        },
      },
      {
        $project: {
          sample_id: "$uuid",
          sample_name: "$name",
          file_id: "$files.uuid",
          stage_id: "$files.stage_id",
          stage_name: stageFromObject.name,
          file_path: "$files.path",
          file_type: "$files.type",
        },
      },
    ]);

    const runFiles = filteredSamples.map((sample) => ({
      run_id: newRun.uuid,
      file_id: sample.file_id,
    }));

    await RunFiles.insertMany(runFiles);

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
      }

      stageIds.push(stage.uuid);
    }

    // Add to run_stages
    const runStages = stageIds.map((stageId) => ({
      run_id: newRun.uuid,
      stage_id: stageId,
    }));

    await RunStages.insertMany(runStages);

    const filteredStages = await Promise.all(
      runStages.map(async (runStage) => {
        const stage = await Stages.findOne({ uuid: runStage.stage_id });
        return {
          stage_id: runStage.stage_id,
          stage_name: stage ? stage.name : "Unknown",
        };
      })
    );

    const resultSamples = filteredSamples.map((sample) => {
      return {
        sample_path: sample.file_path,
        sample_name: sample.sample_name,
        sample_type: sample.file_type,
        sample_id: sample.sample_id,
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
