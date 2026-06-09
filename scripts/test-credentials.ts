// Local test of the credential helper (checkCredentials) in src/lib/oauth.ts.
// Node 25 runs .ts directly (type stripping), so this imports the real code.
// Usage:  node scripts/test-credentials.ts

import { checkCredentials } from "../src/lib/oauth.ts";

let passed = 0;
let failed = 0;

function expect(label: string, actual: boolean, want: boolean): void {
  if (actual === want) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label} — got ${actual}, want ${want}`);
  }
}

function resetEnv(): void {
  delete process.env.MCP_USER;
  delete process.env.MCP_PASS;
  delete process.env.MCP_USERS_JSON;
}

// 1. Multi-user JSON map: correct + wrong passwords, unknown user.
resetEnv();
process.env.MCP_USERS_JSON = JSON.stringify({ alice: "pw1", bob: "pw2" });
console.log("1. multi-user JSON map");
expect("alice/pw1 accepted", checkCredentials("alice", "pw1"), true);
expect("bob/pw2 accepted", checkCredentials("bob", "pw2"), true);
expect("alice/wrong rejected", checkCredentials("alice", "nope"), false);
expect("unknown user rejected", checkCredentials("carol", "pw1"), false);
expect("empty password rejected", checkCredentials("alice", ""), false);

// 2. Back-compat: single MCP_USER / MCP_PASS pair only.
resetEnv();
process.env.MCP_USER = "solo";
process.env.MCP_PASS = "secret";
console.log("2. single pair (back-compat)");
expect("solo/secret accepted", checkCredentials("solo", "secret"), true);
expect("solo/wrong rejected", checkCredentials("solo", "bad"), false);
expect("other user rejected", checkCredentials("alice", "secret"), false);

// 3. Merged: both sources present, JSON wins a username clash.
resetEnv();
process.env.MCP_USER = "alice";
process.env.MCP_PASS = "single-pw";
process.env.MCP_USERS_JSON = JSON.stringify({ alice: "json-pw", bob: "pw2" });
console.log("3. merged — JSON wins clash");
expect("alice uses JSON password", checkCredentials("alice", "json-pw"), true);
expect("alice old single password rejected", checkCredentials("alice", "single-pw"), false);
expect("bob (JSON-only) accepted", checkCredentials("bob", "pw2"), true);

// 3b. Merged: single-pair user NOT in JSON still works.
resetEnv();
process.env.MCP_USER = "solo";
process.env.MCP_PASS = "single-pw";
process.env.MCP_USERS_JSON = JSON.stringify({ bob: "pw2" });
console.log("3b. merged — non-clashing single pair survives");
expect("solo/single-pw accepted", checkCredentials("solo", "single-pw"), true);
expect("bob/pw2 accepted", checkCredentials("bob", "pw2"), true);

// 4. Fail closed: nothing configured => everything denied.
resetEnv();
console.log("4. fail closed (unconfigured)");
expect("any login denied (empty map)", checkCredentials("alice", "pw1"), false);
expect("empty/empty denied", checkCredentials("", ""), false);

// 5. Malformed JSON: ignored, falls back to the single pair.
resetEnv();
process.env.MCP_USER = "solo";
process.env.MCP_PASS = "secret";
process.env.MCP_USERS_JSON = "{not valid json";
console.log("5. malformed MCP_USERS_JSON falls back to single pair");
expect("solo/secret still accepted", checkCredentials("solo", "secret"), true);
expect("garbage does not crash, unknown denied", checkCredentials("alice", "pw1"), false);

// 5b. Malformed JSON with no single pair => fail closed (no crash).
resetEnv();
process.env.MCP_USERS_JSON = "[1,2,3]"; // valid JSON but not an object map
console.log("5b. non-object JSON => empty map, fail closed");
expect("array JSON ignored, denied", checkCredentials("alice", "pw1"), false);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
