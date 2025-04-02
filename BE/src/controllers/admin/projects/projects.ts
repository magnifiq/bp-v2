import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import { Response } from "express";
import Projects from "../../../models/Projects";
import UserProjects from "../../../models/UserProjects";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import Stages from "../../../models/Stages";
import { checkAdminRole } from "../../../utils/admin";

interface Sample {
  sample: string;
  name: string;
  ext: string;
  type: string;
  path: string;
  reference_id?: string;
}

export const findProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const { id } = req.params;

    const project = await Projects.findOne({
      uuid: id,
      deletedAt: null,
    });

    if (!project) {
      res.status(404).json("Project isn't found");
      return;
    }

    res.status(200).json(project);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when searching a project by admin",
        });
      }
    } else {
      console.error("Error when fetching a project by ID:", error);
      res.status(500).json({ message: "Error when fetching project by ID" });
    }
  }
};

export const fetchAllProjects = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const projects = await Projects.find({ deletedAt: null });
    res.status(200).json(projects);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when fetching projects by admin",
        });
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
    checkAdminRole(req);
    const {
      name,
      organizationId,
      diseaseId,
      description,
      doi,
      link,
      source,
      samples,
      userId,
    } = req.body;

    if (
      !name ||
      !diseaseId ||
      !description ||
      !samples ||
      !organizationId ||
      !doi ||
      !link ||
      !source ||
      !userId
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    const newProject = new Projects({
      name,
      organizationId,
      diseaseId,
      description,
      doi,
      link,
      source,
    });

    const newProjectSaved = await newProject.save();
    const newProjectId = newProjectSaved.uuid;

    const newUserProjectPair = new UserProjects({
      userId,
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
      if (error.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when creating a project by admin",
        });
      }
    } else {
      console.error("Error when creating a project:", error);
      res.status(500).json({ message: "Error when creating a project" });
    }
  }
};

export const deleteProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const { id } = req.params;

    const project = await Projects.findOne({
      deletedAt: null,
      uuid: id,
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

    res.status(200).json({ project_id: id, deleted_at: project.deletedAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when deleting a project by admin",
        });
      }
    } else {
      console.error("Error when deleting a project by ID:", error);
      res.status(500).json({ message: "Error when deleting a project by ID" });
    }
  }
};
