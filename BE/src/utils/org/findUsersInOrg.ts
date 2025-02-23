import Users from "../../models/Users";

/**
 * Return the users' ids that belong to the organization.
 */
export const findUsersInOrg = async (org_id: string): Promise<string[]> => {
  const users = await Users.find({ organizationId: org_id, deletedAt: null });
  const userIds = users.map((user) => user.uuid);
  return userIds;
};
