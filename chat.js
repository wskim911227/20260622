const chatMessagesEl = document.getElementById("chatMessages");
const sajuRecommendBtn = document.getElementById("sajuRecommendBtn");
const chatInputForm = document.getElementById("chatInputForm");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const sajuGender = document.getElementById("sajuGender");
const sajuBirthDate = document.getElementById("sajuBirthDate");
const sajuBirthTime = document.getElementById("sajuBirthTime");

const API_URL = "/api/saju-chat";
let chatHistory = [];
let isChatLoading = false;

function getBallColor(num) {
  if (num <= 10) return "yellow";
  if (num <= 20) return "blue";
  if (num <= 30) return "red";
  if (num <= 40) return "gray";
  return "green";
}

function createMiniBall(num) {
  const el = document.createElement("span");
  el.className = `mini-ball ${getBallColor(num)}`;
  el.textContent = num;
  return el;
}

function getProfile() {
  return {
    gender: sajuGender.value,
    birthDate: sajuBirthDate.value,
    birthTime: sajuBirthTime.value || null,
  };
}

function validateProfile() {
  const profile = getProfile();
  if (!profile.gender) {
    appendMessage("system", "성별을 선택해 주세요.");
    return null;
  }
  if (!profile.birthDate) {
    appendMessage("system", "생년월일을 입력해 주세요.");
    return null;
  }
  return profile;
}

function appendMessage(role, content, extra = null) {
  const msg = document.createElement("div");
  msg.className = `chat-message chat-message--${role}`;

  if (role === "assistant" && extra?.numbers) {
    const ballsWrap = document.createElement("div");
    ballsWrap.className = "chat-numbers";
    extra.numbers.forEach((num) => ballsWrap.appendChild(createMiniBall(num)));

    const plus = document.createElement("span");
    plus.className = "bonus-divider";
    plus.textContent = "+";
    ballsWrap.appendChild(plus);
    ballsWrap.appendChild(createMiniBall(extra.bonus));

    msg.appendChild(ballsWrap);

    if (extra.sajuSummary) {
      const summary = document.createElement("p");
      summary.className = "chat-saju-summary";
      summary.textContent = extra.sajuSummary;
      msg.appendChild(summary);
    }
  }

  const text = document.createElement("p");
  text.className = "chat-text";
  text.textContent = content;
  msg.appendChild(text);

  chatMessagesEl.appendChild(msg);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function appendLoading() {
  const msg = document.createElement("div");
  msg.className = "chat-message chat-message--loading";
  msg.id = "chatLoading";
  msg.innerHTML = '<span class="chat-loading-dots"><span></span><span></span><span></span></span> 사주 분석 중...';
  chatMessagesEl.appendChild(msg);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function removeLoading() {
  document.getElementById("chatLoading")?.remove();
}

function setChatEnabled(enabled) {
  chatInput.disabled = !enabled;
  chatSendBtn.disabled = !enabled;
}

async function callSajuApi(message = null) {
  const profile = validateProfile();
  if (!profile) return;

  isChatLoading = true;
  sajuRecommendBtn.disabled = true;
  chatSendBtn.disabled = true;

  if (!message) {
    chatHistory = [];
    chatMessagesEl.innerHTML = "";
    appendMessage("user", `${profile.birthDate}생 ${profile.gender === "male" ? "남성" : "여성"} — 사주 번호 추천 요청`);
  } else {
    appendMessage("user", message);
    chatHistory.push({ role: "user", content: message });
  }

  appendLoading();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        message,
        history: chatHistory.slice(-6),
      }),
    });

    const data = await response.json();
    removeLoading();

    if (!response.ok) {
      appendMessage("system", data.error || "요청에 실패했습니다.");
      return;
    }

    appendMessage("assistant", data.explanation, {
      numbers: data.numbers,
      bonus: data.bonus,
      sajuSummary: data.sajuSummary,
    });

    chatHistory.push({
      role: "assistant",
      content: `[추천번호: ${data.numbers.join(", ")} + ${data.bonus}] ${data.sajuSummary} ${data.explanation}`,
    });

    setChatEnabled(true);
  } catch {
    removeLoading();
    appendMessage("system", "네트워크 오류가 발생했습니다. Vercel에 배포된 환경에서 API가 동작하는지 확인해 주세요.");
  } finally {
    isChatLoading = false;
    sajuRecommendBtn.disabled = false;
    if (chatHistory.length > 0) chatSendBtn.disabled = false;
  }
}

sajuRecommendBtn.addEventListener("click", () => {
  if (isChatLoading) return;
  callSajuApi();
});

chatInputForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (isChatLoading) return;

  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.value = "";
  callSajuApi(message);
});
