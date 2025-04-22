import { Response } from "express";
import { ValidateAccessKeyRequest } from "../../../middlewares/validateAccessKeyMiddleware";
import Projects from "../../../models/Projects";
import UserProjects from "../../../models/UserProjects";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import Stages from "../../../models/Stages";
import Users from "../../../models/Users";

interface Sample {
  sample: string;
  name: string;
  ext: string;
  type: string;
  path: string;
  reference_id?: string;
}

export const createProject = async (
  req: ValidateAccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      user_id: userId,
      disease_id: diseaseId,
      name,
      description,
      samples,
      doi,
      link,
      source,
    } = req.body;
    const { accessKey } = req;
    if (!accessKey) {
      res.status(402).json({ message: "Access key not found" });
      return;
    }
    if (
      !name ||
      !diseaseId ||
      !description ||
      !samples ||
      !doi ||
      !link ||
      !source ||
      !userId
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    const { organizationId } = accessKey;
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
    res.status(200).json({
      project_id: newProjectSaved.uuid,
      name: newProjectSaved.name,
      samples: samples,
      created_at: newProjectSaved.createdAt,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Error with the project creation" });
  }
};

interface queryProps {
  name?: { $regex: string; $options: string };
  diseaseId?: string;
  description?: { $regex: string; $options: string };
  doi?: { $regex: string; $options: string };
  link?: { $regex: string; $options: string };
  source?: { $regex: string; $options: string };
  deletedAt: null;
  userId?: string;
  organizationId?: string;
}

export const queryProjects = async (
  req: ValidateAccessKeyRequest,
  res: Response
) => {
  try {
    const { disease_id, name, description, doi, link, source } = req.query;

    const { user_id } = req.body;
    const { accessKey } = req;
    if (!accessKey) {
      res.status(402).json({ message: "Access key not found" });
      return;
    }
    const user = await Users.findOne({ uuid: user_id, deletedAt: null });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const userRole = user.user_role;
    const organizationId = accessKey.organizationId;
    let projects = [];

    if (userRole === "organization") {
      projects = await Projects.find({
        organizationId,
        deletedAt: null,
      });
    } else if (userRole === "user") {
      projects = await Projects.find({
        organizationId,
        deletedAt: null,
        userId: user_id,
      });
    } else {
      projects = await Projects.find({
        deletedAt: null,
      });
    }
    const query: queryProps = { deletedAt: null };

    if (name) {
      query.name = { $regex: name as string, $options: "i" };
    }
    if (description) {
      query.description = { $regex: `.*${description}.*`, $options: "i" };
    }
    if (doi) {
      query.doi = { $regex: doi as string, $options: "i" };
    }
    if (link) {
      query.link = { $regex: link as string, $options: "i" };
    }
    if (source) {
      query.source = { $regex: source as string, $options: "i" };
    }
    if (disease_id) {
      query.diseaseId = typeof disease_id === "string" ? disease_id : undefined;
    }

    const filteredProjects = projects.filter((project) => {
      return Object.entries(query).every(([key, value]) => {
        if (value) {
          return new RegExp(value.$regex, value.$options).test(
            (project as Record<string, any>)[key]
          );
        }
        return true;
      });
    });
    res.status(200).json(filteredProjects);
  } catch (error) {
    console.error("Error querying projects:", error);
    res.status(500).json({ message: "Error when querying projects" });
  }
};

export const getProjectById = async (
  req: ValidateAccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { accessKey, user_id } = req.body;
    const user = await Users.findOne({ uuid: user_id, deletedAt: null });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const organizationId = accessKey.organizationId;
    const userRole = user.user_role;
    let project = null;
    if (userRole === "organization") {
      project = await Projects.findOne({
        organizationId,
        uuid: id,
        deletedAt: null,
      });
    } else if (userRole === "user") {
      project = await Projects.findOne({
        organizationId,
        uuid: id,
        deletedAt: null,
        userId: user_id,
      });
    } else {
      project = await Projects.findOne({
        deletedAt: null,
        uuid: id,
      });
    }

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching disease by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
