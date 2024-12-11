import express from "express";
import { register, login } from "./controllers/auth";
import { resetPassword } from "./controllers/configurePassword";
import { authenticateJWT } from "./middlewares/authMiddleware";
import { validateToolAuth } from "./middlewares/toolAuthMiddleware";
import { toolAuth } from "./controllers/auth";

const app = express();

app.use(express.json());

// auth routes
app.post("/register", register);
app.post("/login", login);
app.post("/reset-password", authenticateJWT, resetPassword);
app.post("/tool-auth", validateToolAuth, toolAuth);
export default app;
