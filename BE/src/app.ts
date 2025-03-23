import express from "express";
import { register, login } from "./controllers/auth";
import {
  resetPassword,
  resetPasswordWithoutLogin,
  resendResetLink,
} from "./controllers/configurePassword";
import { authenticateJWT } from "./middlewares/authMiddleware";
import { validateToolAuth } from "./middlewares/toolAuthMiddleware";
import { toolAuth } from "./controllers/auth";
import orgRouter from "./routers/orgRouter";
import userRouter from "./routers/userRouter";
import adminRouter from "./routers/adminRouter";

const app = express();

app.use(express.json());

// auth routes
app.post("/register", register);
app.post("/login", login);
// this endpoint is used to reset passwords for newly created users and organizations
// and users who forget their passwords
app.post("/reset-token-password", resetPasswordWithoutLogin);
app.post("/resend-reset-token", resendResetLink);
app.post("/reset-password", authenticateJWT, resetPassword);
app.post("/tool-auth", validateToolAuth, toolAuth);
//add me endpoint

//org routes
app.use("/org", orgRouter);

//user routes
app.use("/user", userRouter);

//admin routes
app.use("/admin", adminRouter);

export default app;
