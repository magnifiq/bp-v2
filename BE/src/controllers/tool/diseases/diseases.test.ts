import request from "supertest";
import app from "../../../app";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Diseases from "../../../models/Diseases";

dotenv.config();

describe("Tool calls for diseases", () => {
  let diseaseId: string;
  beforeAll(async () => {
    jest.setTimeout(30000);

    try {
      await mongoose.connect(process.env.MONGO_URI as string);
      await Diseases.deleteMany({});
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      throw err;
    }

    try {
      await Diseases.create([
        {
          uuid: "1",
          name: "Cancer",
          organ: "Lung",
          genes: ["BRCA1"],
          mutations: ["mutation1"],
        },
        {
          uuid: "2",
          name: "Diabetes",
          organ: "Pancreas",
          genes: ["GENE1"],
          mutations: ["mutation2"],
        },
      ]);
      const disease = await Diseases.create({
        uuid: "3",
        name: "Heart Disease",
        organ: "Heart",
        genes: ["GENE2"],
        mutations: ["mutation3"],
        deletedAt: null,
      });
      diseaseId = disease.uuid;
    } catch (err) {
      throw err;
    }
  });

  afterAll(async () => {
    await Diseases.deleteMany({});
    await mongoose.connection.close();
  });

  it("should return diseases matching the query", async () => {
    const response = await request(app)
      .get("/tool/disease")
      .query({ name: "Cancer" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe("Cancer");
  });

  it("should return 404 if the disease is not found", async () => {
    const response = await request(app).get("/tool/disease/invalid-id");
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Disease not found");
  });

  it("should return the disease by ID", async () => {
    const response = await request(app).get(`/tool/disease/${diseaseId}`);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Heart Disease");
    expect(response.body.organ).toBe("Heart");
  });
});
