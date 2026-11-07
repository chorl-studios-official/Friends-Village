import { onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db, googleProvider } from "./firebase.js";

const gate = document.querySelector("#gate");
const formSection = document.querySelector("#form");
const form = document.querySelector("#application");
const status = document.querySelector("#status");
const submit = document.querySelector("#submit");

function setStatus(text, kind) {
  status.textContent = text;
  status.className = kind ? `status is-${kind}` : "status";
}

document.querySelector("#sign-in").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    setStatus("Не удалось войти через Google. Попробуйте ещё раз.", "bad");
    console.error(error);
  }
});

document.querySelector("#sign-out").addEventListener("click", () => signOut(auth));

function fillForm(data) {
  const fields = ["nick", "email", "discord", "why", "expect", "withFriends", "about", "extra"];
  for (const name of fields) {
    form.elements[name].value = data[name] || "";
  }
  for (const input of form.querySelectorAll('input[name="playTime"]')) {
    input.checked = input.value === data.playTime;
  }
  for (const input of form.querySelectorAll('input[name="rules"]')) {
    input.checked = input.value === data.rules;
  }
  for (const input of form.querySelectorAll('input[name="banned"]')) {
    input.checked = input.value === data.banned;
  }
  const activities = new Set(data.activities || []);
  for (const input of form.querySelectorAll('input[name="activities"]')) {
    input.checked = activities.has(input.value);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    gate.hidden = false;
    formSection.hidden = true;
    return;
  }
  gate.hidden = true;
  formSection.hidden = false;
  document.querySelector("#account-name").textContent = user.displayName || "Аккаунт Google";
  document.querySelector("#account-email").textContent = user.email || "";
  const snapshot = await getDoc(doc(db, "applications", user.uid));
  if (snapshot.exists()) {
    fillForm(snapshot.data());
    submit.textContent = "Обновить заявку";
    setStatus("Вы уже отправляли заявку. Можно изменить ответы и сохранить их снова.", "");
  } else if (!form.elements.email.value) {
    form.elements.email.value = user.email || "";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  const data = new FormData(form);
  submit.disabled = true;
  setStatus("Отправляем…", "");
  const ref = doc(db, "applications", user.uid);
  const existing = await getDoc(ref);
  const payload = {
    nick: String(data.get("nick") || "").trim(),
    email: String(data.get("email") || "").trim(),
    discord: String(data.get("discord") || "").trim(),
    playTime: String(data.get("playTime") || ""),
    activities: data.getAll("activities"),
    why: String(data.get("why") || "").trim(),
    expect: String(data.get("expect") || "").trim(),
    withFriends: String(data.get("withFriends") || "").trim(),
    rules: String(data.get("rules") || ""),
    banned: String(data.get("banned") || ""),
    about: String(data.get("about") || "").trim(),
    extra: String(data.get("extra") || "").trim(),
    googleEmail: user.email || "",
    googleName: user.displayName || "",
    updatedAt: serverTimestamp(),
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
  };
  try {
    await setDoc(ref, payload);
    submit.textContent = "Обновить заявку";
    setStatus("Заявка сохранена. Администрация посмотрит её и свяжется с вами.", "ok");
  } catch (error) {
    setStatus("Не получилось сохранить заявку. Проверьте обязательные поля и попробуйте снова.", "bad");
    console.error(error);
  } finally {
    submit.disabled = false;
  }
});
