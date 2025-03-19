import { Response, Request } from "express";
import bcrypt from "bcrypt";
import Users from "../models/Users";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/common";
import dotenv from "dotenv";

dotenv.config();

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

interface RequestWithNoLogin extends Request {
  body: { token: string; newPassword: string };
}

export const resetPasswordWithoutLogin = async (
  req: RequestWithNoLogin,
  res: Response
): Promise<void> => {
  try {
    if (!req.body || !req.body.token || !req.body.newPassword) {
      res.status(400).json({ message: "Token and new password are required" });
      return;
    }
    const { token, newPassword } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (error) {
      res.status(400).json({ message: "Invalid or expired token" });
      return;
    }

    const { userId } = decoded as { userId: string };

    const user = await Users.findOne({ uuid: userId });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = passwordHash;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password" });
  }
};

export const resendResetLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const resetToken = jwt.sign(
      { userId: user.uuid },
      process.env.JWT_SECRET as string,
      { expiresIn: "24h" }
    );

    const BASE_URL =
      process.env.NODE_ENV === "production"
        ? process.env.PROD_URL
        : `http://localhost:${process.env.PORT}`;

    const resetLink = `${BASE_URL}/reset-token-password?token=${resetToken}`;

    await sendEmail(
      email,
      "Password Reset Link (New)",
      `Your previous reset link expired. Click here for a new one: ${resetLink}`
    );

    res.status(200).json({ message: "New reset link sent" });
  } catch (error) {
    res.status(500).json({ message: "Error sending reset link" });
  }
};
