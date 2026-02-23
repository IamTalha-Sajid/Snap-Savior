# Snap Savior

**Snap Savior** is a Firefox extension that fills Snapchat’s official streak restore form in bulk. Save your details once, then open one tab per friend and auto-fill each form. You solve the CAPTCHA and submit each tab yourself.

[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-FF7139?logo=firefox-browser)](https://addons.mozilla.org/en-US/firefox/addon/snap-savior/)

---

## Install

**Recommended:** Install from Firefox Add-ons (AMO):

1. Open **[Snap Savior on addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/snap-savior/)** (or search “Snap Savior” in Firefox Add-ons).
2. Click **Add to Firefox** and confirm.

**From source (development):**

1. Clone or download this repository.
2. In Firefox, go to `about:debugging` → **This Firefox** → **Load Temporary Add-on…**.
3. Select `manifest.json` from the repository root.

The temporary add-on stays until you restart Firefox. Reload it from the same page after code changes.

---

## How to use

1. **Save your details**  
   Click the Snap Savior icon → **My details**. Enter your Snapchat **Username**, **Email**, and **Mobile Number**, then click **Save**.  
   - Email and mobile numbers are validated before saving
   - Usernames are automatically sanitized (invalid characters removed)
   - These are stored only on your device.

2. **Restore bulk streaks**  
   In **Restore bulk streaks**, enter one friend’s Snapchat username per line. Click **Open tabs & fill**.  
   - Duplicate usernames are automatically filtered
   - Progress indicator shows "Opening X of Y tabs..."
   - You can cancel the operation at any time using the **Cancel** button
   - The extension opens one tab per friend, goes to the official Snapchat streak restore form, and fills your details plus that friend’s username
   - It does **not** submit the form (because of CAPTCHA)

3. **Submit each request**  
   In each tab, solve the CAPTCHA and click **Submit** when you’re ready.

---

## Privacy

- Your saved details (username, email, mobile) are stored **only in your browser** (local storage).
- Nothing is sent to the extension author or any third-party server.
- Data is used solely to fill the form on help.snapchat.com in your own tabs.  
  The extension declares **no data collection** in its manifest.

---

## Permissions

| Permission        | Why |
|-------------------|-----|
| **Storage**       | Save and read your details (username, email, mobile) locally. |
| **Tabs**          | Open one new tab per friend. |
| **help.snapchat.com** | Run the fill script only on the official Snapchat support form page. |

---

## Building from source

To produce the same package as published on AMO:

**Requirements:** A shell (Linux, macOS, or Windows with WSL / Git Bash) and `zip`.

```bash
chmod +x build.sh
./build.sh
```

This creates `snap-savior.zip` with the add-on files only (no transpilation or minification). The extension source is plain HTML, CSS, and JavaScript.

---

## Features

- ✅ **Input validation** - Email, mobile number, and username validation
- ✅ **Duplicate filtering** - Automatically removes duplicate usernames
- ✅ **Progress indicator** - Real-time progress bar showing tab opening status
- ✅ **Cancellation** - Cancel bulk operations at any time
- ✅ **Error handling** - Graceful handling of tab creation failures and closed tabs
- ✅ **Security** - Content Security Policy and input sanitization

## License

MIT License.
