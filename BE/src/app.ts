import express from "express";
import orgRouter from "./routers/orgRouter";
import userRouter from "./routers/userRouter";
import adminRouter from "./routers/adminRouter";
import toolRouter from "./routers/toolRouter";
import authRouter from "./routers/authRouter";

const app = express();

app.use(express.json());

// auth routes
app.use("/auth", authRouter);

//org routes
app.use("/org", orgRouter);

//user routes
app.use("/user", userRouter);

//admin routes
app.use("/admin", adminRouter);

// tool routes
app.use("/tool", toolRouter);

export default app;
