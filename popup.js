const STORAGE_KEYS = ["username", "email", "mobile"];

const detailsView = document.getElementById("details-view");
const detailsEdit = document.getElementById("details-edit");
const displayUsername = document.getElementById("display-username");
const displayEmail = document.getElementById("display-email");
const displayMobile = document.getElementById("display-mobile");
const inputUsername = document.getElementById("input-username");
const inputEmail = document.getElementById("input-email");
const inputMobile = document.getElementById("input-mobile");
const btnUpdate = document.getElementById("btn-update");
const btnSave = document.getElementById("btn-save");
const saveFeedback = document.getElementById("save-feedback");
const inputUsernames = document.getElementById("input-usernames");
const btnConfirm = document.getElementById("btn-confirm");
const confirmFeedback = document.getElementById("confirm-feedback");

function showDetailsView(stored) {
  if (stored) {
    displayUsername.textContent = stored.username || "";
    displayEmail.textContent = stored.email || "";
    displayMobile.textContent = stored.mobile || "";
  }
  detailsView.hidden = false;
  detailsEdit.hidden = true;
  saveFeedback.textContent = "";
}

function showDetailsEdit(stored) {
  inputUsername.value = stored?.username || "";
  inputEmail.value = stored?.email || "";
  inputMobile.value = stored?.mobile || "";
  detailsView.hidden = true;
  detailsEdit.hidden = false;
  saveFeedback.textContent = "";
}

function showSaveFeedback(msg, isError = false, isSuccess = false) {
  saveFeedback.textContent = msg;
  saveFeedback.className = "feedback" + (isError ? " feedback--error" : isSuccess ? " feedback--success" : "");
}

function showConfirmFeedback(msg, isError = false, isSuccess = false) {
  confirmFeedback.textContent = msg;
  confirmFeedback.className = "feedback" + (isError ? " feedback--error" : isSuccess ? " feedback--success" : "");
}

function parseUsernames(text) {
  return text
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));
}

btnUpdate.addEventListener("click", () => {
  browser.storage.local.get(STORAGE_KEYS).then(showDetailsEdit);
});

btnSave.addEventListener("click", () => {
  const username = inputUsername.value.trim();
  const email = inputEmail.value.trim();
  const mobile = inputMobile.value.trim();
  if (!username || !email || !mobile) {
    showSaveFeedback("Fill all three fields.", true);
    return;
  }
  browser.storage.local.set({ username, email, mobile }).then(() => {
    showSaveFeedback("Saved.", false, true);
    showDetailsView({ username, email, mobile });
  }).catch(() => {
    showSaveFeedback("Failed to save.", true);
  });
});

btnConfirm.addEventListener("click", () => {
  showConfirmFeedback("");
  const usernames = parseUsernames(inputUsernames.value);
  if (usernames.length === 0) {
    showConfirmFeedback("Enter at least one username.", true);
    return;
  }
  browser.storage.local.get(STORAGE_KEYS).then((stored) => {
    const username = (stored.username || "").trim();
    const email = (stored.email || "").trim();
    const mobile = (stored.mobile || "").trim();
    if (!username || !email || !mobile) {
      showConfirmFeedback("Save your details first (My details → Save).", true);
      return;
    }
    browser.runtime.sendMessage({ type: "openBulkTabs", friends: usernames });
    showConfirmFeedback(usernames.length + " tab(s) opening. Submit each after CAPTCHA.", false, true);
  });
});

browser.storage.local.get(STORAGE_KEYS).then((stored) => {
  const hasAll = [stored.username, stored.email, stored.mobile].every((v) => (v || "").trim());
  if (hasAll) {
    showDetailsView(stored);
  } else {
    showDetailsEdit(stored);
  }
});
