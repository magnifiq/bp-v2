import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Users from "../../../models/Users";
import Runs from "../../../models/Runs";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import RunFiles from "../../../models/RunFiles";
import Stages from "../../../models/Stages";
import RunStages from "../../../models/RunStages";

dotenv.config();

describe("Admin runs CRUD calls", () => {
  let token: string;
  let runId: string;
  let userId: string;
  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({});
      await Runs.deleteMany({});
      await Samples.deleteMany({});
      await Files.deleteMany({});
      await RunFiles.deleteMany({});
      await Stages.deleteMany({ name: { $ne: "import" } });
      await RunStages.deleteMany({});

      const org = await Users.create({
        email: "sample@organization.com",
        firstName: "Sample",
        lastName: "Organization",
        user_role: "organization",
        passwordHash: "12345",
        organizationId: "00000",
        username: "sampleorg",
      });

      const orgId = org.uuid;

      const newUser = new Users({
        firstName: "Asti",
        username: "asti",
        lastName: "Sample",
        email: "asti@example.com",
        user_role: "user",
        organizationId: orgId,
        passwordHash: "11223",
      });

      await newUser.save();

      userId = newUser.uuid;

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

      const newRun1 = new Runs({
        name: "Test Run NEW",
        accessId: "access123",
        userId,
        runtime: "10m",
        config: { key: "value" },
        status: "started",
      });

      await newRun1.save();
      const newRun2 = new Runs({
        name: "Test Run 2",
        accessId: "access1234",
        userId,
        runtime: "10m",
        config: { key: "value" },
        status: "started",
      });

      await newRun2.save();

      const newRun3 = new Runs({
        name: "exotic name",
        accessId: "access1234",
        userId: "321",
        runtime: "10m",
        config: { key: "value" },
        status: "started",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3), // 3 days ago
      });

      await newRun3.save();

      const newSample = new Samples({
        name: "Sample test",
        projectId: "project123",
      });

      await newSample.save();
      const newSampleId = newSample.uuid;
      const newFile = new Files({
        sampleId: newSampleId,
        referenceId: "ref123",
        name: "file1",
        stageId: "stage123",
        path: "path/to/file",
        type: "normal",
        ext: "bam",
      });
      await newFile.save();

      const newFileId = newFile.uuid;

      const newStage1 = new Stages({
        name: "Stage 1",
        method: "meth1",
        args: {},
      });

      await newStage1.save();

      const newStage2 = new Stages({
        name: "Stage 2",
        method: "meth2",
        args: {},
      });

      await newStage2.save();

      const createdRun = await Runs.findOne({ name: "Test Run NEW" });
      if (!createdRun) {
        throw new Error("Run not found");
      }
      runId = createdRun.uuid;

      const newPairSampleFile = new RunFiles({
        runId: runId,
        fileId: newFileId,
        status: "started",
      });

      await newPairSampleFile.save();

      const newRunStage1 = new RunStages({
        runId: runId,
        stageId: newStage1.uuid,
        status: "started",
      });

      await newRunStage1.save();

      const newRunStage2 = new RunStages({
        runId: runId,
        stageId: newStage2.uuid,
        status: "started",
      });

      await newRunStage2.save();
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
    await Runs.deleteMany({});
    await Samples.deleteMany({});
    await Files.deleteMany({});
    await RunFiles.deleteMany({});
    await Stages.deleteMany({ name: { $ne: "import" } });
    await RunStages.deleteMany({});
    await mongoose.connection.close();
  });

  it("should fetch all runs", async () => {
    const res = await request(app)
      .get("/admin/run")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(3);
    expect(res.body.some((run: any) => run.name === "Test Run NEW")).toBe(true);
  });

  it("should fetch a run by ID", async () => {
    const res = await request(app)
      .get(`/admin/run/${runId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("uuid", runId);
    expect(res.body).toHaveProperty("name", "Test Run NEW");
  });

  it("should fetch run with a specific id", async () => {
    const res = await request(app)
      .get("/admin/run")
      .query({ id: runId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("uuid", runId);
    expect(res.body).toHaveProperty("name", "Test Run NEW");
  });

  it("should fetch runs with a specific name", async () => {
    const res = await request(app)
      .get("/admin/run")
      .query({ name: "Test Run NEW" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
  });

  it("should fetch runs with a specific regex", async () => {
    const res = await request(app)
      .get("/admin/run")
      .query({ name: "Test Run" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(2);
  });

  it("should fetch runs within a date range", async () => {
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const endDate = new Date().toISOString(); // now

    const res = await request(app)
      .get("/admin/run")
      .query({ start_at: startDate, end_at: endDate })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(2);
  });

  it("should fetch runs with a specific status", async () => {
    const res = await request(app)
      .get("/admin/run")
      .query({ status: "started" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.some((run: any) => run.status === "started")).toBe(true);
  });

  it("should fetch runs by user name", async () => {
    const res = await request(app)
      .get("/admin/run")
      .query({ user_name: "asti" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(2);
  });

  it("should fetch runs by sample regex", async () => {
    const res = await request(app)
      .get("/admin/run")
      .query({ sample: "Sample" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
  });

  it("should fetch runs by stage regex", async () => {
    const res = await request(app)
      .get("/admin/run")
      .query({ stage: "Stage" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
  });

  it("should fetch runs with multiple query parameters", async () => {
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const endDate = new Date().toISOString(); // now

    const res = await request(app)
      .get("/admin/run")
      .query({
        name: "Test Run",
        start_at: startDate,
        end_at: endDate,
        status: "started",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.some((run: any) => run.name === "Test Run NEW")).toBe(true);
    expect(res.body.some((run: any) => run.status === "started")).toBe(true);
  });

  it("should delete a run by admin", async () => {
    const res = await request(app)
      .delete(`/admin/run/${runId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("deleted_at");
  });

  it("should return 404 when admin tries to delete a run that is not found", async () => {
    const res = await request(app)
      .delete("/admin/run/1234")
      .set("Authorization", `Bearer ${token}`);

    expect(JSON.parse(res.text)).toEqual("Run isn't found");
  });
});
