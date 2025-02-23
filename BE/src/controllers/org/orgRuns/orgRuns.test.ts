import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import Users from "../../../models/Users";
import Runs from "../../../models/Runs";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import RunFiles from "../../../models/RunFiles";
import dotenv from "dotenv";
import Stages from "../../../models/Stages";
import RunStages from "../../../models/RunStages";
dotenv.config();

describe("Organization runs CRUD calls", () => {
  let token: string;
  let userId: string;
  let runId: string;
  let runOutsideOrgId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({ email: "asti@example.com" });
      await Runs.deleteMany({});
      await Samples.deleteMany({});
      await Files.deleteMany({});
      await RunFiles.deleteMany({});
      await Stages.deleteMany({ name: { $ne: "import" } });
      await RunStages.deleteMany({});
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      throw err;
    }

    try {
      const res = await request(app)
        .post("/login")
        .send({ email: "sample@organization.com", password: "111111" });

      token = res.body.token;
      const res1 = await request(app)
        .post("/org/user")
        .set("Authorization", `Bearer ${token}`)
        .send({
          firstName: "Asti",
          lastName: "Sample",
          email: "asti@example.com",
          role: "user",
        });

      userId = await res1.body.user_id;

      const newRun1 = new Runs({
        name: "Test Run NEW",
        accessId: "access123",
        userId: userId,
        runtime: "10m",
        config: {},
        status: "started",
      });

      await newRun1.save();
      const newRun2 = new Runs({
        name: "Test Run 2",
        accessId: "access1234",
        userId: userId,
        runtime: "10m",
        config: {},
        status: "started",
      });

      await newRun2.save();

      const newRun3 = new Runs({
        name: "exotic name",
        accessId: "access1234",
        userId: "24575",
        runtime: "10m",
        config: {},
        status: "started",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3), // 3 days ago
      });

      await newRun3.save();

      const runOutsideOrg = await Runs.findOne({ name: "exotic name" });

      if (!runOutsideOrg) {
        throw new Error("Run not found");
      }
      runOutsideOrgId = runOutsideOrg.uuid;

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
      });

      await newPairSampleFile.save();

      const newRunStage1 = new RunStages({
        runId: runId,
        stageId: newStage1.uuid,
      });

      await newRunStage1.save();

      const newRunStage2 = new RunStages({
        runId: runId,
        stageId: newStage2.uuid,
      });

      await newRunStage2.save();
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    await Users.deleteMany({ email: "asti@example.com" });
    await Runs.deleteMany({});
    await Samples.deleteMany({});
    await Files.deleteMany({});
    await RunFiles.deleteMany({});
    await Stages.deleteMany({ name: { $ne: "import" } });
    await RunStages.deleteMany({});
    await mongoose.connection.close();
  });

  it("should fetch all runs in the organization", async () => {
    const res = await request(app)
      .get("/org/run")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const userRuns = res.body.filter((run: any) => run.userId === userId);
    expect(userRuns.length).toBeGreaterThan(0);

    expect(userRuns.some((run: any) => run.name === "Test Run NEW")).toBe(true);
  });

  it("should fetch a run by ID", async () => {
    const res = await request(app)
      .get(`/org/run/${runId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("uuid", runId);
    expect(res.body).toHaveProperty("name", "Test Run NEW");
  });

  it("should return 404 for a run not in the organization", async () => {
    const res = await request(app)
      .get(`/org/run/${runOutsideOrgId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(JSON.parse(res.text)).toEqual(
      "Run doesn't belong to this organization"
    );
  });

  it("should fetch run with a specific id", async () => {
    const res = await request(app)
      .get("/org/run")
      .query({ id: runId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("uuid", runId);
    expect(res.body).toHaveProperty("name", "Test Run NEW");
  });

  it("shouldn't fetch run with a specific id outside of organization", async () => {
    const res = await request(app)
      .get("/org/run")
      .query({ id: runOutsideOrgId })
      .set("Authorization", `Bearer ${token}`);

    expect(JSON.parse(res.text)).toEqual(
      "Run doesn't belong to this organization"
    );
  });

  it("should fetch runs with a specific name", async () => {
    const res = await request(app)
      .get("/org/run")
      .query({ name: "Test Run NEW" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
  });

  it("should fetch runs with a specific regex", async () => {
    const res = await request(app)
      .get("/org/run")
      .query({ name: "Test Run" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(2);
  });

  it("should fetch runs within a date range", async () => {
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const endDate = new Date().toISOString(); // now

    const res = await request(app)
      .get("/org/run")
      .query({ start_at: startDate, end_at: endDate })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(2);
  });

  it("should fetch runs with a specific status", async () => {
    const res = await request(app)
      .get("/org/run")
      .query({ status: "started" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.some((run: any) => run.status === "started")).toBe(true);
  });

  it("should fetch runs by user name", async () => {
    const res = await request(app)
      .get("/org/run")
      .query({ user_name: "asti" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(2);
  });

  it("should fetch runs by sample regex", async () => {
    const res = await request(app)
      .get("/org/run")
      .query({ sample: "Sample" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
  });

  it("should fetch runs by stage regex", async () => {
    const res = await request(app)
      .get("/org/run")
      .query({ stage: "Stage" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
  });

  it("should fetch runs with multiple query parameters", async () => {
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const endDate = new Date().toISOString(); // now

    const res = await request(app)
      .get("/org/run")
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

  it("should delete a run that belongs to the organization", async () => {
    const res = await request(app)
      .delete(`/org/run/${runId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("deleted_at");
  });

  it("should return 404 when a user tries to delete a run not in the organization", async () => {
    const res = await request(app)
      .delete(`/org/run/${runOutsideOrgId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(JSON.parse(res.text)).toEqual(
      "Run doesn't belong to this organization"
    );
  });
});
