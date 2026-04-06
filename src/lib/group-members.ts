export function getGroupMemberIds(group: { members: Array<{ userId: unknown }> }) {
  const ids: string[] = [];

  for (const member of group.members) {
    const value = member.userId;

    if (typeof value === "string") {
      ids.push(value);
      continue;
    }

    if (value && typeof value === "object") {
      if ("_id" in value && value._id && typeof value._id === "object" && "toString" in value._id) {
        ids.push(value._id.toString());
        continue;
      }

      if ("toString" in value && typeof value.toString === "function") {
        ids.push(value.toString());
      }
    }
  }

  return ids;
}
