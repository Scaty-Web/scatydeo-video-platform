export interface ThreadComment {
  id: string;
  parent_id: string | null;
}

export function getThreadReplies<T extends ThreadComment>(comments: T[], rootId: string): T[] {
  const result: T[] = [];
  const visited = new Set([rootId]);
  const visit = (parentId: string) => {
    for (const comment of comments) {
      if (comment.parent_id !== parentId || visited.has(comment.id)) continue;
      visited.add(comment.id);
      result.push(comment);
      visit(comment.id);
    }
  };
  visit(rootId);
  return result;
}