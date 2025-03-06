import { AuthenticatedRequest } from "../../middlewares/authMiddleware";

export const checkUserRole = (
  req: AuthenticatedRequest
): { id: string; role: string } => {
  if (!req.user || !req.user.id || !req.user.role) {
    throw new Error("Unauthorized access");
  }

  const { id, role } = req.user;
  if (role !== "user") {
    throw new Error("The user doesn't have the 'user' role");
  }

  return { id, role };
};
