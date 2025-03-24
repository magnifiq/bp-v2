import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import {
  createOrganization,
  updateOrganization,
  findOrganization,
  fetchAllOrganizations,
  deleteOrganization,
} from "../controllers/admin/organizations/organizations";
import {
  createUser,
  deleteUser,
  fetchAllUsers,
  findUser,
  updateUser,
} from "../controllers/admin/users/users";

const adminRouter = Router();

// organization-associated routes
adminRouter.post("/create-organization", authenticateJWT, createOrganization);
adminRouter.put(
  "/update-organization/:id",
  authenticateJWT,
  updateOrganization
);
adminRouter.get("/organization/:id", authenticateJWT, findOrganization);
adminRouter.get("/organizations", authenticateJWT, fetchAllOrganizations);
adminRouter.delete("/organization/:id", authenticateJWT, deleteOrganization);

adminRouter.post("/user", authenticateJWT, createUser);
adminRouter.put("/user/:id", authenticateJWT, updateUser);
adminRouter.get("/user/:id", authenticateJWT, findUser);
adminRouter.get("/users", authenticateJWT, fetchAllUsers);
adminRouter.delete("/user/:id", authenticateJWT, deleteUser);
export default adminRouter;
