import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import Users from "../../../models/Users";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { sendEmail } from "../../../utils/common";
import UserProjects from "../../../models/UserProjects";

dotenv.config();

jest.mock("../../../utils/common", () => ({
  sendEmail: jest
    .fn()
    .mockResolvedValue({ response: "Email sent successfully" }),
}));

describe("Admin user CRUD calls", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({});
      await UserProjects.deleteMany({});
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
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      process.exit(1);
    }
  });

  afterAll(async () => {
    await Users.deleteMany({});
    await UserProjects.deleteMany({});

    await mongoose.connection.close();
  });

  it("should add a new user to the organization", async () => {
    const res = await request(app)
      .post("/admin/user")
      .set("Authorization", `Bearer ${token}`)
      .send({
        first_name: "Katrine",
        last_name: "Sample",
        email: "katri@example.com",
        organization_id: "111",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("user_id");
    expect(res.body).toHaveProperty("created_at");

    // save the created user id for the next test
    userId = res.body.user_id;

    expect(sendEmail).toHaveBeenCalledWith(
      "katri@example.com",
      "Set your password for user",
      expect.stringContaining("Click here to set password")
    );
  });

  it("should update a user", async () => {
    const res = await request(app)
      .put(`/admin/user/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        first_name: "Katrine",
        last_name: "Sample",
        email: "newemail@gmail.com",
        username: "a",
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("user_id", userId);
    expect(res.body).toHaveProperty("updated_at");
  });

  it("should find a specific user", async () => {
    const res = await request(app)
      .get(`/admin/user/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    const user = await Users.findOne({ uuid: userId });
    expect(res.statusCode).toEqual(200);
    expect(res.body.user).toHaveProperty("uuid", user?.uuid);
    expect(res.body.user).toHaveProperty("firstName", user?.firstName);
    expect(res.body.user).toHaveProperty("lastName", user?.lastName);
    expect(res.body.user).toHaveProperty(
      "createdAt",
      user?.createdAt?.toISOString()
    );
  });

  it("should fetch all users", async () => {
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.users).toHaveLength(2);
  });

  it("shouldn't fetch all users if the user is not an admin", async () => {
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
      .get("/admin/users")
      .set("Authorization", `Bearer ${nonAdminToken}`);

    expect(res2.status).toBe(409);
    expect(res2.body).toHaveProperty(
      "message",
      "The user doesn't have the 'admin' role"
    );
  });

  it("should delete a user by admin and also remove access to all projects", async () => {
    const newPair = new UserProjects({
      userId,
      projectId: "1",
    });
    await newPair.save();

    const res = await request(app)
      .delete(`/admin/user/${userId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("user_id", userId);
    expect(res.body.deleted_at).not.toBeNull();
  });
});
