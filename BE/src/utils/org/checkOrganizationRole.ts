import { AuthenticatedRequest } from "../../middlewares/authMiddleware";

export const checkOrganizationRole = (
  req: AuthenticatedRequest
): { id: string; role: string } => {
  if (!req.user || !req.user.id || !req.user.role) {
    throw new Error("Unauthorized access");
  }

  const { id, role } = req.user;
  if (role !== "organization") {
    throw new Error("The user doesn't have the organization role");
  }

  return { id, role };
};
