export function assertSearchWasSaved(error, record) {
  if (error || !record?.id) throw new Error('Não foi possível registrar a busca. Tente novamente.');
}

export function candidateEstimate(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}
