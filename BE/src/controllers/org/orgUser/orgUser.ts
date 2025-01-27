import { Response } from "express";
import bcrypt from "bcrypt";
import Users from "../../../models/Users";
import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import {
  checkOrganizationRole,
  findUserAndCheckOrganization,
} from "../../../utils/org";

export const addUserToOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { firstName, lastName, email, role } = req.body;

    const userInfo = checkOrganizationRole(req, res);
    if (!userInfo) return;

    const { id } = userInfo;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("20GenFlow25", salt);

    // all added users must reset passwords after first login, the first password is "20GenFlow25"
    const newUser = new Users({
      firstName,
      lastName,
      email,
      user_role: role,
      organizationId: id,
      username: email,
      passwordHash,
    });

    try {
      await newUser.save();
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          "Error when adding a new user to the organization:",
          error.message
        );
        res.status(500).json({
          message: "Error when adding a new user to the organization",
        });
      } else {
        console.error(
          "Unknown error when adding a new user to the organization:",
          error
        );
        res.status(500).json({
          message: "Unknown error when adding a new user to the organization",
        });
      }
      return;
    }

    res
      .status(201)
      .json({ user_id: newUser.uuid, created_at: newUser.createdAt });
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        "Error when adding a new user to the organization:",
        error.message
      );
      res
        .status(500)
        .json({ message: "Error when adding a new user to the organization" });
    } else {
      console.error(
        "Unknown error when adding a new user to the organization:",
        error
      );
      res.status(500).json({
        message: "Unknown error when adding a new user to the organization",
      });
    }
  }
};

export const updateOrganizationUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: user_id } = req.params;
    const { first_name, last_name, email } = req.body;

    const userInfo = checkOrganizationRole(req, res);
    if (!userInfo) return;

    const { id } = userInfo;

    const user = await findUserAndCheckOrganization(user_id, id);
    user.firstName = first_name;
    user.lastName = last_name;
    user.email = email;
    await user.save();

    res.status(200).json({ user_id: user.uuid, updated_at: user.updatedAt });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
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
    const userInfo = checkOrganizationRole(req, res);
    if (!userInfo) return;

    const { id } = userInfo;

    const users = await Users.find({ organizationId: id });

    res.status(200).json(users);
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        "Error when fetching users by organization:",
        error.message
      );
      res
        .status(500)
        .json({ message: "Error when fetching users by organization" });
    } else {
      console.error(
        "Unknown error when fetching users by organization:",
        error
      );
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

    const userInfo = checkOrganizationRole(req, res);
    if (!userInfo) return;

    const { id } = userInfo;

    const user = await findUserAndCheckOrganization(user_id, id);
    res.status(200).json(user);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
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

    const userInfo = checkOrganizationRole(req, res);
    if (!userInfo) return;

    const { id } = userInfo;
    const user = await findUserAndCheckOrganization(user_id, id);
    await Users.deleteOne({ uuid: user_id });

    res.status(200).json({ user_id: user.uuid, deleted_at: new Date() });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
      } else if (error.message === "User not in the organization") {
        res.status(403).json({ message: "User not in the organization" });
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
