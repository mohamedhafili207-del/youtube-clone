const STORAGE_KEY = "kiditube-v1";

const defaultState = () => ({
  age: null,
  pin: "0000",
  minutesLimit: 30,
  watchedSeconds: 0,
  favorites: [],
  locked: false,
});

function loadState() {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaultState();
  }
}

let state = loadState();
let category = "all";
let currentVideo = null;
let pinBuffer = "";
let parentMode = false;
let tick = null;

const $ = (id) => document.getElementById(id);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function filteredVideos() {
  const q = $("search").value.trim();
  return VIDEOS.filter((v) => {
    const ageOk = !state.age || v.ages.includes(state.age);
    const catOk = category === "all" || v.category === category;
    const text = `${v.title} ${v.titleFr} ${v.desc}`;
    const qOk = !q || text.includes(q);
    return ageOk && catOk && qOk;
  });
}

function renderCategories() {
  $("cats").innerHTML = CATEGORIES.map(
    (c) =>
      `<button class="cat ${c.id === category ? "active" : ""}" data-cat="${c.id}">${c.emoji} ${c.label}</button>`
  ).join("");
}

function cardHtml(v) {
  return `
    <button class="card" data-play="${v.id}">
      <div class="thumb" style="background:${v.color}">
        <span>${v.emoji}</span>
        <span class="duration">${v.duration}</span>
      </div>
      <div class="card-body">
        <h3>${v.title}</h3>
        <p>${v.titleFr}</p>
      </div>
    </button>`;
}

function renderHome() {
  const list = filteredVideos();
  $("grid").innerHTML = list.length
    ? list.map(cardHtml).join("")
    : `<div class="empty">ما لقيناش فيديو بهاد البحث 🙈</div>`;
}

function renderFavs() {
  const list = VIDEOS.filter((v) => state.favorites.includes(v.id) && (!state.age || v.ages.includes(state.age)));
  $("fav-grid").innerHTML = list.length
    ? list.map(cardHtml).join("")
    : `<div class="empty">مازال ما ضفتوش فيديوهات للمفضلة ⭐</div>`;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === `screen-${name}`));
  document.querySelectorAll(".bottom button").forEach((el) => el.classList.toggle("active", el.dataset.screen === name));
  if (name !== "watch") {
    const video = $("player");
    video.pause();
  }
  if (name === "home") renderHome();
  if (name === "favs") renderFavs();
}

function playVideo(id) {
  if (state.locked) {
    openOverlay("time");
    return;
  }
  const v = VIDEOS.find((x) => x.id === id);
  if (!v) return;
  currentVideo = v;
  $("player").src = v.src;
  $("player").poster = v.poster || "";
  $("watch-title").textContent = v.title;
  $("watch-desc").textContent = v.desc;
  const favOn = state.favorites.includes(v.id);
  $("fav-btn").classList.toggle("on", favOn);
  $("fav-btn").textContent = favOn ? "❤️ في المفضلة" : "♡ أضف للمفضلة";
  showScreen("watch");
  $("player").play().catch(() => {});
}

function toggleFav() {
  if (!currentVideo) return;
  const i = state.favorites.indexOf(currentVideo.id);
  if (i >= 0) state.favorites.splice(i, 1);
  else state.favorites.push(currentVideo.id);
  save();
  playVideo(currentVideo.id);
}

function openOverlay(which) {
  ["age", "parent", "pin", "time"].forEach((k) => {
    $(`modal-${k}`).style.display = k === which ? "block" : "none";
  });
  $("overlay").classList.add("show");
  if (which === "pin") {
    pinBuffer = "";
    $("pin-dots").textContent = "";
    $("pin-msg").textContent = "أدخل رقم الوالدين";
  }
}

function closeOverlay() {
  $("overlay").classList.remove("show");
}

function setAge(age) {
  state.age = age;
  save();
  closeOverlay();
  renderHome();
}

function startTimer() {
  clearInterval(tick);
  tick = setInterval(() => {
    if ($("screen-watch").classList.contains("active") && !$("player").paused) {
      state.watchedSeconds += 1;
      if (state.minutesLimit && state.watchedSeconds >= state.minutesLimit * 60) {
        state.locked = true;
        $("player").pause();
        save();
        openOverlay("time");
      }
      save();
    }
    const left = Math.max(0, state.minutesLimit * 60 - state.watchedSeconds);
    const m = Math.floor(left / 60);
    const s = String(left % 60).padStart(2, "0");
    $("timer").textContent = state.locked ? "توقف" : `${m}:${s}`;
  }, 1000);
}

function handlePin(n) {
  if (n === "c") {
    pinBuffer = "";
  } else if (n === "ok") {
    if (pinBuffer === state.pin) {
      parentMode = true;
      state.locked = false;
      save();
      $("minutes").value = state.minutesLimit;
      $("newpin").value = state.pin;
      openOverlay("parent");
    } else {
      $("pin-msg").textContent = "الرقم غلط، عاود";
      pinBuffer = "";
    }
  } else if (pinBuffer.length < 4) {
    pinBuffer += n;
  }
  $("pin-dots").textContent = "●".repeat(pinBuffer.length);
}

function saveParent() {
  const minutes = Number($("minutes").value);
  const pin = $("newpin").value.trim();
  if (minutes >= 5 && minutes <= 180) state.minutesLimit = minutes;
  if (/^\d{4}$/.test(pin)) state.pin = pin;
  state.watchedSeconds = 0;
  state.locked = false;
  save();
  closeOverlay();
}

document.addEventListener("click", (e) => {
  const cat = e.target.closest("[data-cat]");
  if (cat) {
    category = cat.dataset.cat;
    renderCategories();
    renderHome();
  }
  const play = e.target.closest("[data-play]");
  if (play) playVideo(play.dataset.play);
  const screenBtn = e.target.closest("[data-screen]");
  if (screenBtn) showScreen(screenBtn.dataset.screen);
  const pinBtn = e.target.closest("[data-pin]");
  if (pinBtn) handlePin(pinBtn.dataset.pin);
  const ageBtn = e.target.closest("[data-age]");
  if (ageBtn) setAge(ageBtn.dataset.age);
});

$("search").addEventListener("input", renderHome);
$("fav-btn").addEventListener("click", toggleFav);
$("back-btn").addEventListener("click", () => showScreen("home"));
$("parent-tab").addEventListener("click", () => openOverlay("pin"));
$("save-parent").addEventListener("click", saveParent);
$("close-parent").addEventListener("click", closeOverlay);
$("reset-time").addEventListener("click", () => openOverlay("pin"));
$("unlock-time").addEventListener("click", () => openOverlay("pin"));

renderCategories();
renderHome();
startTimer();

if (!state.age) openOverlay("age");
else closeOverlay();
