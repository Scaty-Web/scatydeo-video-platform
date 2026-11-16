import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, normalizeUsername, signinErrorMessage, signupErrorMessage, usernameProblem } from "./authInput";
test("registration trims email and username", () => {
  assert.equal(normalizeEmail("  Person@Example.com  "), "person@example.com");
  assert.equal(normalizeUsername("  Kedoş  "), "Kedoş");
});
test("leaked password failure is not mistaken for a successful signup", () => {
  assert.match(signupErrorMessage({ code: "weak_password", message: "Password found in leaked database" }), /benzersiz/);
});
test("usernames with spaces or symbols are rejected, Turkish letters allowed", () => {
  assert.notEqual(usernameProblem("kedi kral"), null);
  assert.notEqual(usernameProblem("ab"), null);
  assert.notEqual(usernameProblem("a".repeat(21)), null);
  assert.equal(usernameProblem("Gariban_Kedoş"), null);
});
test("unconfirmed email sign-in is explained instead of 'wrong password'", () => {
  assert.match(signinErrorMessage({ code: "email_not_confirmed", message: "Email not confirmed" }) ?? "", /doğrulanmadı/);
  assert.equal(signinErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }), null);
});
