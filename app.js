const MIN_NUMBER = 1;
const MAX_NUMBER = 45;
const MAIN_COUNT = 6;
const DRUM_BALL_COUNT = 28;

const ballsEl = document.querySelectorAll("#balls .slot-ball");
const bonusSection = document.getElementById("bonusSection");
const bonusBall = document.getElementById("bonusBall");
const drawBtn = document.getElementById("drawBtn");
const includeBonusCheckbox = document.getElementById("includeBonus");
const countSelect = document.getElementById("countSelect");
const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const clearBtn = document.getElementById("clearBtn");
const machineDrum = document.getElementById("machineDrum");
const drumBallsEl = document.getElementById("drumBalls");
const chuteBall = document.getElementById("chuteBall");

let isDrawing = false;
let tumbleInterval = null;

function getBallColor(num) {
  if (num <= 10) return "yellow";
  if (num <= 20) return "blue";
  if (num <= 30) return "red";
  if (num <= 40) return "gray";
  return "green";
}

function pickUniqueNumbers(count, exclude = []) {
  const excludeSet = new Set(exclude);
  const pool = [];
  for (let i = MIN_NUMBER; i <= MAX_NUMBER; i++) {
    if (!excludeSet.has(i)) pool.push(i);
  }

  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result.sort((a, b) => a - b);
}

function generateLottoSet(includeBonus) {
  const main = pickUniqueNumbers(MAIN_COUNT);
  const bonus = includeBonus ? pickUniqueNumbers(1, main)[0] : null;
  return { main, bonus };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function populateDrumBalls() {
  drumBallsEl.innerHTML = "";
  const drumSize = machineDrum.querySelector(".drum-glass").offsetWidth || 200;

  for (let i = 0; i < DRUM_BALL_COUNT; i++) {
    const num = randomInt(MIN_NUMBER, MAX_NUMBER);
    const ball = document.createElement("div");
    ball.className = `drum-ball ${getBallColor(num)}`;
    ball.textContent = num;
    ball.style.left = `${randomInt(8, drumSize - 30)}px`;
    ball.style.top = `${randomInt(8, drumSize - 30)}px`;
    ball.style.setProperty("--tx0", `${randomInt(-25, 25)}px`);
    ball.style.setProperty("--ty0", `${randomInt(-25, 25)}px`);
    ball.style.setProperty("--tx1", `${randomInt(-30, 30)}px`);
    ball.style.setProperty("--ty1", `${randomInt(-30, 30)}px`);
    ball.style.setProperty("--tumble-dur", `${(randomInt(4, 9) / 10).toFixed(1)}s`);
    ball.style.setProperty("--idle-delay", `${(randomInt(0, 20) / 10).toFixed(1)}s`);
    drumBallsEl.appendChild(ball);
  }
}

function shuffleDrumNumbers() {
  drumBallsEl.querySelectorAll(".drum-ball").forEach((ball) => {
    const num = randomInt(MIN_NUMBER, MAX_NUMBER);
    ball.textContent = num;
    ball.className = `drum-ball ${getBallColor(num)}`;
  });
}

function startTumbling() {
  machineDrum.classList.add("is-tumbling");
  tumbleInterval = setInterval(shuffleDrumNumbers, 120);
}

function stopTumbling() {
  machineDrum.classList.remove("is-tumbling");
  if (tumbleInterval) {
    clearInterval(tumbleInterval);
    tumbleInterval = null;
  }
}

function resetBalls() {
  ballsEl.forEach((ball) => {
    ball.textContent = "?";
    ball.className = "ball slot-ball placeholder";
    ball.closest(".result-slot")?.classList.remove("has-ball");
  });

  bonusBall.textContent = "?";
  bonusBall.className = "ball slot-ball bonus placeholder";
  bonusBall.closest(".result-slot")?.classList.remove("has-ball");

  chuteBall.hidden = true;
  chuteBall.className = "chute-ball";
  chuteBall.textContent = "";
}

function setBallElement(el, num) {
  const color = getBallColor(num);
  el.textContent = num;
  el.className = `ball slot-ball ${color} revealed`;
  if (el.classList.contains("bonus")) {
    el.classList.add("bonus");
  }
  el.closest(".result-slot")?.classList.add("has-ball");
}

function setChuteBall(num) {
  chuteBall.hidden = false;
  chuteBall.textContent = num;
  chuteBall.className = `chute-ball ${getBallColor(num)}`;
}

async function animateBallFromMachine(num, targetEl, { isBonus = false } = {}) {
  const tumbleDuration = 900 + randomInt(0, 400);
  startTumbling();
  await sleep(tumbleDuration);

  stopTumbling();

  let spinCount = 0;
  const spinMax = 8;
  const spinTimer = setInterval(() => {
    const randomNum = randomInt(MIN_NUMBER, MAX_NUMBER);
    setChuteBall(randomNum);
    spinCount += 1;
    if (spinCount >= spinMax) clearInterval(spinTimer);
  }, 70);

  await sleep(spinMax * 70 + 100);
  clearInterval(spinTimer);

  setChuteBall(num);
  chuteBall.classList.remove("is-descending");
  void chuteBall.offsetWidth;
  chuteBall.classList.add("is-descending");

  await sleep(720);

  chuteBall.hidden = true;
  chuteBall.classList.remove("is-descending");

  if (isBonus) {
    bonusBall.className = `ball slot-ball bonus ${getBallColor(num)} revealed`;
    bonusBall.textContent = num;
    bonusBall.closest(".result-slot")?.classList.add("has-ball");
  } else {
    setBallElement(targetEl, num);
  }

  await sleep(280);
}

async function animateReveal(numbers, bonus) {
  for (let i = 0; i < ballsEl.length; i++) {
    await animateBallFromMachine(numbers[i], ballsEl[i]);
  }

  if (bonus !== null) {
    bonusSection.hidden = false;
    await sleep(400);
    await animateBallFromMachine(bonus, bonusBall, { isBonus: true });
  } else {
    bonusSection.hidden = true;
  }

  stopTumbling();
}

function createMiniBall(num) {
  const el = document.createElement("span");
  el.className = `mini-ball ${getBallColor(num)}`;
  el.textContent = num;
  return el;
}

function addHistoryItem(setIndex, { main, bonus }) {
  historySection.hidden = false;

  const li = document.createElement("li");
  li.className = "history-item";

  const label = document.createElement("span");
  label.className = "set-label";
  label.textContent = `#${setIndex}`;
  li.appendChild(label);

  main.forEach((num) => li.appendChild(createMiniBall(num)));

  if (bonus !== null) {
    const divider = document.createElement("span");
    divider.className = "bonus-divider";
    divider.textContent = "+";
    li.appendChild(divider);
    li.appendChild(createMiniBall(bonus));
  }

  historyList.prepend(li);
}

async function draw() {
  if (isDrawing) return;

  isDrawing = true;
  drawBtn.disabled = true;
  stopTumbling();

  const includeBonus = includeBonusCheckbox.checked;
  const count = parseInt(countSelect.value, 10);

  historyList.innerHTML = "";
  historySection.hidden = count <= 1;
  const drawnSets = [];

  for (let i = 0; i < count; i++) {
    resetBalls();
    populateDrumBalls();
    const result = generateLottoSet(includeBonus);
    await animateReveal(result.main, result.bonus);
    drawnSets.push(result);

    if (count > 1) {
      addHistoryItem(i + 1, result);
    }

    if (i < count - 1) {
      await sleep(600);
    }
  }

  await saveDrawnSets(drawnSets);

  isDrawing = false;
  drawBtn.disabled = false;
}

async function saveDrawnSets(sets) {
  for (const { main, bonus } of sets) {
    try {
      await LottoStorage.saveLottoDraw({
        numbers: main,
        bonus,
        source: "draw",
      });
    } catch (err) {
      console.warn("추첨 번호 저장 실패:", err.message);
    }
  }
  loadSavedDraws();
}

drawBtn.addEventListener("click", draw);

clearBtn.addEventListener("click", () => {
  historyList.innerHTML = "";
  historySection.hidden = true;
  stopTumbling();
  resetBalls();
  populateDrumBalls();
  bonusSection.hidden = !includeBonusCheckbox.checked;
});

includeBonusCheckbox.addEventListener("change", () => {
  if (!isDrawing) {
    bonusSection.hidden = !includeBonusCheckbox.checked;
  }
});

const savedDrawsLoading = document.getElementById("savedDrawsLoading");
const savedDrawsError = document.getElementById("savedDrawsError");
const savedDrawsList = document.getElementById("savedDrawsList");
const savedDrawsEmpty = document.getElementById("savedDrawsEmpty");
const refreshSavedBtn = document.getElementById("refreshSavedBtn");

function formatSavedDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderSavedDrawItem(draw) {
  const li = document.createElement("li");
  li.className = "saved-draw-item";

  const meta = document.createElement("div");
  meta.className = "saved-draw-meta";

  const badge = document.createElement("span");
  badge.className = `saved-draw-badge saved-draw-badge--${draw.source}`;
  badge.textContent = draw.source === "saju" ? "사주" : "추첨";
  meta.appendChild(badge);

  const date = document.createElement("span");
  date.className = "saved-draw-date";
  date.textContent = formatSavedDate(draw.created_at);
  meta.appendChild(date);

  li.appendChild(meta);

  const balls = document.createElement("div");
  balls.className = "saved-draw-numbers";
  draw.numbers.forEach((num) => balls.appendChild(createMiniBall(num)));

  if (draw.bonus != null) {
    const plus = document.createElement("span");
    plus.className = "bonus-divider";
    plus.textContent = "+";
    balls.appendChild(plus);
    balls.appendChild(createMiniBall(draw.bonus));
  }

  li.appendChild(balls);

  if (draw.saju_summary) {
    const summary = document.createElement("p");
    summary.className = "saved-draw-summary";
    summary.textContent = draw.saju_summary;
    li.appendChild(summary);
  }

  return li;
}

async function loadSavedDraws() {
  savedDrawsLoading.hidden = false;
  savedDrawsError.hidden = true;
  savedDrawsEmpty.hidden = true;

  try {
    const draws = await LottoStorage.fetchLottoDraws(50);
    savedDrawsLoading.hidden = true;
    savedDrawsList.innerHTML = "";

    if (!draws.length) {
      savedDrawsEmpty.hidden = false;
      return;
    }

    draws.forEach((draw) => savedDrawsList.appendChild(renderSavedDrawItem(draw)));
  } catch (err) {
    savedDrawsLoading.hidden = true;
    savedDrawsError.hidden = false;
    savedDrawsError.textContent = err.message;
  }
}

refreshSavedBtn.addEventListener("click", loadSavedDraws);
window.loadSavedDraws = loadSavedDraws;

const LOTTO_DATA_URL = "https://smok95.github.io/lotto/results/all.json";
const PAGE_SIZE = 20;

const winningLoading = document.getElementById("winningLoading");
const winningError = document.getElementById("winningError");
const winningTableWrap = document.getElementById("winningTableWrap");
const winningTableBody = document.getElementById("winningTableBody");
const winningPagination = document.getElementById("winningPagination");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const roundSearch = document.getElementById("roundSearch");

let allWinningData = [];
let filteredWinningData = [];
let currentPage = 1;

function formatDate(isoDate) {
  const date = new Date(isoDate);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function formatPrize(amount) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function createTableMiniBall(num) {
  const el = document.createElement("span");
  el.className = `table-mini-ball ${getBallColor(num)}`;
  el.textContent = num;
  return el;
}

function renderWinningTable() {
  const totalPages = Math.max(1, Math.ceil(filteredWinningData.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredWinningData.slice(start, start + PAGE_SIZE);

  winningTableBody.innerHTML = "";

  pageData.forEach((item) => {
    const firstPrize = item.divisions[0];
    const tr = document.createElement("tr");

    const roundTd = document.createElement("td");
    roundTd.className = "round-cell";
    roundTd.textContent = `${item.draw_no}회`;
    tr.appendChild(roundTd);

    const dateTd = document.createElement("td");
    dateTd.className = "date-cell";
    dateTd.textContent = formatDate(item.date);
    tr.appendChild(dateTd);

    const numbersTd = document.createElement("td");
    const numbersWrap = document.createElement("div");
    numbersWrap.className = "numbers-cell";
    item.numbers.forEach((num) => numbersWrap.appendChild(createTableMiniBall(num)));

    const plus = document.createElement("span");
    plus.className = "bonus-plus";
    plus.textContent = "+";
    numbersWrap.appendChild(plus);
    numbersWrap.appendChild(createTableMiniBall(item.bonus_no));
    numbersTd.appendChild(numbersWrap);
    tr.appendChild(numbersTd);

    const prizeTd = document.createElement("td");
    prizeTd.className = "prize-cell";
    prizeTd.textContent = formatPrize(firstPrize.prize);
    tr.appendChild(prizeTd);

    const winnersTd = document.createElement("td");
    winnersTd.className = "winners-cell";
    winnersTd.textContent = `${firstPrize.winners}명`;
    tr.appendChild(winnersTd);

    winningTableBody.appendChild(tr);
  });

  pageInfo.textContent = `${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function applySearch() {
  const query = roundSearch.value.trim();
  if (!query) {
    filteredWinningData = allWinningData;
  } else {
    filteredWinningData = allWinningData.filter(
      (item) => String(item.draw_no).includes(query)
    );
  }
  currentPage = 1;
  renderWinningTable();
}

async function loadWinningHistory() {
  try {
    const response = await fetch(LOTTO_DATA_URL);
    if (!response.ok) throw new Error("데이터를 불러오지 못했습니다.");

    const data = await response.json();
    allWinningData = data.sort((a, b) => b.draw_no - a.draw_no);
    filteredWinningData = allWinningData;

    winningLoading.hidden = true;
    winningTableWrap.hidden = false;
    winningPagination.hidden = false;
    renderWinningTable();
  } catch (err) {
    winningLoading.hidden = true;
    winningError.hidden = false;
    winningError.textContent = `당첨 정보를 불러오지 못했습니다. (${err.message})`;
  }
}

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderWinningTable();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredWinningData.length / PAGE_SIZE);
  if (currentPage < totalPages) {
    currentPage += 1;
    renderWinningTable();
  }
});

roundSearch.addEventListener("input", applySearch);

populateDrumBalls();
loadSavedDraws();
loadWinningHistory();
