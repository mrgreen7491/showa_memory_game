"use strict";

const ITEMS = [
  ["01_kurodenwa.png", "黒電話"], ["02_soroban.png", "そろばん"],
  ["03_katorisenko.png", "蚊取り線香"], ["04_ashifumi_mishin.png", "足踏みミシン"],
  ["05_mahotobin.png", "魔法瓶"], ["06_yakan.png", "やかん"],
  ["07_chabudai.png", "ちゃぶ台"], ["08_senpuki.png", "扇風機"],
  ["09_shirokuro_tv.png", "白黒テレビ"], ["10_mezamashi_dokei.png", "目覚まし時計"],
  ["11_record.png", "レコード盤"], ["12_chikuonki.png", "蓄音機"],
  ["13_geta.png", "下駄"], ["14_bangasa.png", "番傘"],
  ["15_akashirobo.png", "赤白帽"], ["16_randoseru.png", "ランドセル"],
  ["17_buriki_robot.png", "ブリキのロボット"], ["18_taketombo.png", "竹とんぼ"],
  ["19_kendama.png", "けん玉"], ["20_daruma.png", "だるま"],
  ["21_koma.png", "こま"], ["22_bidama.png", "ビー玉"],
  ["23_kamifusen.png", "紙風船"], ["24_orizuru.png", "折り鶴"],
  ["25_hagoita.png", "羽子板"], ["26_koinobori.png", "鯉のぼり"],
  ["27_kingyobachi.png", "金魚鉢"], ["28_ramune_bin.png", "ラムネ瓶"],
  ["29_post.png", "丸型郵便ポスト"], ["30_sanrinsha.png", "三輪車"]
];
const LEVELS = {
  easy: { name: "かんたん", choices: 2 },
  medium: { name: "少しむずかしい", choices: 3 },
  hard: { name: "もっとむずかしい", choices: 4 }
};
const TOTAL_QUESTIONS = 10;
const MEMORY_SECONDS = 15;
const SCREEN_IDS = ["startScreen", "memoryScreen", "questionScreen", "correctScreen", "wrongScreen", "finishScreen"];
const CORRECT_SOUNDS = [
  "audio/seikai1.wav",
  "audio/seikai2.wav",
  "audio/seikai3.wav"
];
const WRONG_SOUNDS = [
  "audio/zannen1.wav",
  "audio/zannen2.wav",
  "audio/zannen3.wav"
];
const $ = id => document.getElementById(id);

let levelKey = "easy";
let lastLevel = "easy";
let questionNumber = 0;
let rounds = [];
let currentRound = null;
let timerId = null;
let lastCorrectSound = null;
let lastWrongSound = null;
let activeAudio = null;

function pickRandomSound(pool, lastUsed) {
  const candidates = pool.length > 1 ? pool.filter(s => s !== lastUsed) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
function playSound(src) {
  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    const audio = new Audio(src);
    activeAudio = audio;
    audio.play().catch(() => {});
  } catch (_) {}
}
function playCorrectSound() {
  const chosen = pickRandomSound(CORRECT_SOUNDS, lastCorrectSound);
  lastCorrectSound = chosen;
  playSound(chosen);
}
function playWrongSound() {
  const chosen = pickRandomSound(WRONG_SOUNDS, lastWrongSound);
  lastWrongSound = chosen;
  playSound(chosen);
}

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function src(item) { return `images/${item[0]}`; }
function show(id) {
  SCREEN_IDS.forEach(s => { $(s).hidden = (s !== id); });
}
function updateProgress() {
  $("progress").textContent = currentRound
    ? `${LEVELS[levelKey].name} ${questionNumber + 1} / ${TOTAL_QUESTIONS} 問` : "";
}
function buildRounds() {
  // 各問題で覚える5枚を選び、その5枚のうち1枚を質問対象にする。
  return Array.from({length: TOTAL_QUESTIONS}, () => {
    const memorySet = shuffle(ITEMS).slice(0, 5);
    const target = memorySet[Math.floor(Math.random() * memorySet.length)];
    const distractors = shuffle(ITEMS.filter(x => !memorySet.some(m => m[0] === x[0])))
      .slice(0, LEVELS[levelKey].choices - 1);
    return {
      memorySet,
      target,
      choices: shuffle([target, ...distractors])
    };
  });
}
function imageCard(item, className) {
  const card = document.createElement("div");
  card.className = className;
  const img = document.createElement("img");
  img.src = src(item);
  img.alt = item[1];
  card.appendChild(img);
  return card;
}
function renderMemoryGrid(containerId, items, cardClass = "memory-card", blinkTarget = null) {
  const container = $(containerId);
  container.innerHTML = "";
  items.forEach(item => {
    const isTarget = blinkTarget && item[0] === blinkTarget[0];
    const card = imageCard(item, cardClass + (isTarget ? " is-correct" : ""));
    container.appendChild(card);
  });
}
function beginLevel(key) {
  clearInterval(timerId);
  levelKey = lastLevel = key;
  questionNumber = 0;
  rounds = buildRounds();
  currentRound = rounds[0];
  beginMemory();
}
function beginMemory() {
  clearInterval(timerId);
  currentRound = rounds[questionNumber];
  updateProgress();
  renderMemoryGrid("memoryGrid", currentRound.memorySet);
  $("countdown").textContent = MEMORY_SECONDS;
  show("memoryScreen");

  let seconds = MEMORY_SECONDS;
  timerId = setInterval(() => {
    seconds -= 1;
    $("countdown").textContent = seconds;
    if (seconds <= 0) {
      clearInterval(timerId);
      timerId = null;
      showQuestion();
    }
  }, 1000);
}
function showQuestion() {
  $("questionText").textContent = "さっき見た5つの絵の中にあったものと同じ絵はどれでしょう？";
  const grid = $("answerGrid");
  grid.innerHTML = "";
  grid.style.setProperty("--choice-count", currentRound.choices.length);
  currentRound.choices.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-card";
    button.setAttribute("aria-label", item[1]);
    const img = document.createElement("img");
    img.src = src(item);
    img.alt = item[1];
    button.appendChild(img);
    button.addEventListener("click", () => selectAnswer(item));
    grid.appendChild(button);
  });
  show("questionScreen");
}
function selectAnswer(item) {
  if (item[0] === currentRound.target[0]) showCorrect();
  else showWrong();
}
function showCorrect() {
  playCorrectSound();
  renderMemoryGrid("reviewMemoryGrid", currentRound.memorySet, "memory-card", currentRound.target);
  const grid = $("reviewAnswerGrid");
  grid.innerHTML = "";
  grid.style.setProperty("--choice-count", currentRound.choices.length);
  currentRound.choices.forEach(item => {
    const card = imageCard(item, "answer-card" + (item[0] === currentRound.target[0] ? " is-correct" : ""));
    grid.appendChild(card);
  });
  show("correctScreen");
}
function showWrong() {
  playWrongSound();
  show("wrongScreen");
}
function nextQuestion() {
  questionNumber += 1;
  if (questionNumber >= TOTAL_QUESTIONS) {
    currentRound = null;
    $("progress").textContent = "";
    $("finishText").textContent = `${LEVELS[levelKey].name}の10問が終わりました。お疲れさまでした！`;
    show("finishScreen");
    return;
  }
  currentRound = rounds[questionNumber];
  beginMemory();
}

document.querySelectorAll(".level").forEach(button => {
  button.addEventListener("click", () => beginLevel(button.dataset.level));
});
$("retryBtn").addEventListener("click", beginMemory);
$("nextBtn").addEventListener("click", nextQuestion);
$("againBtn").addEventListener("click", () => beginLevel(lastLevel));
$("levelsBtn").addEventListener("click", () => {
  currentRound = null;
  $("progress").textContent = "";
  show("startScreen");
});
$("fullscreenBtn").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {
    alert("全画面表示にできませんでした。ブラウザーの全画面機能をご利用ください。");
  }
});
show("startScreen");