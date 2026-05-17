export function computeUnreadCommentCount(
  comments: { createdAt: Date }[],
  lastReadAt: Date | null,
): number {
  if (lastReadAt === null) return comments.length;
  return comments.filter((c) => c.createdAt > lastReadAt).length;
}
