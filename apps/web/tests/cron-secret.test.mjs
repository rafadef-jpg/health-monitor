import { test, after } from "node:test";
import assert from "node:assert/strict";
// Node 24 executes TypeScript modules via native type stripping.
import { isCronAuthorized } from "../src/lib/auth/cron-secret.ts";

const ORIGINAL = process.env.CRON_SECRET;
const TEST_SECRET = "test-cron-secret-9f3c7e1b";

function withSecret(value, fn) {
  process.env.CRON_SECRET = value;
  try {
    fn();
  } finally {
    process.env.CRON_SECRET = ORIGINAL;
  }
}

after(() => {
  process.env.CRON_SECRET = ORIGINAL;
});

test("F-07: secret ausente (não configurado) => não autoriza", () => {
  delete process.env.CRON_SECRET;
  assert.equal(isCronAuthorized(`Bearer ${TEST_SECRET}`), false);
  assert.equal(isCronAuthorized("Bearer x"), false);
});

test("F-07: header ausente => não autoriza", () => {
  withSecret(TEST_SECRET, () => {
    assert.equal(isCronAuthorized(null), false);
  });
});

test("F-07: valor correto => autoriza", () => {
  withSecret(TEST_SECRET, () => {
    assert.equal(isCronAuthorized(`Bearer ${TEST_SECRET}`), true);
  });
});

test("F-07: valor errado (mesmo tamanho) => não autoriza", () => {
  withSecret(TEST_SECRET, () => {
    const wrong = "A".repeat(TEST_SECRET.length);
    assert.equal(isCronAuthorized(`Bearer ${wrong}`), false);
  });
});

test("F-07: tamanho diferente => não autoriza sem lançar erro", () => {
  withSecret(TEST_SECRET, () => {
    assert.equal(isCronAuthorized("Bearer curto"), false);
    assert.equal(isCronAuthorized(`Bearer ${TEST_SECRET}extra-caracteres`), false);
  });
});

test("F-07: prefixo diferente => não autoriza", () => {
  withSecret(TEST_SECRET, () => {
    assert.equal(isCronAuthorized(TEST_SECRET), false); // sem "Bearer "
    assert.equal(isCronAuthorized(`bearer ${TEST_SECRET}`), false);
  });
});

test("F-07: secret nunca aparece em mensagens de erro (não há exceção vazando segredo)", () => {
  withSecret(TEST_SECRET, () => {
    // Forçando caminhos anômalos não deve lançar exceção que exponha o secret
    assert.doesNotThrow(() => isCronAuthorized("Bearer " + "🔑".repeat(3)));
  });
});
