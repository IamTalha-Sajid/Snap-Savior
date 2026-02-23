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
const btnCancel = document.getElementById("btn-cancel");
const confirmFeedback = document.getElementById("confirm-feedback");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");

// Input validation functions
function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  // Basic email validation: contains @ and has valid domain
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function validateMobile(mobile) {
  if (!mobile || typeof mobile !== "string") return false;
  // Basic mobile validation: at least 7 digits, allows +, spaces, dashes, parentheses
  const cleaned = mobile.replace(/[\s\-\(\)\+]/g, "");
  return /^\d{7,15}$/.test(cleaned);
}

function sanitizeUsername(username) {
  if (!username || typeof username !== "string") return "";
  // Remove any characters that could cause issues in URLs or forms
  // Allow alphanumeric, underscore, dot, hyphen
  return username.trim().replace(/[^a-zA-Z0-9._-]/g, "");
}

function validateUsername(username) {
  const sanitized = sanitizeUsername(username);
  // Username should be 1-30 characters (Snapchat limit)
  return sanitized.length >= 1 && sanitized.length <= 30;
}

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
  const rawUsernames = text
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"))
    .map(sanitizeUsername)
    .filter((s) => s && validateUsername(s));
  
  // Remove duplicates while preserving order
  const uniqueUsernames = Array.from(new Set(rawUsernames));
  
  return {
    usernames: uniqueUsernames,
    duplicatesRemoved: rawUsernames.length - uniqueUsernames.length
  };
}

btnUpdate.addEventListener("click", () => {
  browser.storage.local.get(STORAGE_KEYS).then(showDetailsEdit);
});

btnSave.addEventListener("click", () => {
  const rawUsername = inputUsername.value.trim();
  const rawEmail = inputEmail.value.trim();
  const rawMobile = inputMobile.value.trim();
  
  // Check all fields are filled
  if (!rawUsername || !rawEmail || !rawMobile) {
    showSaveFeedback("Fill all three fields.", true);
    return;
  }
  
  // Validate email
  if (!validateEmail(rawEmail)) {
    showSaveFeedback("Please enter a valid email address.", true);
    inputEmail.focus();
    return;
  }
  
  // Validate mobile
  if (!validateMobile(rawMobile)) {
    showSaveFeedback("Please enter a valid mobile number (7-15 digits).", true);
    inputMobile.focus();
    return;
  }
  
  // Sanitize and validate username
  const username = sanitizeUsername(rawUsername);
  if (!validateUsername(username)) {
    showSaveFeedback("Username must be 1-30 characters (letters, numbers, _, ., - only).", true);
    inputUsername.focus();
    return;
  }
  
  // If sanitization changed the username, show warning but allow save
  if (username !== rawUsername) {
    inputUsername.value = username;
  }
  
  browser.storage.local.set({ username, email: rawEmail.trim(), mobile: rawMobile.trim() }).then(() => {
    showSaveFeedback("Saved.", false, true);
    showDetailsView({ username, email: rawEmail.trim(), mobile: rawMobile.trim() });
  }).catch(() => {
    showSaveFeedback("Failed to save.", true);
  });
});

function showProgress(current, total) {
  if (total === 0) {
    progressContainer.hidden = true;
    return;
  }
  const percentage = Math.round((current / total) * 100);
  progressFill.style.width = percentage + "%";
  progressText.textContent = `Opening ${current} of ${total} tabs...`;
  progressContainer.hidden = false;
}

function hideProgress() {
  progressContainer.hidden = true;
  progressFill.style.width = "0%";
  progressText.textContent = "";
}

function setBulkOperationState(isActive) {
  btnConfirm.hidden = isActive;
  btnCancel.hidden = !isActive;
  inputUsernames.disabled = isActive;
  // Hide the textarea field container when processing
  const fieldContainer = inputUsernames.closest(".field");
  if (fieldContainer) {
    fieldContainer.hidden = isActive;
  }
}

btnConfirm.addEventListener("click", () => {
  showConfirmFeedback("");
  const parseResult = parseUsernames(inputUsernames.value);
  const usernames = parseResult.usernames;
  const duplicatesRemoved = parseResult.duplicatesRemoved;
  
  if (usernames.length === 0) {
    showConfirmFeedback("Enter at least one valid username.", true);
    return;
  }
  
  // Notify user if duplicates were removed
  if (duplicatesRemoved > 0) {
    showConfirmFeedback(`${duplicatesRemoved} duplicate(s) removed. Processing ${usernames.length} unique username(s).`, false, false);
  }
  
  browser.storage.local.get(STORAGE_KEYS).then((stored) => {
    const username = (stored.username || "").trim();
    const email = (stored.email || "").trim();
    const mobile = (stored.mobile || "").trim();
    if (!username || !email || !mobile) {
      showConfirmFeedback("Save your details first (My details → Save).", true);
      return;
    }
    // Validate stored data as well
    if (!validateEmail(email) || !validateMobile(mobile) || !validateUsername(username)) {
      showConfirmFeedback("Your saved details are invalid. Please update them.", true);
      return;
    }
    browser.runtime.sendMessage({ type: "openBulkTabs", friends: usernames }).catch((error) => {
      showConfirmFeedback("Failed to start bulk operation. Try again.", true);
      setBulkOperationState(false);
    });
    setBulkOperationState(true);
    showProgress(0, usernames.length);
    showConfirmFeedback("Starting...", false, false);
  });
});

btnCancel.addEventListener("click", () => {
  browser.runtime.sendMessage({ type: "cancelBulkOperation" }).catch(() => {
    // Ignore errors
  });
  setBulkOperationState(false);
  hideProgress();
  // Show textarea again
  const fieldContainer = inputUsernames.closest(".field");
  if (fieldContainer) {
    fieldContainer.hidden = false;
  }
  showConfirmFeedback("Operation cancelled.", false, false);
});


// Restore operation state when popup opens
function restoreOperationState() {
  browser.runtime.sendMessage({ type: "getOperationState" }).catch(() => {});
}

// Listen for restored operation state
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "operationStateRestored" && msg.state) {
    const state = msg.state;
    if (state.processing) {
      // Restore UI state
      setBulkOperationState(true);
      showProgress(state.total - state.remaining, state.total);
      showConfirmFeedback(`Resumed: ${state.total - state.remaining} of ${state.total} tabs processed.`, false, false);
    }
  }
  // ... existing message handlers
  if (msg.type === "tabCreationError") {
    // Show error but don't stop the process
    const errorMsg = msg.failed && msg.total 
      ? `Warning: ${msg.failed} of ${msg.total} tab(s) failed to open. Check if popups are blocked.`
      : "Warning: Some tabs failed to open. Check if popups are blocked.";
    showConfirmFeedback(errorMsg, true);
  }
  if (msg.type === "progressUpdate") {
    showProgress(msg.current, msg.total);
  }
  if (msg.type === "bulkOperationComplete") {
    setBulkOperationState(false);
    hideProgress();
    // Show textarea again
    const fieldContainer = inputUsernames.closest(".field");
    if (fieldContainer) {
      fieldContainer.hidden = false;
    }
    
    // Show success or error message based on results
    if (msg.failed > 0) {
      showConfirmFeedback(`Completed with errors: ${msg.success} succeeded, ${msg.failed} failed.`, true);
    } else {
      showConfirmFeedback(`Success! ${msg.success} tab(s) opened.`, false, true);
    }
  }
  if (msg.type === "bulkOperationCancelled") {
    setBulkOperationState(false);
    hideProgress();
    // Show textarea again
    const fieldContainer = inputUsernames.closest(".field");
    if (fieldContainer) {
      fieldContainer.hidden = false;
    }
    showConfirmFeedback("Operation cancelled.", false, false);
  }
});

// Initialize popup
browser.storage.local.get(STORAGE_KEYS).then((stored) => {
  const hasAll = [stored.username, stored.email, stored.mobile].every((v) => (v || "").trim());
  if (hasAll) {
    showDetailsView(stored);
  } else {
    showDetailsEdit(stored);
  }
  // Restore operation state after UI is initialized
  restoreOperationState();
});
