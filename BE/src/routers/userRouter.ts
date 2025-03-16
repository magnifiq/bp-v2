import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { getStatistics } from "../controllers/user/statistics/statistics";
import {
  findRunById,
  deleteUserRun,
  queryRuns,
} from "../controllers/user/runs/runs";

const userRouter = Router();

userRouter.get("/statistics", authenticateJWT, getStatistics);
userRouter.get("/run/:id", authenticateJWT, findRunById);
userRouter.delete("/run/:id", authenticateJWT, deleteUserRun);
userRouter.get("/run", authenticateJWT, queryRuns);
export default userRouter;
