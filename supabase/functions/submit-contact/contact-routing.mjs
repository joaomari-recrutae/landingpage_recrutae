const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

export function assertContactWasSaved(dbError) {
  if (!dbError) return;
  throw new Error("Contact lead insert failed");
}

export function shouldSendLeadEmail({ contactKind, types, sourcePage } = {}) {
  const normalizedTypes = Array.isArray(types) ? types.map(normalize) : [];
  const kind = normalize(contactKind);
  const source = normalize(sourcePage);
  const isCandidateSource = source.includes("sou candidato")
    || source.includes("sou-candidato")
    || source.includes("vagas de tecnologia e mercado digital");
  const isExplicitCandidate = kind === "candidate" || kind === "candidato";

  if (isExplicitCandidate || isCandidateSource) return false;
  if (normalizedTypes.includes("empresa")) return true;

  return !normalizedTypes.includes("candidato");
}
