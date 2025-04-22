import { Request, Response, NextFunction } from "express";
import AccessKeys from "../models/AccessKeys";

export interface ValidateAccessKeyRequest extends Request {
  accessKey?: {
    uuid: string;
    active: boolean;
    name: string;
    organizationId: string;
    licenseType: string;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    expireAt: Date;
  };
}
export const validateAccessKeyMiddleware = async (
  req: ValidateAccessKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { access_key } = req.body;
    const accessKey = await AccessKeys.findOne({
      uuid: access_key,
      active: true,
      deletedAt: null,
      expireAt: { $gte: new Date() },
    });
    if (!accessKey) {
      res.status(400).json({ message: "Invalid or expired access key" });
      return;
    }

    req.accessKey = accessKey;

    next();
  } catch (error) {
    console.error("Error validating access key:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
