import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Runs from "../../../models/Runs";
import Users from "../../../models/Users";
import bcrypt from "bcrypt";

dotenv.config();

interface Run {
  uuid: string;
  name: string;
  accessId: string;
  userId: string;
  runtime: string;
  config: object;
  status: string;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
describe("Users statistics calls", () => {
  let token: string;
  let userId: string;
  let latestRun: Run;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({});
      await Runs.deleteMany({});
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      throw err;
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("11111", salt);

      await Users.create({
        email: "sample@organization.com",
        firstName: "Sample",
        lastName: "Organization",
        user_role: "organization",
        passwordHash,
        organizationId: "00000",
        username: "sampleorg",
      });

      const createdUser = await request(app).post("/auth/register").send({
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        email: "john.doe@example.com",
        password: "password123",
        user_role: "user",
        organizationId: "22222",
      });

      userId = createdUser.body.uuid;

      const res = await request(app).post("/auth/login").send({
        email: "john.doe@example.com",
        password: "password123",
      });
      token = res.body.token;

      const newRun1 = new Runs({
        name: "Test Run NEW",
        accessId: "access123",
        userId: userId,
        runtime: "10m",
        config: { key: "value" },
        status: "finished",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      });

      await newRun1.save();
      const newRun2 = new Runs({
        name: "Test Run 2",
        accessId: "access1234",
        userId: userId,
        runtime: "10m",
        config: { key: "value" },
        status: "finished",
      });

      latestRun = await newRun2.save();

      const newRun3 = new Runs({
        name: "exotic name",
        accessId: "access1234",
        userId: "24575",
        runtime: "10m",
        config: { key: "value" },
        status: "interrupted",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3), // 3 days ago
      });

      await newRun3.save();

      const newRun4 = new Runs({
        name: "exotic name",
        accessId: "access1234",
        userId: userId,
        runtime: "10m",
        config: { key: "value" },
        status: "interrupted",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 6), // 6 days ago
      });

      await newRun4.save();
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    await Users.deleteMany({});
    await Runs.deleteMany({});
    await mongoose.connection.close();
  });

  it("should return statistics for the user", async () => {
    const res = await request(app)
      .get("/user/statistics")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.successful_runs).toBe(2);
    expect(res.body.interrupted_runs).toBe(1);
    expect(res.body.failed_runs).toBe(0);
    expect(res.body.latest_run.uuid).toBe(latestRun.uuid);
    expect(res.body.latest_run.name).toBe(latestRun.name);
    expect(res.body.latest_run.accessId).toBe(latestRun.accessId);
    expect(res.body.latest_run.userId).toBe(latestRun.userId);
    expect(res.body.latest_run.runtime).toBe(latestRun.runtime);
    expect(res.body.latest_run.config).toEqual(latestRun.config);
    expect(res.body.latest_run.status).toBe(latestRun.status);
    expect(new Date(res.body.latest_run.createdAt)).toEqual(
      latestRun.createdAt
    );
    expect(new Date(res.body.latest_run.updatedAt)).toEqual(
      latestRun.updatedAt
    );
  });

  it("shouldn't return statistics for the user with role 'organization'", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "sample@organization.com", password: "11111" });
    const token1 = login.body.token;
    const res = await request(app)
      .get("/user/statistics")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(409);
  });
});
