import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import Users from "../../../models/Users";
import dotenv from "dotenv";
dotenv.config();

describe("Organization user CRUD calls", () => {
  let token: string;
  let userId: string;
  let savedUserId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      const emails = [
        "katri@example.com",
        "alla@example.com",
        "outside@example.com",
      ];
      await Users.deleteMany({ email: { $in: emails } });

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
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      process.exit(1);
    }

    // Create a test organization user and get a token
    // const orgUser = new Users({
    //   firstName: "Org",
    //   lastName: "User",
    //   email: "orguser@example.com",
    //   user_role: "organization",
    //   organizationId: "org123",
    //   username: "orguser@example.com",
    //   passwordHash: "54294750027884",
    // });

    // await orgUser.save();
    try {
      const res = await request(app)
        .post("/login")
        .send({ email: "sample@organization.com", password: "111111" });

      token = res.body.token;
    } catch (err) {
      console.error("Failed to login", err);
    }
  });

  afterAll(async () => {
    const emails = [
      "katri@example.com",
      "alla@example.com",
      "outside@example.com",
    ];
    await Users.deleteMany({ email: { $in: emails } });
    await mongoose.connection.close();
  });

  it("should add a new user to the organization", async () => {
    const res = await request(app)
      .post("/org/user")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Katrine",
        lastName: "Sample",
        email: "katri@example.com",
        role: "user",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("user_id");
    expect(res.body).toHaveProperty("created_at");

    // save the created user id for the next test
    userId = res.body.user_id;
  });

  it("should state error about adding a user by a user without organization role", async () => {
    const res = await request(app)
      .post("/org/user")
      .set("Authorization", "Bearer 432534")
      .send({
        firstName: "Error",
        lastName: "Sample",
        email: "err2@extra.com",
        role: "user",
      });

    expect(res.statusCode).toEqual(401);
  });

  it("should update an organization user", async () => {
    const res = await request(app)
      .put(`/org/user/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        first_name: "KatriNew",
        last_name: "Sample",
        email: "katrinew@example.com",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.user_id).toEqual(userId);
    expect(res.body).toHaveProperty("updated_at");
  });

  it("should fetch all users in the org", async () => {
    const newUserRes = await request(app)
      .post("/org/user")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Alla",
        lastName: "Vito",
        email: "alla@example.com",
        role: "user",
      });

    const res = await request(app)
      .get("/org/user")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const newUser = await Users.findOne({ uuid: newUserRes.body.user_id });
    if (!newUser) {
      throw new Error("New user not found");
    }

    const addedUser = res.body.find(
      (user: any) => user.email === newUser.email
    );

    expect(addedUser).toMatchObject({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      user_role: newUser.user_role,
    });
  });

  it("should find a user in the org", async () => {
    const res = await request(app)
      .get(`/org/user/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    const user = await Users.findOne({ uuid: userId });
    if (!user) {
      throw new Error("User not found");
    }
    expect(res.statusCode).toEqual(200);
    expect(res.body.username).toBe(user.username);
  });

  it("should state error about a user outside the org", async () => {
    const res = await request(app)
      .get(`/org/user/${savedUserId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(403);
  });

  it("should delete a user in the org", async () => {
    const res = await request(app)
      .delete(`/org/user/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.user_id).toEqual(userId);
  });

  it("should state error about a user outside the organization", async () => {
    const res = await request(app)
      .delete(`/org/user/${savedUserId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(403);
  });
});
