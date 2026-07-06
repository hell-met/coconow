const issueButton = document.querySelector("#issueButton");
const reissueButton = document.querySelector("#reissueButton");
const copyButton = document.querySelector("#copyButton");
const postalAreaInput = document.querySelector("#postalArea");
const postalPanel = document.querySelector("#postalPanel");
const actions = document.querySelector("#actions");
const tagOutput = document.querySelector("#tagOutput");
const message = document.querySelector("#message");
const shareButtons = document.querySelectorAll("[data-share]");

const HASH_PEPPER = "COCONOW-JP-v2";
let latestTag = "";
let latestPostText = "";

function getJapanTimeParts() {
  const formatter = new Intl.DateTimeFormat("ja-JP-u-ca-gregory", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });

  return Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
}

function getHourlyStamp() {
  const parts = getJapanTimeParts();
  return `${parts.year}${parts.month}${parts.day}${parts.hour}`;
}

function normalizeDigits(value) {
  return value.replace(/\D/g, "");
}

function getPostalArea(value) {
  const digits = normalizeDigits(value);

  if (digits.length === 6) {
    return digits;
  }

  if (digits.length === 7) {
    return digits.slice(0, 6);
  }

  throw new Error("郵便番号は上6桁、または7桁で入力してください。");
}

function encodeBase36(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12)
    .toUpperCase();
}

async function digestTagSource(source) {
  const bytes = new TextEncoder().encode(source);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return encodeBase36(new Uint8Array(hashBuffer));
}

async function buildTag(postalArea) {
  const hourlyStamp = getHourlyStamp();
  const encryptedLocation = await digestTagSource(
    `${HASH_PEPPER}:${hourlyStamp}:${postalArea}`,
  );

  return `#coconow${hourlyStamp}${encryptedLocation}`;
}

function setMessage(text) {
  message.textContent = text;
}

function setBusy(isBusy) {
  issueButton.disabled = isBusy;
  reissueButton.disabled = isBusy;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("このブラウザでは位置情報を取得できません。"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: latitude,
    lon: longitude,
    zoom: "18",
    addressdetails: "1",
    "accept-language": "ja",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error("位置情報から郵便番号を取得できませんでした。");
  }

  return response.json();
}

function ensureJapan(latitude, longitude) {
  if (latitude < 20 || latitude > 46 || longitude < 122 || longitude > 154) {
    throw new Error("日本国内の位置情報で発行してください。");
  }
}

function showIssuedTag(tag, postalArea, note) {
  latestTag = tag;
  latestPostText = `${tag}\n\nCOCONOW-ココナウ-`;
  tagOutput.textContent = tag;
  postalAreaInput.value = postalArea;
  postalPanel.hidden = false;
  actions.hidden = false;
  setMessage(note);
}

async function issueFromPostalArea(postalArea, note) {
  const normalizedPostalArea = getPostalArea(postalArea);
  const tag = await buildTag(normalizedPostalArea);
  showIssuedTag(tag, normalizedPostalArea, note);
}

async function issueTag() {
  setBusy(true);
  setMessage("位置情報を確認しています...");

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude, accuracy } = position.coords;
    ensureJapan(latitude, longitude);

    const result = await reverseGeocode(latitude, longitude);
    const postcode = result?.address?.postcode;

    if (!postcode) {
      throw new Error("郵便番号を取得できませんでした。上6桁を入力して再発行してください。");
    }

    const postalArea = getPostalArea(postcode);
    const accuracyText =
      Number.isFinite(accuracy) && accuracy > 1000
        ? "PC環境では位置情報がずれることがあります。違う場合は上6桁を修正してください。"
        : "郵便番号が違う場合は上6桁を修正して再発行できます。";

    await issueFromPostalArea(postalArea, accuracyText);
  } catch (error) {
    postalPanel.hidden = false;
    setMessage(error.message || "タグを発行できませんでした。");
  } finally {
    setBusy(false);
  }
}

async function reissueTag() {
  setBusy(true);

  try {
    const postalArea = getPostalArea(postalAreaInput.value);
    await issueFromPostalArea(postalArea, "修正したエリアで再発行しました。");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setBusy(false);
  }
}

async function copyTag() {
  if (!latestTag) return;

  try {
    await navigator.clipboard.writeText(latestTag);
    setMessage("タグをコピーしました。");
  } catch {
    setMessage("コピーできませんでした。タグを選択してコピーしてください。");
  }
}

function openShareTarget(target) {
  const encodedText = encodeURIComponent(latestPostText);
  const urls = {
    x: `https://twitter.com/intent/tweet?text=${encodedText}`,
    threads: `https://www.threads.net/intent/post?text=${encodedText}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodedText}`,
    line: `https://social-plugins.line.me/lineit/share?text=${encodedText}`,
  };

  window.open(urls[target], "_blank", "noopener,noreferrer");
}

async function sharePost(target) {
  if (!latestTag) return;

  try {
    if (target === "native" && navigator.share) {
      await navigator.share({ text: latestPostText });
      return;
    }

    if (target === "native") {
      await navigator.clipboard.writeText(latestPostText);
      setMessage("タグ付きポスト文をコピーしました。");
      return;
    }

    openShareTarget(target);
  } catch {
    setMessage("共有できませんでした。コピーして投稿してください。");
  }
}

postalAreaInput.addEventListener("input", () => {
  postalAreaInput.value = normalizeDigits(postalAreaInput.value).slice(0, 7);
});
issueButton.addEventListener("click", issueTag);
reissueButton.addEventListener("click", reissueTag);
copyButton.addEventListener("click", copyTag);
shareButtons.forEach((button) => {
  button.addEventListener("click", () => sharePost(button.dataset.share));
});
