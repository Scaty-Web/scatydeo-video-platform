import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STUDIO_VOICE, STUDIO_VOICES } from "./voices";

test("studio narration defaults to the requested ElevenLabs Jessica voice", () => {
  assert.equal(DEFAULT_STUDIO_VOICE, "Jessica");
  assert.equal(STUDIO_VOICES[DEFAULT_STUDIO_VOICE], "cgSgspJ2msm6clMCkdW9");
});