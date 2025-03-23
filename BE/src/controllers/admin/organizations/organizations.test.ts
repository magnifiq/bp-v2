import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Organizations from "../../../models/Organizations";
import Users from "../../../models/Users";
import { sendEmail } from "../../../utils/common";
import bcrypt from "bcrypt";
import AccessKeys from "../../../models/AccessKeys";

dotenv.config();

jest.mock("../../../utils/common", () => ({
  sendEmail: jest
    .fn()
    .mockResolvedValue({ response: "Email sent successfully" }),
}));

describe("Admin calls for organizations", () => {
  let token: string;
  let resetToken: string;
  let createdOrganizationId: string | undefined;
  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({});
      await Organizations.deleteMany({});
      await AccessKeys.deleteMany({});
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("11111", salt);

    const adminUser = new Users({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      user_role: "admin",
      username: "admin@example.com",
      passwordHash: passwordHash,
      organizationId: "00000",
    });

    await adminUser.save();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "11111" });

    token = res.body.token;
  });

  afterAll(async () => {
    await Users.deleteMany({});
    await Organizations.deleteMany({});
    await AccessKeys.deleteMany({});
    await mongoose.connection.close();
  });

  it("should create an organization", async () => {
    jest.setTimeout(30000);

    const res = await request(app)
      .post("/admin/create-organization")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Test Org",
        description: "A test organization",
        email: "example@gmail.com",
        address: "123 Test St",
        city: "Test City",
        country: "Test Country",
        post_code: "12345",
        license_type: "trial",
      });

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();

    const organization = await Organizations.findOne({
      email: "example@gmail.com",
    });

    createdOrganizationId = organization?.uuid;
    expect(organization).not.toBeNull();
    expect(organization).toHaveProperty("name", "Test Org");

    const user = await Users.findOne({ email: "example@gmail.com" });
    expect(user).not.toBeNull();
    expect(user).toHaveProperty("organizationId", organization?.uuid);

    const accessKey = await AccessKeys.findOne({ name: "Test Org" });
    expect(accessKey).toHaveProperty("organizationId", organization?.uuid);

    expect(sendEmail).toHaveBeenCalledWith(
      "example@gmail.com",
      "Set your password for organization",
      expect.stringContaining("Click here to set password")
    );

    const mockedSendEmail = sendEmail as jest.Mock;
    const emailArgs = mockedSendEmail.mock.calls[0];
    const resetLink = emailArgs[2].match(/token=([^"]+)/)[1];
    resetToken = resetLink;
  });

  it("should reset the password after the creation of the user with 'organization' role", async () => {
    const newPassword = "newpassword123";

    const res = await request(app).post("/auth/reset-token-password").send({
      token: resetToken,
      newPassword: newPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Password reset successfully");

    const user = await Users.findOne({ email: "example@gmail.com" });
    expect(user).not.toBeNull();
    const isMatch = await bcrypt.compare(newPassword, user?.passwordHash || "");
    expect(isMatch).toBe(true);
  });

  it("should return 409 if the user is not an admin", async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("11111", salt);
    const nonAdminUser = new Users({
      firstName: "NonAdmin",
      lastName: "User",
      email: "nonadmin@example.com",
      user_role: "user",
      username: "nonadmin@example.com",
      passwordHash: passwordHash,
      organizationId: "1",
    });

    await nonAdminUser.save();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nonadmin@example.com", password: "11111" });

    const nonAdminToken = res.body.token;
    const res2 = await request(app)
      .post("/admin/create-organization")
      .set("Authorization", `Bearer ${nonAdminToken}`)
      .send({
        name: "Test Organization",
        description: "A test organization",
        email: "org@example.com",
        address: "123 Test St",
        city: "Test City",
        country: "Test Country",
        post_code: "12345",
        license_type: "basic",
      });

    expect(res2.status).toBe(409);
    expect(res2.body).toHaveProperty(
      "message",
      "The user doesn't have the 'admin' role"
    );
  });

  it("should find the specific organization", async () => {
    const res = await request(app)
      .get(`/admin/organization/${createdOrganizationId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name", "Test Org");
    expect(res.body).toHaveProperty("email", "example@gmail.com");
  });

  it("should return 404 if the organization is not found", async () => {
    const res = await request(app)
      .get(`/admin/organization/00000`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("should return all organizations", async () => {
    const res = await request(app)
      .get(`/admin/organizations`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it("should update the organization", async () => {
    const updatedDetails = {
      name: "Updated Org Name",
      description: "Updated description",
      email: "updatedemail@example.com",
    };
    const res = await request(app)
      .put(`/admin/update-organization/${createdOrganizationId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updatedDetails);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("org_id", createdOrganizationId);

    const organization = await Organizations.findOne({
      uuid: createdOrganizationId,
    });
    expect(organization).toHaveProperty("name", "Updated Org Name");
    expect(organization).toHaveProperty("description", "Updated description");
    expect(organization).toHaveProperty("email", "updatedemail@example.com");
  });

  it("should delete the organization", async () => {
    const res = await request(app)
      .delete(`/admin/organization/${createdOrganizationId}`)
      .set("Authorization", `Bearer ${token}`);

    const org = await Organizations.findOne({ uuid: createdOrganizationId });
    const deletedTime = org?.deletedAt?.toISOString();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("org_id", createdOrganizationId);
    expect(res.body).toHaveProperty("deleted_at", deletedTime);
  });

  it("shouldn't delete the organization if a user isn't admin", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nonadmin@example.com", password: "11111" });

    const nonAdminToken = res.body.token;

    const res2 = await request(app)
      .delete(`/admin/organization/${createdOrganizationId}`)
      .set("Authorization", `Bearer ${nonAdminToken}`);

    expect(res2.status).toBe(409);
    expect(res2.body).toHaveProperty(
      "message",
      "The user doesn't have the 'admin' role"
    );
  });
});
