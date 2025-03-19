import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Users from "../../../models/Users";
import Projects from "../../../models/Projects";
import UserProjects from "../../../models/UserProjects";
import Files from "../../../models/Files";
import Samples from "../../../models/Samples";
import Stages from "../../../models/Stages";

dotenv.config();

describe("User projects calls", () => {
  let token: string;
  let userId: string;
  let orgId: string = "22222";
  let createdProjectId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({ email: "john.doe@example.com" });
      await Projects.deleteMany({});
      await UserProjects.deleteMany({});
      await Files.deleteMany({});
      await Samples.deleteMany({});
      await Stages.deleteMany({ name: { $ne: "import" } });
      const createdUser = await request(app).post("/auth/register").send({
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        email: "john.doe@example.com",
        password: "password123",
        user_role: "user",
        organizationId: orgId,
      });

      userId = createdUser.body.uuid;

      const res = await request(app).post("/auth/login").send({
        email: "john.doe@example.com",
        password: "password123",
      });
      token = res.body.token;

      const newProject = new Projects({
        name: "Test project",
        organizationId: orgId,
        diseaseId: "diseaseId",
        description: "description",
        doi: "doi",
        link: "link",
        source: "source",
      });
      const createdProject = await newProject.save();
      if (!createdProject) {
        throw new Error("Project is not found");
      }
      createdProjectId = createdProject.uuid;
      const newProjectUserPair = new UserProjects({
        userId,
        projectId: createdProjectId,
      });
      await newProjectUserPair.save();
      const newProject1 = new Projects({
        name: "Test project other",
        organizationId: orgId,
        diseaseId: "diseaseId",
        description: "description",
        doi: "doi",
        link: "link",
        source: "source",
      });
      await newProject1.save();
      const newProjectUserPair1 = new UserProjects({
        userId,
        projectId: newProject1.uuid,
      });
      await newProjectUserPair1.save();
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    await mongoose.connect(process.env.MONGO_URI as string);
    await Users.deleteMany({ email: "john.doe@example.com" });
    await Projects.deleteMany({});
    await UserProjects.deleteMany({});
    await Files.deleteMany({});
    await Samples.deleteMany({});
    await Stages.deleteMany({ name: { $ne: "import" } });
    await mongoose.connection.close();
  });

  it("should return project by ID", async () => {
    const res = await request(app)
      .get(`/user/project/${createdProjectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test project");
  });

  it("shouldn't return project for which a user doesn't have the access", async () => {
    const res = await request(app)
      .get("/user/project/3333ftse")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(411);
  });

  it("should return all user projects", async () => {
    const res = await request(app)
      .get("/user/project")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should create a project with samples", async () => {
    const samples = [
      {
        sample: "Sample 1",
        reference_id: "ref1",
        name: "file1.txt",
        ext: "txt",
        type: "text/plain",
        path: "/files/file1.txt",
      },
      {
        sample: "Sample 2",
        reference_id: "ref2",
        name: "file2.txt",
        ext: "txt",
        type: "text/plain",
        path: "/files/file2.txt",
      },
    ];

    const res = await request(app)
      .post("/user/project/create")
      .send({
        name: "New Project",
        diseaseId: "diseaseId",
        description: "description",
        doi: "doi",
        link: "link",
        source: "source",
        samples,
      })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Project");

    const projectId = res.body.uuid;
    const projectSamples = await Samples.find({ projectId });
    expect(projectSamples).toHaveLength(2);
  });

  it("should fail to create a project with missing required fields", async () => {
    const res = await request(app)
      .post("/user/project/create")
      .send({
        name: "New Project",
        diseaseId: "diseaseId",
        description: "description",
        doi: "doi",
        link: "link",
        source: "source",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
