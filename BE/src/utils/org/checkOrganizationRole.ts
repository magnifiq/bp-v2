import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";

export const checkOrganizationRole = (
  req: AuthenticatedRequest,
  res: Response
): { id: string; role: string } | null => {
  if (!req.user || !req.user.id || !req.user.role) {
    res.status(403).json({ message: "Unauthorized access" });
    return null;
  }

  const { id, role } = req.user;
  if (role !== "organization") {
    res
      .status(403)
      .json({ message: "A user doesn't have the organization role" });
    return null;
  }

  return { id, role };
};
