import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Users from "../../../models/Users";
import Projects from "../../../models/Projects";
import UserProjects from "../../../models/UserProjects";
import Samples from "../../../models/Samples";
import Files from "../../../models/Files";

dotenv.config();

describe("Organization projects calls", () => {
  let token: string;
  let userId: string;
  let createdProjectId: string;
  let savedUserId: string;
  let orgUserId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      const emails = ["asti@example.com", "outside@example.com"];
      await Users.deleteMany({ email: { $in: emails } });
      await Projects.deleteMany({});
      await Files.deleteMany({});

      await UserProjects.deleteMany({});

      const outsideUser = new Users({
        firstName: "outside",
        lastName: "User",
        email: "outside@example.com",
        user_role: "user",
        organizationId: "test22",
        username: "outside@example.com",
        passwordHash: "54294750027884",
      });

      const savedUser = await outsideUser.save();
      savedUserId = savedUser.uuid;
      const res = await request(app)
        .post("/login")
        .send({ email: "sample@organization.com", password: "111111" });

      const orgUserFound = await Users.findOne({
        email: "sample@organization.com",
      });
      if (orgUserFound) orgUserId = orgUserFound.uuid;
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

      const org = await Users.findOne({
        email: "sample@organization.com",
      });
      if (!org) {
        throw new Error("Organization is not found");
      }
      const orgId = org.uuid;
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

      if (!createdProject) {
        throw new Error("Project is not found");
      }
      createdProjectId = createdProject.uuid;
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    const emails = ["asti@example.com", "outside@example.com"];
    await Users.deleteMany({ email: { $in: emails } });
    await Projects.deleteMany({});
    await UserProjects.deleteMany({});
    await Files.deleteMany({});
    await mongoose.connection.close();
  });

  it("should return project by ID", async () => {
    const res = await request(app)
      .get(`/org/projects/${createdProjectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Test project");
  });

  it("shouldn't return project outside of the organization", async () => {
    const res = await request(app)
      .get("/org/projects/3333ftse")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("should return all projects in the organization", async () => {
    const res = await request(app)
      .get("/org/projects")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should add the user to the project", async () => {
    const res = await request(app)
      .post(`/org/add_to_project/${createdProjectId}`)
      .send({ user_id: userId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(userId);
    expect(res.body.project_id).toBe(createdProjectId);
  });

  it("shouldn't add the user that is already added to the project", async () => {
    const res = await request(app)
      .post(`/org/add_to_project/${createdProjectId}`)
      .send({ user_id: userId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it("shouldn't add the user outside of the organization to the project", async () => {
    const res = await request(app)
      .post(`/org/add_to_project/${createdProjectId}`)
      .send({ user_id: savedUserId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
  it("should delete user from the organization", async () => {
    const res = await request(app)
      .delete(`/org/delete_from_project/${createdProjectId}`)
      .send({ user_id: userId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(userId);
    expect(res.body.deleted_at).toBeDefined();
    expect(res.body.project_id).toBe(createdProjectId);
  });
  it("shouldn't delete user that is not added to the project", async () => {
    const res = await request(app)
      .delete(`/org/delete_from_project/${createdProjectId}`)
      .send({ user_id: userId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
  });
  it("shouldn't delete user who is outside of the organization from the project ", async () => {
    const res = await request(app)
      .delete(`/org/delete_from_project/${createdProjectId}`)
      .send({ user_id: savedUserId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
  it("shouldn't delete user from the project if the user is the same as the requester", async () => {
    const res = await request(app)
      .delete(`/org/delete_from_project/${createdProjectId}`)
      .send({ user_id: orgUserId })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(407);
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
      .post("/org/project/create")
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
      .post("/org/project/create")
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
