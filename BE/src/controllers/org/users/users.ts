import { Response } from "express";
import Users from "../../../models/Users";
import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import {
  checkOrganizationRole,
  findUserAndCheckOrganization,
} from "../../../utils/org";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../utils/common";
import dotenv from "dotenv";

dotenv.config();

export const addUserToOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { firstName, lastName, email, role } = req.body;

    const { id } = checkOrganizationRole(req);

    const newUser = new Users({
      firstName,
      lastName,
      email,
      user_role: role,
      organizationId: id,
      username: email,
      passwordHash: "73jes",
    });

    await newUser.save();

    const resetToken = jwt.sign(
      { userId: newUser.uuid },
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
      `The organization has created the user. Click here to set password: ${resetLink}`
    );
    res
      .status(201)
      .json({ user_id: newUser.uuid, created_at: newUser.createdAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the organization role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      } else {
        console.error(
          "Error when adding a new user to the organization:",
          error
        );
        res.status(500).json({
          message: "Unknown error when adding a new user to the organization",
        });
      }
    }
  }
};

export const updateOrganizationUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: user_id } = req.params;
    const updatedFields = req.body;

    const { id } = checkOrganizationRole(req);

    const user = await findUserAndCheckOrganization(user_id, id);

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
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
      } else if (
        error.message === "The user doesn't have the organization role"
      ) {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      } else {
        console.error("Error when updating the user:", error.message);
        res.status(500).json({ message: "Error when updating the user" });
      }
    } else {
      console.error("Unknown error when updating the user:", error);
      res.status(500).json({ message: "Unknown error when updating the user" });
    }
  }
};

export const findUsersInOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = checkOrganizationRole(req);

    const users = await Users.find({ organizationId: id, deletedAt: null });

    res.status(200).json(users);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the organization role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      }
    } else {
      console.error("Error when fetching users by organization:", error);
      res
        .status(500)
        .json({ message: "Unknown error when fetching users by organization" });
    }
  }
};

export const findUserById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: user_id } = req.params;
    const { id } = checkOrganizationRole(req);

    const user = await findUserAndCheckOrganization(user_id, id);
    res.status(200).json(user);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
      } else if (
        error.message === "The user doesn't have the organization role"
      ) {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      } else {
        console.error("Error when fetching user by ID:", error.message);
        res.status(500).json({ message: "Error when fetching user by ID" });
      }
    } else {
      console.error("Unknown error when fetching user by ID:", error);
      res
        .status(500)
        .json({ message: "Unknown error when fetching user by ID" });
    }
  }
};

export const deleteUserFromOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: user_id } = req.params;
    const { id } = checkOrganizationRole(req);
    const user = await findUserAndCheckOrganization(user_id, id);
    await user.softDelete();

    res.status(200).json({ user_id: user.uuid, deleted_at: user.deletedAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
      } else if (
        error.message === "The user doesn't have the organization role"
      ) {
        res
          .status(409)
          .json({ message: "The user doesn't have the organization role" });
      } else {
        console.error(
          "Error when deleting a user from the organization:",
          error.message
        );
        res.status(500).json({
          message: "Error when deleting a user from the organization",
        });
      }
    } else {
      console.error(
        "Unknown error when deleting a user from the organization:",
        error
      );
      res.status(500).json({
        message: "Unknown error when deleting a user from the organization",
      });
    }
  }
};
