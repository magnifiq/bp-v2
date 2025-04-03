import Users from "../../models/Users";

export const findUserAndCheckOrganization = async (
  user_id: string,
  organizationId: string
): Promise<any> => {
  const user = await Users.findOne({ uuid: user_id, deletedAt: null });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.organizationId !== organizationId) {
    throw new Error("User not in the organization");
  }

  return user;
};
