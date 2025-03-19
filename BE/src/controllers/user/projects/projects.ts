import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import { Response } from "express";
import { checkUserRole } from "../../../utils/user";
import Projects from "../../../models/Projects";
import UserProjects from "../../../models/UserProjects";
import Users from "../../../models/Users";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import Stages from "../../../models/Stages";

export const findUserProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: user_id } = checkUserRole(req);
    const { id: project_id } = req.params;
    const usersInProject = await UserProjects.find({
      projectId: project_id,
      deletedAt: null,
    });
    if (!usersInProject) {
      res.status(404).json("Project doesn't exist with this id");
      return;
    }
    const usersInProjectIds = usersInProject.map((user) => user.userId);
    if (!usersInProjectIds.includes(user_id)) {
      res.status(411).json("User doesn't have access to this project");
      return;
    }
    const project = await Projects.findOne({
      uuid: project_id,
      deletedAt: null,
    });

    if (!project) {
      res.status(409).json("Project isn't found");
      return;
    }

    res.status(200).json(project);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'user' role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the 'user' role" });
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
    const { id: user_id } = checkUserRole(req);
    const userProjects = await UserProjects.find({
      userId: user_id,
      deletedAt: null,
    });
    if (!userProjects) {
      res.status(404).json("User doesn't have any projects");
      return;
    }
    const userProjectsIds = userProjects.map((project) => project.projectId);

    const projects = await Projects.find({
      uuid: { $in: userProjectsIds },
      deletedAt: null,
    });
    res.status(200).json(projects);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'user' role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the 'user' role" });
      }
    } else {
      console.error("Error when fetching all projects:", error);
      res.status(500).json({ message: "Error when fetching all projects" });
    }
  }
};
interface Sample {
  sample: string;
  name: string;
  ext: string;
  type: string;
  path: string;
  reference_id?: string;
}

export const createUserProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: user_id } = checkUserRole(req);

    const foundUser = await Users.findOne({ uuid: user_id, deletedAt: null });
    if (!foundUser) {
      res.status(404).json("User isn't found");
      return;
    }
    const foundUserOrgId = foundUser.organizationId;
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
      organizationId: foundUserOrgId,
      diseaseId,
      description,
      doi,
      link,
      source,
    });

    const newProjectSaved = await newProject.save();
    const newProjectId = newProjectSaved.uuid;

    const newUserProjectPair = new UserProjects({
      userId: user_id,
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
      if (error.message === "The user doesn't have the 'user' role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the 'user' role" });
      }
    } else {
      console.error("Error when creating a project:", error);
      res.status(500).json({ message: "Error when creating a project" });
    }
  }
};
