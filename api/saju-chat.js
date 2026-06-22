const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `당신은 사주명리(四柱命理)에 정통한 로또 번호 상담 전문가입니다.
사용자의 성별과 생년월일(및 출생시간)을 바탕으로 사주팔자를 분석하고, 로또 6/45에 맞는 행운의 번호 6개와 보너스 번호 1개를 추천합니다.

분석 시 반드시 다음 사주 요소를 근거로 설명하세요:
- 사주팔자(년·월·일·시 주)와 일간(日干)
- 오행(木火土金水)의 균형과 부족/과다
- 십성, 용신·희신 개념
- 숫자와 오행의 대응 (예: 1,2=木 / 3,4=火 / 5,6=土 / 7,8=金 / 9,0=水 등 명리적 숫자론)
- 성별에 따른 대운·세운 참고 (가능한 범위 내)

규칙:
- 추천 번호는 1~45 사이 정수 6개(오름차순, 중복 없음) + 보너스 1개(본번호와 중복 없음)
- 사주에 기반한 구체적이고 이해하기 쉬운 한국어 설명 제공
- 당첨을 보장하지 않으며 참고용임을 언급
- 출생시간 미입력 시 시주 없이 삼주(년·월·일) 기준으로 분석한다고 명시

반드시 JSON 형식으로만 응답하세요.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    numbers: {
      type: "array",
      items: { type: "integer" },
      description: "추천 로또 번호 6개 (1-45, 오름차순, 중복 없음)",
    },
    bonus: {
      type: "integer",
      description: "보너스 번호 (1-45, numbers와 중복 없음)",
    },
    sajuSummary: {
      type: "string",
      description: "사주팔자 요약 (년·월·일·시 주, 일간, 오행 균형 한 줄 요약)",
    },
    explanation: {
      type: "string",
      description: "각 추천 번호와 전체 조합을 사주 관점에서 상세 설명 (2~4문단)",
    },
  },
  required: ["numbers", "bonus", "sajuSummary", "explanation"],
};

function validateNumbers(numbers, bonus) {
  if (!Array.isArray(numbers) || numbers.length !== 6) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted.some((n) => !Number.isInteger(n) || n < 1 || n > 45)) return false;
  if (new Set(sorted).size !== 6) return false;
  if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45) return false;
  if (sorted.includes(bonus)) return false;
  return true;
}

function buildUserPrompt({ gender, birthDate, birthTime, message, history }) {
  const genderLabel = gender === "male" ? "남성" : gender === "female" ? "여성" : gender;
  const timeNote = birthTime ? `출생시간: ${birthTime}` : "출생시간: 미입력 (삼주 기준 분석)";

  let prompt = `[사용자 정보]
성별: ${genderLabel}
생년월일: ${birthDate}
${timeNote}

`;

  if (history && history.length > 0) {
    prompt += "[이전 대화]\n";
    history.forEach((msg) => {
      prompt += `${msg.role === "user" ? "사용자" : "상담사"}: ${msg.content}\n`;
    });
    prompt += "\n";
  }

  if (message) {
    prompt += `[사용자 질문]\n${message}\n\n`;
  } else {
    prompt += "위 사주 정보를 바탕으로 행운의 로또 번호 6개와 보너스 번호 1개를 추천하고, 사주 근거를 상세히 설명해 주세요.";
  }

  return prompt;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용됩니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 설정해 주세요." });
  }

  const { gender, birthDate, birthTime, message, history } = req.body || {};

  if (!gender || !birthDate) {
    return res.status(400).json({ error: "성별과 생년월일을 입력해 주세요." });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return res.status(400).json({ error: "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)" });
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt({ gender, birthDate, birthTime, message, history }) }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini API error:", errBody);
      return res.status(502).json({ error: "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: "AI 응답을 파싱할 수 없습니다." });
    }

    const parsed = JSON.parse(text);

    if (!validateNumbers(parsed.numbers, parsed.bonus)) {
      return res.status(502).json({ error: "추천 번호 형식이 올바르지 않습니다. 다시 시도해 주세요." });
    }

    parsed.numbers = [...parsed.numbers].sort((a, b) => a - b);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("saju-chat error:", err);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
};
