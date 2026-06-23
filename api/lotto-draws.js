const { getSupabaseConfig, supabaseRest, validateDrawPayload } = require("./lib/supabase");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!getSupabaseConfig()) {
    return res.status(500).json({
      error: "Supabase가 설정되지 않았습니다. Vercel에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 등록해 주세요.",
    });
  }

  try {
    if (req.method === "GET") {
      const limit = Math.min(parseInt(req.query?.limit, 10) || 50, 100);
      const data = await supabaseRest(
        `lotto_draws?select=id,numbers,bonus,source,saju_summary,explanation,created_at&order=created_at.desc&limit=${limit}`
      );
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { numbers, bonus, source = "draw", saju_summary, explanation } = req.body || {};

      if (!validateDrawPayload({ numbers, bonus })) {
        return res.status(400).json({ error: "번호 형식이 올바르지 않습니다. (1~45, 6개 + 보너스)" });
      }

      const row = {
        numbers: [...numbers].sort((a, b) => a - b),
        bonus: bonus ?? null,
        source: source === "saju" ? "saju" : "draw",
        saju_summary: saju_summary || null,
        explanation: explanation || null,
      };

      const data = await supabaseRest("lotto_draws", {
        method: "POST",
        body: JSON.stringify(row),
        prefer: "return=representation",
      });

      return res.status(201).json(data[0] || data);
    }

    return res.status(405).json({ error: "GET, POST만 허용됩니다." });
  } catch (err) {
    console.error("lotto-draws error:", err);
    return res.status(500).json({ error: err.message || "서버 오류가 발생했습니다." });
  }
};
