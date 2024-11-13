import express from "express";
import { register, login } from "./controllers/auth";
import { resetPassword } from "./controllers/configurePassword";
import { authenticateJWT } from "./middlewares/authMiddleware";
const app = express();

app.use(express.json());

// auth routes
app.post("/register", register);
app.post("/login", login);
app.post("/reset-password", authenticateJWT, resetPassword);
export default app;
