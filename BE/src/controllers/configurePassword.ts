import { Request, Response } from "express";
import bcrypt from "bcrypt";
import Users from "../models/Users";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      throw new Error("Unauthorized user");
    }
    const { newPassword } = req.body;

    const userId = req.user.id;
    const user = await Users.findById(userId);

    if (!user) {
      throw new Error("User does not exist");
    }
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    user.passwordHash = newPasswordHash;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};
