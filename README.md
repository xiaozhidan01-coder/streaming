# streaming

海外流媒体更新 — a static mobile web app (PWA) listing weekly Netflix / HBO Max / Disney+ / Apple TV / Prime Video releases.

Live: https://xiaozhidan01-coder.github.io/streaming/

Plain static site, no build step. Served by GitHub Pages from branch `main`, folder `/`. All asset paths are relative, so it works under the `/streaming/` sub-path. `.nojekyll` disables Jekyll processing.

Local preview: `python3 -m http.server` in the repo root, then open http://localhost:8000/.
