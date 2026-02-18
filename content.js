(function () {
  "use strict";

  const ARTICLE_URL = "https://help.snapchat.com/hc/en-us/articles/7012318024852-I-lost-my-Streak-How-do-I-restore-it";
  const FORM_SELECTORS = "form#new_request, form.request-form";
  const PENDING_FRIEND_KEY = "pendingFriendForFill";

  function getForm() {
    return document.querySelector(FORM_SELECTORS);
  }

  function isOnArticlePage() {
    return window.location.href.indexOf(ARTICLE_URL) === 0 || window.location.pathname.indexOf("/articles/") !== -1;
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const parent = el.closest && el.closest(".form-field");
    if (parent && window.getComputedStyle(parent).display === "none") return false;
    return true;
  }

  function findLabelWithText(form, labelText, exact) {
    const labels = form.querySelectorAll("label");
    for (const label of labels) {
      const text = (label.textContent || "").trim();
      const matches = exact ? text === labelText : text.indexOf(labelText) !== -1;
      if (matches && isVisible(label)) return label;
    }
    return null;
  }

  function inputForLabel(form, labelText, exact) {
    const label = findLabelWithText(form, labelText, exact);
    if (!label) return null;
    const forId = label.getAttribute("for");
    if (forId) {
      const input = document.getElementById(forId);
      if (input && input.type === "text" && isVisible(input)) return input;
    }
    const field = label.closest(".form-field");
    if (field && isVisible(field)) {
      const input = field.querySelector('input[type="text"]');
      if (input && isVisible(input)) return input;
    }
    return null;
  }

  function fillInput(input, value) {
    if (!input) return;
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function waitForForm(maxWaitMs) {
    return new Promise((resolve) => {
      const form = getForm();
      if (form) {
        resolve(form);
        return;
      }
      const deadline = Date.now() + (maxWaitMs || 15000);
      const t = setInterval(() => {
        const f = getForm();
        if (f) {
          clearInterval(t);
          resolve(f);
        } else if (Date.now() > deadline) {
          clearInterval(t);
          resolve(null);
        }
      }, 200);
    });
  }

  function getFormLink() {
    const linkText = /this\s+form/i;
    const links = Array.from(document.querySelectorAll('a[href*="/requests/new"]'));
    const withText = links.find((a) => linkText.test((a.textContent || "").trim()));
    if (withText) return withText;
    const main = document.querySelector("main");
    const inMain = main ? links.find((a) => main.contains(a)) : null;
    if (inMain) return inMain;
    return links[0] || null;
  }

  function runOnArticlePage() {
    const hash = (window.location.hash || "").replace(/^#/, "").trim();
    if (!hash) return;
    const friendUsername = decodeURIComponent(hash);
    browser.storage.local.set({ [PENDING_FRIEND_KEY]: friendUsername }).then(() => {
      const link = getFormLink();
      if (link) link.click();
    });
  }

  function runOnFormPage() {
    browser.storage.local.get([PENDING_FRIEND_KEY, "username", "email", "mobile"]).then((stored) => {
      const friendUsername = (stored[PENDING_FRIEND_KEY] || "").trim();
      browser.storage.local.remove(PENDING_FRIEND_KEY);

      const username = (stored.username || "").trim();
      const email = (stored.email || "").trim();
      const mobile = (stored.mobile || "").trim();
      if (!friendUsername || !username || !email || !mobile) {
        if (friendUsername) browser.runtime.sendMessage({ type: "fillDone" });
        return;
      }

      waitForForm(15000).then((form) => {
        if (!form) {
          browser.runtime.sendMessage({ type: "fillDone" });
          return;
        }

        const fields = [
          { label: "Username", value: username, exact: true },
          { label: "Email", value: email, exact: true },
          { label: "Mobile Number", value: mobile, exact: true },
          { label: "Friend's Username", value: friendUsername, exact: false },
        ];

        fields.forEach(({ label, value, exact }) => {
          const input = inputForLabel(form, label, exact);
          if (input) {
            input.scrollIntoView({ block: "nearest", behavior: "instant" });
            fillInput(input, value);
          }
        });

        browser.runtime.sendMessage({ type: "fillDone" });
      });
    });
  }

  function run() {
    const form = getForm();
    if (form) {
      runOnFormPage();
    } else if (isOnArticlePage()) {
      runOnArticlePage();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
