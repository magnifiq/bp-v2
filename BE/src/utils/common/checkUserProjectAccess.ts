import UserProjects from "../../models/UserProjects";
import Projects from "../../models/Projects";
import Users from "../../models/Users";

/**
 * Checks if a user has access to a specific project based on their role.
 * If a user has the role "user", it checks if the user is associated with the project {UserProjectsDB}.
 * If a user has the role "organization", it checks if the organization is associated with the project (Projects DB).
 * If a user has the role "admin", it doesn't do any checks
 */
const checkUserProjectAccess = async (user_id: string, project_id: string) => {
  const foundUser = await Users.findOne({ uuid: user_id, deletedAt: null });
  if (!foundUser) {
    throw new Error("User isn't found");
  }
  const user_role = foundUser.user_role;
  if (user_role === "user") {
    const userProject = await UserProjects.findOne({
      userId: user_id,
      projectId: project_id,
    });

    if (!userProject) {
      throw new Error("User does not have access to this project.");
    }
  } else if (user_role === "organization") {
    const organizationProject = await Projects.findOne({
      organizationId: user_id,
      _id: project_id,
    });

    if (!organizationProject) {
      throw new Error("Organization does not have access to this project.");
    }
  }
};

export default checkUserProjectAccess;
