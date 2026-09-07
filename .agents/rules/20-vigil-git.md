---
description: Git hygiene and safety constraints. Always active.
---

# Vigil Git Hygiene

1. **Never reset unrelated user changes**: Do not run `git reset --hard` or destructive operations on files you are not actively managing.
2. **Never overwrite uncommitted work**: Ensure the working directory is safe before applying changes that might wipe out user progress.
3. **Inspect diff before completion**: Always review the final diff to ensure no debugging artifacts or unintended changes leak into the project.
4. **Do not commit unless requested**: Present the changes and leave the decision to commit to the user, unless explicitly asked to automate the commit.
