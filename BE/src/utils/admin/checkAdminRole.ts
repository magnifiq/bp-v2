import { AuthenticatedRequest } from "../../middlewares/authMiddleware";

export const checkAdminRole = (req: AuthenticatedRequest) => {
  if (!req.user || !req.user.id || !req.user.role) {
    throw new Error("Unauthorized access");
  }

  const { role } = req.user;
  if (role !== "admin") {
    throw new Error("The user doesn't have the 'admin' role");
  }
};
