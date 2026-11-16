import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSearchWasSaved, candidateEstimate } from './search-result.mjs';

test('a busca só pode confirmar sucesso depois de persistir o registro', () => {
  assert.throws(() => assertSearchWasSaved({ message: 'Database unavailable' }, null));
  assert.throws(() => assertSearchWasSaved(null, null));
  assert.doesNotThrow(() => assertSearchWasSaved(null, { id: 'saved-search' }));
});

test('sem estimativa válida não inventa contagem e preserva zero', () => {
  assert.equal(candidateEstimate(undefined), null);
  assert.equal(candidateEstimate(-1), null);
  assert.equal(candidateEstimate('72'), null);
  assert.equal(candidateEstimate(0), 0);
  assert.equal(candidateEstimate(48), 48);
});
