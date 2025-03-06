import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import { Response } from "express";
import {
  checkOrganizationRole,
  findUserAndCheckOrganization,
} from "../../../utils/org";
import Projects from "../../../models/Projects";
import UserProjects from "../../../models/UserProjects";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import Stages from "../../../models/Stages";

interface Sample {
  sample: string;
  name: string;
  ext: string;
  type: string;
  path: string;
  reference_id?: string;
}

export const findProjectInOrg = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: project_id } = req.params;

    const orgInfo = checkOrganizationRole(req);

    const { id } = orgInfo;
    const project = await Projects.findOne({
      organizationId: id,
      uuid: project_id,
    });

    if (!project) {
      res.status(404).json("Run isn't found");
      return;
    }

    res.status(200).json(project);
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
      }
    } else {
      console.error("Error when fetching project by ID:", error);
      res.status(500).json({ message: "Error when fetching project by ID" });
    }
  }
};

export const fetchAllProjects = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const orgInfo = checkOrganizationRole(req);

    const { id } = orgInfo;
    const projects = await Projects.find({ organizationId: id });
    res.status(200).json(projects);
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
      }
    } else {
      console.error("Error when fetching all projects:", error);
      res.status(500).json({ message: "Error when fetching all projects" });
    }
  }
};

export const createProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const orgInfo = checkOrganizationRole(req);

    const { id } = orgInfo;
    const { name, diseaseId, description, doi, link, source, samples } =
      req.body;
    if (!name || !diseaseId || !description || !samples) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    const newProject = new Projects({
      name,
      organizationId: id,
      diseaseId,
      description,
      doi,
      link,
      source,
    });

    const newProjectSaved = await newProject.save();
    const newProjectId = newProjectSaved.uuid;

    const newUserProjectPair = new UserProjects({
      userId: id,
      projectId: newProjectId,
    });

    await newUserProjectPair.save();
    const importStage = await Stages.findOne({ name: "import" });
    if (!importStage) {
      throw new Error("No import stage found");
    }
    const importStageId = importStage.uuid;

    // we want to save samples in parallel
    await Promise.all(
      samples.map(async (sample: Sample) => {
        const newSample = new Samples({
          projectId: newProjectId,
          name: sample.sample,
        });

        const savedSample = await newSample.save();

        const newFile = new Files({
          sampleId: savedSample.uuid,
          referenceId: sample.reference_id,
          stageId: importStageId,
          name: sample.name,
          ext: sample.ext,
          type: sample.type,
          path: sample.path,
        });

        await newFile.save();
      })
    );
    res.status(200).json(newProjectSaved);
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
      }
    } else {
      console.error("Error when creating a project:", error);
      res.status(500).json({ message: "Error when creating a project" });
    }
  }
};

export const addUserToProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: project_id } = req.params;
    const { user_id } = req.body;
    const orgInfo = checkOrganizationRole(req);

    const { id } = orgInfo;

    const user = await findUserAndCheckOrganization(user_id, id);

    const existingPair = await UserProjects.findOne({
      userId: user.uuid,
      projectId: project_id,
    });
    if (existingPair) {
      res.status(409).json({ message: "User is already added to the project" });
      return;
    }
    const newUserProject = new UserProjects({
      userId: user.uuid,
      projectId: project_id,
    });

    const savedUserProject = await newUserProject.save();
    res.status(200).json({
      project_id,
      user_id: savedUserProject.userId,
      created_at: savedUserProject.createdAt,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
      } else if (error.message === "Unauthorized access") {
        res.status(401).json({ message: "Unauthorized access" });
      } else if (
        error.message === "The user doesn't have the organization role"
      ) {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      }
    } else {
      console.error("Error when adding a user to the project:", error);
      res
        .status(500)
        .json({ message: "Error when adding a user to the project" });
    }
  }
};

export const deleteUserFromProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: project_id } = req.params;
    const { user_id } = req.body;
    const orgInfo = checkOrganizationRole(req);

    const { id } = orgInfo;
    if (user_id === id) {
      res
        .status(407)
        .json({ message: "Can't delete yourself from the project" });
      return;
    }
    const user = await findUserAndCheckOrganization(user_id, id);
    const existingPair = await UserProjects.findOne({
      userId: user.uuid,
      projectId: project_id,
    });
    if (!existingPair) {
      res.status(409).json({ message: "User isn't added to the project" });
      return;
    }
    const deletedAt = new Date();
    await existingPair.deleteOne({});
    res.status(200).json({ project_id, user_id, deleted_at: deletedAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
      } else if (error.message === "Unauthorized access") {
        res.status(401).json({ message: "Unauthorized access" });
      } else if (
        error.message === "The user doesn't have the organization role"
      ) {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      }
    } else {
      console.error("Error when deleting a user from the project:", error);
      res
        .status(500)
        .json({ message: "Error when deleting a user from the project" });
    }
  }
};
