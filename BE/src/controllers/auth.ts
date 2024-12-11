import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Users from "../models/Users";
import dotenv from "dotenv";
import { AccessKeyRequest } from "../middlewares/toolAuthMiddleware";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      user_role,
      organizationId,
    } = req.body;

    const user = await Users.findOne({ email });

    if (user) {
      throw new Error("User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new Users({
      firstName,
      lastName,
      username,
      email,
      passwordHash,
      user_role,
      organizationId,
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await Users.findOne({ email });

    if (!user) {
      throw new Error("User does not exist");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.uuid, role: user.user_role },
      JWT_SECRET as string,
      {
        expiresIn: JWT_EXPIRATION,
      }
    );

    res.status(200).json({ token, id: user.uuid, user_role: user.user_role });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

export const toolAuth = async (
  req: AccessKeyRequest,
  res: Response
): Promise<void> => {
  try {
    const { user, accessKey } = req;

    if (!user || !accessKey) {
      res.status(400).json({ message: "User or access key not found." });
      return;
    }

    res.status(200).json({
      access_key: accessKey.uuid,
      username: user.username,
      user_id: user.id,
      user_role: user.user_role,
      organization_id: user.organizationId,
      organisation_name: user.organizationName || "Unknown",
      key_type: accessKey.licenseType,
      expire_at: accessKey.expireAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error." });
    }
  }
};
