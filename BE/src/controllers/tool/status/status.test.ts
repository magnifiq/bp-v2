import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import RunStats from "../../../models/RunStats";
import AccessKeys from "../../../models/AccessKeys";
dotenv.config();

describe("Tool call for system status", () => {
  let runId: string;
  let accessKeyId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await RunStats.deleteMany({});
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
        organizationId: "000",
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
    await RunStats.deleteMany({});
    await AccessKeys.deleteMany({});
    await mongoose.connection.close();
  });

  it("should successfully update system status", async () => {
    const response = await request(app)
      .post("/tool/status/232")
      .send({
        access_key: accessKeyId,
        run_timestamp: "2023-10-01T12:00:00Z",
        cpu_util: [50.5, 60.2, 55.1],
        gpu_util: [70.3],
        ram_used: 4096,
        ram_available: 8192,
        ram_swap: 1024,
        disk_io: [100.5, 50.2],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("run_id", "232");
    expect(response.body).toHaveProperty(
      "message",
      "Status update recorded successfully"
    );

    const savedRunStats = await RunStats.findOne({ runId: "232" });
    if (!savedRunStats) {
      console.error("Error: RunStats not found");
      return;
    }

    expect(savedRunStats).toMatchObject({
      runId: "232",
      time: new Date("2023-10-01T12:00:00Z"),
      cpuTotal: 50.5,
      cpuCores: [60.2, 55.1],
      gpuTotal: 70.3,
      gpuCores: [70.3],
      memTotal: 5120,
      memFree: 8192,
      diskRd: 100.5,
      diskWr: 50.2,
    });
  });
});
