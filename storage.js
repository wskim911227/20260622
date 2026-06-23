const DRAWS_API = "/api/lotto-draws";

async function saveLottoDraw({ numbers, bonus, source = "draw", sajuSummary = null, explanation = null }) {
  const response = await fetch(DRAWS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numbers,
      bonus,
      source,
      saju_summary: sajuSummary,
      explanation,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "저장에 실패했습니다.");
  }

  return response.json();
}

async function fetchLottoDraws(limit = 50) {
  const response = await fetch(`${DRAWS_API}?limit=${limit}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "조회에 실패했습니다.");
  }
  return response.json();
}

window.LottoStorage = { saveLottoDraw, fetchLottoDraws };
