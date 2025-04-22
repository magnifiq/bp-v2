import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import UserProjects from "../../../models/UserProjects";
import Users from "../../../models/Users";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import Stages from "../../../models/Stages";
import Projects from "../../../models/Projects";
import AccessKeys from "../../../models/AccessKeys";

dotenv.config();

describe("Tool calls for projects", () => {
  let user: any;
  let accessKeyId: any;
  let organizationId = "00000";
  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({});
      await Samples.deleteMany({});
      await Files.deleteMany({});
      await Stages.deleteMany({ name: { $ne: "import" } });
      await UserProjects.deleteMany({});
      await Projects.deleteMany({});
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
      user = await Users.create({
        uuid: "user123",
        firstName: "Org",
        lastName: "User",
        email: "org@example.com",
        user_role: "organization",
        username: "org@example.com",
        passwordHash: "11111",
        organizationId: "00000",
      });

      const accessKey = await AccessKeys.create({
        expireAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        organizationId,
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
    await Users.deleteMany({});
    await Samples.deleteMany({});
    await Files.deleteMany({});
    await Stages.deleteMany({ name: { $ne: "import" } });
    await UserProjects.deleteMany({});
    await Projects.deleteMany({});
    await AccessKeys.deleteMany({});
    await mongoose.connection.close();
  });

  it("should create a new project", async () => {
    const response = await request(app)
      .post("/tool/project")
      .send({
        access_key: accessKeyId,
        user_id: user.uuid,
        disease_id: "disease123",
        name: "Test Project 1",
        description: "This is a test project",
        samples: [
          {
            sample: "sample1",
            name: "Sample 1",
            ext: ".txt",
            type: "text",
            path: "/path/to/sample1",
          },
        ],
        doi: "10.1234/test",
        link: "http://example.com",
        source: "Test Source",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("project_id");
    expect(response.body.name).toBe("Test Project 1");
  });

  it("should return 400 if required fields are missing", async () => {
    const response = await request(app)
      .post("/tool/project")
      .send({ access_key: accessKeyId });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Missing required fields");
  });

  it("should query projects based on filters", async () => {
    await Projects.create({
      name: "Test Project 2",
      organizationId,
      diseaseId: "disease123",
      description: "This is a test project",
      doi: "10.1234/test",
      link: "http://example.com",
      source: "Test Source",
      deletedAt: null,
    });

    const response = await request(app)
      .get("/tool/project")
      .send({
        access_key: accessKeyId,
        user_id: user.uuid,
      })
      .query({ name: "Test Project" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].name).toBe("Test Project 1");
  });
});
