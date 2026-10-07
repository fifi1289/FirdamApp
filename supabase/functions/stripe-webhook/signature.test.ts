import { verifyStripeSignature } from "./signature.ts";

async function sign(payload: string, secret: string, t: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${t},v1=${hex}`;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test("accepts a valid signature", async () => {
  const t = 1_800_000_000;
  const header = await sign('{"id":"evt_1"}', "whsec_test", t);
  assert(await verifyStripeSignature('{"id":"evt_1"}', header, "whsec_test", t + 10), "should verify");
});

Deno.test("rejects tampered payload, wrong secret and old timestamps", async () => {
  const t = 1_800_000_000;
  const header = await sign('{"id":"evt_1"}', "whsec_test", t);
  assert(!(await verifyStripeSignature('{"id":"evt_2"}', header, "whsec_test", t)), "tampered payload");
  assert(!(await verifyStripeSignature('{"id":"evt_1"}', header, "whsec_other", t)), "wrong secret");
  assert(!(await verifyStripeSignature('{"id":"evt_1"}', header, "whsec_test", t + 3600)), "replay");
  assert(!(await verifyStripeSignature('{"id":"evt_1"}', null, "whsec_test", t)), "missing header");
});
