# Chemical Potential Lab

## Source and publication
- This is the editable source for https://github.com/cmku-dft/chemical-potential-lab.
- The primary app is https://cmku-dft.github.io/chemical-potential-lab/.
- The user has requested GitHub Pages hosting and easy ongoing updates. Use the existing GitHub repository; do not create a replacement repository or site.
- Main-branch pushes run `.github/workflows/pages.yml`, which checks the app and publishes `dist` to Pages. Pull requests run checks without publishing.
- The original ChatGPT Sites URL is an independent deployment. `.openai/hosting.json` retains its identity, but GitHub pushes do not update that URL. Update it only when the user requests it.
- Before editing, inspect the worktree and remote branch. Preserve user changes and use a fast-forward pull when appropriate. Never force-push routine updates.

## Development
- Edit `dist/` directly: this is authored source, not generated build output.
- No package installation is necessary. Node.js 22+ is sufficient.
- `npm run dev` serves the app locally; `npm run check` and `npm test` validate it.
- `npm run build:pages` produces ignored `.pages-output/`; never edit that directory directly.
- Keep asset links relative so the app works under `/chemical-potential-lab/`.
- Binary hosts use one independent potential, shown as an interval or a 2D host line. Never invent a third constituent or classify every binary line as marginal.
- Preserve scientific constraints, energy units, formula parsing, session compatibility, and SVG/PNG export behavior.
- Preserve the distinction between illustrative energies and published HSE data, including the two conflicting ZnSb2O4 host energies.
- Do not add Chesta code/assets or private DFT datasets, local sessions, credentials, or unpublished research files.
- After a requested published change, commit the relevant files, push to GitHub, and verify the Actions result for that exact commit before reporting success.
