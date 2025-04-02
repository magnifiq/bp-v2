import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Users from "../../../models/Users";
import Projects from "../../../models/Projects";
import UserProjects from "../../../models/UserProjects";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";
import bcrypt from "bcrypt";

dotenv.config();

describe("Admin projects calls", () => {
  let token: string;
  let createdProjectId: string;
  let testProjectId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Users.deleteMany({});
      await Projects.deleteMany({});
      await Files.deleteMany({});

      await UserProjects.deleteMany({});

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

      const newProject = new Projects({
        name: "Test project",
        organizationId: "1",
        diseaseId: "diseaseId",
        description: "description",
        doi: "doi",
        link: "link",
        source: "source",
      });

      const createdProject = await newProject.save();

      const newProject1 = new Projects({
        name: "Test project other",
        organizationId: "1",
        diseaseId: "diseaseId",
        description: "description",
        doi: "doi",
        link: "link",
        source: "source",
      });
      await newProject1.save();

      if (!createdProject) {
        throw new Error("Project is not found");
      }
      createdProjectId = createdProject.uuid;
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    await Users.deleteMany({});
    await Projects.deleteMany({});
    await UserProjects.deleteMany({});
    await Files.deleteMany({});
    await mongoose.connection.close();
  });

  it("should return project by ID", async () => {
    const res = await request(app)
      .get(`/admin/project/${createdProjectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test project");
  });

  it("should return all projects", async () => {
    const res = await request(app)
      .get("/admin/projects")
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
      .post("/admin/project")
      .send({
        name: "New Project",
        diseaseId: "diseaseId",
        description: "description",
        doi: "doi",
        link: "link",
        source: "source",
        samples,
        organizationId: "1",
        userId: "0",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Project");

    testProjectId = res.body.uuid;
    const projectSamples = await Samples.find({ projectId: testProjectId });
    expect(projectSamples).toHaveLength(2);
  });

  it("should fail to create a project with missing required fields", async () => {
    const res = await request(app)
      .post("/admin/project")
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

  it("should delete a project", async () => {
    const res = await request(app)
      .delete(`/admin/project/${testProjectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("project_id", testProjectId);
    expect(res.body.deleted_at).not.toBeNull();
    const pair = await UserProjects.findOne({ projectId: testProjectId });
    expect(pair?.deletedAt).not.toBeNull();
  });
});
