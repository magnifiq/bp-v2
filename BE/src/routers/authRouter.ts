import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { register, login, me } from "../controllers/auth/auth";
import {
  resetPassword,
  resetPasswordWithoutLogin,
  resendResetLink,
} from "../controllers/configurePassword";
import { validateToolAuth } from "../middlewares/toolAuthMiddleware";
import { toolAuth } from "../controllers/auth/auth";
import { validateAccessKeyMiddleware } from "../middlewares/validateAccessKeyMiddleware";

const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/login", login);
// this endpoint is used to reset passwords for newly created users and organizations
// and users who forget their passwords
authRouter.post("/reset-token-password", resetPasswordWithoutLogin);
authRouter.post("/resend-reset-token", resendResetLink);
authRouter.post("/reset-password", authenticateJWT, resetPassword);
authRouter.post("/tool-auth", validateToolAuth, toolAuth);
authRouter.post("/me", validateAccessKeyMiddleware, me);
export default authRouter;
