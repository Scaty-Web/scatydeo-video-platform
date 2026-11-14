import { test } from "node:test";
import assert from "node:assert/strict";
import { narrationTimeline } from "./aiStudioMedia";

test("narration never speaks over the previous sentence", () => {
  assert.deepEqual(narrationTimeline([{ start: 0, duration: 4 }, { start: 2, duration: 3 }, { start: 10, duration: 2 }]), [{ start: 0, duration: 4 }, { start: 4, duration: 3 }, { start: 10, duration: 2 }]);
});