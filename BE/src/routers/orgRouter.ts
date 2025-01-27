import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import {
  addUserToOrganization,
  findUsersInOrganization,
  updateOrganizationUser,
  findUserById,
  deleteUserFromOrganization,
} from "../controllers/org/orgUser/orgUser";

const orgRouter = Router();

// user-associated routes
orgRouter.post("/user", authenticateJWT, addUserToOrganization);
orgRouter.put("/user/:id", authenticateJWT, updateOrganizationUser);
orgRouter.get("/user", authenticateJWT, findUsersInOrganization);
orgRouter.get("/user/:id", authenticateJWT, findUserById);
orgRouter.delete("/user/:id", authenticateJWT, deleteUserFromOrganization);

export default orgRouter;
