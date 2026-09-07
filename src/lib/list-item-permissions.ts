export function canCurateListItems(input: {
  isOwner: boolean;
  memberRole: "OWNER" | "CONTRIBUTOR" | "VIEWER" | null;
}): boolean {
  return (
    input.isOwner ||
    input.memberRole === "OWNER" ||
    input.memberRole === "CONTRIBUTOR"
  );
}
