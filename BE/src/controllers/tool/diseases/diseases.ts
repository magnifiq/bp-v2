import { Response, Request } from "express";
import Diseases from "../../../models/Diseases";

interface queryProps {
  name?: { $regex: string; $options: string };
  organ?: { $regex: string; $options: string };
  genes?: { $in: string[] };
  mutations?: { $in: string[] };
  deletedAt: null;
}
export const queryDiseases = async (req: Request, res: Response) => {
  try {
    const { name, organ, genes, mutations } = req.query;
    const query: queryProps = { deletedAt: null };

    if (name) {
      query.name = { $regex: name as string, $options: "i" };
    }
    if (organ) {
      query.organ = { $regex: organ as string, $options: "i" };
    }
    if (genes && genes?.length !== 0) {
      query.genes = { $in: genes as string[] };
    }
    if (mutations && mutations?.length !== 0) {
      query.mutations = { $in: mutations as string[] };
    }
    const diseases = await Diseases.find(query);

    res.status(200).json(diseases);
  } catch (error) {
    console.error("Error querying diseases:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDiseaseById = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const disease = await Diseases.findOne({ uuid: id, deletedAt: null });

    if (!disease) {
      res.status(404).json({ message: "Disease not found" });
      return;
    }

    res.status(200).json(disease);
  } catch (error) {
    console.error("Error fetching disease by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
