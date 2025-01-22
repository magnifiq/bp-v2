import UserProjects from "../models/UserProjects";
import Projects from "../models/Projects";

/**
 * Checks if a user has access to a specific project based on their role.
 * If a user has the role "user", it checks if the user is associated with the project {UserProjectsDB}.
 * If a user has the role "organization", it checks if the organization is associated with the project (Projects DB).
 * If a user has the role "admin", it doesn't do any checks
 */
const checkUserProjectAccess = async (
  user_id: string,
  project_id: string,
  user_role: string
): Promise<{ status: number; message: string }> => {
  if (user_role === "user") {
    const userProject = await UserProjects.findOne({
      userId: user_id,
      projectId: project_id,
    });

    if (!userProject) {
      return {
        status: 403,
        message: "User does not have access to this project.",
      };
    }
  } else if (user_role === "organization") {
    const organizationProject = await Projects.findOne({
      organizationId: user_id,
      _id: project_id,
    });

    if (!organizationProject) {
      return {
        status: 403,
        message: "Organization does not have access to this project.",
      };
    }
  }

  return { status: 200, message: "Access granted." };
};

export default checkUserProjectAccess;
