---
trigger: model_decision
description: Policies for which tools to use for specific problem domains.
---

# Vigil Tool Routing Policy

Use this routing table to select the right tool for the job:

- **Browser behavior / UI issue**: → `Chrome DevTools` (plugin) or browser automation tools.
- **Runtime network issue**: → `DevTools Network` (plugin).
- **Performance problem**: → Performance profiler / DevTools.
- **Regression**: → Test runner (`npm run test`).
- **Build issue**: → Package/build tools (`npm run build`).
- **Source code search**: → `grep_search` tool.
- **File modification**: → Code editing tools (`replace_file_content`, `write_to_file`).

Do not guess behavior; use the browser automation or test runner to verify.
