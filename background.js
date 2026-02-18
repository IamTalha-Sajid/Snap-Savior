"use strict";

const ARTICLE_URL = "https://help.snapchat.com/hc/en-us/articles/7012318024852-I-lost-my-Streak-How-do-I-restore-it";

let queue = [];
let processing = false;

function openNext() {
  if (queue.length === 0) {
    processing = false;
    return;
  }
  const friend = queue.shift();
  const url = ARTICLE_URL + "#" + encodeURIComponent(friend);
  browser.tabs.create({ url });
}

browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "openBulkTabs") {
    const friends = msg.friends || [];
    if (friends.length === 0) return;
    queue = friends;
    processing = true;
    openNext();
  }
  if (msg.type === "fillDone") {
    openNext();
  }
});
