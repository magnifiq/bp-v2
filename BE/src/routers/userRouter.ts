import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { getStatistics } from "../controllers/user/statistics/statistics";

const userRouter = Router();

userRouter.get("/statistics", authenticateJWT, getStatistics);

export default userRouter;
