"use strict";

const ARTICLE_URL = "https://help.snapchat.com/hc/en-us/articles/7012318024852-I-lost-my-Streak-How-do-I-restore-it";
const OPERATION_STATE_KEY = "bulkOperationState";

let queue = [];
let processing = false;
let activeTabs = new Map(); // Map of tabId -> { friend, timestamp }
let totalCount = 0; // Total number of tabs to open
let completedCount = 0; // Number of tabs completed
let failedCount = 0; // Number of tabs that failed to open

// Save operation state to storage
function saveOperationState() {
  browser.storage.local.set({
    [OPERATION_STATE_KEY]: {
      processing: processing,
      total: totalCount,
      completed: completedCount,
      failed: failedCount,
      remaining: queue.length,
      timestamp: Date.now()
    }
  }).catch(() => {
    // Ignore storage errors
  });
}

// Load operation state from storage
function loadOperationState() {
  return browser.storage.local.get(OPERATION_STATE_KEY).then((result) => {
    const state = result[OPERATION_STATE_KEY];
    if (state && state.processing) {
      // Restore state if it's recent (within last hour)
      const age = Date.now() - (state.timestamp || 0);
      if (age < 3600000) { // 1 hour
        processing = state.processing;
        totalCount = state.total || 0;
        completedCount = state.completed || 0;
        failedCount = state.failed || 0;
        // Note: queue can't be fully restored, but we can show progress
        return state;
      }
    }
    return null;
  });
}

function sendProgressUpdate() {
  const remaining = queue.length;
  const current = totalCount - remaining;
  saveOperationState(); // Save state whenever progress updates
  browser.runtime.sendMessage({
    type: "progressUpdate",
    current: current,
    total: totalCount,
    remaining: remaining
  }).catch(() => {
    // Popup might be closed, ignore
  });
}

function openNext() {
  if (queue.length === 0) {
    processing = false;
    const successCount = totalCount - failedCount;
    // Clear saved state
    browser.storage.local.remove(OPERATION_STATE_KEY).catch(() => {});
    // Notify popup that operation is complete
    browser.runtime.sendMessage({
      type: "bulkOperationComplete",
      total: totalCount,
      success: successCount,
      failed: failedCount
    }).catch(() => {
      // Popup might be closed, ignore
    });
    // Reset counters
    totalCount = 0;
    completedCount = 0;
    failedCount = 0;
    return;
  }
  const friend = queue.shift();
  const url = ARTICLE_URL + "#" + encodeURIComponent(friend);
  
  // Send progress update before opening tab
  sendProgressUpdate();
  
  browser.tabs.create({ url })
    .then((tab) => {
      // Track this tab with unique ID and timestamp
      activeTabs.set(tab.id, {
        friend: friend,
        timestamp: Date.now()
      });
    })
    .catch((error) => {
      // Handle tab creation failure (e.g., popup blocker)
      console.error("Failed to create tab:", error);
      completedCount++;
      failedCount++;
      // Notify popup if possible, or continue to next
      browser.runtime.sendMessage({
        type: "tabCreationError",
        error: "Failed to open tab. Check if popups are blocked.",
        friend: friend,
        failed: failedCount,
        total: totalCount
      }).catch(() => {
        // Popup might be closed, continue anyway
      });
      // Continue to next friend even if this one failed
      openNext();
    });
}

browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "openBulkTabs") {
    const friends = msg.friends || [];
    if (friends.length === 0) return;
    queue = [...friends]; // Create copy to avoid reference issues
    totalCount = friends.length;
    completedCount = 0;
    failedCount = 0;
    processing = true;
    activeTabs.clear(); // Clear previous active tabs
    saveOperationState(); // Save initial state
    openNext();
  }
  if (msg.type === "cancelBulkOperation") {
    queue = [];
    processing = false;
    totalCount = 0;
    completedCount = 0;
    failedCount = 0;
    // Clear saved state
    browser.storage.local.remove(OPERATION_STATE_KEY).catch(() => {});
    // Notify popup that operation was cancelled
    browser.runtime.sendMessage({
      type: "bulkOperationCancelled"
    }).catch(() => {
      // Popup might be closed, ignore
    });
  }
  if (msg.type === "getOperationState") {
    // Popup requesting current state
    loadOperationState().then((state) => {
      if (state) {
        browser.runtime.sendMessage({
          type: "operationStateRestored",
          state: state
        }).catch(() => {});
      }
    });
  }
  if (msg.type === "fillDone") {
    // Verify this message is from a tracked tab to prevent race conditions
    if (sender?.tab?.id) {
      const tabInfo = activeTabs.get(sender.tab.id);
      if (tabInfo) {
        // Valid message from tracked tab
        activeTabs.delete(sender.tab.id);
        completedCount++;
        // Continue to next tab immediately
        openNext();
      }
      // If tab not in activeTabs, ignore (might be duplicate or stale message)
    } else {
      // Fallback: if no sender info, still process (for compatibility)
      completedCount++;
      openNext();
    }
  }
  if (msg.type === "closeTab") {
    // Close tab request from content script
    if (sender?.tab?.id) {
      setTimeout(() => {
        browser.tabs.remove(sender.tab.id).catch(() => {
          // Tab might already be closed, ignore
        });
      }, 1000);
    }
  }
});

// Handle tab closure - if user closes tab before fill completes, continue queue
browser.tabs.onRemoved.addListener((tabId) => {
  if (activeTabs.has(tabId)) {
    // Tab was closed before completion, remove from tracking and continue
    activeTabs.delete(tabId);
    if (processing) {
      completedCount++;
      // Don't count as failed - user might have closed it intentionally
      openNext();
    }
  }
});
