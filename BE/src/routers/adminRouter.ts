import { Router } from "express";
import { authenticateJWT } from "../middlewares/authMiddleware";
import {
  createOrganization,
  updateOrganization,
  findOrganization,
  fetchAllOrganizations,
  deleteOrganization,
} from "../controllers/admin/organizations/organizations";

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
export default adminRouter;
