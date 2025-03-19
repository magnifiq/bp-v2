import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { getStatistics } from "../controllers/user/statistics/statistics";
import {
  findRunById,
  deleteUserRun,
  queryRuns,
} from "../controllers/user/runs/runs";

import {
  findUserProject,
  fetchAllProjects,
  createUserProject,
} from "../controllers/user/projects/projects";

const userRouter = Router();

userRouter.get("/statistics", authenticateJWT, getStatistics);
userRouter.get("/run/:id", authenticateJWT, findRunById);
userRouter.delete("/run/:id", authenticateJWT, deleteUserRun);
userRouter.get("/run", authenticateJWT, queryRuns);

userRouter.get("/project/:id", authenticateJWT, findUserProject);
userRouter.get("/project", authenticateJWT, fetchAllProjects);
userRouter.post("/project/create", authenticateJWT, createUserProject);
export default userRouter;
