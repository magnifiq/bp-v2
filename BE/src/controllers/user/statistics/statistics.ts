import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
import { Response } from "express";
import { checkUserRole } from "../../../utils/user";
import Runs from "../../../models/Runs";

export const getStatistics = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id: user_id } = checkUserRole(req);

    const successfulRunsCount = await Runs.countDocuments({
      userId: user_id,
      status: "finished",
      deletedAt: null,
    });

    const failedRunsCount = await Runs.countDocuments({
      userId: user_id,
      status: "failed",
      deletedAt: null,
    });

    const interruptedRunsCount = await Runs.countDocuments({
      userId: user_id,
      status: "interrupted",
      deletedAt: null,
    });

    const latestRun = await Runs.findOne({ userId: user_id, deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();

    res.status(200).json({
      successful_runs: successfulRunsCount,
      failed_runs: failedRunsCount,
      interrupted_runs: interruptedRunsCount,
      latest_run: latestRun,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "The user doesn't have the 'user' role") {
        res
          .status(409)
          .json({ message: "The user doesn't have the 'user' role" });
      }
    } else {
      console.error("Unknown error when fetching statistics:", error);
      res
        .status(500)
        .json({ message: "Unknown error when fetching statistics" });
    }
  }
};
