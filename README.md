# microbit-class-portal

A small, student-facing website for sharing micro:bit MakeCode tutorials by
class. Students open the site, pick their class, click a tutorial, and the
guided MakeCode tutorial runs **embedded right on the page**.

Live site: <https://siflueckiger.github.io/microbit-class-portal/>

- Student view: `/`
- Teacher admin: `/#/admin`

## How it works

- Tutorials are plain MakeCode Markdown, stored under `public/tutorials/<class>/`.
- `public/manifest.json` lists each tutorial (`class`, `title`, `description`,
  `file`).
- The site reads the manifest and tutorial files from the `main` branch on
  GitHub, so publishing a tutorial does **not** require a rebuild.
- The tutorial is loaded into an embedded MakeCode editor with
  `@microbit/makecode-embed`'s `importTutorial`.

```
public/
  manifest.json
  tutorials/
    5a/flashing-heart.md
    7b/dice.md
```

## For students

Share the site URL. They:

1. pick their class,
2. click a tutorial,
3. follow the steps and download to the micro:bit.

No accounts or logins.

## For the teacher: adding a tutorial

1. Open `https://siflueckiger.github.io/microbit-class-portal/#/admin`.
2. **Connect GitHub** with a fine-grained token:
   - Go to <https://github.com/settings/personal-access-tokens/new>.
   - **Repository access**: *Only select repositories* → `microbit-class-portal`.
   - **Repository permissions** → **Contents: Read and write**.
   - Generate and copy the token.
   - Paste it into the admin page. It is stored only in your browser.
3. Paste the tutorial Markdown (exported from your block-authoring tool), set
   the title, description and class, then **Publish tutorial**.

You can also delete tutorials from the same page. Publishing commits the
Markdown file and updates `manifest.json` via the GitHub API.

> GitHub's raw CDN caches files for a few minutes, so a newly published
> tutorial may take a short while to appear for students.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:5174>. In development the app reads the bundled
`public/manifest.json` and tutorials, so it works without GitHub.

## Build and deploy

```bash
npm run build     # type-check + production build into dist/
npm run deploy    # build and publish dist/ to the gh-pages branch
```

GitHub Pages serves the `gh-pages` branch (with `.nojekyll`).

## Configuration

Edit `src/config.ts` to change:

- `REPO.owner` / `REPO.name` / `REPO.branch` — where tutorial data lives.
- `SITE_TITLE` / `SITE_SUBTITLE` — the student-facing heading.

## Notes

- Tutorial content is public (MakeCode Markdown must be publicly fetchable);
  "class" organizes and filters, it does not make content private.
- The admin page is effectively gated by the GitHub token: without it you can
  view the form but not publish.
- The token is a credential. Use a fine-grained token scoped to this repo only,
  and click **Disconnect** on shared machines.
