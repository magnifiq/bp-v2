import { Response } from "express";
import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../utils/common";

import Users from "../../../models/Users";
import { checkAdminRole } from "../../../utils/admin";
import dotenv from "dotenv";
import UserProjects from "../../../models/UserProjects";

dotenv.config();

export const createUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const { first_name, last_name, email, organization_id } = req.body;

    const user = new Users({
      firstName: first_name,
      lastName: last_name,
      email,
      user_role: "user",
      organizationId: organization_id,
      username: email,
      passwordHash: "2222",
    });

    await user.save();

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
      "Set your password for user",
      `The admin has created the user. Click here to set password: ${resetLink}`
    );

    res.status(200).json({ user_id: user.uuid, created_at: user.createdAt });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when creating a user by admin",
        });
      }
    }
  }
};

export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const { id: user_id } = req.params;
    const updatedFields = req.body;
    const user = await Users.findOne({ uuid: user_id, deletedAt: null });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const fieldMappings: Record<string, string> = {
      last_name: "lastName",
      first_name: "firstName",
      email: "email",
      username: "username",
    };

    Object.keys(updatedFields).forEach((key) => {
      const mappedKey = fieldMappings[key] || key;
      if (fieldMappings[key] && updatedFields[key] !== undefined) {
        (user as any)[mappedKey] = updatedFields[key];
      }
    });

    await user.save();

    res.status(200).json({ user_id: user.uuid, updated_at: user.updatedAt });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when updating a user by admin",
        });
      }
    }
  }
};

export const findUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const { id: user_id } = req.params;
    const user = await Users.findOne({ uuid: user_id, deletedAt: null });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ user });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when finding a user by admin",
        });
      }
    }
  }
};

export const fetchAllUsers = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    checkAdminRole(req);
    const users = await Users.find({ deletedAt: null });
    if (users.length === 0) {
      res.status(402).json({ message: "There are no users" });
      return;
    }
    res.status(200).json({ users });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when fetching users by admin",
        });
      }
    }
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    checkAdminRole(req);
    const { id: user_id } = req.params;
    const user = await Users.findOne({ uuid: user_id, deletedAt: null });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    await user.softDelete();

    const pair = await UserProjects.findOne({
      userId: user_id,
      deletedAt: null,
    });
    if (!pair) {
      res.status(405).json({ message: "This user doesn't have any projects" });
      return;
    }

    await pair.softDelete();

    res.status(200).json({ user_id: user.uuid, deleted_at: user.deletedAt });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when deleting a user by admin",
        });
      }
    }
  }
};
