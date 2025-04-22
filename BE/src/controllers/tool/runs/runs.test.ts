import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Runs from "../../../models/Runs";
import AccessKeys from "../../../models/AccessKeys";

dotenv.config();

describe("Tool calls for runs", () => {
  let accessKeyId: string;
  let organizationId = "00000";
  let runId: string;
  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Runs.deleteMany({});
      await AccessKeys.deleteMany({});
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
        organizationId,
        active: true,
        licenseType: "test",
        name: "Test Access Key",
      });
      accessKeyId = accessKey.uuid;

      const run = await Runs.create({
        uuid: "run123",
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
    await Runs.deleteMany({});
    await AccessKeys.deleteMany({});
    await mongoose.connection.close();
  });

  it("should update the run status", async () => {
    const res = await request(app).put(`/tool/run/${runId}`).send({
      access_key: accessKeyId,
      update_type: "finished",
      message: "Run completed successfully",
    });

    expect(res.status).toBe(200);
    expect(res.body.run_id).toBe(runId);
  });
});
