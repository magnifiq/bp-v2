import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import AccessKeys from "../../../models/AccessKeys";
import RunFiles from "../../../models/RunFiles";
import Files from "../../../models/Files";
import Runs from "../../../models/Runs";
import Samples from "../../../models/Samples";
dotenv.config();

describe("Tool calls for samples", () => {
  let accessKeyId: string;
  let sampleId: string;
  let runId: string;
  let sampleId1: string;
  let fileId: string;
  let fileId1: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await AccessKeys.deleteMany({});
      await RunFiles.deleteMany({});
      await Files.deleteMany({});
      await Runs.deleteMany({});
      await Samples.deleteMany({});
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      throw err;
    }

    try {
      const accessKey = await AccessKeys.create({
        expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        organizationId: "0000",
        active: true,
        licenseType: "test",
        name: "Test Access Key",
      });
      accessKeyId = accessKey.uuid;

      const file = await Files.create({
        sampleId: "test-sample-id",
        deletedAt: null,
        name: "test-file.txt",
        type: "text/plain",
        ext: "txt",
        stageId: "test-stage-id",
        path: "test/path/to/file.txt",
      });
      fileId = file.uuid;
      sampleId = file.sampleId;

      const file1 = await Files.create({
        sampleId: "test-sample-id-1",
        deletedAt: null,
        name: "test-file.txt",
        type: "text/plain",
        ext: "txt",
        stageId: "test-stage-id-1",
        path: "test/path/to/file.txt",
      });

      await Samples.create({
        uuid: file.sampleId,
        projectId: "project123",
        name: "sample1",
      });
      fileId1 = file1.uuid;
      sampleId1 = file1.sampleId;

      const run = await Runs.create({
        accessId: accessKeyId,
        name: "Test Run",
        userId: "user123",
        config: { key: "value" },
        runtime: "0",
        status: "started",
      });
      runId = run.uuid;
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    await AccessKeys.deleteMany({});
    await RunFiles.deleteMany({});
    await Runs.deleteMany({});
    await Files.deleteMany({});
    await Samples.deleteMany({});
    await mongoose.connection.close();
  });

  it("should create a new sample record", async () => {
    const response = await request(app).post("/tool/sample").send({
      access_key: accessKeyId,
      run_id: runId,
      sample_id: sampleId,
      update_type: "interrupted",
      message: "Sample processing started",
      file_type: "text/plain",
      file_path: "test/path/to/file.txt",
      file_name: "test-file.txt",
      stage_id: "test-stage-id",
      file_ext: "txt",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("run_id", runId);
    expect(response.body).toHaveProperty(
      "message",
      "Sample update recorded successfully"
    );
  });

  it("should update an existing sample record", async () => {
    await RunFiles.create({
      runId,
      fileId: fileId1,
      status: "started",
    });

    const response = await request(app).put("/tool/sample").send({
      access_key: accessKeyId,
      run_id: runId,
      sample_id: fileId1,
      update_type: "finished",
      message: "Sample processing completed",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("run_id", runId);
    expect(response.body).toHaveProperty("file_id", fileId1);
    expect(response.body).toHaveProperty(
      "message",
      "Sample update recorded successfully"
    );

    const sample = await RunFiles.findOne({
      runId,
      fileId: fileId1,
    });
    expect(sample).not.toBeNull();
    expect(sample?.status).toBe("finished");
  });
});
