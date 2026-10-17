/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
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
  assert.deepEqual(getThreadReplies(comments, "root"), comments.slice(1, 4));
  assert.equal(getThreadReplies(comments, "root")[1].parent_id, "reply");
});

test("malformed cycles cannot repeat replies", () => {
  assert.deepEqual(getThreadReplies([
    { id: "root", parent_id: "reply" },
    { id: "reply", parent_id: "root" },
  ], "root"), [{ id: "reply", parent_id: "root" }]);
});