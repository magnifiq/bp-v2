import request from "supertest";
import app from "../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Users from "../../models/Users";
import Runs from "../../models/Runs";
import Samples from "../../models/Samples";
import Stages from "../../models/Stages";
import RunFiles from "../../models/RunFiles";
import RunStages from "../../models/RunStages";
import AccessKeys from "../../models/AccessKeys";
import Files from "../../models/Files";
import UserProjects from "../../models/UserProjects";
dotenv.config();

describe("Auth endpoints", () => {
  let token: string;
  let userId: string;
  let accessKeyId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({});
      await Runs.deleteMany({});
      await Samples.deleteMany({});
      await Stages.deleteMany({ name: { $ne: "import" } });
      await RunFiles.deleteMany({});
      await RunStages.deleteMany({});
      await AccessKeys.deleteMany({});
      await Files.deleteMany({});
      await UserProjects.deleteMany({});

      const accessKey = await AccessKeys.create({
        expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        organizationId: "0000",
        active: true,
        licenseType: "test",
        name: "Test Access Key",
      });
      accessKeyId = accessKey.uuid;

      const sample = await Samples.create({
        uuid: "sample-uuid",
        projectId: "project123",
        name: "sample1",
      });
      const sample2 = await Samples.create({
        uuid: "sample-uuid-2",
        projectId: "project123",
        name: "sample2",
      });

      await Stages.create({
        uuid: "stage-uuid-1",
        name: "Stage 1",
        method: "one",
        args: { key: "value" },
      });
      await Stages.insertMany([
        {
          uuid: "stage1-uuid",
          name: "Stage 1",
          method: "method1",
          args: { key: "value" },
        },
        {
          uuid: "stage2-uuid",
          name: "Stage 2",
          method: "method2",
          args: { key: "value" },
        },
      ]);
      await Files.create({
        uuid: "file-uuid",
        sampleId: sample.uuid,
        stageId: "stage-uuid-1",
        name: "sample1.txt",
        path: "/path/to/sample1.txt",
        ext: "txt",
        type: "text",
      });

      await Files.create({
        uuid: "file-uuid-2",
        sampleId: sample2.uuid,
        stageId: "stage-uuid-1",
        name: "sample2.txt",
        path: "/path/to/sample1.txt",
        ext: "txt",
        type: "text",
      });
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    await Users.deleteMany({});
    await Runs.deleteMany({});
    await Samples.deleteMany({});
    await Stages.deleteMany({ name: { $ne: "import" } });
    await RunFiles.deleteMany({});
    await AccessKeys.deleteMany({});
    await Files.deleteMany({});
    await RunStages.deleteMany({});
    await UserProjects.deleteMany({});
    await mongoose.connection.close();
  });

  it("should register a new user", async () => {
    const res = await request(app).post("/auth/register").send({
      firstName: "Test",
      lastName: "User",
      username: "testuser",
      email: "testuser@example.com",
      password: "password123",
      user_role: "user",
      organizationId: "org123",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("email", "testuser@example.com");
    userId = res.body.uuid;
  });

  it("should fail to register an existing user", async () => {
    const res = await request(app).post("/auth/register").send({
      firstName: "Test",
      lastName: "User",
      username: "testuser",
      email: "testuser@example.com",
      password: "password123",
      user_role: "user",
      organizationId: "org123",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "User already exists");
  });

  it("should log in an existing user", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "testuser@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    token = res.body.token;
  });

  it("should fail to log in with incorrect credentials", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "testuser@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid credentials");
  });

  it("should create a new run using the /me endpoint", async () => {
    await UserProjects.create({
      userId: userId,
      projectId: "project123",
    });
    const res = await request(app)
      .post("/auth/me")
      .send({
        access_key: accessKeyId,
        user_id: userId,
        run_name: "run1",
        config: {
          general: {
            project_id: "3c906a6f-d852-4bf2-9e74-5dee317ea6fb",
            glob: "sample*.bam",
            from_stage: "import",
            reference: "path/to/reference.fasta",
            output: "path/to/output",
          },
          stages: [
            {
              name: "preprocessing",
              method: "Samtools Fastq",
              args: {
                threads: "32",
              },
            },
            {
              name: "alignment",
              method: "BWA MEM",
              args: {
                mode: "inherit",
                threads: "32",
              },
            },
            {
              name: "variant_calling",
              method: "GATK HaplotypeCaller",
              args: {
                dbsnp: "path/to/dbsnp.vcf",
                "hmm-native-threads": "10",
              },
            },
          ],
        },
        glob: "sample.*",
        project_id: "project123",
        from_stage: "Stage 1",
        stages: [
          {
            uuid: "stage1-uuid",
            name: "Stage 1",
            method: "method1",
            args: { key: "value" },
          },
          {
            uuid: "stage2-uuid",
            name: "Stage 2",
            method: "method2",
            args: { key: "value" },
          },
        ],
        samples: [
          {
            file_path: "path/to/sample1.bam",
            sample_name: "sample1",
            file_type: "bam",
            file_name: "file1",
            file_ext: "bam",
          },
          {
            file_path: "path/to/sample2.bam",
            sample_name: "sample2",
            file_type: "bam",
            file_ext: "bam",
            file_name: "file2",
          },
          {
            file_path: "path/to/sample3.bam",
            sample_name: "sample3",
            file_type: "bam",
            file_ext: "bam",
            file_name: "file3",
          },
        ],
      })
      .set("Authorization", `Bearer ${token}`);

    const run1 = await Runs.findOne({ name: "run1" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("run_id");
    expect(res.body).toHaveProperty("run_name", "run1");
    expect(res.body.stages).toHaveLength(2);
    expect(res.body.samples).toBeInstanceOf(Array);

    const run = await Runs.findOne({ uuid: res.body.run_id });
    expect(run).not.toBeNull();
    expect(run?.name).toBe("run1");

    const stages = await RunStages.find({
      runId: res.body.run_id,
      deletedAt: null,
    });
    expect(stages).toHaveLength(2);
    expect(stages[0].stageId).toBe("stage1-uuid");
    expect(stages[1].stageId).toBe("stage2-uuid");

    const samples = await RunFiles.find({
      runId: res.body.run_id,
      deletedAt: null,
    });
    expect(samples.length).toBe(3);
    samples.forEach((sample) => {
      expect(sample).toHaveProperty("fileId");
      expect(sample).toHaveProperty("runId", res.body.run_id);
    });
  });

  it("should fail to create a run with missing fields in /me endpoint", async () => {
    const res = await request(app)
      .post("/auth/me")
      .send({
        access_key: accessKeyId,
        user_id: userId,
        run_name: "Test Run",
        config: { param1: "value1" },
        glob: "sample.*",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty(
      "message",
      "Missing required fields in /me endpoint."
    );
  });
});
