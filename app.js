import {
  createVisionBoard,
  createVisionItem,
  deleteVisionItem,
  deleteCalendarEvent,
  getGoalLifeMap,
  getCalendarEvents,
  getCurrentUser,
  getTodayTasks,
  getVisionBoards,
  hasSupabaseConfig,
  saveBloomDraft,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  supabase,
  upsertGoalLifeMap,
  updateVisionBoard,
  updateCalendarEvent,
  updateTaskStatus,
  updateVisionItem,
  uploadVisionImage,
} from "./supabase-client.js";

const folderData = {
  goals: {
    title: "Goals",
    custom: "goals",
    sections: [],
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
    custom: "calendar",
    events: [],
    sections: [],
  },
  vision: {
    title: "Vision",
    custom: "vision",
  },
  memories: {
    title: "Memories",
    sections: [
      ["Journal", "まだ記録はありません。Bloom Chatから保存するとここに反映されます。"],
      ["Happy Moments", "まだ記録はありません。"],
      ["Done List", "まだ記録はありません。"],
      ["Gratitude", "まだ記録はありません。"],
      ["Memories", "まだ記録はありません。"],
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
const missionsWidget = document.querySelector("#missionsWidget");
const homeButton = document.querySelector("#homeButton");
const authScreen = document.querySelector("#authScreen");
const appShell = document.querySelector("#appShell");
const authForm = document.querySelector("#authForm");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authMessage = document.querySelector("#authMessage");
const signupButton = document.querySelector("#signupButton");
const logoutButton = document.querySelector("#logoutButton");
const userEmail = document.querySelector("#userEmail");
const homeLifeMap = document.querySelector("#homeLifeMap");

let draft = null;
let exp = 2350;
let saving = 32600;
let currentUser = null;
let editingCalendarEventId = null;
let visionState = {
  boards: [],
  activeBoardId: null,
  error: "",
  loaded: false,
  saving: false,
};

const MOOD_ASSETS = {
  happy: new URL("./assets/icons/icon/emotion/emotion_happy.png", import.meta.url).href,
  excited: new URL("./assets/icons/icon/emotion/emotion_excited.png", import.meta.url).href,
  good: new URL("./assets/icons/icon/emotion/emotion_good.png", import.meta.url).href,
  calm: new URL("./assets/icons/icon/emotion/emotion_normal.png", import.meta.url).href,
  tired: new URL("./assets/icons/icon/emotion/emotion_taired.png", import.meta.url).href,
  sad: new URL("./assets/icons/icon/emotion/emotion_sad.png", import.meta.url).href,
  bad: new URL("./assets/icons/icon/emotion/emotion_bad.png", import.meta.url).href,
};

const RABBIT_HOME_ICONS = [
  new URL("./assets/icons/icon/rabbit/rabbit_happy.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_heart.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_joy.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_glad.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_good.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_smile.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_love.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_cheer.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_blink.png", import.meta.url).href,
  new URL("./assets/icons/icon/rabbit/rabbit_relax.png", import.meta.url).href,
];

function setRandomHomeRabbitIcon() {
  const src = RABBIT_HOME_ICONS[Math.floor(Math.random() * RABBIT_HOME_ICONS.length)];
  document.querySelectorAll(".random-rabbit-icon").forEach((image) => {
    image.src = src;
    image.alt = "Bloom rabbit";
    image.onerror = () => {
      image.onerror = null;
      image.src = RABBIT_HOME_ICONS[0];
    };
  });
}

function setMoodFace(asset = MOOD_ASSETS.calm, fallback = "") {
  if (!moodFace) return;
  moodFace.textContent = "";
  const img = document.createElement("img");
  img.src = asset || MOOD_ASSETS.calm;
  img.alt = fallback || "Mood";
  img.loading = "lazy";
  img.onerror = () => {
    if (img.src !== MOOD_ASSETS.calm) {
      img.src = MOOD_ASSETS.calm;
      return;
    }
    moodFace.textContent = "Mood";
  };
  moodFace.append(img);
}
let visionDrag = null;
let goalState = null;
let goalSaveTimer = null;

const calendarKindOptions = [
  ["personal", "Personal"],
  ["task", "Task"],
  ["finance", "Money"],
  ["reward", "Reward"],
  ["habit", "Habit"],
];

const visionStarterItems = [
  {
    type: "sticky",
    content: "ここに2026年の理想を書いてね",
    color: "butter",
    x: 26,
    y: 34,
    width: 166,
    height: 108,
    rotation: 0,
    z_index: 1,
  },
  {
    type: "text",
    content: "韓国ワーホリ / 理想の部屋 / 美容計画",
    color: "white",
    x: 214,
    y: 72,
    width: 190,
    height: 72,
    rotation: 0,
    z_index: 2,
  },
];

const visionBackgroundOptions = [
  ["dream", "Dream"],
  ["pink", "Pink"],
  ["mint", "Mint"],
  ["lavender", "Lavender"],
  ["cream", "Cream"],
];

const visionStickyColorOptions = [
  ["butter", "Butter"],
  ["pink", "Pink"],
  ["mint", "Mint"],
  ["lavender", "Lavender"],
  ["cream", "Cream"],
];

const goalCategories = [
  {
    id: "career",
    icon: "💼",
    label: "Career",
    title: "仕事・キャリア",
    tone: "lavender",
    prompt: "今年、仕事でどんな私になりたい？",
  },
  {
    id: "money",
    icon: "💰",
    label: "Money",
    title: "お金・暮らし",
    tone: "mint",
    prompt: "安心して暮らすために整えたいことは？",
  },
  {
    id: "health",
    icon: "❤️",
    label: "Health",
    title: "健康・体づくり",
    tone: "pink",
    prompt: "体と心をどう育てたい？",
  },
  {
    id: "life",
    icon: "🌸",
    label: "Joy",
    title: "趣味・人間関係",
    tone: "cream",
    prompt: "好きなことや大切な人とどう過ごしたい？",
  },
  {
    id: "growth",
    icon: "📖",
    label: "Growth",
    title: "自己成長・メンタルケア",
    tone: "sky",
    prompt: "どんな内側の変化を育てたい？",
  },
];

const goalProgressSourceOptions = [
  ["plan-checks", "Plan checks"],
  ["task-sync", "Task app sync"],
  ["money-sync", "Money sync"],
];

const lifeMapAssets = {
  backgrounds: {
    a1: new URL("./assets/lifemap/background/A1.png", import.meta.url).href,
    a2: new URL("./assets/lifemap/background/A2.png", import.meta.url).href,
    a3: new URL("./assets/lifemap/background/A3.png", import.meta.url).href,
    a4: new URL("./assets/lifemap/background/A4.png", import.meta.url).href,
    a5: new URL("./assets/lifemap/background/A5.png", import.meta.url).href,
  },
  clouds: {
    dense: new URL("./assets/lifemap/cloud/overlay dence.png", import.meta.url).href,
    medium: new URL("./assets/lifemap/cloud/overlay medium.png", import.meta.url).href,
    soft: new URL("./assets/lifemap/cloud/overlay soft.png", import.meta.url).href,
    light: new URL("./assets/lifemap/cloud/overlay light.png", import.meta.url).href,
  },
  locked: new URL("./assets/lifemap/decoration/marker locked.png", import.meta.url).href,
  sparkles: new URL("./assets/lifemap/effect/sparkles.png", import.meta.url).href,
};

const defaultGoalIdealDay = [
  "7:00 起床",
  "7:20 朝の支度と軽いストレッチ",
  "9:00 大切な仕事をひとつ進める",
  "12:00 ランチと休憩",
  "18:30 自分のための予定",
  "22:30 明日の準備と就寝",
];

function splitGoalLines(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeGoalCategory(category) {
  const plans = splitGoalLines(category.woop?.plans ?? []);
  const progress = Math.min(100, Math.max(0, Number(category.progress) || 0));
  const hasGoalContent = Boolean(category.woop?.wish || category.woop?.outcome || category.woop?.obstacle || plans.length);
  const inferredStatus = category.status
    ?? (progress >= 100 ? "bloomed" : progress >= 25 ? "growing" : hasGoalContent ? "planned" : "hidden");
  const mapStage = category.mapStage ?? inferredStatus;
  return {
    ...category,
    status: inferredStatus,
    mapStage,
    isUnlocked: !["hidden", "locked"].includes(inferredStatus),
    progressSource: category.progressSource ?? "plan-checks",
    completedPlans: Array.isArray(category.completedPlans)
      ? category.completedPlans.slice(0, plans.length)
      : plans.map(() => false),
    woop: {
      wish: category.woop?.wish ?? "",
      outcome: category.woop?.outcome ?? "",
      obstacle: category.woop?.obstacle ?? "",
      plans,
    },
    idealDay: splitGoalLines(category.idealDay ?? []),
  };
}

function normalizeGoalState(state) {
  const fallback = createDefaultGoalState();
  const categories = Array.isArray(state?.categories) && state.categories.length
    ? state.categories
    : fallback.categories;

  return {
    yearTheme: state?.yearTheme || fallback.yearTheme,
    activeCategoryId: state?.activeCategoryId || "",
    categories: categories.map(normalizeGoalCategory),
    recentWins: Array.isArray(state?.recentWins) ? state.recentWins : fallback.recentWins,
    idealDay: splitGoalLines(state?.idealDay ?? fallback.idealDay),
    lastUnlockedCategoryId: state?.lastUnlockedCategoryId ?? "",
  };
}

function calculateGoalProgress(category) {
  const plans = splitGoalLines(category.woop?.plans ?? []);
  if (category.progressSource === "plan-checks" && plans.length) {
    const done = (category.completedPlans ?? []).filter(Boolean).length;
    return Math.round((done / plans.length) * 100);
  }

  return Math.min(100, Math.max(0, Number(category.progress) || 0));
}

function goalStatusFromProgress(category) {
  const progress = calculateGoalProgress(category);
  const plans = splitGoalLines(category.woop?.plans ?? []);
  const hasWoop = Boolean(category.woop?.wish || category.woop?.outcome || category.woop?.obstacle || plans.length);
  if (progress >= 100) return "bloomed";
  if (progress >= 50) return "growing";
  if (hasWoop) return "planned";
  if (category.status === "seed") return "seed";
  return category.status ?? "hidden";
}

function refreshGoalMapStage(category) {
  const status = goalStatusFromProgress(category);
  category.status = status;
  category.mapStage = status;
  category.isUnlocked = !["hidden", "locked"].includes(status);
}

function getLifeMapRabbitMessage(state) {
  const unlocked = state.categories.filter((category) => !["hidden", "locked"].includes(category.status)).length;
  if (state.lastUnlockedCategoryId) return "新しいエリアが見えてきたよ";
  if (!unlocked) return "まずは、育てたいエリアをひとつ選ぼう";
  return "小さな一歩が、世界を少しずつ育てるよ";
}

function getLifeMapStage(state) {
  const categories = state.categories ?? [];
  const unlocked = categories.filter((category) => !["hidden", "locked"].includes(category.status));
  const progress = averageGoalProgress(categories);
  const statuses = unlocked.map((category) => category.status);

  if (!unlocked.length) return "a1";
  if (statuses.includes("bloomed") || progress >= 90) return "a5";
  if (statuses.includes("growing") || progress >= 50) return "a4";
  if (statuses.includes("planned") || progress >= 25) return "a3";
  return "a2";
}

function getLifeMapBackground(state) {
  return lifeMapAssets.backgrounds[getLifeMapStage(state)] ?? lifeMapAssets.backgrounds.a1;
}

function getLifeMapCloud(status) {
  if (status === "hidden") return lifeMapAssets.clouds.dense;
  if (status === "locked") return lifeMapAssets.clouds.medium;
  if (status === "planned") return lifeMapAssets.clouds.light;
  if (status === "growing") return lifeMapAssets.clouds.soft;
  return lifeMapAssets.clouds.soft;
}

function getGoalQuestion(category) {
  const firstPlan = splitGoalLines(category.woop?.plans ?? [])[0];
  if (firstPlan) return `今日、${category.label}のために「${firstPlan}」を少しだけ進められそう？`;
  if (category.woop?.wish) return `「${category.woop.wish}」に近づく最初の一歩は何にする？`;
  return `${category.label}で、今年いちばん育てたいことは？`;
}

function getGoalComment(category) {
  const progress = calculateGoalProgress(category);
  if (progress >= 80) return `${category.label}はかなり育ってきています。次は続けやすさを整えよう。`;
  if (progress >= 40) return `${category.label}は少しずつ形になっています。小さなPlanを続ければ大丈夫。`;
  return `${category.label}はまだ設計中。大きく決めすぎず、最初の一歩だけ置いてみよう。`;
}

function averageGoalProgress(categories) {
  if (!categories?.length) return 0;
  return Math.round(categories.reduce((sum, category) => sum + calculateGoalProgress(category), 0) / categories.length);
}

function createDefaultGoalState() {
  const categories = goalCategories.map((category) => {
    return {
      ...category,
      title: category.title,
      status: "hidden",
      mapStage: "hidden",
      progress: 0,
      progressSource: "plan-checks",
      completedPlans: [],
      importance: 3,
      matrix: "Important / Gentle pace",
      reward: "",
      vision: "",
      nextAction: "最初の一歩を決める",
      rabbit: "",
      woop: {
        wish: "",
        outcome: "",
        obstacle: "",
        plans: [],
      },
      idealDay: [],
      mandala: ["Theme", category.label, "Vision", "Action", "Reward", "Care", "Habit", "Money", "Review"],
    };
  });

  return {
    yearTheme: "自由に、しなやかに育つ",
    idealDay: defaultGoalIdealDay,
    activeCategoryId: "",
    categories,
    recentWins: ["Visionを開いて理想を見直した", "今日の予定を整理できた"],
    lastUnlockedCategoryId: "",
  };
}

function setAuthMessage(text) {
  if (authMessage) authMessage.textContent = text;
}

function goalStorageKey() {
  return `bloom-goals-${currentUser?.id ?? "guest"}`;
}

function loadGoalState() {
  if (goalState) return goalState;

  try {
    const stored = localStorage.getItem(goalStorageKey());
    goalState = normalizeGoalState(stored ? JSON.parse(stored) : createDefaultGoalState());
  } catch (_error) {
    goalState = normalizeGoalState(createDefaultGoalState());
  }

  return goalState;
}

function saveGoalState({ sync = true } = {}) {
  if (!goalState) return;
  localStorage.setItem(goalStorageKey(), JSON.stringify(goalState));
  renderHomeLifeMap();
  if (sync) queueGoalSupabaseSave();
}

function queueGoalSupabaseSave() {
  if (!currentUser || !goalState) return;
  window.clearTimeout(goalSaveTimer);
  goalSaveTimer = window.setTimeout(saveGoalStateToSupabase, 450);
}

async function saveGoalStateToSupabase() {
  if (!currentUser || !goalState) return;

  try {
    await upsertGoalLifeMap({ userId: currentUser.id, goalMap: goalState });
  } catch (error) {
    addMessage("assistant", `GoalsをSupabaseへ保存できませんでした: ${error.message}`);
  }
}

async function loadGoalStateFromSupabase(userId) {
  try {
    const data = await getGoalLifeMap({ userId });
    if (!data) {
      goalState = loadGoalState();
      await upsertGoalLifeMap({ userId, goalMap: goalState });
      return;
    }

    goalState = normalizeGoalState({
      yearTheme: data.year_theme,
      activeCategoryId: data.categories?.[0]?.id ?? "career",
      categories: data.categories ?? createDefaultGoalState().categories,
      recentWins: data.recent_wins ?? [],
      idealDay: data.ideal_day ?? createDefaultGoalState().idealDay,
    });
    localStorage.setItem(goalStorageKey(), JSON.stringify(goalState));
    renderHomeLifeMap();

    if (!folderWindow.hidden && folderTitle.textContent === "Goals") renderFolder("goals");
  } catch (error) {
    goalState = null;
    addMessage("assistant", `Goalsはローカル保存で表示中です。Supabase SQLを準備すると同期できます: ${error.message}`);
  }
}

function activeGoalCategory() {
  const state = loadGoalState();
  return state.categories.find((category) => category.id === state.activeCategoryId && !["hidden", "locked"].includes(category.status))
    ?? state.categories.find((category) => !["hidden", "locked"].includes(category.status))
    ?? null;
}

function showApp(user) {
  currentUser = user;
  goalState = null;
  authScreen.hidden = true;
  appShell.hidden = false;
  if (userEmail) userEmail.textContent = user.email ?? "Signed in";
  renderHomeLifeMap();
  loadGoalStateFromSupabase(user.id);
  loadCalendarEvents(user.id);
  loadTaskMissions(user.id);
  loadVisionBoards(user.id);
}

function showAuth(message = "") {
  currentUser = null;
  goalState = null;
  visionState = { boards: [], activeBoardId: null, error: "", loaded: false, saving: false };
  authScreen.hidden = false;
  appShell.hidden = true;
  setAuthMessage(message);
}

async function initAuth() {
  if (!hasSupabaseConfig) {
    showAuth("Supabaseの環境変数 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を設定してください。");
    authForm.querySelectorAll("input, button").forEach((element) => {
      element.disabled = true;
    });
    return;
  }

  try {
    const user = await getCurrentUser();
    if (user) {
      showApp(user);
    } else {
      showAuth("メールアドレスでログインしてください。");
    }
  } catch (error) {
    showAuth(error.message);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      showApp(session.user);
    } else {
      showAuth();
    }
  });
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.innerHTML = `<span>${role === "user" ? "YOU" : "Bloom"}</span><p></p>`;
  message.querySelector("p").textContent = text;
  chatLog.append(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function normalizeDigits(value) {
  return String(value ?? "").replace(/[\uFF10-\uFF19]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248));
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function amountFromText(text) {
  const normalized = normalizeDigits(text).replace(/[\uFF0C,]/g, "");
  const match = normalized.match(new RegExp("(?:\\u00a5\\s*)?([0-9]{2,7})\\s*(?:\\u5186|yen|YEN)"));
  return match ? Number(match[1]) : null;
}

function timeFromText(text) {
  const normalized = normalizeDigits(text);
  const timePattern = new RegExp("(\\u5348\\u524d|\\u5348\\u5f8c|\\u671d|\\u663c|\\u5915\\u65b9|\\u591c)?\\s*([0-2]?\\d)\\s*(?:\\u6642|:|\\uff1a)\\s*([0-5]\\d)?\\s*(?:\\u304b\\u3089|\\u301c|~|\\u958b\\u59cb|\\u30b9\\u30bf\\u30fc\\u30c8)?");
  const match = normalized.match(timePattern);
  if (!match) return null;

  let hour = Number(match[2]);
  const minute = match[3] ? Number(match[3]) : 0;
  const hint = match[1] ?? "";

  if ((hint === "\u5348\u5f8c" || hint === "\u591c" || hint === "\u5915\u65b9") && hour < 12) hour += 12;
  if (hint === "\u671d" && hour === 12) hour = 0;

  return String(Math.min(hour, 23)).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

function dateInfoFromText(text) {
  const normalized = normalizeDigits(text);
  if (hasAny(normalized, ["\u660e\u5f8c\u65e5", "\u3042\u3055\u3063\u3066"])) {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return { label: "upcoming", value: dateInputValueFromDate(date), readable: "\u660e\u5f8c\u65e5" };
  }
  if (hasAny(normalized, ["\u660e\u65e5", "\u3042\u3057\u305f"])) return { label: "tomorrow", value: "", readable: "\u660e\u65e5" };
  if (hasAny(normalized, ["\u4eca\u65e5", "\u672c\u65e5"])) return { label: "today", value: "", readable: "\u4eca\u65e5" };

  const monthDay = normalized.match(new RegExp("([0-9]{1,2})\\u6708([0-9]{1,2})\\u65e5"));
  if (monthDay) {
    const date = new Date();
    date.setMonth(Number(monthDay[1]) - 1, Number(monthDay[2]));
    return { label: "upcoming", value: dateInputValueFromDate(date), readable: Number(monthDay[1]) + "/" + Number(monthDay[2]) };
  }

  return { label: "today", value: "", readable: "\u4eca\u65e5" };
}

function readableDateLabel(value) {
  if (value === "tomorrow") return "\u660e\u65e5";
  if (value === "upcoming") return "\u4e88\u5b9a";
  return "\u4eca\u65e5";
}

function shortDateLabel(value) {
  if (value === "tomorrow") return "Tomorrow";
  if (value === "upcoming") return "Upcoming";
  return "Today";
}

function dateLabelFromDate(date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (target.getTime() === today.getTime()) return "today";
  if (target.getTime() === tomorrow.getTime()) return "tomorrow";
  return "upcoming";
}

function timeLabelFromDate(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dateInputValueFromDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function calendarKindLabel(value) {
  return calendarKindOptions.find(([kind]) => kind === value)?.[1] ?? value ?? "Personal";
}

async function loadCalendarEvents(userId) {
  try {
    const events = await getCalendarEvents({ userId, days: 14 });
    folderData.calendar.events = events.map((event) => {
      const startsAt = new Date(event.starts_at);
      const hasTime = startsAt.getHours() !== 0 || startsAt.getMinutes() !== 0;
      return {
        id: event.id,
        date: dateLabelFromDate(startsAt),
        dateValue: dateInputValueFromDate(startsAt),
        time: hasTime ? timeLabelFromDate(startsAt) : "",
        title: event.title,
        kind: event.kind ?? "personal",
        kindLabel: calendarKindLabel(event.kind ?? "personal"),
        startsAt: event.starts_at,
      };
    });
  } catch (error) {
    addMessage("assistant", `Calendarを読み込めませんでした: ${error.message}`);
  }
}

function renderTaskMissions(tasks = []) {
  if (!missionsWidget) return;

  missionsWidget.querySelectorAll(".mission, .mission-empty").forEach((element) => element.remove());

  if (!tasks.length) {
    const empty = document.createElement("p");
    empty.className = "mission-empty";
    empty.textContent = "Task appの今日のタスクがここに表示されます。";
    missionsWidget.append(empty);
    return;
  }

  tasks.forEach((task) => {
    const label = document.createElement("label");
    label.className = "mission";
    label.classList.toggle("is-done", task.status === "done");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.status === "done";
    checkbox.dataset.taskId = task.id;

    const title = document.createElement("span");
    title.textContent = task.title;

    label.append(checkbox, title);
    missionsWidget.append(label);
  });
}

async function loadTaskMissions(userId) {
  try {
    const tasks = await getTodayTasks({ userId, limit: 6 });
    renderTaskMissions(tasks);
  } catch (error) {
    addMessage("assistant", `Tasksを読み込めませんでした: ${error.message}`);
  }
}

function activeVisionBoard() {
  return visionState.boards.find((board) => board.id === visionState.activeBoardId) ?? visionState.boards[0] ?? null;
}

async function loadVisionBoards(userId = currentUser?.id) {
  if (!userId) return;

  try {
    let boards = await getVisionBoards({ userId });

    if (!boards.length) {
      const firstBoard = await createVisionBoard({ userId, title: "2026 Dream Sheet" });
      const createdItems = [];
      for (const item of visionStarterItems) {
        createdItems.push(await createVisionItem({ userId, item: { ...item, board_id: firstBoard.id } }));
      }
      boards = [{ ...firstBoard, items: createdItems }];
    }

    visionState = {
      ...visionState,
      boards,
      activeBoardId: visionState.activeBoardId ?? boards[0]?.id ?? null,
      error: "",
      loaded: true,
      saving: false,
    };
  } catch (error) {
    visionState = {
      ...visionState,
      error: `Visionの保存テーブルを準備すると使えるようになります: ${error.message}`,
      loaded: true,
      saving: false,
    };
  }
}

function splitJournalText(text) {
  const dateWords = "(?:\\u4eca\\u65e5|\\u672c\\u65e5|\\u660e\\u65e5|\\u3042\\u3057\\u305f|\\u660e\\u5f8c\\u65e5|\\u3042\\u3055\\u3063\\u3066|[0-9]{1,2}\\u6708[0-9]{1,2}\\u65e5)";
  return normalizeDigits(text)
    .replace(new RegExp("\\u3001\\s*(?=" + dateWords + ")", "g"), "\u3002")
    .split(/[\u3002.!\uff01?\uff1f\n]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function spendingTitleFromText(text) {
  if (hasAny(text, ["\u30e9\u30f3\u30c1", "\u663c\u3054\u306f\u3093", "\u663c\u98df", "\u304a\u663c"])) return "\u30e9\u30f3\u30c1";
  if (hasAny(text, ["\u30ab\u30d5\u30a7", "\u30b9\u30bf\u30d0", "\u30b3\u30fc\u30d2\u30fc", "\u304a\u8336", "\u30d5\u30e9\u30da\u30c1\u30fc\u30ce"])) return "\u30ab\u30d5\u30a7";
  const categories = ["\u7f8e\u5bb9\u9662", "\u75c5\u9662", "\u4ea4\u901a", "\u96fb\u8eca", "\u670d", "\u30b3\u30b9\u30e1", "\u672c"];
  return categories.find((category) => text.includes(category)) ?? "\u652f\u51fa";
}

function cleanPlanTitle(chunk) {
  const normalized = normalizeDigits(chunk);
  const datePattern = new RegExp("(\\u4eca\\u65e5|\\u672c\\u65e5|\\u660e\\u65e5|\\u3042\\u3057\\u305f|\\u660e\\u5f8c\\u65e5|\\u3042\\u3055\\u3063\\u3066|[0-9]{1,2}\\u6708[0-9]{1,2}\\u65e5)", "g");
  const timePattern = new RegExp("(\\u5348\\u524d|\\u5348\\u5f8c|\\u671d|\\u663c|\\u5915\\u65b9|\\u591c)?\\s*[0-2]?\\d\\s*(?:\\u6642|:|\\uff1a)\\s*[0-5]?\\d?\\s*(?:\\u304b\\u3089|\\u301c|~|\\u958b\\u59cb|\\u30b9\\u30bf\\u30fc\\u30c8)?", "g");
  let title = normalized
    .replace(datePattern, "")
    .replace(timePattern, "")
    .replace(new RegExp("(?:\\u00a5\\s*)?[0-9]{2,7}\\s*(?:\\u5186|yen|YEN)", "gi"), "")
    .replace(new RegExp("^(\\u306f|\\u306b|\\u3067|\\u304b\\u3089|\\u3001|,|\\u3002|\\u30fb|\\s)+"), "")
    .replace(new RegExp("(\\u4e88\\u5b9a|\\u4e88\\u7d04|\\u884c\\u304f|\\u884c\\u3063\\u305f|\\u3042\\u308b|\\u3042\\u3063\\u305f|\\u3059\\u308b|\\u3057\\u305f)$", "g"), "")
    .trim();

  if ((normalized.includes("\u53cb\u9054") || normalized.includes("\u53cb\u4eba")) && normalized.includes("\u30e9\u30f3\u30c1")) return "\u53cb\u9054\u3068\u30e9\u30f3\u30c1";
  if (hasAny(normalized, ["\u30e9\u30f3\u30c1", "\u663c\u3054\u306f\u3093", "\u663c\u98df", "\u304a\u663c"])) return "\u30e9\u30f3\u30c1";
  if (hasAny(normalized, ["\u52c9\u5f37", "\u5b66\u7fd2", "\u82f1\u8a9e", "\u8aad\u66f8", "\u8cc7\u683c", "\u5bbf\u984c"])) return "\u52c9\u5f37";
  if (hasAny(normalized, ["\u30d9\u30ea\u30fc\u30c0\u30f3\u30b9", "\u30c0\u30f3\u30b9", "\u30cf\u30d5\u30e9", "\u30ec\u30c3\u30b9\u30f3", "\u30ea\u30cf"])) return "\u30c0\u30f3\u30b9";
  if (hasAny(normalized, ["\u7f8e\u5bb9\u9662", "\u7f8e\u5bb9\u5ba4", "\u30d8\u30a2\u30b5\u30ed\u30f3", "\u30b5\u30ed\u30f3"])) return "\u7f8e\u5bb9\u9662";
  if (hasAny(normalized, ["\u75c5\u9662", "\u6b6f\u533b\u8005", "\u30af\u30ea\u30cb\u30c3\u30af", "\u4e88\u7d04"])) return title || "\u4e88\u7d04";
  if (hasAny(normalized, ["\u30ab\u30d5\u30a7", "\u30b9\u30bf\u30d0", "\u30b3\u30fc\u30d2\u30fc", "\u304a\u8336"])) return "\u30ab\u30d5\u30a7";

  title = title.replace(new RegExp("^(\\u591c|\\u671d|\\u663c|\\u5915\\u65b9)(\\u306f|\\u306b)?"), "").trim();
  return title.slice(0, 24);
}

function extractPlans(text) {
  const plans = [];

  splitJournalText(text).forEach((chunk) => {
    const time = timeFromText(chunk);
    const dateInfo = dateInfoFromText(chunk);
    const title = cleanPlanTitle(chunk);
    const looksLikePlan = Boolean(time) || hasAny(chunk, ["\u4e88\u5b9a", "\u4e88\u7d04", "\u660e\u65e5", "\u3042\u3057\u305f", "\u4eca\u65e5", "\u672c\u65e5", "\u304b\u3089", "\u958b\u59cb", "\u30b9\u30bf\u30fc\u30c8", "\u7f8e\u5bb9\u9662", "\u7f8e\u5bb9\u5ba4", "\u30d8\u30a2\u30b5\u30ed\u30f3", "\u30b5\u30ed\u30f3", "\u75c5\u9662", "\u6b6f\u533b\u8005", "\u30cd\u30a4\u30eb", "\u30e9\u30f3\u30c1", "\u52c9\u5f37", "\u30c0\u30f3\u30b9"]);
    const isOnlySpending = Boolean(amountFromText(chunk)) && !time && !hasAny(chunk, ["\u4e88\u5b9a", "\u4e88\u7d04", "\u884c\u304f", "\u3042\u308b", "\u660e\u65e5", "\u4eca\u65e5"]);

    if (!title || !looksLikePlan || isOnlySpending) return;

    plans.push({
      date: dateInfo.label,
      dateValue: dateInfo.value,
      time,
      title,
      label: dateInfo.readable + " " + (time ? time + "~" : "") + title,
    });
  });

  return plans;
}

function detectMood(text) {
  const isHappy = hasAny(text, ["\u5b09\u3057", "\u3046\u308c\u3057", "\u697d\u3057\u304b\u3063\u305f", "\u697d\u3057\u3044", "\u3088\u304b\u3063\u305f", "\u6700\u9ad8", "\u597d\u304d", "\u8912\u3081", "\u307b\u3081", "\ud83d\ude0a", "\u263a", "\ud83e\udd70"]);
  const isGloomy = hasAny(text, ["\u6182\u9b31", "\u3086\u3046\u3046\u3064", "\u843d\u3061\u8fbc", "\u3057\u3093\u3069", "\u60b2\u3057", "\u5bc2\u3057", "\u96e8", "\u3082\u3084\u3082\u3084", "\u4e0d\u5b89"]);
  const isTired = hasAny(text, ["\u75b2\u308c", "\u3064\u304b\u308c", "\u7720\u3044", "\u306d\u3080\u3044", "\u7dca\u5f35", "\u7126"]);

  if (isGloomy && isHappy) return { mood: "\u5b09\u3057\u3044\u3051\u3069\u5c11\u3057\u6182\u9b31", icon: "\u2601\ufe0f", asset: MOOD_ASSETS.good };
  if (isGloomy) return { mood: "\u5c11\u3057\u6182\u9b31", icon: "\u2601\ufe0f", asset: MOOD_ASSETS.sad };
  if (isTired && isHappy) return { mood: "\u5c11\u3057\u75b2\u308c\u305f\u3051\u3069\u524d\u5411\u304d", icon: "\u2615", asset: MOOD_ASSETS.good };
  if (isTired) return { mood: "\u5c11\u3057\u75b2\u308c", icon: "\u2615", asset: MOOD_ASSETS.tired };
  if (isHappy) return { mood: "\u5b09\u3057\u3044", icon: "\ud83d\ude0a", asset: MOOD_ASSETS.happy };
  return { mood: "\u7a4f\u3084\u304b", icon: "\u25e1", asset: MOOD_ASSETS.calm };
}

function detectActivity(text) {
  if (hasAny(text, ["\u30d9\u30ea\u30fc\u30c0\u30f3\u30b9", "\u30c0\u30f3\u30b9", "\u30cf\u30d5\u30e9", "\u30ec\u30c3\u30b9\u30f3", "\u30ea\u30cf"])) return "\u30d9\u30ea\u30fc\u30c0\u30f3\u30b9";
  if (hasAny(text, ["\u52c9\u5f37", "\u82f1\u8a9e", "\u8aad\u66f8", "\u8cc7\u683c"])) return "\u52c9\u5f37";
  if (hasAny(text, ["\u6563\u6b69", "\u30b8\u30e0", "\u30e8\u30ac", "\u904b\u52d5"])) return "\u904b\u52d5";
  return "";
}

function memoryFromText(text, activity, mood) {
  if (hasAny(text, ["\u8912\u3081", "\u307b\u3081"])) return "\u8912\u3081\u3089\u308c\u305f\u3053\u3068";
  if (activity && hasAny(text, ["\u697d\u3057\u304b\u3063\u305f", "\u697d\u3057\u3044", "\u5b09\u3057", "\u3046\u308c\u3057"])) return activity + "\u304c\u697d\u3057\u304b\u3063\u305f";
  if (hasAny(text, ["\u3067\u304d\u305f", "\u7d42\u308f\u3063\u305f", "\u9811\u5f35\u3063\u305f", "\u304c\u3093\u3070\u3063\u305f", "\u884c\u3051\u305f"])) return "\u4eca\u65e5\u3067\u304d\u305f\u3053\u3068";
  if (mood.includes("\u5b09\u3057\u3044")) return "\u5b09\u3057\u304b\u3063\u305f\u3053\u3068";
  return "\u4eca\u65e5\u306e\u8a18\u9332";
}

function classify(text) {
  const amount = amountFromText(text);
  const moodData = detectMood(text);
  const plans = extractPlans(text);
  const firstPlan = plans[0];
  const activity = detectActivity(text);
  const spendingTitle = amount ? spendingTitleFromText(text) : "";
  const memory = memoryFromText(text, activity, moodData.mood);
  const growth = activity
    ? activity + "\u306e\u8a18\u9332\u3092Growth\u306b\u8ffd\u52a0"
    : hasAny(text, ["\u8912\u3081", "\u307b\u3081", "\u9811\u5f35\u3063\u305f", "\u304c\u3093\u3070\u3063\u305f", "\u3067\u304d\u305f"])
      ? "\u4eca\u65e5\u3067\u304d\u305f\u3053\u3068\u3092Growth\u306b\u8ffd\u52a0"
      : "\u4eca\u65e5\u306e\u8a18\u9332\u3092Growth\u306b\u8ffd\u52a0";

  return {
    mood: moodData.mood,
    moodIcon: moodData.icon,
    moodAsset: moodData.asset,
    journal: text.slice(0, 120),
    memory,
    plan: plans.length ? plans.map((item) => item.label).join(" / ") : "\u306a\u3057",
    plans,
    planDate: firstPlan?.date ?? "today",
    planTime: firstPlan?.time ?? null,
    planTitle: firstPlan?.title ?? "",
    spendingTitle,
    amount,
    activity,
    habit: activity ? activity + " +1" : "",
    growth,
    vision: activity ? activity + "\u76ee\u6a19\u306e\u9032\u6357 +1" : "",
    raw: text,
  };
}

function renderPreview(data) {
  const none = "\u306a\u3057";
  const rows = [
    ["Mood", data.mood],
    ["Journal", data.journal],
    ["Memories", data.memory],
    ["Plans", data.plan],
    ["Spending", data.amount ? data.spendingTitle + " " + data.amount.toLocaleString("ja-JP") + "\u5186" : none],
    ["Activity", data.activity || none],
    ["Habits", data.habit || none],
    ["Growth", data.growth],
    ["Vision", data.vision || none],
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

function updateLocalFolders(data) {
  const none = "\u306a\u3057";
  const happyMoment = hasAny(data.raw, ["\u5b09\u3057", "\u3046\u308c\u3057", "\u697d\u3057\u304b\u3063\u305f", "\u697d\u3057\u3044", "\u8912\u3081", "\u307b\u3081"])
    ? data.memory
    : none;
  const gratitude = hasAny(data.raw, ["\u611f\u8b1d", "\u3042\u308a\u304c\u3068\u3046", "\u52a9\u304b\u3063\u305f"])
    ? data.raw.slice(0, 80)
    : none;

  folderData.memories.sections = [
    ["Journal", data.journal],
    ["Happy Moments", happyMoment],
    ["Done List", data.activity ? data.activity + "\u3092\u8a18\u9332" : data.memory],
    ["Gratitude", gratitude],
    ["Memories", data.memory],
  ];

  const newCalendarEvents = [
    ...(data.plans ?? []).map((item) => ({
      date: item.date,
      dateValue: item.dateValue,
      time: item.time,
      title: item.title,
      kind: "personal",
    })),
    ...(data.amount
      ? [
          {
            date: "today",
            time: null,
            title: data.spendingTitle + " " + data.amount.toLocaleString("ja-JP") + "\u5186",
            kind: "finance",
          },
        ]
      : []),
    {
      date: "today",
      time: null,
      title: data.mood,
      kind: "habit",
    },
  ];

  folderData.calendar.events = [...(folderData.calendar.events ?? []), ...newCalendarEvents];
  folderData.calendar.sections = [];
}

function renderFolder(key) {
  const data = folderData[key];
  folderTitle.textContent = data.title;
  folderContent.innerHTML = "";

  if (data.custom === "goals") {
    folderContent.append(renderGoalsFolder());
  } else if (data.custom === "calendar") {
    const board = document.createElement("div");
    board.className = "calendar-board";

    [
      ["today", "Today"],
      ["tomorrow", "Tomorrow"],
      ["upcoming", "Upcoming"],
    ].forEach(([dateKey, title]) => {
      const day = document.createElement("section");
      day.className = "calendar-day";
      day.innerHTML = "<h3></h3><div></div>";
      day.querySelector("h3").textContent = title;

      const list = day.querySelector("div");
      const events = (data.events ?? []).filter((item) => item.date === dateKey);

      if (!events.length) {
        const empty = document.createElement("p");
        empty.className = "calendar-empty";
        empty.textContent = "予定はまだありません。";
        list.append(empty);
      } else {
        events.forEach((event) => {
          const row = document.createElement("article");
          row.className = `calendar-event ${editingCalendarEventId === event.id ? "is-selected" : ""}`;
          row.dataset.eventId = event.id || "";

          const mainButton = document.createElement("button");
          mainButton.className = "calendar-event-main";
          mainButton.type = "button";
          mainButton.dataset.calendarAction = "edit";
          mainButton.disabled = !event.id;

          const mark = document.createElement("span");
          mark.className = `calendar-mark event-kind-${event.kind ?? "personal"}`;
          mark.setAttribute("aria-hidden", "true");

          const time = document.createElement("time");
          time.textContent = event.time || "";

          const titleText = document.createElement("strong");
          titleText.textContent = event.title;

          mainButton.append(mark, time, titleText);
          row.append(mainButton);

          if (event.id) {
            const deleteButton = document.createElement("button");
            deleteButton.className = "calendar-delete";
            deleteButton.type = "button";
            deleteButton.dataset.calendarAction = "delete";
            deleteButton.setAttribute("aria-label", "Delete event");
            deleteButton.textContent = "×";
            row.append(deleteButton);
          }

          list.append(row);
        });
      }

      board.append(day);
    });

    folderContent.append(board);

    const editingEvent = (data.events ?? []).find((event) => event.id === editingCalendarEventId);
    if (editingEvent) {
      folderContent.append(renderCalendarEditor(editingEvent));
    }

    data.sections.forEach(([title, body]) => {
      const section = document.createElement("section");
      section.className = "folder-section";
      section.innerHTML = "<h3></h3><p></p>";
      section.querySelector("h3").textContent = title;
      section.querySelector("p").textContent = body;
      folderContent.append(section);
    });
  } else if (data.custom === "vision") {
    folderContent.append(renderVisionFolder());
    folderWindow.hidden = false;
    folderWindow.scrollIntoView({ behavior: "smooth", block: "start" });
    return;

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

function renderIdealDayList(container, lines) {
  container.innerHTML = "";
  splitGoalLines(lines).forEach((item) => {
    const row = document.createElement("p");
    const [time, ...rest] = item.split(" ");
    row.innerHTML = "<time></time><span></span>";
    row.querySelector("time").textContent = /^\d/.test(time) ? time : " ";
    row.querySelector("span").textContent = /^\d/.test(time) ? rest.join(" ") : item;
    container.append(row);
  });
}

function renderGoalsFolder() {
  return renderGoalsFolderV2();

  const state = loadGoalState();
  const active = activeGoalCategory();
  const mapStage = getLifeMapStage(state);
  const mapBackground = getLifeMapBackground(state);
  const shell = document.createElement("section");
  shell.className = "goals-workspace";
  shell.innerHTML = `
    <section class="goal-theme-card">
      <span>2026 Theme</span>
      <textarea class="goal-theme-input" data-goal-field="yearTheme" rows="2"></textarea>
      <p>Bloom Rabbit asks: 今年、一番叶えたいことは？</p>
    </section>
    <section class="life-map" data-stage="${mapStage}">
      <div class="life-map-board">
        <img class="life-map-background" src="${mapBackground}" alt="" />
        <img class="life-map-complete-effect" src="${lifeMapAssets.sparkles}" alt="" />
        <div class="life-map-center" data-status="seed">
          <small>Bloom Tree</small>
          <strong></strong>
          <p>${getLifeMapRabbitMessage(state)}</p>
        </div>
        <div class="life-map-categories"></div>
      </div>
    </section>
    <section class="goal-overview">
      <article>
        <span>Progress</span>
        <strong>${averageGoalProgress(state.categories)}%</strong>
      </article>
      <article>
        <span>Recent Wins</span>
        <p></p>
      </article>
      <article>
        <span>Bloom Note</span>
        <p>方向を決める日と、実行する日は分けて大丈夫。</p>
      </article>
    </section>
    <section class="goal-card goal-ideal-planner">
      <div class="goal-card-head">
        <div>
          <span>Ideal Day</span>
          <h3>1日の設計</h3>
        </div>
      </div>
      <div class="ideal-day-list"></div>
      <label class="goal-soft-editor">Edit Ideal Day<textarea data-goal-field="idealDayGlobal" rows="5"></textarea></label>
    </section>
    <section class="goal-detail"></section>
  `;

  shell.querySelector(".goal-theme-input").value = state.yearTheme;
  shell.querySelector(".life-map-center strong").textContent = `「${state.yearTheme}」`;
  shell.querySelector(".goal-overview p").textContent = state.recentWins.join(" / ");
  shell.querySelector('[data-goal-field="idealDayGlobal"]').value = state.idealDay.join("\n");
  renderIdealDayList(shell.querySelector(".goal-ideal-planner .ideal-day-list"), state.idealDay);

  const categoryList = shell.querySelector(".life-map-categories");
  state.categories.forEach((category) => {
    const status = category.status ?? "hidden";
    const unlocked = !["hidden", "locked"].includes(status);
    const button = document.createElement("button");
    button.className = `life-category life-area-${category.id} life-category-${category.tone} ${category.id === active?.id ? "is-active" : ""} ${category.id === state.lastUnlockedCategoryId ? "is-unlocking" : ""}`;
    button.type = "button";
    button.dataset.goalAction = unlocked ? "select-category" : "unlock-category";
    button.dataset.categoryId = category.id;
    button.dataset.status = status;
    button.dataset.mapStage = category.mapStage ?? status;
    button.setAttribute("aria-label", unlocked ? `${category.label}を開く` : `${category.label}エリアを解放する`);
    button.innerHTML = `
      <span class="life-category-icon">${category.icon}</span>
      <strong>${category.label}</strong>
      <small>${unlocked ? category.title : "未発見エリア"}</small>
      <div class="life-area-scene" aria-hidden="true">
        <span class="life-area-path"></span>
        <span class="life-area-building"></span>
        <span class="life-area-sprout"></span>
        <span class="life-area-sparkle">✦</span>
      </div>
      <img class="life-map-lock" src="${lifeMapAssets.locked}" alt="" />
      <img class="life-map-cloud" src="${getLifeMapCloud(status)}" alt="" />
      <img class="life-map-unlock-sparkle" src="${lifeMapAssets.sparkles}" alt="" />
    `;
    categoryList.append(button);
  });

  if (active) {
    shell.querySelector(".goal-detail").append(renderGoalDetail(active));
  } else {
    shell.querySelector(".goal-detail").innerHTML = `
      <article class="goal-card goal-empty-map">
        <span>Rabbit</span>
        <h3>最初のエリアを作る</h3>
        <p class="rabbit-comment">雲の下に、まだ見えていない場所があるよ。育てたいエリアをひとつ選んでみよう。</p>
      </article>
    `;
  }
  return shell;
}

function renderGoalDetail(category) {
  const detail = document.createElement("div");
  const compactGoals = window.matchMedia?.("(max-width: 429px)").matches ?? false;
  const desktopOpen = compactGoals ? "" : "open";
  detail.className = "goal-detail-grid";
  detail.dataset.categoryId = category.id;
  detail.innerHTML = `
    <article class="goal-card goal-card-main">
      <div class="goal-card-head">
        <div>
          <span>${category.icon} ${category.label}</span>
          <h3>${category.title}</h3>
        </div>
        <div class="goal-stars" aria-label="Importance">${"★".repeat(category.importance)}${"☆".repeat(5 - category.importance)}</div>
      </div>
      <p class="rabbit-comment">${getGoalComment(category)}</p>
      <div class="goal-progress"><i style="width: ${calculateGoalProgress(category)}%"></i></div>
      <div class="goal-card-meta">
        <span>Progress: ${calculateGoalProgress(category)}% / ${category.progressSource === "plan-checks" ? "Plan checks" : category.progressSource}</span>
        <span>Matrix: ${category.matrix}</span>
        <span>Next: ${category.nextAction}</span>
      </div>
    </article>
    <article class="goal-card goal-guide">
      <span>Rabbit Guide</span>
      <h3>この順番で考えると整いやすいよ</h3>
      <div class="goal-step-list">
        <div><b>1</b><span>Wishに「叶えたいこと」を書く</span></div>
        <div><b>2</b><span>Outcomeに「叶った後の景色」を書く</span></div>
        <div><b>3</b><span>Obstacleに「つまずきそうなこと」を置く</span></div>
        <div><b>4</b><span>Planに「小さなAction」を1行ずつ書く</span></div>
      </div>
      <p>${getGoalQuestion(category)}</p>
    </article>
    <details class="goal-card goal-woop" open>
      <summary><span><b>WOOP</b><small>願いを小さなPlanに分ける中心ノート</small></span></summary>
      <label>Wish<span class="field-hint">叶えたいことを一文で</span><textarea data-goal-field="wish" rows="2"></textarea></label>
      <label>Outcome<span class="field-hint">叶ったらどんな気持ち・状態になる？</span><textarea data-goal-field="outcome" rows="2"></textarea></label>
      <label>Obstacle<span class="field-hint">邪魔になりそうなこと、つまずきそうなこと</span><textarea data-goal-field="obstacle" rows="2"></textarea></label>
      <label>Plan<span class="field-hint">今日や今週できる小さなActionを1行ずつ</span><textarea data-goal-field="plans" rows="4"></textarea></label>
      <div class="goal-plan-checks"></div>
    </details>
    <details class="goal-card goal-map-editor" ${desktopOpen}>
      <summary><span><b>Map Details</b><small>地図に表示する名前・次の一歩・ごほうび</small></span></summary>
      <label>Map Label<span class="field-hint">Life Map上の短い名前</span><input data-goal-field="label" type="text" value="" /></label>
      <label>Goal Title<span class="field-hint">このカテゴリで目指す状態</span><input data-goal-field="title" type="text" value="" /></label>
      <label>Next Action<span class="field-hint">Planから自動反映されます。必要なら手直しできます。</span><input data-goal-field="nextAction" type="text" value="" /></label>
      <label>Reward<span class="field-hint">叶えたら自分にあげたいもの</span><input data-goal-field="reward" type="text" value="" /></label>
      <label>Vision Link<span class="field-hint">関連するVisionシート名</span><input data-goal-field="vision" type="text" value="" /></label>
      <details class="goal-advanced-settings">
        <summary><span><b>Advanced Settings</b><small>進捗の測り方と分類</small></span></summary>
        <div class="goal-editor-grid">
          <label>Progress Source<select data-goal-field="progressSource"></select></label>
          <label>Importance<input data-goal-field="importance" type="number" min="1" max="5" value="" /></label>
        </div>
        <label>Matrix<input data-goal-field="matrix" type="text" value="" /></label>
      </details>
    </details>
    <details class="goal-card goal-mandala" ${desktopOpen}>
      <summary><span><b>Mandala</b><small>アイデアを広げたい時だけ使う</small></span></summary>
      <div class="goal-card-head">
        <button type="button" data-goal-action="toggle-mandala">マンダラチャートを開く</button>
      </div>
      <div class="mandala-grid" hidden></div>
    </details>
    <details class="goal-card goal-vision-link" ${desktopOpen}>
      <summary><span><b>Vision</b><small>理想の景色を見返す</small></span></summary>
      <p>${category.vision}</p>
      <button type="button" data-folder="vision" data-goal-action="open-vision">Visionを開く</button>
    </details>
    <details class="goal-card goal-reward" ${desktopOpen}>
      <summary><span><b>Reward</b><small>叶えた先のごほうび</small></span></summary>
      <p>${category.reward}</p>
      <small>Moneyのごほうび貯金と連携予定</small>
    </details>
  `;

  detail.querySelector('[data-goal-field="wish"]').value = category.woop.wish;
  detail.querySelector('[data-goal-field="outcome"]').value = category.woop.outcome;
  detail.querySelector('[data-goal-field="obstacle"]').value = category.woop.obstacle;
  detail.querySelector('[data-goal-field="plans"]').value = category.woop.plans.join("\n");
  detail.querySelector('[data-goal-field="label"]').value = category.label;
  detail.querySelector('[data-goal-field="title"]').value = category.title;
  detail.querySelector('[data-goal-field="importance"]').value = category.importance;
  detail.querySelector('[data-goal-field="matrix"]').value = category.matrix;
  detail.querySelector('[data-goal-field="nextAction"]').value = category.nextAction;
  detail.querySelector('[data-goal-field="vision"]').value = category.vision;
  detail.querySelector('[data-goal-field="reward"]').value = category.reward;
  const progressSource = detail.querySelector('[data-goal-field="progressSource"]');
  goalProgressSourceOptions.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === category.progressSource;
    progressSource.append(option);
  });

  const planChecks = detail.querySelector(".goal-plan-checks");
  renderGoalPlanChecks(planChecks, category);

  const mandalaGrid = detail.querySelector(".mandala-grid");
  category.mandala.forEach((cell, index) => {
    const box = document.createElement("textarea");
    box.dataset.goalField = "mandala";
    box.dataset.index = String(index);
    box.rows = 2;
    box.value = cell;
    mandalaGrid.append(box);
  });

  const timeline = detail.querySelector(".ideal-day-list");
  if (timeline) {
  category.idealDay.forEach((item) => {
    const row = document.createElement("p");
    const [time, ...rest] = item.split(" ");
    row.innerHTML = "<time></time><span></span>";
    row.querySelector("time").textContent = /^\d/.test(time) ? time : "—";
    row.querySelector("span").textContent = /^\d/.test(time) ? rest.join(" ") : item;
    timeline.append(row);
  });
  }

  return detail;
}

function renderGoalPlanChecks(container, category) {
  if (!container) return;
  container.innerHTML = "";
  const plans = splitGoalLines(category.woop.plans);
  if (!plans.length) {
    const empty = document.createElement("p");
    empty.className = "goal-plan-empty";
    empty.textContent = "Planを1行ずつ入力すると、ここに小さなActionチェックが並びます。";
    container.append(empty);
    return;
  }

  plans.forEach((plan, index) => {
    const label = document.createElement("label");
    label.innerHTML = `<input data-goal-field="completedPlan" data-index="${index}" type="checkbox" /> <span></span>`;
    label.querySelector("input").checked = Boolean(category.completedPlans?.[index]);
    label.querySelector("span").textContent = plan;
    container.append(label);
  });
}

function renderLifeMapBoard(state, { mode = "home" } = {}) {
  const active = activeGoalCategory();
  const mapStage = getLifeMapStage(state);
  const mapBackground = getLifeMapBackground(state);
  const section = document.createElement("section");
  section.className = `life-map life-map-${mode}`;
  section.dataset.stage = mapStage;
  section.innerHTML = `
    <div class="life-map-heading">
      <div>
        <span>Life Map</span>
        <strong></strong>
      </div>
      ${mode === "home" ? '<button type="button" data-folder="goals" data-goal-action="open-goals">Edit Goals</button>' : ""}
    </div>
    <div class="life-map-board">
      <img class="life-map-background" src="${mapBackground}" alt="" />
      <img class="life-map-complete-effect" src="${lifeMapAssets.sparkles}" alt="" />
      <div class="life-map-center" data-status="seed">
        <small>Bloom</small>
      </div>
      <div class="life-map-categories"></div>
    </div>
  `;

  section.querySelector(".life-map-heading strong").textContent = state.yearTheme;
  const categoryList = section.querySelector(".life-map-categories");
  state.categories.forEach((category) => {
    const status = category.status ?? "hidden";
    const unlocked = !["hidden", "locked"].includes(status);
    const button = document.createElement("button");
    button.className = `life-category life-area-${category.id} life-category-${category.tone} ${category.id === active?.id ? "is-active" : ""} ${category.id === state.lastUnlockedCategoryId ? "is-unlocking" : ""}`;
    button.type = "button";
    button.dataset.goalAction = unlocked ? "select-category" : "unlock-category";
    button.dataset.categoryId = category.id;
    button.dataset.status = status;
    button.dataset.mapStage = category.mapStage ?? status;
    button.setAttribute("aria-label", unlocked ? `${category.label}を開く` : `${category.label}エリアを育て始める`);
    button.innerHTML = `
      <span class="life-category-pin">
        <span class="life-category-icon">${category.icon}</span>
        <strong>${category.label}</strong>
      </span>
      <img class="life-map-lock" src="${lifeMapAssets.locked}" alt="" />
      <img class="life-map-cloud" src="${getLifeMapCloud(status)}" alt="" />
      <img class="life-map-unlock-sparkle" src="${lifeMapAssets.sparkles}" alt="" />
    `;
    categoryList.append(button);
  });

  return section;
}

function renderHomeLifeMap() {
  if (!homeLifeMap || !currentUser) return;
  const state = loadGoalState();
  homeLifeMap.innerHTML = "";
  homeLifeMap.append(renderLifeMapBoard(state, { mode: "home" }));
}

function renderGoalsFolderV2() {
  const state = loadGoalState();
  const active = activeGoalCategory();
  const shell = document.createElement("section");
  shell.className = "goals-workspace goals-workspace-simple";
  shell.innerHTML = `
    <section class="goal-theme-card">
      <span>2026 Theme</span>
      <textarea class="goal-theme-input" data-goal-field="yearTheme" rows="2"></textarea>
      <p>まずは今年の方向を決めます。毎日の実行はTask、景色はVision、ここでは人生の設計図を整えます。</p>
    </section>
    <section class="goal-category-picker">
      <div class="goal-section-title">
        <span>Areas</span>
        <h3>育てるエリアを選ぶ</h3>
      </div>
      <div class="goal-category-list"></div>
    </section>
    <section class="goal-overview">
      <article>
        <span>Progress</span>
        <strong>${averageGoalProgress(state.categories)}%</strong>
      </article>
      <article>
        <span>Recent Wins</span>
        <p></p>
      </article>
      <article>
        <span>Bloom Note</span>
        <p>方向を決める場所と、実行する場所は分けて大丈夫。ここでは迷った時に戻れる地図を作ります。</p>
      </article>
    </section>
    <section class="goal-detail"></section>
    <section class="goal-card goal-ideal-planner">
      <div class="goal-card-head">
        <div>
          <span>Ideal Day</span>
          <h3>1日の設計</h3>
        </div>
      </div>
      <div class="ideal-day-list"></div>
      <label class="goal-soft-editor">Edit Ideal Day<textarea data-goal-field="idealDayGlobal" rows="5"></textarea></label>
    </section>
  `;

  shell.querySelector(".goal-theme-input").value = state.yearTheme;
  shell.querySelector(".goal-overview p").textContent = state.recentWins.join(" / ");
  shell.querySelector('[data-goal-field="idealDayGlobal"]').value = state.idealDay.join("\n");
  renderIdealDayList(shell.querySelector(".goal-ideal-planner .ideal-day-list"), state.idealDay);

  const categoryList = shell.querySelector(".goal-category-list");
  state.categories.forEach((category) => {
    const status = category.status ?? "hidden";
    const unlocked = !["hidden", "locked"].includes(status);
    const button = document.createElement("button");
    button.className = `goal-area-chip life-category-${category.tone} ${category.id === active?.id ? "is-active" : ""}`;
    button.type = "button";
    button.dataset.goalAction = unlocked ? "select-category" : "unlock-category";
    button.dataset.categoryId = category.id;
    button.dataset.status = status;
    button.innerHTML = `
      <span class="life-category-icon">${category.icon}</span>
      <strong>${category.label}</strong>
      <small>${unlocked ? category.title : "未設定"}</small>
    `;
    categoryList.append(button);
  });

  const detail = shell.querySelector(".goal-detail");
  if (active) {
    detail.append(renderGoalDetailV2(active));
  } else {
    detail.innerHTML = `
      <article class="goal-card goal-empty-map">
        <span>Start</span>
        <h3>最初のエリアを選ぶ</h3>
        <p class="rabbit-comment">Career、Money、Health、Joy、Growthから、今いちばん育てたい場所をひとつ選んでね。</p>
      </article>
    `;
  }

  return shell;
}

function renderGoalDetailV2(category) {
  const detail = document.createElement("div");
  detail.className = "goal-detail-grid goal-detail-simple";
  detail.dataset.categoryId = category.id;
  detail.innerHTML = `
    <article class="goal-card goal-card-main">
      <div class="goal-card-head">
        <div>
          <span>${category.icon} ${category.label}</span>
          <h3>${category.title}</h3>
        </div>
        <div class="goal-stars" aria-label="Importance">${"★".repeat(category.importance)}${"☆".repeat(5 - category.importance)}</div>
      </div>
      <p class="rabbit-comment">${getGoalComment(category)}</p>
      <div class="goal-progress"><i style="width: ${calculateGoalProgress(category)}%"></i></div>
      <div class="goal-card-meta">
        <span>Progress: ${calculateGoalProgress(category)}%</span>
        <span>Next: ${category.nextAction}</span>
      </div>
      <div class="goal-editor-grid">
        <label>Area Name<input data-goal-field="title" type="text" value="" /></label>
        <label>Next Action<input data-goal-field="nextAction" type="text" value="" /></label>
      </div>
    </article>
    <details class="goal-card goal-woop" open>
      <summary><span><b>Goal Design</b><small>願いを小さなPlanに分ける</small></span></summary>
      <label>Wish<span class="field-hint">叶えたいことを一文で</span><textarea data-goal-field="wish" rows="2"></textarea></label>
      <label>Outcome<span class="field-hint">叶った後に見たい景色・気持ち</span><textarea data-goal-field="outcome" rows="2"></textarea></label>
      <label>Obstacle<span class="field-hint">つまずきそうなこと、迷いそうなこと</span><textarea data-goal-field="obstacle" rows="2"></textarea></label>
      <label>Plan<span class="field-hint">今日か今週できる小さなActionを1行ずつ</span><textarea data-goal-field="plans" rows="4"></textarea></label>
      <div class="goal-plan-checks"></div>
    </details>
    <details class="goal-card goal-progress-settings">
      <summary><span><b>Progress</b><small>Planの完了で進捗が育ちます</small></span></summary>
      <div class="goal-editor-grid">
        <label>Progress Source<select data-goal-field="progressSource"></select></label>
        <label>Importance<input data-goal-field="importance" type="number" min="1" max="5" value="" /></label>
      </div>
      <label>Reward<input data-goal-field="reward" type="text" value="" /></label>
      <label>Vision Link<input data-goal-field="vision" type="text" value="" /></label>
      <label>Matrix<input data-goal-field="matrix" type="text" value="" /></label>
    </details>
    <details class="goal-card goal-mandala">
      <summary><span><b>Mandala</b><small>アイデアを広げたい時だけ使う</small></span></summary>
      <div class="goal-card-head">
        <button type="button" data-goal-action="toggle-mandala">マンダラチャートを開く</button>
      </div>
      <div class="mandala-grid" hidden></div>
    </details>
  `;

  detail.querySelector('[data-goal-field="wish"]').value = category.woop.wish;
  detail.querySelector('[data-goal-field="outcome"]').value = category.woop.outcome;
  detail.querySelector('[data-goal-field="obstacle"]').value = category.woop.obstacle;
  detail.querySelector('[data-goal-field="plans"]').value = category.woop.plans.join("\n");
  detail.querySelector('[data-goal-field="title"]').value = category.title;
  detail.querySelector('[data-goal-field="importance"]').value = category.importance;
  detail.querySelector('[data-goal-field="matrix"]').value = category.matrix;
  detail.querySelector('[data-goal-field="nextAction"]').value = category.nextAction;
  detail.querySelector('[data-goal-field="vision"]').value = category.vision;
  detail.querySelector('[data-goal-field="reward"]').value = category.reward;

  const progressSource = detail.querySelector('[data-goal-field="progressSource"]');
  goalProgressSourceOptions.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === category.progressSource;
    progressSource.append(option);
  });

  renderGoalPlanChecks(detail.querySelector(".goal-plan-checks"), category);

  const mandalaGrid = detail.querySelector(".mandala-grid");
  category.mandala.forEach((cell, index) => {
    const box = document.createElement("textarea");
    box.dataset.goalField = "mandala";
    box.dataset.index = String(index);
    box.rows = 2;
    box.value = cell;
    mandalaGrid.append(box);
  });

  return detail;
}

function renderCalendarEditor(event) {
  const editor = document.createElement("section");
  editor.className = "calendar-editor";
  editor.dataset.eventId = event.id;
  editor.innerHTML = `
    <div class="calendar-editor-head">
      <h3>Edit Plan</h3>
      <button type="button" data-calendar-action="close-edit" aria-label="Close editor">&times;</button>
    </div>
    <label>
      <span>Title</span>
      <input class="calendar-editor-title" type="text" value="" />
    </label>
    <div class="calendar-editor-grid">
      <label>
        <span>Date</span>
        <input class="calendar-editor-date" type="date" value="" />
      </label>
      <label>
        <span>Time</span>
        <input class="calendar-editor-time" type="time" value="" />
      </label>
    </div>
    <label>
      <span>Mark</span>
      <select class="calendar-editor-kind"></select>
    </label>
    <div class="calendar-editor-actions">
      <button type="button" data-calendar-action="save-edit">Save</button>
    </div>
  `;

  editor.querySelector(".calendar-editor-title").value = event.title ?? "";
  editor.querySelector(".calendar-editor-date").value = event.dateValue ?? dateInputValueFromDate(new Date());
  editor.querySelector(".calendar-editor-time").value = event.time || "";

  const kindSelect = editor.querySelector(".calendar-editor-kind");
  calendarKindOptions.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === (event.kind ?? "personal");
    kindSelect.append(option);
  });

  return editor;
}

async function handleCalendarAction(button) {
  const action = button.dataset.calendarAction;
  const container = button.closest(".calendar-event, .calendar-editor");
  const eventId = container?.dataset.eventId;
  if (!eventId || !currentUser) return;

  const event = folderData.calendar.events.find((item) => item.id === eventId);

  if (action === "edit") {
    editingCalendarEventId = eventId;
    renderFolder("calendar");
    return;
  }

  if (action === "close-edit") {
    editingCalendarEventId = null;
    renderFolder("calendar");
    return;
  }

  button.disabled = true;

  try {
    if (action === "delete") {
      await deleteCalendarEvent({ userId: currentUser.id, eventId });
      folderData.calendar.events = folderData.calendar.events.filter((item) => item.id !== eventId);
      if (editingCalendarEventId === eventId) editingCalendarEventId = null;
    }

    if (action === "save-edit") {
      const editor = button.closest(".calendar-editor");
      const titleInput = editor.querySelector(".calendar-editor-title");
      const dateInput = editor.querySelector(".calendar-editor-date");
      const timeInput = editor.querySelector(".calendar-editor-time");
      const kindInput = editor.querySelector(".calendar-editor-kind");

      await updateCalendarEvent({
        userId: currentUser.id,
        eventId,
        title: titleInput.value.trim() || "予定",
        dateValue: dateInput.value,
        time: timeInput.value || "",
        kind: kindInput.value || "personal",
        currentStartsAt: event?.startsAt,
      });
      await loadCalendarEvents(currentUser.id);
      editingCalendarEventId = null;
    }

    renderFolder("calendar");
  } catch (error) {
    addMessage("assistant", `Calendarを更新できませんでした: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

function renderVisionFolder() {
  const shell = document.createElement("section");
  shell.className = "vision-workspace";

  if (!visionState.loaded && currentUser) {
    shell.innerHTML = `<p class="vision-status">Visionを読み込んでいます...</p>`;
    loadVisionBoards(currentUser.id).then(() => {
      if (!folderWindow.hidden && folderTitle.textContent === "Vision") renderFolder("vision");
    });
    return shell;
  }

  if (visionState.error) {
    shell.innerHTML = `
      <div class="vision-setup">
        <h3>Vision setup</h3>
        <p></p>
      </div>
    `;
    shell.querySelector("p").textContent = visionState.error;
    return shell;
  }

  const board = activeVisionBoard();
  shell.innerHTML = `
    <div class="vision-topbar">
      <label>
        <span>Sheet</span>
        <select class="vision-board-select" data-vision-field="board"></select>
      </label>
      <div class="vision-new-board">
        <input class="vision-new-title" type="text" placeholder="New sheet title" />
        <button type="button" data-vision-action="new-board">New</button>
      </div>
    </div>
    <div class="vision-toolrow">
      <button type="button" data-vision-action="add-image">Image</button>
      <button type="button" data-vision-action="add-text">Text</button>
      <button type="button" data-vision-action="add-sticky">Sticky</button>
      <button type="button" data-vision-action="save-board">Save</button>
      <input class="vision-file-input" type="file" accept="image/*" hidden />
    </div>
    <div class="vision-colorbar">
      <span>Background</span>
      <div class="vision-bg-swatches"></div>
    </div>
    <div class="vision-meta">
      <strong></strong>
      <span>Drag items to arrange your dream sheet.</span>
    </div>
    <div class="vision-canvas"></div>
  `;

  const select = shell.querySelector(".vision-board-select");
  visionState.boards.forEach((visionBoard) => {
    const option = document.createElement("option");
    option.value = visionBoard.id;
    option.textContent = visionBoard.title;
    option.selected = visionBoard.id === board?.id;
    select.append(option);
  });

  shell.querySelector(".vision-meta strong").textContent = board?.title ?? "Vision";
  const canvas = shell.querySelector(".vision-canvas");
  canvas.classList.add(`vision-canvas-${board?.background ?? "dream"}`);
  const bgSwatches = shell.querySelector(".vision-bg-swatches");
  visionBackgroundOptions.forEach(([value, label]) => {
    const swatch = document.createElement("button");
    swatch.className = `vision-swatch vision-bg-${value}`;
    swatch.type = "button";
    swatch.dataset.visionAction = "set-background";
    swatch.dataset.background = value;
    swatch.setAttribute("aria-label", `Background ${label}`);
    swatch.title = label;
    swatch.setAttribute("aria-pressed", String((board?.background ?? "dream") === value));
    bgSwatches.append(swatch);
  });
  (board?.items ?? []).forEach((item) => canvas.append(renderVisionItem(item)));

  return shell;
}

function renderVisionItem(item) {
  const element = document.createElement("article");
  element.className = `vision-item vision-item-${item.type} vision-color-${item.color ?? "butter"}`;
  element.dataset.visionItemId = item.id;
  element.style.left = `${Number(item.x ?? 24)}px`;
  element.style.top = `${Number(item.y ?? 24)}px`;
  element.style.width = `${Number(item.width ?? 160)}px`;
  element.style.height = `${Number(item.height ?? 100)}px`;
  element.style.zIndex = String(item.z_index ?? 1);
  element.style.transform = `rotate(${Number(item.rotation ?? 0)}deg)`;

  const deleteButton = document.createElement("button");
  deleteButton.className = "vision-item-delete";
  deleteButton.type = "button";
  deleteButton.dataset.visionAction = "delete-item";
  deleteButton.setAttribute("aria-label", "Delete item");
  deleteButton.innerHTML = "&times;";

  if (item.type === "image") {
    const image = document.createElement("img");
    image.className = "vision-image-media";
    image.src = item.display_url || item.content;
    image.alt = "";
    element.append(image, deleteButton);
  } else {
    const handle = document.createElement("div");
    handle.className = "vision-item-handle";
    handle.textContent = item.type;
    element.append(handle);

    const content = document.createElement("div");
    content.className = "vision-item-content";
    content.contentEditable = "true";
    content.spellcheck = false;
    content.textContent = item.content;
    element.append(content, deleteButton);

    if (item.type === "sticky") {
      const colorPicker = document.createElement("div");
      colorPicker.className = "vision-sticky-colors";
      visionStickyColorOptions.forEach(([value, label]) => {
        const swatch = document.createElement("button");
        swatch.className = `vision-swatch vision-sticky-${value}`;
        swatch.type = "button";
        swatch.dataset.visionAction = "set-sticky-color";
        swatch.dataset.color = value;
        swatch.setAttribute("aria-label", `Sticky ${label}`);
        swatch.title = label;
        swatch.setAttribute("aria-pressed", String((item.color ?? "butter") === value));
        colorPicker.append(swatch);
      });
      element.append(colorPicker);
    }
  }

  const resizeHandle = document.createElement("button");
  resizeHandle.className = "vision-item-resize";
  resizeHandle.type = "button";
  resizeHandle.setAttribute("aria-label", "Resize item");
  element.append(resizeHandle);

  return element;
}

function nextVisionZIndex(board) {
  return Math.max(0, ...(board?.items ?? []).map((item) => Number(item.z_index ?? 0))) + 1;
}

async function addVisionItem(type, content, displayUrl = "") {
  const board = activeVisionBoard();
  if (!board || !currentUser) return;

  const item = {
    board_id: board.id,
    type,
    content,
    color: type === "sticky" ? "butter" : "white",
    x: 32 + (board.items.length % 4) * 22,
    y: 38 + (board.items.length % 4) * 18,
    width: type === "image" ? 178 : type === "sticky" ? 168 : 190,
    height: type === "image" ? 128 : type === "sticky" ? 112 : 82,
    rotation: 0,
    z_index: nextVisionZIndex(board),
  };

  try {
    const created = await createVisionItem({ userId: currentUser.id, item });
    board.items.push({ ...created, display_url: displayUrl });
    renderFolder("vision");
  } catch (error) {
    addMessage("assistant", `Visionに追加できませんでした: ${error.message}`);
  }
}

async function handleVisionAction(button) {
  const action = button.dataset.visionAction;
  const workspace = button.closest(".vision-workspace");
  if (!workspace || !currentUser) return;

  if (action === "add-text") {
    await addVisionItem("text", "小さな夢メモ");
  }

  if (action === "add-sticky") {
    await addVisionItem("sticky", "付箋メモ");
  }

  if (action === "add-image") {
    workspace.querySelector(".vision-file-input")?.click();
  }

  if (action === "new-board") {
    const input = workspace.querySelector(".vision-new-title");
    const title = input.value.trim() || `Dream Sheet ${visionState.boards.length + 1}`;
    try {
      const board = await createVisionBoard({ userId: currentUser.id, title });
      visionState.boards.push(board);
      visionState.activeBoardId = board.id;
      renderFolder("vision");
    } catch (error) {
      addMessage("assistant", `Visionシートを作成できませんでした: ${error.message}`);
    }
  }

  if (action === "save-board") {
    await saveActiveVisionBoard();
  }

  if (action === "set-background") {
    const board = activeVisionBoard();
    if (!board) return;
    board.background = button.dataset.background || "dream";
    try {
      await updateVisionBoard({ userId: currentUser.id, board });
      renderFolder("vision");
    } catch (error) {
      addMessage("assistant", `Vision背景を保存できませんでした: ${error.message}`);
    }
  }

  if (action === "set-sticky-color") {
    const itemElement = button.closest(".vision-item");
    const itemId = itemElement?.dataset.visionItemId;
    const board = activeVisionBoard();
    const item = board?.items.find((entry) => entry.id === itemId);
    if (!item) return;

    item.color = button.dataset.color || "butter";
    try {
      await updateVisionItem({ userId: currentUser.id, item });
      renderFolder("vision");
    } catch (error) {
      addMessage("assistant", `付箋の色を保存できませんでした: ${error.message}`);
    }
  }

  if (action === "delete-item") {
    const itemElement = button.closest(".vision-item");
    const itemId = itemElement?.dataset.visionItemId;
    const board = activeVisionBoard();
    const item = board?.items.find((entry) => entry.id === itemId);
    if (!board || !item) return;

    try {
      await deleteVisionItem({ userId: currentUser.id, item });
      board.items = board.items.filter((entry) => entry.id !== itemId);
      renderFolder("vision");
    } catch (error) {
      addMessage("assistant", `Visionアイテムを削除できませんでした: ${error.message}`);
    }
  }
}

async function saveActiveVisionBoard() {
  const board = activeVisionBoard();
  if (!board || !currentUser) return;

  visionState.saving = true;
  try {
    await Promise.all(board.items.map((item) => updateVisionItem({ userId: currentUser.id, item })));
    addMessage("assistant", "Visionシートを保存しました。");
  } catch (error) {
    addMessage("assistant", `Visionを保存できませんでした: ${error.message}`);
  } finally {
    visionState.saving = false;
  }
}

async function handleVisionFileChange(inputElement) {
  const file = inputElement.files?.[0];
  inputElement.value = "";
  if (!file || !currentUser) return;

  try {
    const uploaded = await uploadVisionImage({ userId: currentUser.id, file });
    await addVisionItem("image", uploaded.path, uploaded.signedUrl);
  } catch (error) {
    addMessage("assistant", `画像をアップロードできませんでした: ${error.message}`);
  }
}

async function saveVisionItemContent(contentElement) {
  const itemElement = contentElement.closest(".vision-item");
  const itemId = itemElement?.dataset.visionItemId;
  const board = activeVisionBoard();
  const item = board?.items.find((entry) => entry.id === itemId);
  if (!item || !currentUser) return;

  item.content = contentElement.textContent.trim() || (item.type === "sticky" ? "付箋メモ" : "小さな夢メモ");
  try {
    await updateVisionItem({ userId: currentUser.id, item });
  } catch (error) {
    addMessage("assistant", `Visionメモを保存できませんでした: ${error.message}`);
  }
}

function startVisionDrag(event) {
  if (event.target.closest(".vision-item-delete")) return;
  if (event.target.closest(".vision-swatch")) return;

  const resizeHandle = event.target.closest(".vision-item-resize");
  const handle = event.target.closest(".vision-item-handle");
  const imageItem = event.target.closest(".vision-image-media")?.closest(".vision-item");
  const itemElement = resizeHandle?.closest(".vision-item") ?? handle?.closest(".vision-item") ?? imageItem;
  const canvas = itemElement?.closest(".vision-canvas");
  const board = activeVisionBoard();
  const item = board?.items.find((entry) => entry.id === itemElement?.dataset.visionItemId);
  if (!itemElement || !canvas || !item) return;
  if (!resizeHandle && !handle && item.type !== "image") return;

  event.preventDefault();
  const itemRect = itemElement.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  visionDrag = {
    mode: resizeHandle ? "resize" : "move",
    item,
    itemElement,
    canvas,
    offsetX: event.clientX - itemRect.left,
    offsetY: event.clientY - itemRect.top,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: itemRect.width,
    startHeight: itemRect.height,
    canvasLeft: canvasRect.left,
    canvasTop: canvasRect.top,
  };
  itemElement.setPointerCapture?.(event.pointerId);
}

function moveVisionDrag(event) {
  if (!visionDrag) return;

  if (visionDrag.mode === "resize") {
    const maxWidth = visionDrag.canvas.clientWidth - Number(visionDrag.item.x ?? 0);
    const maxHeight = visionDrag.canvas.clientHeight - Number(visionDrag.item.y ?? 0);
    const minWidth = visionDrag.item.type === "image" ? 72 : 110;
    const minHeight = visionDrag.item.type === "image" ? 72 : 62;
    const width = Math.min(Math.max(minWidth, visionDrag.startWidth + event.clientX - visionDrag.startX), maxWidth);
    const height = Math.min(Math.max(minHeight, visionDrag.startHeight + event.clientY - visionDrag.startY), maxHeight);

    visionDrag.item.width = Math.round(width);
    visionDrag.item.height = Math.round(height);
    visionDrag.itemElement.style.width = `${visionDrag.item.width}px`;
    visionDrag.itemElement.style.height = `${visionDrag.item.height}px`;
    return;
  }

  const canvasRect = visionDrag.canvas.getBoundingClientRect();
  const maxX = visionDrag.canvas.clientWidth - visionDrag.itemElement.offsetWidth;
  const maxY = visionDrag.canvas.clientHeight - visionDrag.itemElement.offsetHeight;
  const x = Math.min(Math.max(0, event.clientX - canvasRect.left - visionDrag.offsetX), Math.max(0, maxX));
  const y = Math.min(Math.max(0, event.clientY - canvasRect.top - visionDrag.offsetY), Math.max(0, maxY));

  visionDrag.item.x = Math.round(x);
  visionDrag.item.y = Math.round(y);
  visionDrag.itemElement.style.left = `${visionDrag.item.x}px`;
  visionDrag.itemElement.style.top = `${visionDrag.item.y}px`;
}

async function endVisionDrag() {
  if (!visionDrag || !currentUser) {
    visionDrag = null;
    return;
  }

  const item = visionDrag.item;
  visionDrag = null;
  try {
    await updateVisionItem({ userId: currentUser.id, item });
  } catch (error) {
    addMessage("assistant", `Visionの位置を保存できませんでした: ${error.message}`);
  }
}

function handleGoalAction(button) {
  const action = button.dataset.goalAction;
  const state = loadGoalState();

  if (action === "open-goals") {
    renderFolder("goals");
    return;
  }

  if (action === "unlock-category") {
    const category = state.categories.find((item) => item.id === button.dataset.categoryId);
    if (!category) return;
    category.status = "seed";
    category.mapStage = "seed";
    category.isUnlocked = true;
    state.activeCategoryId = category.id;
    state.lastUnlockedCategoryId = category.id;
    saveGoalState();
    renderFolder("goals");
    window.setTimeout(() => {
      const latest = loadGoalState();
      if (latest.lastUnlockedCategoryId === category.id) {
        latest.lastUnlockedCategoryId = "";
        saveGoalState({ sync: false });
      }
    }, 1100);
    addMessage("assistant", "新しいエリアが見えてきたよ");
    return;
  }

  if (action === "select-category") {
    const category = state.categories.find((item) => item.id === button.dataset.categoryId);
    if (!category || ["hidden", "locked"].includes(category.status)) return;
    state.activeCategoryId = category.id;
    saveGoalState();
    renderFolder("goals");
  }

  if (action === "toggle-mandala") {
    const grid = button.closest(".goal-card")?.querySelector(".mandala-grid");
    if (grid) grid.hidden = !grid.hidden;
  }

  if (action === "open-vision") {
    renderFolder("vision");
  }
}

function saveGoalField(field) {
  const state = loadGoalState();

  if (field.dataset.goalField === "yearTheme") {
    state.yearTheme = field.value.trim() || "自由に、しなやかに育つ";
    saveGoalState();
    if (!folderWindow.hidden && folderTitle.textContent === "Goals") renderFolder("goals");
    return;
  }

  if (field.dataset.goalField === "idealDayGlobal") {
    state.idealDay = splitGoalLines(field.value);
    saveGoalState();
    if (!folderWindow.hidden && folderTitle.textContent === "Goals") renderFolder("goals");
    return;
  }

  const categoryId = field.closest(".goal-detail-grid")?.dataset.categoryId;
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) return;

  const key = field.dataset.goalField;
  if (key === "wish" || key === "outcome" || key === "obstacle") {
    category.woop[key] = field.value.trim();
    refreshGoalMapStage(category);
  }

  if (key === "plans") {
    category.woop.plans = field.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    category.completedPlans = category.woop.plans.map((_, index) => Boolean(category.completedPlans?.[index]));
    category.nextAction = category.woop.plans[0] ?? "最初の一歩を決める";
    refreshGoalMapStage(category);
    renderGoalPlanChecks(field.closest(".goal-woop")?.querySelector(".goal-plan-checks"), category);
  }

  if (["label", "title", "matrix", "nextAction", "vision", "reward", "progressSource"].includes(key)) {
    category[key] = field.value.trim();
  }

  if (key === "completedPlan") {
    category.completedPlans ??= [];
    category.completedPlans[Number(field.dataset.index)] = field.checked;
    refreshGoalMapStage(category);
  }

  if (key === "progress") {
    category.progress = Math.min(100, Math.max(0, Number(field.value) || 0));
    refreshGoalMapStage(category);
  }

  if (key === "importance") {
    category.importance = Math.min(5, Math.max(1, Number(field.value) || 1));
  }

  if (key === "idealDay") {
    category.idealDay = field.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (key === "mandala") {
    category.mandala[Number(field.dataset.index)] = field.value.trim();
  }

  saveGoalState();
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("ログインしています...");

  try {
    const user = await signInWithEmail({
      email: authEmail.value.trim(),
      password: authPassword.value,
    });
    showApp(user);
  } catch (error) {
    setAuthMessage(error.message);
  }
});

signupButton.addEventListener("click", async () => {
  setAuthMessage("アカウントを作成しています...");

  try {
    const user = await signUpWithEmail({
      email: authEmail.value.trim(),
      password: authPassword.value,
    });

    if (user) {
      showApp(user);
    } else {
      setAuthMessage("確認メールを送信しました。メール内のリンクからログインを完了してください。");
    }
  } catch (error) {
    setAuthMessage(error.message);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut();
    showAuth("ログアウトしました。");
  } catch (error) {
    setAuthMessage(error.message);
  }
});

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

saveDraft.addEventListener("click", async () => {
  if (!draft) return;
  if (!currentUser) {
    showAuth("保存するにはログインしてください。");
    return;
  }

  saveDraft.disabled = true;
  saveDraft.textContent = "Saving...";

  try {
    await saveBloomDraft({ userId: currentUser.id, draft });
  } catch (error) {
    addMessage("assistant", `保存できませんでした: ${error.message}`);
    saveDraft.disabled = false;
    saveDraft.textContent = "Save";
    return;
  }

  setMoodFace(draft.moodAsset, draft.moodIcon);
  moodText.textContent = draft.mood + ". " + draft.journal;
  latestMemory.textContent = draft.memory;

  if (draft.plans?.length) {
    draft.plans.forEach((planItem) => {
      const item = document.createElement("li");
      item.innerHTML = "<time></time><span></span>";
      item.querySelector("time").textContent = shortDateLabel(planItem.date);
      item.querySelector("span").textContent = (planItem.time ? planItem.time + " " : "") + planItem.title;
      todayPlans.append(item);
    });
  }

  if (draft.amount) {
    saving = Math.min(50000, saving + Math.round(draft.amount * 0.1));
    rewardSaving.textContent = saving.toLocaleString("ja-JP") + "\u5186";
    savingBar.style.width = Math.round((saving / 50000) * 100) + "%";
  }

  updateGrowth(15);
  updateLocalFolders(draft);
  await loadCalendarEvents(currentUser.id);
  addMessage("assistant", "Memories、Money、Calendar、Growthに保存したよ。");
  input.value = "";
  confirmPanel.hidden = true;
  draft = null;
  saveDraft.disabled = false;
  saveDraft.textContent = "Save";
});

folderButtons.forEach((button) => {
  button.addEventListener("click", () => renderFolder(button.dataset.folder));
});

closeFolder.addEventListener("click", () => {
  folderWindow.hidden = true;
});

folderContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-calendar-action]");
  if (button) {
    handleCalendarAction(button);
    return;
  }

  const goalButton = event.target.closest("[data-goal-action]");
  if (goalButton) {
    handleGoalAction(goalButton);
    return;
  }

  const visionButton = event.target.closest("[data-vision-action]");
  if (visionButton) {
    handleVisionAction(visionButton);
  }
});

homeLifeMap?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-goal-action]");
  if (button) handleGoalAction(button);
});

folderContent.addEventListener("input", (event) => {
  if (event.target.matches('[data-goal-field="plans"]')) {
    saveGoalField(event.target);
  }
});

folderContent.addEventListener("change", (event) => {
  if (event.target.matches("[data-goal-field]")) {
    saveGoalField(event.target);
  }

  if (event.target.matches(".vision-board-select")) {
    visionState.activeBoardId = event.target.value;
    renderFolder("vision");
  }

  if (event.target.matches(".vision-file-input")) {
    handleVisionFileChange(event.target);
  }
});

folderContent.addEventListener(
  "focusout",
  (event) => {
    if (event.target.matches("[data-goal-field]")) {
      saveGoalField(event.target);
    }

    if (event.target.matches(".vision-item-content")) {
      saveVisionItemContent(event.target);
    }
  },
  true
);

folderContent.addEventListener("pointerdown", startVisionDrag);
document.addEventListener("pointermove", moveVisionDrag);
document.addEventListener("pointerup", endVisionDrag);

missionChecks.forEach((check) => {
  check.addEventListener("change", () => updateGrowth(check.checked ? 30 : -30));
});

missionsWidget?.addEventListener("change", async (event) => {
  const checkbox = event.target.closest('input[type="checkbox"][data-task-id]');
  if (!checkbox || !currentUser) return;

  checkbox.disabled = true;
  try {
    await updateTaskStatus({
      userId: currentUser.id,
      taskId: checkbox.dataset.taskId,
      done: checkbox.checked,
    });
    updateGrowth(checkbox.checked ? 30 : -30);
    await loadTaskMissions(currentUser.id);
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    addMessage("assistant", `Taskを更新できませんでした: ${error.message}`);
  } finally {
    checkbox.disabled = false;
  }
});

homeButton.addEventListener("click", () => {
  folderWindow.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

setRandomHomeRabbitIcon();
setMoodFace(MOOD_ASSETS.happy, "\ud83d\ude0a");
initAuth();
