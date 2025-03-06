import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import {
  addUserToOrganization,
  findUsersInOrganization,
  updateOrganizationUser,
  findUserById,
  deleteUserFromOrganization,
} from "../controllers/org/users/users";

import {
  findRunById,
  deleteRunFromOrganization,
  queryRuns,
} from "../controllers/org/runs/runs";

import {
  findProjectInOrg,
  fetchAllProjects,
  addUserToProject,
  deleteUserFromProject,
  createProject,
} from "../controllers/org/projects/projects";

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

//projects-associated routes
orgRouter.get("/projects/:id", authenticateJWT, findProjectInOrg);
orgRouter.get("/projects", authenticateJWT, fetchAllProjects);
orgRouter.post("/project/create", authenticateJWT, createProject);
orgRouter.post("/add_to_project/:id", authenticateJWT, addUserToProject);
orgRouter.delete(
  "/delete_from_project/:id",
  authenticateJWT,
  deleteUserFromProject
);
export default orgRouter;
