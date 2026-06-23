function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRest(path, options = {}) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
    body: options.body,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text || response.statusText;
    throw new Error(message);
  }

  return data;
}

function validateDrawPayload({ numbers, bonus }) {
  if (!Array.isArray(numbers) || numbers.length !== 6) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted.some((n) => !Number.isInteger(n) || n < 1 || n > 45)) return false;
  if (new Set(sorted).size !== 6) return false;
  if (bonus != null) {
    if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45) return false;
    if (sorted.includes(bonus)) return false;
  }
  return true;
}

module.exports = { getSupabaseConfig, supabaseRest, validateDrawPayload };
