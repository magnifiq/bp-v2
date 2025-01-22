import { Request, Response, NextFunction } from "express";
import AccessKeys from "../models/AccessKeys";
import Users from "../models/Users";
import { IAccessKey } from "../types";
import bcrypt from "bcrypt";
import Organizations from "../models/Organizations";

export interface AccessKeyRequest extends Request {
  user?: {
    id: string;
    username: string;
    user_role: string;
    organizationId: string;
    organizationName: string;
  };
  accessKey?: IAccessKey;
}

export const validateToolAuth = async (
  req: AccessKeyRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, password } = req.body;

    if (!password || !username) {
      res.status(400).json({ message: "Password and username are required." });
      return;
    }

    const foundUser = await Users.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!foundUser) {
      res.status(401).json({ message: "Username isn't correct" });
      return;
    }
    const isMatch = await bcrypt.compare(password, foundUser.passwordHash);

    if (!isMatch) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }

    const foundOrganization = await Organizations.findOne({
      uuid: foundUser.organizationId,
    });

    if (!foundOrganization) {
      res
        .status(401)
        .json({ message: "Organization not found for this user." });
      return;
    }
    const user = {
      id: (foundUser.uuid as string).toString(),
      username: foundUser.username,
      user_role: foundUser.user_role,
      organizationId: (foundOrganization.uuid as string).toString(),
      organizationName: foundOrganization.name,
    };

    if (!user) {
      res
        .status(401)
        .json({ message: "Invalid user or mismatched access key." });
      return;
    }

    const organizationAccessKey = await AccessKeys.findOne({
      organizationId: user.organizationId,
    });

    if (!organizationAccessKey) {
      res.status(401).json({
        message: "No access key found for the organization.",
        user: {
          username: user.username,
          id: user.id,
          organizationId: user.organizationId || null,
          organizationName: user.organizationName || null,
        },
      });
      return;
    }

    const currentDate = new Date();
    if (
      organizationAccessKey.expireAt &&
      currentDate > organizationAccessKey.expireAt
    ) {
      res.status(401).json({
        message: "Access key is expired.",
        key_details: {
          accessKeyId: organizationAccessKey.uuid,
          expireAt: organizationAccessKey.expireAt,
        },
      });
      return;
    }

    req.user = user; //userWithOrganization
    req.accessKey = organizationAccessKey;
    next();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Internal server error." });
    }
  }
};
