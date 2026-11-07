import { onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ADMIN, auth, db, googleProvider } from "./firebase.js";

const gate = document.querySelector("#gate");
const list = document.querySelector("#list");
const cards = document.querySelector("#cards");
const status = document.querySelector("#status");

const fields = [
  ["Ник", "nick"],
  ["Почта в анкете", "email"],
  ["Дискорд", "discord"],
  ["Как долго играете", "playTime"],
  ["Чем нравится заниматься", "activities"],
  ["Почему Friends Village", "why"],
  ["Ожидания", "expect"],
  ["С друзьями или один", "withFriends"],
  ["Готовы соблюдать правила", "rules"],
  ["Были баны", "banned"],
  ["О себе", "about"],
  ["Ещё администрации", "extra"],
];

function when(value) {
  if (!value) return "";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function show(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return value ? String(value) : "—";
}

document.querySelector("#sign-in").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    status.textContent = "Не удалось войти через Google.";
    console.error(error);
  }
});

document.querySelector("#sign-out").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  cards.replaceChildren();
  if (!user) {
    gate.hidden = false;
    list.hidden = true;
    return;
  }
  gate.hidden = true;
  list.hidden = false;
  document.querySelector("#account-name").textContent = user.displayName || "Аккаунт Google";
  document.querySelector("#account-email").textContent = user.email || "";
  if ((user.email || "").toLowerCase() !== ADMIN) {
    status.textContent = "У этого аккаунта нет доступа к заявкам.";
    status.className = "status is-bad";
    return;
  }
  status.textContent = "Загружаем заявки…";
  status.className = "status";
  try {
    const snapshot = await getDocs(collection(db, "applications"));
    const items = snapshot.docs
      .map((item) => item.data())
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    status.textContent = items.length ? `Заявок: ${items.length}` : "Пока никто не подал заявку.";
    status.className = "status";
    for (const item of items) {
      const card = document.createElement("article");
      card.className = "panel card-app";
      const title = document.createElement("h2");
      title.textContent = item.nick || "Без ника";
      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = `${item.googleName || "Google"} · ${item.googleEmail || "почта не указана"} · ${when(item.createdAt)}`;
      const answers = document.createElement("dl");
      answers.className = "answers";
      for (const [label, key] of fields) {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        term.textContent = label;
        const value = document.createElement("dd");
        value.textContent = show(item[key]);
        row.append(term, value);
        answers.append(row);
      }
      card.append(title, meta, answers);
      cards.append(card);
    }
  } catch (error) {
    status.textContent = "Не удалось открыть заявки.";
    status.className = "status is-bad";
    console.error(error);
  }
});
