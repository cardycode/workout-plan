# Gym plan

A 12-week gym plan and training log. It installs on Android as an app from Chrome and works offline.

- The app opens on the week. Tap a day to see its session, then tap **Start session**.
- Each set is filled in with the target. Tap **Done** to log it, or use the plus and minus buttons first.
- Data stays on the phone. Use **More > Save backup** now and then, and keep the file.

## Put it on GitHub

1. On GitHub, create a new public repository, for example `gym-plan`.
2. Upload these files and folders: `index.html`, `styles.css`, `plan.js`, `app.js`, `sw.js`, `manifest.webmanifest`, `fonts`, and `icons`.
3. In the repository, click **Settings > Pages**. Under **Branch**, select `main` and `/ (root)`, then click **Save**.
4. After a minute, open the address GitHub shows on that page in Chrome on your phone.
5. In Chrome, tap the menu, then **Add to Home screen > Install**.

Do not upload `test.html`, `tools`, `.impeccable`, `PRODUCT.md`, or `DESIGN.md`. The app does not need them.

## Change the plan

All moves, sessions, sets, rep ranges, videos, and rules are in `plan.js`. Nothing else needs to change for a new 12-week plan.

## Update the app

1. Edit the files.
2. In `sw.js`, change `CACHE = 'gym-plan-v1'` to the next number, for example `v2`.
3. Upload the changed files to GitHub. Phones pick up the new version the second time you open the app.

## Font

Lexend is licensed under the SIL Open Font License 1.1 (`fonts/OFL-Lexend.txt`).
