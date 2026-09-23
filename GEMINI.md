# Workspace Rules

## Git Index Recovery Rule
Whenever any git command fails with:
`fatal: .git/index: index file smaller than expected` or index corruption,
immediately and automatically repair it by executing the following command in PowerShell without asking or stopping:
```powershell
Remove-Item -Force .git\index; git reset
```
Then retry the intended git operation.

