import test from "node:test";
import assert from "node:assert/strict";

import * as routing from "./contact-routing.mjs";

const { shouldSendLeadEmail } = routing;

test("suppresses the current Sou Candidato form payload", () => {
  assert.equal(shouldSendLeadEmail({
    contactKind: "",
    types: [],
    sourcePage: "Vagas de Tecnologia e Mercado Digital",
  }), false);
});

test("does not trust a lead label coming from the candidate page", () => {
  assert.equal(shouldSendLeadEmail({
    contactKind: "lead",
    types: [],
    sourcePage: "/sou-candidato.html",
  }), false);
});

test("candidate markers take precedence over a contradictory company type", () => {
  assert.equal(shouldSendLeadEmail({
    contactKind: "candidate",
    types: ["empresa"],
    sourcePage: "Página inicial",
  }), false);
});

test("candidate source takes precedence over a contradictory company type", () => {
  assert.equal(shouldSendLeadEmail({
    contactKind: "lead",
    types: ["empresa"],
    sourcePage: "/sou-candidato.html",
  }), false);
});

test("suppresses contacts explicitly identified as candidates", () => {
  assert.equal(shouldSendLeadEmail({
    contactKind: "candidate",
    types: [],
    sourcePage: "",
  }), false);

  assert.equal(shouldSendLeadEmail({
    contactKind: "",
    types: ["candidato"],
    sourcePage: "Página inicial",
  }), false);
});

test("keeps sending commercial leads", () => {
  assert.equal(shouldSendLeadEmail({
    contactKind: "lead",
    types: ["empresa"],
    sourcePage: "Recrutamento e Seleção de Profissionais Especializados",
  }), true);

  assert.equal(shouldSendLeadEmail({
    contactKind: "",
    types: [],
    sourcePage: "Consultoria de Recrutamento e Seleção de TI e Digital",
  }), true);
});

test("treats a contact interested as both company and candidate as a lead", () => {
  assert.equal(shouldSendLeadEmail({
    contactKind: "lead",
    types: ["empresa", "candidato"],
    sourcePage: "Página inicial",
  }), true);
});

test("stops processing when the contact was not saved", () => {
  assert.doesNotThrow(() => routing.assertContactWasSaved(null));
  let thrown;
  try {
    routing.assertContactWasSaved({ message: "private database detail" });
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown?.message, "Contact lead insert failed");
});
