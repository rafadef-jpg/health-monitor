import { test } from "node:test";
import assert from "node:assert/strict";
// Node 24 executa módulos TypeScript via type stripping nativo.
import { validatePushSubscription } from "../src/lib/push/validate-subscription.ts";

const VALID = {
  endpoint: "https://push.example.com/send/abc123",
  keys: { p256dh: "B".repeat(88), auth: "a".repeat(24) },
};

test("F-09: payload válido => ok", () => {
  const r = validatePushSubscription(VALID);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.endpoint, VALID.endpoint);
    assert.equal(r.p256dh, VALID.keys.p256dh);
    assert.equal(r.auth, VALID.keys.auth);
  }
});

test("F-09: endpoint HTTP (não HTTPS) => rejeita", () => {
  const r = validatePushSubscription({
    ...VALID,
    endpoint: VALID.endpoint.replace("https://", "http://"),
  });
  assert.equal(r.ok, false);
});

test("F-09: endpoint não parseável => rejeita", () => {
  for (const endpoint of ["nao-e-uma-url", "javascript:alert(1)", "", "data:text/plain,x"]) {
    const r = validatePushSubscription({ ...VALID, endpoint });
    assert.equal(r.ok, false, `deveria rejeitar: ${endpoint}`);
  }
});

test("F-09: endpoint ausente / tipo errado => rejeita", () => {
  assert.equal(validatePushSubscription({ keys: VALID.keys }).ok, false);
  assert.equal(validatePushSubscription(null).ok, false);
  assert.equal(validatePushSubscription(undefined).ok, false);
  assert.equal(validatePushSubscription("string crua").ok, false);
});

test("F-09: endpoint acima do limite (512 chars) => rejeita", () => {
  const grande = "https://push.example.com/" + "x".repeat(512);
  assert.equal(validatePushSubscription({ ...VALID, endpoint: grande }).ok, false);
  const noLimite = ("https://push.example.com/" + "x".repeat(512)).slice(0, 512);
  assert.equal(validatePushSubscription({ ...VALID, endpoint: noLimite }).ok, true);
});

test("F-09: chaves ausentes => rejeita", () => {
  assert.equal(validatePushSubscription({ endpoint: VALID.endpoint }).ok, false);
  assert.equal(validatePushSubscription({ endpoint: VALID.endpoint, keys: {} }).ok, false);
  assert.equal(
    validatePushSubscription({ endpoint: VALID.endpoint, keys: { p256dh: VALID.keys.p256dh } }).ok,
    false
  );
});

test("F-09: chaves com charset inválido ou grandes demais => rejeita", () => {
  assert.equal(
    validatePushSubscription({ ...VALID, keys: { ...VALID.keys, p256dh: "tem espaço aqui" } }).ok,
    false
  );
  assert.equal(
    validatePushSubscription({ ...VALID, keys: { ...VALID.keys, p256dh: "B".repeat(129) } }).ok,
    false
  );
  assert.equal(
    validatePushSubscription({ ...VALID, keys: { ...VALID.keys, auth: "a".repeat(65) } }).ok,
    false
  );
  assert.equal(
    validatePushSubscription({ ...VALID, keys: { ...VALID.keys, auth: "" } }).ok,
    false
  );
});
