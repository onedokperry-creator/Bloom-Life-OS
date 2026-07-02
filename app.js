const folderData = {
  goals: {
    title: "Goals",
    sections: [
      ["Yearly Goals", "心と体を整えながら、ダンスを1年続ける。"],
      ["Monthly Goals", "週2回の運動と、毎週1回のふりかえり。"],
      ["Weekly Goals", "3つの小さなミッションを完了する。"],
      ["Daily Missions", "水を3杯飲む / 5分だけ整える"],
    ],
  },
  money: {
    title: "Money",
    sections: [
      ["Income", "今月 280,000円"],
      ["Spending", "今月 48,200円"],
      ["Budget", "残り 71,800円"],
      ["Event Budget", "12,000円"],
      ["Reward Savings", "32,600円 / 50,000円"],
      ["Assets", "先月より +18,000円"],
    ],
  },
  calendar: {
    title: "Calendar",
    sections: [
      ["Today", "18:00 ダンス / Mood: 嬉しい / Spending: ランチ 1,200円"],
      ["AI Summary", "少し疲れはあったけれど、活動できた日。"],
      ["Life Log", "Plans、Mood、Spending、Photos、Journal、AI Summaryを1日単位で表示します。"],
    ],
  },
  vision: {
    title: "Vision",
    custom: "vision",
  },
  memories: {
    title: "Memories",
    sections: [
      ["Journal", "ダンスが楽しかった。帰りにカフェでゆっくりした。"],
      ["Happy Moments", "仕事で褒められた。"],
      ["Done List", "疲れていても夜の予定に行けた。"],
      ["Gratitude", "先生が声をかけてくれた。"],
      ["Memories", "小さく前に進んだ日。"],
    ],
  },
  growth: {
    title: "Growth",
    sections: [
      ["EXP", "2350 / 3000"],
      ["Level", "Lv.23"],
      ["Badges", "Bloom Starter / Dance Seed"],
      ["Streak", "7 days"],
      ["AI Reflection", "昨日より少し、自分の生活を育てられています。"],
      ["Growth Log", "自分を責めずに記録できた。"],
    ],
  },
};

const folderButtons = document.querySelectorAll(".folder-card");
const folderWindow = document.querySelector("#folderWindow");
const folderTitle = document.querySelector("#folderTitle");
const folderContent = document.querySelector("#folderContent");
const closeFolder = document.querySelector("#closeFolder");
const input = document.querySelector("#bloomInput");
const organizeButton = document.querySelector("#organizeButton");
const promptButtons = document.querySelectorAll(".quick-row button");
const chatLog = document.querySelector("#chatLog");
const confirmPanel = document.querySelector("#confirmPanel");
const savePreview = document.querySelector("#savePreview");
const editDraft = document.querySelector("#editDraft");
const saveDraft = document.querySelector("#saveDraft");
const todayPlans = document.querySelector("#todayPlans");
const moodFace = document.querySelector("#moodFace");
const moodText = document.querySelector("#moodText");
const latestMemory = document.querySelector("#latestMemory");
const expText = document.querySelector("#expText");
const expBar = document.querySelector("#expBar");
const rewardSaving = document.querySelector("#rewardSaving");
const savingBar = document.querySelector("#savingBar");
const missionChecks = document.querySelectorAll(".mission input");
const homeButton = document.querySelector("#homeButton");

let draft = null;
let exp = 2350;
let saving = 32600;

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.innerHTML = `<span>${role === "user" ? "YOU" : "Bloom"}</span><p></p>`;
  message.querySelector("p").textContent = text;
  chatLog.append(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function amountFromText(text) {
  const match = text.match(/([0-9０-９,，]+)\s*円/);
  if (!match) return null;
  const value = match[1]
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
    .replace(/[，,]/g, "");
  return Number(value);
}

function classify(text) {
  const amount = amountFromText(text);
  const isHappy = /嬉し|楽しかった|褒め|😊/.test(text);
  const isTired = /疲|不安|つら/.test(text);
  const hasDance = /ダンス|ベリーダンス/.test(text);
  const hasLunch = /昼|ランチ/.test(text);
  const hasCafe = /カフェ/.test(text);
  const hasPlan = /明日|予約|予定|美容院|夜/.test(text);
  const compliment = /褒め/.test(text);

  return {
    mood: isHappy ? "嬉しい" : isTired ? "少し疲れ" : "穏やか",
    moodIcon: isHappy ? "😊" : isTired ? "☁" : "◡",
    journal: hasDance ? "夜はダンス。少し疲れたけど楽しかった。" : text.slice(0, 42),
    memory: compliment ? "仕事で褒められた" : hasDance ? "ダンスが楽しかった" : "今日の記録",
    plan: hasDance ? "夜はダンス" : hasPlan ? "予定を追加" : "なし",
    spendingTitle: amount ? (hasLunch ? "ランチ" : hasCafe ? "カフェ" : "支出") : "",
    amount,
    activity: hasDance ? "ベリーダンス" : "",
    habit: hasDance ? "ダンス習慣 +1" : "",
    growth: compliment ? "褒められたことをGrowthに記録" : "今日の記録をGrowthに追加",
    vision: hasDance ? "ダンス目標の進捗 +1" : "",
    raw: text,
  };
}

function renderPreview(data) {
  const rows = [
    ["Mood", data.mood],
    ["Journal", data.journal],
    ["Memories", data.memory],
    ["Plans", data.plan],
    ["Spending", data.amount ? `${data.spendingTitle} ${data.amount.toLocaleString("ja-JP")}円` : "なし"],
    ["Activity", data.activity || "なし"],
    ["Habits", data.habit || "なし"],
    ["Growth", data.growth],
    ["Vision", data.vision || "なし"],
  ];

  savePreview.innerHTML = "";
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "preview-row";
    row.innerHTML = "<strong></strong><span></span>";
    row.querySelector("strong").textContent = label;
    row.querySelector("span").textContent = value;
    savePreview.append(row);
  });
  confirmPanel.hidden = false;
}

function updateGrowth(delta) {
  exp = Math.max(0, Math.min(3000, exp + delta));
  expText.textContent = `EXP ${exp} / 3000`;
  expBar.style.width = `${Math.round((exp / 3000) * 100)}%`;
}

function renderFolder(key) {
  const data = folderData[key];
  folderTitle.textContent = data.title;
  folderContent.innerHTML = "";

  if (data.custom === "vision") {
    const board = document.createElement("div");
    board.className = "vision-board";
    ["ダンスを続ける 43%", "旅の計画 25%", "心地よい部屋 58%", "ごほうび旅行 65%"].forEach((item) => {
      const tile = document.createElement("div");
      tile.className = "vision-tile";
      tile.textContent = item;
      board.append(tile);
    });
    folderContent.append(board);
  } else {
    data.sections.forEach(([title, body]) => {
      const section = document.createElement("section");
      section.className = "folder-section";
      section.innerHTML = "<h3></h3><p></p>";
      section.querySelector("h3").textContent = title;
      section.querySelector("p").textContent = body;
      folderContent.append(section);
    });
  }

  folderWindow.hidden = false;
  folderWindow.scrollIntoView({ behavior: "smooth", block: "start" });
}

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt;
    input.focus();
  });
});

organizeButton.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  draft = classify(text);
  addMessage("user", text);
  addMessage("assistant", "Bloomがフォルダごとに整理したよ。保存前に確認してね。");
  renderPreview(draft);
});

editDraft.addEventListener("click", () => {
  confirmPanel.hidden = true;
});

saveDraft.addEventListener("click", () => {
  if (!draft) return;

  moodFace.textContent = draft.moodIcon;
  moodText.textContent = `${draft.mood}. ${draft.journal}`;
  latestMemory.textContent = draft.memory;

  if (draft.plan && draft.plan !== "なし") {
    const item = document.createElement("li");
    item.innerHTML = "<time>Today</time><span></span>";
    item.querySelector("span").textContent = draft.plan;
    todayPlans.append(item);
  }

  if (draft.amount) {
    saving = Math.min(50000, saving + Math.round(draft.amount * 0.1));
    rewardSaving.textContent = `${saving.toLocaleString("ja-JP")}円`;
    savingBar.style.width = `${Math.round((saving / 50000) * 100)}%`;
  }

  updateGrowth(15);
  addMessage("assistant", "Memories、Money、Calendar、Growthに保存したよ。");
  input.value = "";
  confirmPanel.hidden = true;
  draft = null;
});

folderButtons.forEach((button) => {
  button.addEventListener("click", () => renderFolder(button.dataset.folder));
});

closeFolder.addEventListener("click", () => {
  folderWindow.hidden = true;
});

missionChecks.forEach((check) => {
  check.addEventListener("change", () => updateGrowth(check.checked ? 30 : -30));
});

homeButton.addEventListener("click", () => {
  folderWindow.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
});
