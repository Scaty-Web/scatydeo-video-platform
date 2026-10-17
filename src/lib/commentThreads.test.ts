import { expect, test } from "bun:test";
import { getThreadReplies } from "./commentThreads";

test("replies to replies stay in their original thread and retain their target", () => {
  const comments = [
    { id: "root", parent_id: null },
    { id: "reply", parent_id: "root" },
    { id: "nested", parent_id: "reply" },
    { id: "deep", parent_id: "nested" },
    { id: "other", parent_id: null },
    { id: "unrelated", parent_id: "other" },
  ];
  expect(getThreadReplies(comments, "root")).toEqual(comments.slice(1, 4));
  expect(getThreadReplies(comments, "root")[1].parent_id).toBe("reply");
});

test("malformed cycles cannot repeat replies", () => {
  expect(getThreadReplies([
    { id: "root", parent_id: "reply" },
    { id: "reply", parent_id: "root" },
  ], "root")).toEqual([{ id: "reply", parent_id: "root" }]);
});