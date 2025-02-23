import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import {
  addUserToOrganization,
  findUsersInOrganization,
  updateOrganizationUser,
  findUserById,
  deleteUserFromOrganization,
} from "../controllers/org/orgUser/orgUser";

import {
  findRunById,
  deleteRunFromOrganization,
  queryRuns,
} from "../controllers/org/orgRuns/orgRuns";

const orgRouter = Router();

// user-associated routes
orgRouter.post("/user", authenticateJWT, addUserToOrganization);
orgRouter.put("/user/:id", authenticateJWT, updateOrganizationUser);
orgRouter.get("/user", authenticateJWT, findUsersInOrganization);
orgRouter.get("/user/:id", authenticateJWT, findUserById);
orgRouter.delete("/user/:id", authenticateJWT, deleteUserFromOrganization);

//run-associated routes
orgRouter.get("/run/:id", authenticateJWT, findRunById);
orgRouter.delete("/run/:id", authenticateJWT, deleteRunFromOrganization);
orgRouter.get("/run", authenticateJWT, queryRuns);
// TODO: queryRns and findRuns combine because it will override
export default orgRouter;
