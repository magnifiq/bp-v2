import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import { Response } from "express";
import { checkAdminRole } from "../../../utils/admin";
import { sendEmail } from "../../../utils/common";
import jwt from "jsonwebtoken";

import Organizations from "../../../models/Organizations";
import Users from "../../../models/Users";
import AccessKeys from "../../../models/AccessKeys";
import dotenv from "dotenv";

dotenv.config();

enum LicenseTypes {
  trial = "trial",
  standard = "standard",
}

const licenseDetails = {
  [LicenseTypes.trial]: {
    active: true,
    expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // valid for 7 days
  },
  [LicenseTypes.standard]: {
    active: true,
    expireAt: new Date(Infinity),
  },
};

export const createOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const {
      name,
      description,
      email,
      address,
      city,
      country,
      post_code,
      license_type,
    } = req.body;

    const organization = new Organizations({
      name,
      description,
      email,
      address,
      city,
      country,
      postCode: post_code,
    });

    await organization.save();
    const user = new Users({
      firstName: name,
      lastName: "organization",
      username: email,
      email,
      user_role: "organization",
      organizationId: organization.uuid,
      passwordHash: "1212",
    });

    await user.save();

    const licenseDetail = licenseDetails[license_type as LicenseTypes];

    const newAccessKey = new AccessKeys({
      name,
      organizationId: organization.uuid,
      licenseType: license_type,
      expireAt: licenseDetail.expireAt,
      active: licenseDetail.active,
    });

    await newAccessKey.save();

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
      "Set your password for organization",
      `The admin has created the organization. Click here to set password: ${resetLink}`
    );
    res.status(200).json({
      org_id: organization.uuid,
      created_at: organization.createdAt,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when creating organization by admin",
        });
      }
    } else {
      res.status(500).json({
        message: "Unknown error when creating organization by admin",
      });
    }
  }
};

interface Organization {
  uuid: string;
  name: string;
  description: string;
  email: string;
  address: string;
  city: string;
  country: string;
  postCode: number;
}

export const updateOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const { id: org_id } = req.params;
    const updatedDetails: Partial<Organization> = req.body;

    const organization = await Organizations.findOne({
      uuid: org_id,
    });
    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    Object.keys(updatedDetails).forEach((key) => {
      const orgKey = key as keyof Organization;
      if (updatedDetails[orgKey] !== undefined) {
        (organization as any)[orgKey] = updatedDetails[orgKey];
      }
    });

    await organization.save();

    res.status(200).json({
      org_id: organization.uuid,
      updated_at: organization.updatedAt,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when updating organization by admin",
        });
      }
    }
  }
};

export const findOrganization = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    checkAdminRole(req);
    const { id: org_id } = req.params;
    const organization = await Organizations.findOne({
      uuid: org_id,
      deletedAt: null,
    });
    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }
    res.status(200).json(organization);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when fetching organization by admin",
        });
      }
    }
  }
};

export const fetchAllOrganizations = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    checkAdminRole(req);
    const organizations = await Organizations.find({ deletedAt: null });
    res.status(200).json(organizations);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when fetching organizations by admin",
        });
      }
    }
  }
};

export const deleteOrganization = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    checkAdminRole(req);
    const { id: org_id } = req.params;
    const organization = await Organizations.findOne({
      uuid: org_id,
      deletedAt: null,
    });
    if (!organization) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }
    await organization.softDelete();
    res
      .status(200)
      .json({ org_id: organization.uuid, deleted_at: organization.deletedAt });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "The user doesn't have the 'admin' role") {
        res.status(409).json({
          message: "The user doesn't have the 'admin' role",
        });
      } else {
        res.status(500).json({
          message: "Error when deleting organization by admin",
        });
      }
    }
  }
};
