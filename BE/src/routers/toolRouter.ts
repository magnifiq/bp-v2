import { Router } from "express";
import {
  getDiseaseById,
  queryDiseases,
} from "../controllers/tool/diseases/diseases";
import { validateAccessKeyMiddleware } from "../middlewares/validateAccessKeyMiddleware";
import {
  getProjectById,
  createProject,
  queryProjects,
} from "../controllers/tool/projects/projects";
import { updateRun } from "../controllers/tool/runs/runs";

const toolRouter = Router();

toolRouter.get("/disease/:id", getDiseaseById);
toolRouter.get("/disease", queryDiseases);

toolRouter.get("/project/:id", validateAccessKeyMiddleware, getProjectById);
toolRouter.get("/project", validateAccessKeyMiddleware, queryProjects);
toolRouter.post("/project", validateAccessKeyMiddleware, createProject);

toolRouter.put("/run/:run_id", validateAccessKeyMiddleware, updateRun);
export default toolRouter;
