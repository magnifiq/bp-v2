import { Router } from "express";
import {
  getDiseaseById,
  queryDiseases,
} from "../controllers/tool/diseases/diseases";

const toolRouter = Router();

toolRouter.get("/disease/:id", getDiseaseById);
toolRouter.get("/disease", queryDiseases);
export default toolRouter;
