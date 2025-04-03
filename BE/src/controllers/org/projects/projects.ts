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
    const { id } = checkOrganizationRole(req);

    const project = await Projects.findOne({
      organizationId: id,
      uuid: project_id,
      deletedAt: null,
    });

    if (!project) {
      res.status(404).json("Run isn't found");
      return;
    }

    res.status(200).json(project);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the organization role") {
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
    const { id } = checkOrganizationRole(req);
    const projects = await Projects.find({
      organizationId: id,
      deletedAt: null,
    });
    res.status(200).json(projects);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the organization role") {
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
    const { id } = checkOrganizationRole(req);
    const { name, diseaseId, description, doi, link, source, samples } =
      req.body;
    if (
      !name ||
      !diseaseId ||
      !description ||
      !samples ||
      !doi ||
      !link ||
      !source
    ) {
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

    await newProject.save();
    const newProjectId = newProject.uuid;

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
    res.status(200).json(newProject);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the organization role") {
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

    const { id } = checkOrganizationRole(req);

    const user = await findUserAndCheckOrganization(user_id, id);

    const existingPair = await UserProjects.findOne({
      userId: user.uuid,
      projectId: project_id,
      deletedAt: null,
    });
    if (existingPair) {
      res.status(412).json({ message: "User is already added to the project" });
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

    const { id } = checkOrganizationRole(req);

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
      deletedAt: null,
    });
    if (!existingPair) {
      res.status(413).json({ message: "User isn't added to the project" });
      return;
    }
    await existingPair.softDelete();
    res
      .status(200)
      .json({ project_id, user_id, deleted_at: existingPair.deletedAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
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

export const deleteProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: project_id } = req.params;

    const { id } = checkOrganizationRole(req);
    const project = await Projects.findOne({
      uuid: project_id,
      organizationId: id,
      deletedAt: null,
    });

    if (!project) {
      res.status(404).json("Project isn't found");
      return;
    }

    const pairs = await UserProjects.find({
      projectId: project.uuid,
      deletedAt: null,
    });
    for (const pair of pairs) {
      await pair.softDelete();
    }

    await project.softDelete();

    res.status(200).json({ project_id, deleted_at: project.deletedAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when deleting a project",
        });
      }
    } else {
      console.error("Error when deleting a project by ID:", error);
      res.status(500).json({ message: "Error when deleting a project by ID" });
    }
  }
};
