import {
  createVisionBoard,
  createVisionItem,
  deleteVisionItem,
  deleteCalendarEvent,
  getGoalLifeMap,
  getCalendarEvents,
  getCurrentUser,
  getMoneyOverviewData,
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
    custom: "money",
    sections: [],
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
      ["Journal", "Bloom Chatから保存するとここに表示されます。"],
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
      ["AI Reflection", "昨日より少し、生活を育てられています。"],
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
let goalWizardState = null;
let goalMandalaCategoryId = "";
let goalWoopEditCategoryId = "";
let moneyOverviewState = {
  loaded: false,
  loading: false,
  error: "",
  data: null,
  showFuture: false,
  setup: null,
};
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
    content: "縺薙％縺ｫ2026蟷ｴ縺ｮ逅・Φ繧呈嶌縺・※縺ｭ",
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
    content: "髻灘嵜繝ｯ繝ｼ繝帙Μ / 逅・Φ縺ｮ驛ｨ螻・/ 鄒主ｮｹ險育判",
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
  decorations: {
    seed: new URL("./assets/lifemap/background/H6.png", import.meta.url).href,
    planned: new URL("./assets/lifemap/background/H4.png", import.meta.url).href,
    growing: new URL("./assets/lifemap/background/H5.png", import.meta.url).href,
    bloomed: new URL("./assets/lifemap/background/H14.png", import.meta.url).href,
  },
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
    mapTransition: state?.mapTransition ?? null,
  };
}

function calculateGoalProgress(category) {
  const plans = splitGoalLines(category.woop?.plans ?? []);
  const manualProgress = Math.min(100, Math.max(0, Number(category.progress) || 0));
  if (category.progressSource === "plan-checks" && plans.length) {
    const done = (category.completedPlans ?? []).filter(Boolean).length;
    return Math.max(manualProgress, Math.round((done / plans.length) * 100));
  }

  return manualProgress;
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
  return "小さな一歩が、世界を少しずつ育ててるよ";
}

function getLifeMapStage(state) {
  const categories = state.categories ?? [];
  const progress = averageGoalProgress(categories);

  if (progress >= 80) return "a5";
  if (progress >= 60) return "a4";
  if (progress >= 40) return "a3";
  if (progress >= 20) return "a2";
  return "a1";
}

function getLifeMapStageRank(stage) {
  return ["a1", "a2", "a3", "a4", "a5"].indexOf(stage);
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

function getLifeMapDecoration(status) {
  if (status === "bloomed") return lifeMapAssets.decorations.bloomed;
  if (status === "growing") return lifeMapAssets.decorations.growing;
  if (status === "planned") return lifeMapAssets.decorations.planned;
  if (status === "seed") return lifeMapAssets.decorations.seed;
  return "";
}

function getGoalSummaryStats(state) {
  const categories = state.categories ?? [];
  const unlocked = categories.filter((category) => !["hidden", "locked"].includes(category.status)).length;
  const plans = categories.flatMap((category) => splitGoalLines(category.woop?.plans ?? []));
  const done = categories.reduce((sum, category) => sum + (category.completedPlans ?? []).filter(Boolean).length, 0);
  return { unlocked, plans: plans.length, done };
}

function getGoalRecentWins(state) {
  const wins = [];
  (state.categories ?? []).forEach((category) => {
    splitGoalLines(category.woop?.plans ?? []).forEach((plan, index) => {
      if (category.completedPlans?.[index]) wins.push(`${category.label}: ${plan}`);
    });
  });
  return wins.slice(-3).reverse();
}

function getGoalNextActions(state) {
  const actions = [];
  (state.categories ?? []).forEach((category) => {
    splitGoalLines(category.woop?.plans ?? []).forEach((plan, index) => {
      if (!category.completedPlans?.[index]) actions.push(`${category.label}: ${plan}`);
    });
  });
  return actions.slice(0, 3);
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
    yearTheme: "閾ｪ逕ｱ縺ｫ縲√＠縺ｪ繧・°縺ｫ閧ｲ縺､",
    idealDay: defaultGoalIdealDay,
    activeCategoryId: "",
    categories,
    recentWins: ["Vision繧帝幕縺・※逅・Φ繧定ｦ狗峩縺励◆", "莉頑律縺ｮ莠亥ｮ壹ｒ謨ｴ逅・〒縺阪◆"],
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
    const { mapTransition: _mapTransition, ...goalMap } = goalState;
    await upsertGoalLifeMap({ userId: currentUser.id, goalMap });
  } catch (error) {
    addMessage("assistant", `Goals繧担upabase縺ｸ菫晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
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
    addMessage("assistant", `Goals縺ｯ繝ｭ繝ｼ繧ｫ繝ｫ菫晏ｭ倥〒陦ｨ遉ｺ荳ｭ縺ｧ縺吶４upabase SQL繧呈ｺ門ｙ縺吶ｋ縺ｨ蜷梧悄縺ｧ縺阪∪縺・ ${error.message}`);
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
    addMessage("assistant", `Tasks繧定ｪｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
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
      error: `Vision縺ｮ菫晏ｭ倥ユ繝ｼ繝悶Ν繧呈ｺ門ｙ縺吶ｋ縺ｨ菴ｿ縺医ｋ繧医≧縺ｫ縺ｪ繧翫∪縺・ ${error.message}`,
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

function yen(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("ja-JP")}円`;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthsLeftInYear() {
  const today = new Date();
  return Math.max(1, 12 - today.getMonth());
}

function moneyCategory() {
  const state = loadGoalState();
  return state.categories.find((category) => category.id === "money");
}

function moneySettings() {
  const category = moneyCategory();
  category.money ??= {};
  category.money.goals ??= [];
  return category.money;
}

function isMoneyConfigured() {
  const settings = moneySettings();
  return Boolean(settings.money_theme || settings.year_end_target || settings.monthly_target_amount || settings.goals?.length);
}

function parseMoneyAmount(value) {
  const normalized = String(value ?? "")
    .replace(/[\uFF10-\uFF19]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[,\uFF0C\s]/g, "");
  const oku = normalized.match(new RegExp("(\\d+(?:\\.\\d+)?)\\u5104"));
  const man = normalized.match(new RegExp("(\\d+(?:\\.\\d+)?)\\u4E07"));
  if (oku || man) {
    return Math.round((oku ? Number(oku[1]) * 100000000 : 0) + (man ? Number(man[1]) * 10000 : 0));
  }
  const plain = normalized.match(/\d+/);
  return plain ? Number(plain[0]) : 0;
}

function parseMoneyDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const normalized = text
    .replace(/[\uFF10-\uFF19]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[./]/g, "-");
  const full = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (full) return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  const short = normalized.match(/(\d{1,2})-(\d{1,2})/);
  if (short) return `${new Date().getFullYear()}-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`;
  const month = normalized.match(/(\d{1,2})\s*\u6708/);
  if (month) return `${new Date().getFullYear()}-${month[1].padStart(2, "0")}-28`;
  return "";
}

function moneyEventDate(item) {
  return item.paid_on || item.scheduled_on || item.created_at?.slice(0, 10) || "";
}

function moneyMonthKey(value) {
  const key = String(value ?? "");
  return key.length >= 7 ? key.slice(0, 7) : "";
}

function moneyText(item) {
  return `${item.title ?? ""} ${item.category ?? ""}`.toLowerCase();
}

function sumMoney(items, predicate = () => true) {
  return items.filter(predicate).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function matchesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function moneyAreaFor(item) {
  const text = moneyText(item);
  if (matchesAny(text, ["travel", "trip", "korea", "\u65c5\u884c", "\u97d3\u56fd", "\u795e\u6238"])) return "旅行";
  if (matchesAny(text, ["beauty", "cosme", "hair", "\u7f8e\u5bb9", "\u9999\u6c34", "\u30b3\u30b9\u30e1", "\u30d8\u30a2", "\u30cd\u30a4\u30eb"])) return "美容";
  if (matchesAny(text, ["dance", "\u30c0\u30f3\u30b9", "\u8863\u88c5"])) return "ダンス";
  if (matchesAny(text, ["study", "book", "\u52c9\u5f37", "\u672c", "\u8cc7\u683c"])) return "勉強";
  if (matchesAny(text, ["event", "\u30a4\u30d9\u30f3\u30c8", "\u4ea4\u969b"])) return "イベント";
  if (matchesAny(text, ["future", "\u5c06\u6765", "\u5f15\u3063\u8d8a\u3057", "pc"])) return "将来";
  return "暮らし";
}

const lifeInvestmentTags = [
  { id: "beauty", label: "Beauty", flower: "Rose", tone: "#f4a9c7", words: ["beauty", "cosme", "hair", "nail", "\u7f8e\u5bb9", "\u9999\u6c34", "\u30b3\u30b9\u30e1", "\u30d8\u30a2", "\u30cd\u30a4\u30eb"] },
  { id: "health", label: "Health", flower: "Clover", tone: "#9edec8", words: ["health", "gym", "clinic", "\u5065\u5eb7", "\u75c5\u9662", "\u30b8\u30e0", "\u30e8\u30ac"] },
  { id: "learning", label: "Learning", flower: "Lavender", tone: "#b9a8eb", words: ["study", "book", "school", "\u52c9\u5f37", "\u672c", "\u8cc7\u683c", "\u8a9e\u5b66"] },
  { id: "creativity", label: "Creativity", flower: "Cosmos", tone: "#f2b8d2", words: ["create", "art", "design", "\u5236\u4f5c", "\u30a2\u30fc\u30c8", "\u30c7\u30b6\u30a4\u30f3"] },
  { id: "expression", label: "Expression", flower: "Gerbera", tone: "#f0b67f", words: ["dance", "stage", "costume", "\u30c0\u30f3\u30b9", "\u8863\u88c5", "\u8868\u73fe"] },
  { id: "relationships", label: "Relationships", flower: "Tulip", tone: "#f7a6a6", words: ["friend", "gift", "party", "\u53cb\u9054", "\u4ea4\u969b", "\u30ae\u30d5\u30c8", "\u30d7\u30ec\u30bc\u30f3\u30c8"] },
  { id: "experience", label: "Experience", flower: "Sunflower", tone: "#f4cf75", words: ["travel", "trip", "event", "cafe", "\u65c5\u884c", "\u30a4\u30d9\u30f3\u30c8", "\u30ab\u30d5\u30a7", "\u97d3\u56fd", "\u795e\u6238"] },
  { id: "future", label: "Future", flower: "Sakura", tone: "#f5bfd2", words: ["future", "saving", "pc", "move", "\u5c06\u6765", "\u8caf\u91d1", "\u5f15\u3063\u8d8a\u3057", "\u7559\u5b66"] },
];

function lifeTagForMoney(item) {
  const text = moneyText(item);
  return lifeInvestmentTags.find((tag) => matchesAny(text, tag.words)) ?? lifeInvestmentTags.find((tag) => tag.id === "future");
}

function getMoneyReflections(settings) {
  return settings.reflections && typeof settings.reflections === "object" ? settings.reflections : {};
}

function moneyReflectionWeight(value) {
  return value === "bloom" ? 3 : value === "grow" ? 2 : value === "bud" ? 1 : 0;
}

function moneyReflectionLabel(value) {
  return value === "bloom" ? "満開" : value === "grow" ? "すくすく" : value === "bud" ? "つぼみ" : "未記録";
}

function buildLifeInvestments(expenses, reflections) {
  const total = Math.max(1, expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  return lifeInvestmentTags.map((tag) => {
    const items = expenses.filter((item) => lifeTagForMoney(item).id === tag.id);
    const amount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const happiness = items.reduce((sum, item) => sum + moneyReflectionWeight(reflections[item.id]?.feeling), 0);
    const reflected = items.filter((item) => reflections[item.id]?.feeling).length;
    return {
      ...tag,
      amount,
      count: items.length,
      percent: Math.round((amount / total) * 100),
      happiness: reflected ? Math.round((happiness / (reflected * 3)) * 100) : Math.min(95, Math.max(20, Math.round((items.length / Math.max(1, expenses.length)) * 100))),
    };
  }).sort((a, b) => b.amount - a.amount);
}

function getMoneyWants(settings) {
  const wants = Array.isArray(settings.wants) ? settings.wants : [];
  return wants
    .map((want, index) => ({
      id: want.id || `want-${index}-${String(want.title ?? "").slice(0, 8)}`,
      title: String(want.title ?? "").trim(),
      amount: Number(want.amount || 0),
      deadline: want.deadline || "",
      priority: Number(want.priority || 3),
      saved: Number(want.saved || 0),
    }))
    .filter((want) => want.title);
}

function monthsUntil(dateKeyValue) {
  const now = new Date();
  const target = dateKeyValue ? new Date(dateKeyValue) : new Date(now.getFullYear(), 11, 31);
  return Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth() + 1);
}

function moneyStatusIcon(status) {
  return status === "good" ? "\uD83D\uDFE2" : status === "warn" ? "\uD83D\uDFE1" : "\uD83D\uDD34";
}

function calculateMoneyOverview() {
  const settings = moneySettings();
  const data = moneyOverviewState.data ?? { transactions: [], rewardGoals: [] };
  const transactions = data.transactions ?? [];
  const rewards = data.rewardGoals ?? [];
  const now = new Date();
  const todayKey = dateKey(now);
  const yearEndKey = `${now.getFullYear()}-12-31`;
  const paidIncome = transactions.filter((item) => item.kind === "income" && item.paid_on);
  const paidExpense = transactions.filter((item) => item.kind === "expense" && item.paid_on);
  const fixedExpense = paidExpense.filter((item) => matchesAny(moneyText(item), ["fixed", "rent", "subscription", "\u56fa\u5b9a", "\u5bb6\u8cc3", "\u30b5\u30d6\u30b9\u30af", "\u4fdd\u967a"]));
  const variableExpense = paidExpense.filter((item) => !fixedExpense.includes(item));
  const savingTransactions = transactions.filter((item) => ["saving", "investment"].includes(item.kind));
  const futureExpenses = transactions.filter((item) => item.kind === "expense" && item.scheduled_on && item.scheduled_on >= todayKey && item.scheduled_on <= yearEndKey);
  const allExpenses = transactions.filter((item) => item.kind === "expense");
  const reflections = getMoneyReflections(settings);
  const lifeInvestments = buildLifeInvestments(allExpenses, reflections);
  const rewardTotal = rewards.reduce((sum, item) => sum + Number(item.current_amount || 0), 0);
  const paidSavings = savingTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentSavings = Math.max(rewardTotal, paidSavings);
  const monthCount = Math.max(1, now.getMonth() + 1);
  const averageIncome = paidIncome.reduce((sum, item) => sum + Number(item.amount || 0), 0) / monthCount;
  const averageExpense = paidExpense.reduce((sum, item) => sum + Number(item.amount || 0), 0) / monthCount;
  const averageFixedExpense = fixedExpense.reduce((sum, item) => sum + Number(item.amount || 0), 0) / monthCount;
  const averageVariableExpense = variableExpense.reduce((sum, item) => sum + Number(item.amount || 0), 0) / monthCount;
  const eventExpense = futureExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remainingMonths = monthsLeftInYear();
  const yearEndTarget = Number(settings.year_end_target) || Number(rewards[0]?.target_amount || 0);
  const monthlyTarget = Number(settings.monthly_target_amount) || 0;
  const wants = getMoneyWants(settings);
  const wantsTotal = wants.reduce((sum, want) => sum + Number(want.amount || 0), 0);
  const wantsSaved = wants.reduce((sum, want) => sum + Number(want.saved || 0), 0);
  const wantsNeed = Math.max(0, wantsTotal - wantsSaved);
  const requiredMonthlyForWants = wants.reduce((sum, want) => sum + Math.max(0, Number(want.amount || 0) - Number(want.saved || 0)) / monthsUntil(want.deadline), 0);
  const forecastBeforeWants = currentSavings + averageIncome * remainingMonths - averageExpense * remainingMonths - eventExpense;
  const forecast = forecastBeforeWants - wantsNeed;
  const gap = yearEndTarget ? yearEndTarget - forecast : 0;
  const progress = yearEndTarget ? Math.min(100, Math.max(0, Math.round((currentSavings / yearEndTarget) * 100))) : 0;
  const spendingRatio = averageIncome ? averageExpense / averageIncome : 0;
  const targetPressure = averageIncome ? requiredMonthlyForWants / averageIncome : 0;
  const status = !yearEndTarget ? "warn" : gap <= 0 && spendingRatio < 0.85 ? "good" : gap <= monthlyTarget * remainingMonths || targetPressure < 0.18 ? "warn" : "bad";
  const outlook = status === "good" ? "\u9806\u8ABF" : status === "warn" ? "\u6CE8\u610F" : "\u8981\u8ABF\u6574";
  const expenseByArea = allExpenses.reduce((map, item) => {
    const area = moneyAreaFor(item);
    map[area] = (map[area] ?? 0) + Number(item.amount || 0);
    return map;
  }, {});
  const topExpense = Object.entries(expenseByArea).sort((a, b) => b[1] - a[1])[0];
  const reason = status === "good"
    ? `支出ペースは大きく崩れていません。${topExpense ? `${topExpense[0]}は${yen(topExpense[1])}です。` : "このまま記録を続ければ見通しが立ちます。"}`
    : status === "warn"
      ? `${topExpense ? `${topExpense[0]}がやや大きめです。` : "まだ判断材料が少なめです。"}やりたいことを全部叶えるには、月${yen(Math.ceil(requiredMonthlyForWants || Math.max(0, gap / remainingMonths)))}ほど調整すると安心です。`
      : `${topExpense ? `${topExpense[0]}の出費が重めです。` : "年末目標との差が大きめです。"}優先順位を絞るか、月${yen(Math.ceil(Math.max(requiredMonthlyForWants, gap / remainingMonths)))}の調整が必要です。`;
  const moneyGoals = [
    ...(settings.goals ?? []),
    ...rewards.map((goal) => ({
      title: goal.title,
      target_amount: Number(goal.target_amount || 0),
      current_amount: Number(goal.current_amount || 0),
      target_date: goal.target_date,
      reward_saving_goal_id: goal.id,
    })),
  ].filter((goal, index, list) => goal.title && list.findIndex((item) => item.title === goal.title) === index).slice(0, 3);
  const investmentTotal = sumMoney(transactions, (item) => item.kind === "investment" || matchesAny(moneyText(item), ["investment", "\u6295\u8cc7", "nisa"]));
  const repaymentBalance = sumMoney(transactions, (item) => matchesAny(moneyText(item), ["repayment", "loan", "\u8fd4\u6e08", "\u7acb\u66ff"]));
  const monthEndBalance = forecastBeforeWants / remainingMonths;
  const reserveTarget = 100000;
  const reserveFund = Math.max(0, Math.round(averageIncome - averageFixedExpense - averageVariableExpense - monthlyTarget));
  const reserveAdvice = reserveFund > reserveTarget
    ? `予備費は目標${yen(reserveTarget)}を超える見込みです。超えた分は旅行かFutureへ回すと、未来が育ちやすくなります。`
    : reserveFund > 0
      ? `毎月の余り${yen(reserveFund)}を予備費へ置くと、急な予定にもやさしく対応できます。`
      : "今月は予備費へ回す余白が少なめです。固定費と変動費を家計管理アプリで一度だけ見直すと安心です。";
  const specialFunds = rewards.slice(0, 5).map((goal) => ({
    title: goal.title,
    target: Number(goal.target_amount || 0),
    current: Number(goal.current_amount || 0),
    percent: goal.target_amount ? Math.min(100, Math.round((Number(goal.current_amount || 0) / Number(goal.target_amount || 1)) * 100)) : 0,
    forecast: Number(goal.current_amount || 0) + monthlyTarget * remainingMonths,
  }));
  const roadmap = Array.from({ length: remainingMonths }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const scheduled = futureExpenses.filter((item) => moneyMonthKey(item.scheduled_on) === key);
    const wantsInMonth = wants.filter((want) => moneyMonthKey(want.deadline) === key);
    const total = scheduled.reduce((sum, item) => sum + Number(item.amount || 0), 0) + wantsInMonth.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const events = [
      ...scheduled.map((item) => ({ title: item.title || moneyAreaFor(item), area: moneyAreaFor(item), amount: Number(item.amount || 0) })),
      ...wantsInMonth.map((item) => ({ title: item.title, area: "Want", amount: Number(item.amount || 0) })),
    ].slice(0, 4);
    return {
      key,
      label: `${date.getMonth() + 1}月`,
      total,
      level: total > averageExpense * 0.55 ? "danger" : total > averageExpense * 0.28 ? "warn" : "good",
      events,
    };
  });
  const scoreParts = {
    budget: Math.max(0, Math.min(25, Math.round(25 - Math.max(0, spendingRatio - 0.75) * 80))),
    saving: Math.max(0, Math.min(25, Math.round((currentSavings / Math.max(1, yearEndTarget || currentSavings || 1)) * 25))),
    investment: Math.min(15, investmentTotal > 0 ? 15 : 6),
    bonus: Math.max(0, Math.min(15, paidIncome.length ? 15 : 8)),
    advance: Math.max(0, Math.min(20, repaymentBalance > averageExpense ? 8 : 20)),
  };
  const score = Object.values(scoreParts).reduce((sum, value) => sum + value, 0);
  const scoreReasons = [
    spendingRatio > 0.85 ? "支出比率が高めなので、固定費か美容・交際費を見直すと点数が上がります。" : "支出は大きく崩れていません。",
    currentSavings < yearEndTarget * 0.35 ? "積立ペースはこれから育てる余地があります。" : "積立は目標へ向けて進んでいます。",
    investmentTotal ? "投資記録があります。" : "投資枠は未記録です。必要なら家計管理アプリで管理できます。",
  ];
  const nextActions = [
    gap > 0 && monthlyTarget ? `\u4ECA\u6708\u3042\u3068${yen(Math.min(gap, monthlyTarget))}\u3092\u7A4D\u307F\u7ACB\u3066\u308B` : "",
    futureExpenses.length ? "\u30A4\u30D9\u30F3\u30C8\u4E88\u7B97\u3092\u5BB6\u8A08\u7BA1\u7406\u30A2\u30D7\u30EA\u3067\u78BA\u8A8D\u3059\u308B" : "",
    requiredMonthlyForWants ? `やりたいこと用に月${yen(Math.ceil(requiredMonthlyForWants))}を確保する` : "",
    averageExpense ? "\u4F7F\u3063\u3066\u3044\u306A\u3044\u30B5\u30D6\u30B9\u30AF\u30921\u3064\u78BA\u8A8D\u3059\u308B" : "\u5BB6\u8A08\u7BA1\u7406\u30A2\u30D7\u30EA\u3067\u53CE\u5165\u30FB\u652F\u51FA\u3092\u8A18\u9332\u3059\u308B",
  ].filter(Boolean).slice(0, 3);
  const suggestions = [
    topExpense ? `${topExpense[0]}は今年${yen(topExpense[1])}です。来月はこのカテゴリだけ先に予算を決めると整いやすいです。` : "家計管理アプリに支出が増えるほど、提案の精度が上がります。",
    requiredMonthlyForWants ? `やりたいことを全部叶えるには、月${yen(Math.ceil(requiredMonthlyForWants))}の専用積立が目安です。` : "やりたいことを追加すると、必要な月額積立を自動で出します。",
    reserveAdvice,
    wants.length > 1 ? `優先度が高い順に「${wants.slice().sort((a, b) => a.priority - b.priority)[0].title}」から確保すると安心です。` : "まずは今年叶えたいことを1つ登録してみてください。",
  ].slice(0, 4);
  const topLifeInvestment = lifeInvestments[0] ?? lifeInvestmentTags[0];
  const happiestInvestment = lifeInvestments.slice().sort((a, b) => b.happiness - a.happiness)[0] ?? topLifeInvestment;
  const recentReflectionTargets = paidExpense
    .filter((item) => !reflections[item.id])
    .sort((a, b) => String(b.paid_on || b.created_at || "").localeCompare(String(a.paid_on || a.created_at || "")))
    .slice(0, 3);
  const yearReview = {
    topFlower: topLifeInvestment,
    happiest: happiestInvestment,
    growth: lifeInvestments.find((tag) => ["learning", "health", "expression"].includes(tag.id)) ?? topLifeInvestment,
    bestSpending: paidExpense.slice().sort((a, b) => moneyReflectionWeight(reflections[b.id]?.feeling) - moneyReflectionWeight(reflections[a.id]?.feeling))[0] ?? null,
    values: lifeInvestments.filter((tag) => tag.amount > 0).slice(0, 3).map((tag) => tag.label).join(" / ") || "Future",
  };

  return {
    settings,
    currentSavings,
    averageIncome,
    averageExpense,
    averageFixedExpense,
    averageVariableExpense,
    eventExpense,
    forecast,
    yearEndTarget,
    gap,
    progress,
    status,
    outlook,
    reason,
    moneyGoals,
    wants,
    wantsTotal,
    wantsNeed,
    requiredMonthlyForWants,
    forecastBeforeWants,
    investmentTotal,
    repaymentBalance,
    monthEndBalance,
    reserveFund,
    reserveTarget,
    reserveAdvice,
    specialFunds,
    lifeInvestments,
    topLifeInvestment,
    happiestInvestment,
    recentReflectionTargets,
    yearReview,
    roadmap,
    score,
    scoreParts,
    scoreReasons,
    suggestions,
    nextActions,
    scenarios: [
      ["\u4ECA\u306E\u307E\u307E", forecast, gap > 0 ? Math.ceil(gap / remainingMonths) : 0],
      ["\u5C11\u3057\u6574\u3048\u305F\u5834\u5408", forecast + monthlyTarget * remainingMonths, gap > 0 ? Math.max(0, Math.ceil((gap - monthlyTarget * remainingMonths) / remainingMonths)) : 0],
      ["\u76EE\u6A19\u30DA\u30FC\u30B9", yearEndTarget || forecast, gap > 0 ? Math.ceil(gap / remainingMonths) : 0],
    ],
  };
}
function updateMoneyGoalProgress() {
  const category = moneyCategory();
  if (!category) return;
  const overview = calculateMoneyOverview();
  category.progress = overview.progress;
  category.status = !overview.yearEndTarget ? "seed" : overview.progress >= 100 ? "bloomed" : overview.progress >= 75 ? "growing" : overview.progress >= 25 ? "growing" : overview.currentSavings > 0 ? "planned" : "seed";
  category.mapStage = category.status;
}

async function loadMoneyOverview() {
  if (!currentUser || moneyOverviewState.loading || moneyOverviewState.loaded) return;
  moneyOverviewState.loading = true;
  moneyOverviewState.error = "";
  try {
    moneyOverviewState.data = await getMoneyOverviewData({ userId: currentUser.id });
    moneyOverviewState.loaded = true;
    updateMoneyGoalProgress();
    saveGoalState();
  } catch (error) {
    moneyOverviewState.error = error.message;
  } finally {
    moneyOverviewState.loading = false;
  }
}

const moneySetupQuestions = [
  {
    key: "money_theme",
    eyebrow: "Money Theme",
    question: "今年、お金の面で叶えたいことは？",
    placeholder: "例：韓国ワーホリ準備を安心して進める",
  },
  {
    key: "year_end_target",
    eyebrow: "Year End Target",
    question: "年末にいくら残っていたら安心できる？",
    placeholder: "例：150万円",
  },
  {
    key: "priority_goal",
    eyebrow: "Priority",
    question: "どの目標を一番優先したい？",
    placeholder: "例：韓国ワーホリ準備",
  },
  {
    key: "monthly_target_amount",
    eyebrow: "Monthly Step",
    question: "月いくらなら無理なく動かせそう？",
    placeholder: "例：3万円",
  },
];

function renderMoneyFolder() {
  const shell = document.createElement("section");
  shell.className = "money-garden";

  if (currentUser && !moneyOverviewState.loaded && !moneyOverviewState.loading) {
    loadMoneyOverview().then(() => {
      if (!folderWindow.hidden && folderTitle.textContent === "Money") renderFolder("money");
    });
  }

  if (moneyOverviewState.loading) {
    shell.innerHTML = `<p class="money-status">Money Gardenを読み込んでいます...</p>`;
    return shell;
  }

  if (moneyOverviewState.error) {
    shell.innerHTML = `
      <section class="money-empty">
        <span>Money Garden</span>
        <h3>家計データを読み込めませんでした</h3>
        <p>${safeGoalText(moneyOverviewState.error)}</p>
      </section>
    `;
    return shell;
  }

  if (moneyOverviewState.setup || !isMoneyConfigured()) {
    shell.append(renderMoneySetup());
    return shell;
  }

  shell.append(renderMoneyOverview());
  return shell;
}

function renderMoneySetup() {
  moneyOverviewState.setup ??= { step: 0, answers: {} };
  const setup = moneyOverviewState.setup;
  const step = moneySetupQuestions[setup.step];
  const card = document.createElement("section");
  card.className = "money-setup";
  card.innerHTML = `
    <div class="money-setup-top">
      <button type="button" data-money-action="cancel-setup">← Money Gardenへ</button>
      <strong>${setup.step + 1} / ${moneySetupQuestions.length}</strong>
    </div>
    <div class="money-setup-progress">
      ${moneySetupQuestions.map((_, index) => `<i class="${index <= setup.step ? "is-filled" : ""}"></i>`).join("")}
    </div>
    <article class="money-rabbit-card">
      <img src="${RABBIT_HOME_ICONS[0]}" alt="Bloom Rabbit" />
      <div>
        <span>Bloom Rabbit</span>
        <p>Money Gardenを少しだけ整えよう。</p>
      </div>
    </article>
    <label class="money-question">
      <span>${step.eyebrow}</span>
      <strong>${step.question}</strong>
      <textarea data-money-setup-input rows="4" placeholder="${step.placeholder}"></textarea>
    </label>
    <p class="money-setup-error" aria-live="polite"></p>
    <div class="money-setup-actions">
      <button type="button" data-money-action="previous-setup" ${setup.step === 0 ? "disabled" : ""}>戻る</button>
      <button type="button" class="is-primary" data-money-action="next-setup">${setup.step === moneySetupQuestions.length - 1 ? "保存" : "次へ"}</button>
    </div>
  `;
  card.querySelector("[data-money-setup-input]").value = setup.answers[step.key] ?? "";
  return card;
}

function renderMoneyOverview() {
  const overview = calculateMoneyOverview();
  const view = document.createElement("section");
  view.className = "money-overview money-strategy";
  const gapLabel = overview.yearEndTarget ? (overview.gap <= 0 ? "目標まで達成圏内" : `あと${yen(overview.gap)}`) : "目標を設定中";
  view.innerHTML = `
    <section class="money-hero money-strategy-hero">
      <span>Money Garden</span>
      <div>
        <h3>${safeGoalText(overview.settings.money_theme, "今年、どんな未来を育てる？")}</h3>
        <strong>${moneyStatusIcon(overview.status)} ${overview.outlook}</strong>
      </div>
      <p>${safeGoalText(overview.reason)}</p>
    </section>
    <section class="money-stat-grid">
      <article>
        <span>年末残高予測</span>
        <strong>${yen(overview.forecast)}</strong>
      </article>
      <article>
        <span>特別費残高</span>
        <strong>${yen(overview.currentSavings)}</strong>
      </article>
      <article>
        <span>投資累計</span>
        <strong>${yen(overview.investmentTotal)}</strong>
      </article>
      <article>
        <span>返済残高</span>
        <strong>${yen(overview.repaymentBalance)}</strong>
      </article>
      <article>
        <span>月末残高</span>
        <strong>${yen(overview.monthEndBalance)}</strong>
      </article>
    </section>
    <section class="money-card money-reserve">
      <div class="money-card-head">
        <span>予備費</span>
        <small>余ったお金が自動で育つ場所</small>
      </div>
      <div class="money-reserve-grid">
        <article><span>目標残高</span><strong>${yen(overview.reserveTarget)}</strong></article>
        <article><span>今月の余白</span><strong>${yen(overview.reserveFund)}</strong></article>
      </div>
      <p>${safeGoalText(overview.reserveAdvice)}</p>
    </section>
    <section class="money-card">
      <div class="money-card-head">
        <span>やりたいこと</span>
        <small>追加すると未来予測へ反映</small>
      </div>
      <div class="money-want-list"></div>
      <form class="money-want-form" data-money-want-form>
        <input name="title" placeholder="例：韓国旅行" autocomplete="off" />
        <input name="amount" placeholder="金額 例：120000" inputmode="numeric" />
        <input name="deadline" placeholder="期限 例：10月" />
        <select name="priority" aria-label="優先度">
          <option value="1">Priority 1</option>
          <option value="2">Priority 2</option>
          <option value="3" selected>Priority 3</option>
        </select>
        <button type="button" data-money-action="add-want">追加</button>
      </form>
    </section>
    <section class="money-card money-simulation">
      <div class="money-card-head">
        <span>Simulation</span>
        <small>やりたいこと込み</small>
      </div>
      <div class="money-sim-grid">
        <article><span>毎月必要積立</span><strong>${yen(Math.ceil(overview.requiredMonthlyForWants))}</strong></article>
        <article><span>年末残高</span><strong>${yen(overview.forecast)}</strong><small>追加前 ${yen(overview.forecastBeforeWants)}</small></article>
        <article><span>達成率</span><strong>${overview.wantsTotal ? Math.min(100, Math.round(((overview.currentSavings + overview.forecastBeforeWants) / Math.max(1, overview.wantsTotal + overview.yearEndTarget)) * 100)) : overview.progress}%</strong></article>
      </div>
    </section>
    <section class="money-card">
      <div class="money-card-head">
        <span>年間ロードマップ</span>
        <small>出費が集中する月を色で表示</small>
      </div>
      <div class="money-roadmap"></div>
    </section>
    <section class="money-card">
      <div class="money-card-head">
        <span>AI改善提案</span>
        <small>実績から自動分析</small>
      </div>
      <ul class="money-suggestion-list"></ul>
    </section>
    <section class="money-card money-investment-card">
      <div class="money-card-head">
        <span>Life Investment</span>
        <small>今年どんな人生へ投資したか</small>
      </div>
      <div class="money-investment-layout">
        <div class="money-investment-chart" aria-label="Life Investment chart"></div>
        <div class="money-investment-list"></div>
      </div>
    </section>
    <section class="money-card money-bloom-garden">
      <div class="money-card-head">
        <span>Bloom Garden</span>
        <small>人生に咲いた花</small>
      </div>
      <div class="money-flower-bed"></div>
      <div class="money-feeling-log"></div>
    </section>
    <section class="money-card">
      <div class="money-card-head">
        <span>特別費</span>
        <small>家計管理アプリの積立</small>
      </div>
      <div class="money-fund-list"></div>
    </section>
    <section class="money-card money-score">
      <div class="money-card-head">
        <span>家計スコア</span>
        <small>100点満点</small>
      </div>
      <strong>${overview.score}</strong>
      <div class="money-score-bar"><b style="width:${overview.score}%"></b></div>
      <ul class="money-score-reasons"></ul>
    </section>
    <section class="money-card money-year-review">
      <div class="money-card-head">
        <span>Bloom Year Review</span>
        <small>今年のお金で育てた人生</small>
      </div>
      <div class="money-review-grid">
        <article><span>一番咲いた花</span><strong>${safeGoalText(overview.yearReview.topFlower.flower)}</strong><small>${safeGoalText(overview.yearReview.topFlower.label)}</small></article>
        <article><span>幸せだった投資</span><strong>${safeGoalText(overview.yearReview.happiest.label)}</strong><small>${overview.yearReview.happiest.happiness}%</small></article>
        <article><span>成長した分野</span><strong>${safeGoalText(overview.yearReview.growth.label)}</strong><small>${safeGoalText(overview.yearReview.growth.flower)}</small></article>
        <article><span>今年の価値観</span><strong>${safeGoalText(overview.yearReview.values)}</strong></article>
      </div>
    </section>
    <section class="money-card">
      <div class="money-card-head">
        <span>Next Actions</span>
        <small>今月の小さな一歩</small>
      </div>
      <ul class="money-action-list"></ul>
    </section>
    <div class="money-button-row">
      <button type="button" data-money-action="toggle-future">${moneyOverviewState.showFuture ? "未来を閉じる" : "未来を見る"}</button>
      <button type="button" data-money-action="open-finance-app">家計管理アプリを開く</button>
      <button type="button" data-money-action="edit-setup">設定を編集</button>
    </div>
  `;

  const wantList = view.querySelector(".money-want-list");
  if (overview.wants.length) {
    overview.wants.forEach((want) => {
      const percent = want.amount ? Math.min(100, Math.round((Number(want.saved || 0) / Number(want.amount || 1)) * 100)) : 0;
      const item = document.createElement("article");
      item.className = "money-goal-item money-want-item";
      item.innerHTML = `
        <div><strong>${safeGoalText(want.title)}</strong><span>${yen(want.amount)} / ${want.deadline || "期限未定"} / P${want.priority}</span></div>
        <i><b style="width:${percent}%"></b></i>
        <button type="button" data-money-action="delete-want" data-want-id="${safeGoalText(want.id)}">×</button>
      `;
      wantList.append(item);
    });
  } else {
    wantList.innerHTML = `<p class="money-muted">韓国旅行、バッグ、ダンス衣装など「今年叶えたいこと」を追加すると、必要積立を自動で出します。</p>`;
  }

  const roadmap = view.querySelector(".money-roadmap");
  overview.roadmap.forEach((month) => {
    const item = document.createElement("article");
    item.className = `money-roadmap-month is-${month.level}`;
    item.innerHTML = `
      <strong>${month.label}</strong>
      <span>${yen(month.total)}</span>
      <ul>${month.events.length ? month.events.map((event) => `<li>${safeGoalText(event.area)}：${safeGoalText(event.title)}</li>`).join("") : "<li>予定支出なし</li>"}</ul>
    `;
    roadmap.append(item);
  });

  const suggestionList = view.querySelector(".money-suggestion-list");
  overview.suggestions.forEach((suggestion) => {
    const item = document.createElement("li");
    item.textContent = suggestion;
    suggestionList.append(item);
  });

  const chart = view.querySelector(".money-investment-chart");
  const chartStops = overview.lifeInvestments.filter((tag) => tag.amount > 0).slice(0, 8);
  let cursor = 0;
  chart.style.background = chartStops.length
    ? `conic-gradient(${chartStops.map((tag) => {
      const start = cursor;
      cursor += Math.max(3, tag.percent);
      return `${tag.tone} ${start}% ${Math.min(100, cursor)}%`;
    }).join(", ")})`
    : "conic-gradient(#e9e0fb 0 45%, #d9f2e8 45% 70%, #ffd8e8 70% 100%)";
  const investmentList = view.querySelector(".money-investment-list");
  overview.lifeInvestments.slice(0, 8).forEach((tag) => {
    const item = document.createElement("article");
    item.className = "money-investment-tag";
    item.innerHTML = `
      <i style="background:${tag.tone}"></i>
      <div><strong>${safeGoalText(tag.label)}</strong><span>${safeGoalText(tag.flower)} / ${yen(tag.amount)} / 幸福度 ${tag.happiness}%</span></div>
    `;
    investmentList.append(item);
  });

  const flowerBed = view.querySelector(".money-flower-bed");
  overview.lifeInvestments.filter((tag) => tag.amount > 0 || tag.count > 0).slice(0, 8).forEach((tag) => {
    const flowers = Math.max(1, Math.min(5, Math.ceil((tag.happiness || tag.percent) / 22)));
    const item = document.createElement("article");
    item.className = "money-flower-patch";
    item.style.setProperty("--flower-color", tag.tone);
    item.innerHTML = `
      <div>${Array.from({ length: flowers }, () => "<i></i>").join("")}</div>
      <strong>${safeGoalText(tag.label)}</strong>
      <span>${safeGoalText(tag.flower)}</span>
    `;
    flowerBed.append(item);
  });

  const feelingLog = view.querySelector(".money-feeling-log");
  if (overview.recentReflectionTargets.length) {
    overview.recentReflectionTargets.forEach((item) => {
      const tag = lifeTagForMoney(item);
      const row = document.createElement("article");
      row.className = "money-feeling-row";
      row.innerHTML = `
        <div>
          <span>${safeGoalText(tag.label)}</span>
          <strong>${safeGoalText(item.title || item.category || "Spending")}</strong>
          <small>${yen(item.amount)} / このお金の使い方、どう感じた？</small>
        </div>
        <div class="money-feeling-buttons">
          <button type="button" data-money-action="feel-spending" data-spending-id="${safeGoalText(item.id)}" data-feeling="bud">つぼみ</button>
          <button type="button" data-money-action="feel-spending" data-spending-id="${safeGoalText(item.id)}" data-feeling="grow">すくすく</button>
          <button type="button" data-money-action="feel-spending" data-spending-id="${safeGoalText(item.id)}" data-feeling="bloom">満開</button>
        </div>
      `;
      feelingLog.append(row);
    });
  } else {
    feelingLog.innerHTML = `<p class="money-muted">最近の支出には気持ちログがついています。Bloom Gardenに花が増えていきます。</p>`;
  }

  const fundList = view.querySelector(".money-fund-list");
  if (overview.specialFunds.length) {
    overview.specialFunds.forEach((fund) => {
      const item = document.createElement("article");
      item.className = "money-fund-item";
      item.innerHTML = `
        <div><strong>${safeGoalText(fund.title)}</strong><span>${fund.percent}%</span></div>
        <p>${yen(fund.current)} / ${fund.target ? yen(fund.target) : "目標未設定"} / 年末予測 ${yen(fund.forecast)}</p>
        <i><b style="width:${fund.percent}%"></b></i>
      `;
      fundList.append(item);
    });
  } else {
    fundList.innerHTML = `<p class="money-muted">家計管理アプリのごほうび貯金がここに表示されます。</p>`;
  }

  const scoreReasons = view.querySelector(".money-score-reasons");
  overview.scoreReasons.forEach((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    scoreReasons.append(item);
  });

  const actionList = view.querySelector(".money-action-list");
  overview.nextActions.forEach((action) => {
    const item = document.createElement("li");
    item.textContent = action;
    actionList.append(item);
  });

  if (moneyOverviewState.showFuture) {
    const future = document.createElement("section");
    future.className = "money-future";
    future.innerHTML = `<span>Future View</span><div></div>`;
    const grid = future.querySelector("div");
    overview.scenarios.forEach(([label, amount, monthlyAdjust]) => {
      const item = document.createElement("article");
      item.innerHTML = `<strong>${label}</strong><p>${yen(amount)}</p><small>月額調整 ${yen(monthlyAdjust)}</small>`;
      grid.append(item);
    });
    view.append(future);
  }

  return view;
}

function handleMoneyAction(button) {
  const action = button.dataset.moneyAction;

  if (action === "toggle-future") {
    moneyOverviewState.showFuture = !moneyOverviewState.showFuture;
    renderFolder("money");
    return;
  }

  if (action === "open-finance-app") {
    window.open("https://summary-xi.vercel.app/", "_blank", "noopener");
    return;
  }

  if (action === "edit-setup") {
    const settings = moneySettings();
    moneyOverviewState.setup = {
      step: 0,
      answers: {
        money_theme: settings.money_theme ?? "",
        year_end_target: settings.year_end_target ? yen(settings.year_end_target) : "",
        priority_goal: settings.goals?.[0]?.title ?? "",
        monthly_target_amount: settings.monthly_target_amount ? yen(settings.monthly_target_amount) : "",
      },
    };
    renderFolder("money");
    return;
  }

  if (action === "add-want") {
    const form = button.closest("[data-money-want-form]");
    const title = form?.elements.title?.value.trim() ?? "";
    const amount = parseMoneyAmount(form?.elements.amount?.value ?? "");
    const deadline = parseMoneyDate(form?.elements.deadline?.value ?? "");
    const priority = Number(form?.elements.priority?.value || 3);
    if (!title || !amount) {
      addMessage("assistant", "やりたいことは、名前と金額だけ入れれば追加できます。");
      return;
    }
    const settings = moneySettings();
    settings.wants ??= [];
    settings.wants.push({
      id: `want-${Date.now()}`,
      title,
      amount,
      deadline,
      priority,
      saved: 0,
    });
    updateMoneyGoalProgress();
    saveGoalState();
    renderFolder("money");
    return;
  }

  if (action === "delete-want") {
    const settings = moneySettings();
    settings.wants = getMoneyWants(settings).filter((want) => want.id !== button.dataset.wantId);
    updateMoneyGoalProgress();
    saveGoalState();
    renderFolder("money");
    return;
  }

  if (action === "feel-spending") {
    const settings = moneySettings();
    settings.reflections ??= {};
    settings.reflections[button.dataset.spendingId] = {
      feeling: button.dataset.feeling,
      recorded_at: new Date().toISOString(),
    };
    saveGoalState();
    renderFolder("money");
    addMessage("assistant", `気持ちログ「${moneyReflectionLabel(button.dataset.feeling)}」をBloom Gardenに保存したよ。`);
    return;
  }

  if (action === "cancel-setup") {
    moneyOverviewState.setup = isMoneyConfigured() ? null : { step: 0, answers: {} };
    renderFolder("money");
    return;
  }

  if (action === "previous-setup") {
    const input = button.closest(".money-setup")?.querySelector("[data-money-setup-input]");
    const step = moneySetupQuestions[moneyOverviewState.setup.step];
    if (input && step) moneyOverviewState.setup.answers[step.key] = input.value.trim();
    moneyOverviewState.setup.step = Math.max(0, moneyOverviewState.setup.step - 1);
    renderFolder("money");
    return;
  }

  if (action === "next-setup") {
    const card = button.closest(".money-setup");
    const input = card?.querySelector("[data-money-setup-input]");
    const step = moneySetupQuestions[moneyOverviewState.setup.step];
    const value = input?.value.trim() ?? "";
    if (!value) {
      const error = card?.querySelector(".money-setup-error");
      if (error) error.textContent = "ひとことだけ書いてみよう。";
      input?.focus();
      return;
    }

    moneyOverviewState.setup.answers[step.key] = value;
    if (moneyOverviewState.setup.step < moneySetupQuestions.length - 1) {
      moneyOverviewState.setup.step += 1;
      renderFolder("money");
      return;
    }

    const state = loadGoalState();
    const category = state.categories.find((item) => item.id === "money");
    const answers = moneyOverviewState.setup.answers;
    const target = parseMoneyAmount(answers.year_end_target);
    const monthly = parseMoneyAmount(answers.monthly_target_amount);
    const overview = calculateMoneyOverview();
    const existingMoney = category.money ?? {};
    category.money = {
      ...existingMoney,
      money_theme: answers.money_theme,
      year_end_target: target,
      monthly_target_amount: monthly,
      goals: [{
        title: answers.priority_goal,
        target_amount: target,
        current_amount: overview.currentSavings,
        priority: 1,
      }],
      next_action: monthly ? `今月${yen(monthly)}を積み立てる` : "家計管理アプリで積立額を確認する",
    };
    category.woop.wish = answers.money_theme;
    category.woop.plans = [category.money.next_action];
    category.nextAction = category.money.next_action;
    category.reward = answers.priority_goal;
    updateMoneyGoalProgress();
    saveGoalState();
    moneyOverviewState.setup = null;
    renderFolder("money");
    addMessage("assistant", "Money Gardenの見通しを保存したよ。");
  }
}

function renderFolder(key) {
  const data = folderData[key];
  folderTitle.textContent = data.title;
  folderContent.innerHTML = "";

  if (data.custom === "goals") {
    folderContent.append(renderGoalsFolder());
  } else if (data.custom === "money") {
    folderContent.append(renderMoneyFolder());
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
    ["繝繝ｳ繧ｹ繧堤ｶ壹￠繧・43%", "譌・・險育判 25%", "蠢・慍繧医＞驛ｨ螻・58%", "縺斐⊇縺・・譌・｡・65%"].forEach((item) => {
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
  return renderGoalsFolderV3();
}
function renderLifeMapBoard(state, { mode = "home" } = {}) {
  const active = activeGoalCategory();
  const mapStage = getLifeMapStage(state);
  const mapBackground = getLifeMapBackground(state);
  const transition = state.mapTransition;
  const isMapGrowing = transition?.to === mapStage && Number(transition?.until) > Date.now();
  const previousBackground = isMapGrowing ? lifeMapAssets.backgrounds[transition.from] : "";
  const section = document.createElement("section");
  section.className = `life-map life-map-${mode} ${isMapGrowing ? "is-map-growing" : ""}`;
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
      ${previousBackground ? `<img class="life-map-background life-map-background-previous" src="${previousBackground}" alt="" />` : ""}
      <img class="life-map-background ${isMapGrowing ? "life-map-background-next" : ""}" src="${mapBackground}" alt="" />
      ${isMapGrowing ? `<img class="life-map-stage-cloud" src="${lifeMapAssets.clouds.dense}" alt="" />` : ""}
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
        <strong>${category.label}</strong>
      </span>
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

const goalWizardSteps = [
  { key: "wish", eyebrow: "Step 1 / Wish", rabbit: "まずは願いを書こう。", question: "今年、一番叶えたいことは？", placeholder: "例：韓国に近づく働き方を作る" },
  { key: "outcome", eyebrow: "Step 2 / Outcome", rabbit: "叶ったあとの景色を見てみよう。", question: "叶ったら、どんな毎日になっている？", placeholder: "例：安心しながら、新しい挑戦を楽しんでいる" },
  { key: "obstacle", eyebrow: "Step 3 / Obstacle", rabbit: "先につまずきを知っておけば大丈夫。", question: "途中で止まりそうなのは、どんな時？", placeholder: "例：情報が多すぎて、選べなくなる時" },
  { key: "plans", eyebrow: "Step 4 / Plan", rabbit: "最後に、小さな一歩を置こう。", question: "今日か今週、何から始める？", placeholder: "例：求人条件を1件調べる" },
];

function safeGoalText(value, fallback = "") {
  const text = String(value ?? "").trim() || fallback;
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

function getGoalLevel(category) {
  return Math.max(1, Math.min(5, 1 + Math.floor(calculateGoalProgress(category) / 25)));
}

function renderGoalAreaCard(category, active) {
  const progress = calculateGoalProgress(category);
  const unlocked = !["hidden", "locked"].includes(category.status ?? "hidden");
  const button = document.createElement("button");
  button.className = `goal-world-card life-category-${category.tone} ${category.id === active?.id ? "is-active" : ""}`;
  button.type = "button";
  button.dataset.goalAction = unlocked ? "select-category" : "unlock-category";
  button.dataset.categoryId = category.id;
  button.innerHTML = `
    <span class="goal-world-icon">${category.icon}</span>
    <span class="goal-world-copy">
      <strong>${category.label}</strong>
      <small>Lv.${getGoalLevel(category)} ﾂｷ 螳梧・邇・${progress}%</small>
      <span class="goal-world-next">${safeGoalText(category.nextAction, "譛蛻昴・荳豁ｩ繧呈ｱｺ繧√ｋ")}</span>
    </span>
    <span class="goal-world-enter">笆ｶ 蜈･繧・/span>
  `;
  return button;
}

function renderGoalsFolderV2() {
  return renderGoalsFolderV3();
}
function renderGoalsFolderV3() {
  const state = loadGoalState();
  const active = activeGoalCategory();
  const shell = document.createElement("section");
  shell.className = "goals-workspace goals-game";
  shell.innerHTML = `
    <section class="goal-game-theme">
      <span>2026 Theme</span>
      <strong>${safeGoalText(state.yearTheme)}</strong>
    </section>
    <section class="goal-game-map-slot"></section>
    <section class="goal-game-areas">
      <div class="goal-section-title">
        <span>Areas</span>
        <h3>閧ｲ縺ｦ繧九お繝ｪ繧｢</h3>
      </div>
    </section>
    <section class="goal-game-current"></section>
  `;

  shell.querySelector(".goal-game-map-slot").append(renderLifeMapBoard(state, { mode: "goals" }));
  shell.querySelector(".goal-game-areas").append(renderGoalAreaStrip(state, active));

  const current = shell.querySelector(".goal-game-current");
  if (!active) {
    current.innerHTML = `
      <article class="goal-current-empty">
        <span>Choose an area</span>
        <h3>縺ｾ縺壹・閧ｲ縺ｦ縺溘＞繧ｨ繝ｪ繧｢繧・縺､驕ｸ縺ｼ縺・/h3>
        <p>蜈ｨ驛ｨ繧剃ｸ蠎ｦ縺ｫ豎ｺ繧√↑縺上※螟ｧ荳亥､ｫ縲ゅ・繝・・繧堤惻繧√※縲∽ｻ翫＞縺｡縺ｰ繧捺ｰ励↓縺ｪ繧句ｴ謇縺九ｉ蟋九ａ縺ｾ縺吶・/p>
      </article>
    `;
    return shell;
  }

  if (goalMandalaCategoryId === active.id) {
    current.append(renderGoalMandalaScreen(active));
    return shell;
  }

  if (goalWizardState?.categoryId === active.id) {
    current.append(renderGoalRabbitConversation(active));
    return shell;
  }

  const detail = document.createElement("div");
  detail.className = "goal-detail-grid goal-game-detail";
  detail.dataset.categoryId = active.id;
  detail.append(renderGoalVillageOverview(active));
  if (goalWoopEditCategoryId === active.id) detail.append(renderGoalHiddenEditor(active));
  detail.insertAdjacentHTML("beforeend", `
    <button class="goal-mandala-teaser" type="button" data-goal-action="open-mandala" data-category-id="${active.id}">
      <span>笨ｨ 繧ゅ▲縺ｨ繧｢繧､繝・い繧貞ｺ・￡縺溘＞・・/span>
      <strong>繝槭Φ繝繝ｩ繝√Ε繝ｼ繝医ｒ髢九￥ 竊・/strong>
    </button>
  `);
  current.append(detail);
  return shell;
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
    addMessage("assistant", `Calendar繧呈峩譁ｰ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

function renderVisionFolder() {
  const shell = document.createElement("section");
  shell.className = "vision-workspace";

  if (!visionState.loaded && currentUser) {
    shell.innerHTML = `<p class="vision-status">Vision繧定ｪｭ縺ｿ霎ｼ繧薙〒縺・∪縺・..</p>`;
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
    addMessage("assistant", `Vision縺ｫ霑ｽ蜉縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
  }
}

async function handleVisionAction(button) {
  const action = button.dataset.visionAction;
  const workspace = button.closest(".vision-workspace");
  if (!workspace || !currentUser) return;

  if (action === "add-text") {
    await addVisionItem("text", "蟆上＆縺ｪ螟｢繝｡繝｢");
  }

  if (action === "add-sticky") {
    await addVisionItem("sticky", "莉倡ｮ九Γ繝｢");
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
      addMessage("assistant", `Vision繧ｷ繝ｼ繝医ｒ菴懈・縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
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
      addMessage("assistant", `Vision閭梧勹繧剃ｿ晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
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
      addMessage("assistant", `莉倡ｮ九・濶ｲ繧剃ｿ晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
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

  item.content = contentElement.textContent.trim() || (item.type === "sticky" ? "莉倡ｮ九Γ繝｢" : "蟆上＆縺ｪ螟｢繝｡繝｢");
  try {
    await updateVisionItem({ userId: currentUser.id, item });
  } catch (error) {
    addMessage("assistant", `Vision繝｡繝｢繧剃ｿ晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
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
    addMessage("assistant", `Vision縺ｮ菴咲ｽｮ繧剃ｿ晏ｭ倥〒縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
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
    goalWizardState = null;
    goalMandalaCategoryId = "";
    goalWoopEditCategoryId = "";
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
    addMessage("assistant", "新しいエリアが見えてきたよ。");
    return;
  }

  if (action === "preview-category") {
    const category = state.categories.find((item) => item.id === button.dataset.categoryId);
    if (!category) return;
    goalWizardState = null;
    goalMandalaCategoryId = "";
    goalWoopEditCategoryId = "";
    state.activeCategoryId = category.id;
    saveGoalState({ sync: false });
    renderFolder("goals");
    return;
  }

  if (action === "select-category") {
    const category = state.categories.find((item) => item.id === button.dataset.categoryId);
    if (!category || ["hidden", "locked"].includes(category.status)) return;
    goalWizardState = null;
    goalMandalaCategoryId = "";
    goalWoopEditCategoryId = "";
    state.activeCategoryId = category.id;
    saveGoalState();
    renderFolder("goals");
    return;
  }

  if (action === "start-goal-wizard") {
    const category = state.categories.find((item) => item.id === button.dataset.categoryId);
    if (!category) return;
    goalMandalaCategoryId = "";
    goalWoopEditCategoryId = "";
    if (["hidden", "locked"].includes(category.status ?? "hidden")) {
      category.status = "seed";
      category.mapStage = "seed";
      category.isUnlocked = true;
      state.lastUnlockedCategoryId = category.id;
    }
    state.activeCategoryId = category.id;
    goalWizardState = {
      categoryId: category.id,
      step: Math.max(0, Math.min(goalWizardSteps.length - 1, Number(button.dataset.step) || 0)),
      drafts: {
        wish: category.woop.wish,
        outcome: category.woop.outcome,
        obstacle: category.woop.obstacle,
        plans: [...category.woop.plans],
      },
    };
    saveGoalState();
    renderFolder("goals");
    return;
  }

  if (action === "cancel-goal-wizard") {
    goalWizardState = null;
    renderFolder("goals");
    return;
  }

  if (action === "edit-woop") {
    goalWizardState = null;
    goalMandalaCategoryId = "";
    goalWoopEditCategoryId = button.dataset.categoryId;
    renderFolder("goals");
    return;
  }

  if (action === "close-woop") {
    goalWoopEditCategoryId = "";
    renderFolder("goals");
    return;
  }

  if (action === "previous-goal-wizard") {
    if (!goalWizardState) return;
    const step = goalWizardSteps[goalWizardState.step];
    const input = button.closest(".goal-wizard")?.querySelector("[data-goal-wizard-input]");
    if (input && step) {
      goalWizardState.drafts[step.key] = step.key === "plans" ? splitGoalLines(input.value) : input.value.trim();
    }
    goalWizardState.step = Math.max(0, goalWizardState.step - 1);
    renderFolder("goals");
    return;
  }

  if (action === "next-goal-wizard") {
    if (!goalWizardState) return;
    const category = state.categories.find((item) => item.id === goalWizardState.categoryId);
    const step = goalWizardSteps[goalWizardState.step];
    const wizard = button.closest(".goal-wizard");
    const input = wizard?.querySelector("[data-goal-wizard-input]");
    const value = input?.value.trim() ?? "";
    if (!category || !step || !value) {
      const error = wizard?.querySelector(".goal-wizard-error");
      if (error) error.textContent = "ひとことだけ、書いてみよう。";
      input?.focus();
      return;
    }

    goalWizardState.drafts[step.key] = step.key === "plans" ? splitGoalLines(value) : value;
    if (goalWizardState.step < goalWizardSteps.length - 1) {
      goalWizardState.step += 1;
      renderFolder("goals");
      return;
    }

    const previousStage = getLifeMapStage(state);
    category.woop.wish = goalWizardState.drafts.wish;
    category.woop.outcome = goalWizardState.drafts.outcome;
    category.woop.obstacle = goalWizardState.drafts.obstacle;
    category.woop.plans = goalWizardState.drafts.plans;
    category.completedPlans = category.woop.plans.map((_, index) => Boolean(category.completedPlans?.[index]));
    category.nextAction = category.woop.plans[0] ?? "最初の一歩を決める";
    category.reward ||= category.id === "career" ? "韓国ワーホリ貯金" : "";
    category.vision ||= category.id === "career" ? "理想の働き方ボード" : "Dream Sheet";
    category.progress = Math.max(Number(category.progress) || 0, 20);
    refreshGoalMapStage(category);
    const nextStage = getLifeMapStage(state);
    if (getLifeMapStageRank(nextStage) > getLifeMapStageRank(previousStage)) {
      state.mapTransition = {
        from: previousStage,
        to: nextStage,
        until: Date.now() + 1200,
      };
    }
    state.activeCategoryId = category.id;
    goalWizardState = null;
    saveGoalState();
    renderFolder("goals");
    addMessage("assistant", state.mapTransition ? "世界が少し育ったよ。" : `${getGoalVillageName(category)}が少し育ったよ。`);
    if (state.mapTransition) {
      window.setTimeout(() => {
        const latest = loadGoalState();
        latest.mapTransition = null;
        saveGoalState({ sync: false });
        if (!folderWindow.hidden && folderTitle.textContent === "Goals") renderFolder("goals");
      }, 1250);
    }
    return;
  }

  if (action === "open-mandala") {
    const category = state.categories.find((item) => item.id === button.dataset.categoryId);
    if (category) {
      ensureGoalMandalaSeeds(category);
      saveGoalState();
    }
    goalWizardState = null;
    goalWoopEditCategoryId = "";
    goalMandalaCategoryId = button.dataset.categoryId;
    renderFolder("goals");
    return;
  }

  if (action === "close-mandala") {
    goalMandalaCategoryId = "";
    renderFolder("goals");
    return;
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
    state.yearTheme = field.value.trim() || "閾ｪ逕ｱ縺ｫ縲√＠縺ｪ繧・°縺ｫ閧ｲ縺､";
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
    category.nextAction = category.woop.plans[0] ?? "譛蛻昴・荳豁ｩ繧呈ｱｺ繧√ｋ";
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
  if (key === "completedPlan") renderFolder("goals");
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("繝ｭ繧ｰ繧､繝ｳ縺励※縺・∪縺・..");

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

  const moneyButton = event.target.closest("[data-money-action]");
  if (moneyButton) {
    handleMoneyAction(moneyButton);
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
    addMessage("assistant", `Task繧呈峩譁ｰ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆: ${error.message}`);
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
