(function () {
  "use strict";

  const ARTICLE_URL = "https://help.snapchat.com/hc/en-us/articles/7012318024852-I-lost-my-Streak-How-do-I-restore-it";
  const FORM_SELECTORS = "form#new_request, form.request-form";
  const PENDING_FRIEND_KEY = "pendingFriendForFill";
  const FORM_WAIT_TIMEOUT_MS = 15000; // Maximum time to wait for form to appear
  const FORM_CHECK_INTERVAL_MS = 200; // Interval to check for form presence
  const SUBMIT_DELAY_MS = 500; // Small delay to ensure form is ready
  const CAPTCHA_CHECK_DELAY_MS = 2000; // Time to wait before checking if submission failed due to CAPTCHA

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

  function findSubmitButton(form) {
    if (!form) return null;
    
    // Try multiple common selectors for submit button
    const selectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button.submit',
      'button[class*="submit"]',
      'button[class*="Submit"]',
      'input[class*="submit"]',
      'input[class*="Submit"]'
    ];
    
    // Try selectors first
    for (const selector of selectors) {
      try {
        const button = form.querySelector(selector);
        if (button && isVisible(button) && !button.disabled) {
          return button;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    
    // Fallback: find button with "Submit" text
    const buttons = form.querySelectorAll('button, input[type="button"], input[type="submit"]');
    for (const button of buttons) {
      if (!isVisible(button) || button.disabled) continue;
      const text = (button.textContent || button.value || "").trim().toLowerCase();
      if (text.includes("submit")) {
        return button;
      }
    }
    
    // Last resort: find any submit button in the form
    const submitInput = form.querySelector('input[type="submit"]');
    if (submitInput && isVisible(submitInput)) {
      return submitInput;
    }
    
    return null;
  }

  function waitForSubmitButton(form, maxWaitMs) {
    return new Promise((resolve) => {
      const submitButton = findSubmitButton(form);
      if (submitButton) {
        resolve(submitButton);
        return;
      }
      
      const timeout = maxWaitMs || 5000;
      const deadline = Date.now() + timeout;
      const t = setInterval(() => {
        const button = findSubmitButton(form);
        if (button) {
          clearInterval(t);
          resolve(button);
        } else if (Date.now() > deadline) {
          clearInterval(t);
          resolve(null);
        }
      }, 200);
    });
  }

  function detectSuccessMessage() {
    // Check for "We got your request!" success message
    const pageText = document.body.textContent || "";
    return /we\s+got\s+your\s+request/i.test(pageText);
  }

  function detectCaptchaError() {
    // Check for common CAPTCHA error indicators
    const errorSelectors = [
      '[class*="error"]',
      '[class*="Error"]',
      '[id*="error"]',
      '[id*="Error"]',
      '.alert',
      '.alert-danger',
      '[role="alert"]'
    ];
    
    for (const selector of errorSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = (el.textContent || "").toLowerCase();
        if (text.includes("captcha") || text.includes("verification") || 
            text.includes("robot") || text.includes("human")) {
          return true;
        }
      }
    }
    
    // Check if form is still visible (might indicate submission failed)
    const form = getForm();
    if (form && isVisible(form)) {
      // Form still visible might mean submission failed
      // But we'll be more specific - check for error messages
      const errorTexts = document.body.textContent.toLowerCase();
      if (errorTexts.includes("captcha") || errorTexts.includes("verification failed")) {
        return true;
      }
    }
    
    return false;
  }

  function showCaptchaMessage() {
    // Create a visible notification for the user
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      line-height: 1.4;
    `;
    notification.innerHTML = `
      <strong>⚠️ CAPTCHA Required</strong><br>
      Please solve the CAPTCHA and submit manually.
    `;
    document.body.appendChild(notification);
    
    // Remove after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  function autoSubmitForm(form) {
    waitForSubmitButton(form, 5000).then((submitButton) => {
      if (!submitButton) {
        console.log("Submit button not found, form may need manual submission");
        browser.runtime.sendMessage({ type: "fillDone" });
        return;
      }
      
      // Small delay to ensure form is ready, then submit immediately
      setTimeout(() => {
        // Check if button is still available and enabled
        if (submitButton && isVisible(submitButton) && !submitButton.disabled) {
          // Scroll button into view
          submitButton.scrollIntoView({ block: "center", behavior: "smooth" });
          
          // Small delay for smooth scroll
          setTimeout(() => {
            try {
              // Try clicking the button immediately (assuming no CAPTCHA)
              submitButton.click();
              console.log("Form submitted automatically");
              
              // Send fillDone immediately to continue queue, then check for success
              // This prevents getting stuck - we'll close tab later if success detected
              console.log("Form submitted, continuing to next tab");
              browser.runtime.sendMessage({ type: "fillDone" });
              
              // Now check for success and close tab if successful
              let checkCount = 0;
              const maxChecks = 20; // Check for 10 seconds (20 * 500ms)
              
              function checkForSuccess() {
                checkCount++;
                const hasSuccess = detectSuccessMessage();
                const hasCaptcha = detectCaptchaError();
                
                if (hasCaptcha) {
                  console.log("CAPTCHA detected - showing user message");
                  showCaptchaMessage();
                  // Don't close tab - user needs to solve CAPTCHA
                  return;
                }
                
                if (hasSuccess) {
                  console.log("Success message detected - requesting tab close");
                  // Request background script to close this tab
                  browser.runtime.sendMessage({ 
                    type: "closeTab",
                    tabId: null // Will be determined by sender.tab.id in background
                  }).catch(() => {});
                  return;
                }
                
                // Check alternative indicators
                const formStillVisible = getForm() && isVisible(getForm());
                const urlChanged = !window.location.href.includes("/requests/new");
                
                if (!formStillVisible || urlChanged) {
                  console.log("Form gone or URL changed - requesting tab close");
                  browser.runtime.sendMessage({ 
                    type: "closeTab",
                    tabId: null
                  }).catch(() => {});
                  return;
                }
                
                // Continue checking if not done
                if (checkCount < maxChecks) {
                  setTimeout(checkForSuccess, 500);
                } else {
                  console.log("Success check timeout - tab will remain open");
                }
              }
              
              // Start checking after initial delay
              setTimeout(checkForSuccess, CAPTCHA_CHECK_DELAY_MS);
              
              // Also watch for DOM changes (success message might load dynamically)
              const observer = new MutationObserver(() => {
                if (checkCount < maxChecks) {
                  checkForSuccess();
                }
              });
              
              observer.observe(document.body, {
                childList: true,
                subtree: true
              });
              
              // Stop observing after max time
              setTimeout(() => {
                observer.disconnect();
              }, maxChecks * 500);
            } catch (error) {
              console.error("Error submitting form:", error);
              browser.runtime.sendMessage({ type: "fillDone" });
            }
          }, 300);
        } else {
          console.log("Submit button not available, form may need manual submission");
          browser.runtime.sendMessage({ type: "fillDone" });
        }
      }, SUBMIT_DELAY_MS);
    });
  }

  function waitForForm(maxWaitMs) {
    return new Promise((resolve) => {
      const form = getForm();
      if (form) {
        resolve(form);
        return;
      }
      const timeout = maxWaitMs || FORM_WAIT_TIMEOUT_MS;
      const deadline = Date.now() + timeout;
      const t = setInterval(() => {
        const f = getForm();
        if (f) {
          clearInterval(t);
          resolve(f);
        } else if (Date.now() > deadline) {
          clearInterval(t);
          resolve(null);
        }
      }, FORM_CHECK_INTERVAL_MS);
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

      waitForForm(FORM_WAIT_TIMEOUT_MS).then((form) => {
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

        // Auto-submit the form after filling
        autoSubmitForm(form);
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
