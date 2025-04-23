import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import AccessKeys from "../../../models/AccessKeys";
import RunStages from "../../../models/RunStages";

dotenv.config();

describe("Tool calls for stages", () => {
  let accessKeyId: any;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await AccessKeys.deleteMany({});
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
      const accessKey = await AccessKeys.create({
        expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        organizationId: "0000",
        active: true,
        licenseType: "test",
        name: "Test Access Key",
      });
      accessKeyId = accessKey.uuid;
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    await AccessKeys.deleteMany({});
    await RunStages.deleteMany({});
    await mongoose.connection.close();
  });

  it("should update an existing stage record", async () => {
    await RunStages.create({
      runId: "test-run-id-2",
      stageId: "stage-2",
      status: "started",
    });

    const response = await request(app).put("/tool/stage").send({
      access_key: accessKeyId,
      run_id: "test-run-id-2",
      stage_id: "stage-2",
      update_type: "finished",
      message: "Stage 2 has been completed",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("run_id", "test-run-id-2");
    expect(response.body).toHaveProperty("stage_id", "stage-2");
    expect(response.body).toHaveProperty(
      "message",
      "Stage update recorded successfully"
    );

    const stage = await RunStages.findOne({
      runId: "test-run-id-2",
      stageId: "stage-2",
    });
    expect(stage).not.toBeNull();
    expect(stage?.status).toBe("finished");
  });

  it("shouldn't update an existing stage record when there are missing fields", async () => {
    await RunStages.create({
      runId: "test-run-id-2",
      stageId: "stage-2",
      status: "started",
    });

    const response = await request(app).put("/tool/stage").send({
      access_key: accessKeyId,
      run_id: "test-run-id-2",
      update_type: "finished",
      message: "Stage 2 has been completed",
    });

    expect(response.status).toBe(400);
  });
});
