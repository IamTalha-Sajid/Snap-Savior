# Snap Savior – Firefox Extension

Fill Snapchat’s streak restore form in bulk from the browser. Save your details once, then open one tab per friend and auto-fill each form. You solve the CAPTCHA and submit each tab yourself.

---

## Source code and build (for reviewers)

This add-on has **no transpilation, minification, or concatenation**. All source files (HTML, CSS, JavaScript, JSON, PNG) are human-readable and are packaged as-is into the submission ZIP.

### Build environment requirements

- **Operating system:** Any system with a Unix-like shell (Linux, macOS, or Windows with WSL / Git Bash).
- **Required tools:** `zip` (Info-ZIP or compatible). Usually pre-installed on Linux and macOS; on Windows use WSL, Git for Windows, or 7-Zip from the command line.
- **Not required:** Node.js, npm, or any other runtime. No third-party libraries are used.

### Step-by-step build instructions

1. **Obtain the source code**  
   Clone or download the repository so you have the `firefox-extension` directory with all files (e.g. `manifest.json`, `popup.html`, `popup.css`, `popup.js`, `background.js`, `content.js`, `icons/`, `build.sh`).

2. **Open a terminal** in the `firefox-extension` directory:
   ```bash
   cd path/to/firefox-extension
   ```

3. **Run the build script:**
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

4. **Output**  
   The script creates `snap-savior.zip` in the same directory. This ZIP contains only the add-on files (manifest, popup, scripts, icons) and is the exact package submitted to addons.mozilla.org.

### What the build script does

`build.sh` runs `zip -r` to package the following into `snap-savior.zip`:

- `manifest.json`
- `popup.html`, `popup.css`, `popup.js`
- `background.js`, `content.js`
- `icons/` (all icon files)

It excludes: `build.sh`, `README.md`, `color-pallete.txt`, `.git`, `__MACOSX`, `.DS_Store`, and other non-add-on files. No code is modified or generated; the script only collects and zips the source files.

### Verifying the build

Unzip `snap-savior.zip` and confirm it contains the same files and content as the source. The add-on runs in Firefox when loaded from the unpacked files or from the ZIP via “Load Temporary Add-on” (select the manifest inside the ZIP or an unpacked copy).

---

## How to install (temporary)

1. Open Firefox and go to `about:debugging`.
2. Click **This Firefox** (or **This Nightly**).
3. Click **Load Temporary Add-on…**.
4. In the `firefox-extension` folder, select **manifest.json**.

The add-on will stay loaded until you restart Firefox. Reload it from the same page after you change any file.

## How to use

1. **My details**  
   Enter your Snapchat **Username**, **Email**, and **Mobile Number**, then click **Save**. These are stored locally and used to fill the form in every tab.

2. **Restore bulk streaks**  
   In the text area, enter one friend’s Snapchat username per line. Click **Confirm**.  
   The extension opens one new tab per username to the Snapchat streak restore form and fills your details plus that friend’s username. It does **not** submit (because of CAPTCHA).  
   Solve the CAPTCHA and click **Submit** in each tab when you’re ready.

## Permissions

- **Storage**: to save and read your details (username, email, mobile).
- **Tabs**: to open new tabs for each friend.
- **help.snapchat.com**: to run the fill script on the form page only.

## Publishing

Package the add-on by running `./build.sh`, then submit the generated `snap-savior.zip` at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/). For source code submission, upload a ZIP of this entire `firefox-extension` directory (including this README and `build.sh`).
