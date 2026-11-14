import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, normalizeUsername, signupErrorMessage } from "./authInput";
test("registration trims email and username", () => {
  assert.equal(normalizeEmail("  Person@Example.com  "), "person@example.com");
  assert.equal(normalizeUsername("  Kedoş  "), "Kedoş");
});
test("leaked password failure is not mistaken for a successful signup", () => {
  assert.match(signupErrorMessage({ code: "weak_password", message: "Password found in leaked database" }), /benzersiz/);
});