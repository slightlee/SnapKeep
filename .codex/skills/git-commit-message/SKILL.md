---
name: git-commit-message
description: Generate, review, and split Git commit messages from staged or working tree diffs. Prefer repository-specific commit conventions when docs or configs exist; otherwise fall back to Conventional Commits. Use when the user asks for a commit message, commit format guidance, commit splitting advice, or version bump / release commit wording.
---

# git-commit-message

Use this skill when the user wants a commit message for current changes, wants to validate an existing message, wants to know whether a commit should be split, or needs a version bump / release-related commit title.

## Rule Priority

Apply rules in this order:

1. Explicit user instruction in the current conversation
2. Repository-local commit rules and contribution docs
3. Repository tooling and config
4. Recent repository history
5. Default Conventional Commits fallback

## Discover Repository Rules

Before proposing a message, discover repository rules in this order:

1. Confirm this is a Git repository:
   - `git rev-parse --is-inside-work-tree`
2. Read high-priority rule files if they exist:
   - `AGENTS.md`
   - `CONTRIBUTING.md`
   - `README.md`
3. Search docs for explicit commit or release conventions:
   - `rg -n "(commit|conventional commits|commitlint|release|version|changelog|tag)" doc docs .`
   - If the repository docs are primarily written in another language, also search equivalent local-language keywords.
4. Check tooling:
   - `rg --files -g "commitlint.config.*" -g ".commitlintrc*" -g ".cz-config.*" -g "package.json" .`
5. Inspect recent history:
   - `git log --oneline -n 20`

Use repository rules when they are explicit. Use recent history only to infer style when written rules are absent or incomplete.

If written rules conflict with commit history, prefer written rules.

## Inspect Changes

Check changes in this order:

1. `git status --short`
2. If staged changes exist, inspect:
   - `git diff --staged --name-only`
   - `git diff --staged --stat`
   - `git diff --staged`
3. If nothing is staged, inspect:
   - `git diff --name-only`
   - `git diff --stat`
   - `git diff`

Prefer staged diff when deciding the final message. Use working tree diff only when the user has not staged changes yet.

## Change-Set Precedence

Interpret change scope using these rules:

- If staged changes exist, treat the staged diff as the primary commit candidate.
- If unstaged or untracked changes also exist, explicitly say that the recommendation is based on the staged diff only.
- Do not merge staged and unstaged changes into one recommendation unless the user explicitly asks for a message for the entire working tree.
- If the user asks for a message before staging and the working tree contains unrelated changes, recommend staging by intent first.

## Learn Repository Style

If the repository has no explicit commit spec, infer style from recent commits:

- Determine whether the repo consistently uses Conventional Commits or another stable pattern.
- Reuse the repository's preferred scope style only if it is consistent.
- Do not imitate obviously low-quality history if it contains mixed styles, vague summaries, or multi-intent titles.
- If history is noisy or inconsistent, fall back to the default rules in this skill.

## Default Rules

When the repository does not define stricter rules, use:

- Format: `<type>(<scope>): <summary>`
- `type`: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `style`, `revert`
- `scope`: use a stable module or domain name; omit it if unclear
- `summary`: concise, single-intent, result-oriented, no trailing punctuation

Prefer:
- `feat` for user-visible capability changes
- `fix` for behavioral bug fixes
- `refactor` for structural changes without external behavior change
- `style` for formatting or pure UI/style adjustments without behavior change
- `docs` for documentation-only changes
- `chore` for maintenance or version-only changes

## Decision Rules

1. Decide whether the current diff expresses one change intent.
2. If there are multiple independent intents, do not force a single commit message. Recommend splitting by intent and provide one message per split.
3. Choose `type` from repository rules if present, otherwise from the default set above.
4. Choose `scope` in this order:
   - repository-defined scope list or examples
   - top-level domain or module name
   - stable feature area inferred from changed files
   - omit scope if confidence is low
5. Keep `summary` short and specific.
6. Use English for `type` and usually for `scope`. Match the repository or user language for `summary` unless the repository clearly standardizes on one language.

## Scope Heuristics

When repository rules do not define scope names, infer scope using these patterns:

- `docs`: documentation areas such as `docs`, `readme`, `release`, `api-docs`
- `version` or `release`: version constants, changelog, tag workflow, release scripts
- `skills`: reusable AI skills, prompts, or agent workflow assets
- `tooling`: lint, format, commit tooling, local developer scripts
- `build`: bundlers, package manager config, compile pipeline
- `ci`: GitHub Actions, CI pipelines, automation jobs
- `frontend`, `backend`, `api`, `auth`, `db`, `backup`, `deploy`: use clear application domains when the file paths support them

Use directory or domain names first. Use component or file names only when the repository consistently uses them in history or docs.

Special cases:
- If version files are updated together, prefer the repository's version bump pattern; if none exists, default to `chore(release): bump version to X.Y.Z`.
- If the change is only release/process documentation, prefer `docs(release): ...` when that matches repo terminology.
- If the change is pure style/layout without behavior change, prefer `style(...)` instead of `feat(...)`.
- If the user asks to validate an existing commit message, check it against repository rules first, then propose the minimal correction.

## Split Thresholds

Recommend splitting when any of these are true:

- Different `type` values are required for different file groups
- The diff mixes product code and docs with no single dominant intent
- The diff mixes version bump or release metadata with feature work
- The diff contains both reusable tooling assets and repository documentation
- The files fall into clearly separable domains that could be reverted independently

Do not recommend splitting just because many files changed. A large diff can still be one commit if it expresses one intent.

## Supporting File Rule

Do not split out supporting files automatically. Keep them with the primary intent when they only enable or document that intent.

Typical supporting files:

- `.gitignore` updates that only make a new tracked asset committable
- `README` links that only expose a newly added feature, tool, or skill
- small config adjustments required to make one primary change work

Split supporting files into a separate commit only when they introduce an independent policy, workflow, or tooling decision.

## Failure and Escalation Cases

Do not guess silently. Handle these cases explicitly:

- Not a Git repository:
  explain that no Git context is available and ask for a diff or file list.
- No staged or working tree changes:
  say that there is no change set to summarize.
- Diff contains several unrelated areas:
  recommend splitting and group files by intent.
- Repository rules are contradictory:
  explain the conflict and state which rule source was prioritized.
- Scope is too ambiguous:
  omit scope instead of inventing a misleading one.
- Staged and unstaged changes coexist:
  state which change set the recommendation is based on.

## Output Format

Return:

```text
Context used: staged | working tree | existing message
Recommended message: <single best message or "Do not combine into one commit">
Alternative messages: <None or alternate phrasings for the same evaluated change set>
- <option 1>
- <option 2>
Split recommended: Yes|No
Split plan:
- <group or message suggestion>
Reason: <brief explanation>
```

Rules:
- Always state the context used.
- `Recommended message` is the single best message for the evaluated change set.
- `Alternative messages` are alternate phrasings for the same evaluated change set. Do not use this section to list split groups.
- If split is needed, `Alternative messages` may be `None`.
- If no split is needed, keep `Split plan` empty or write `None`.
- If split is needed, `Recommended message` must be `Do not combine into one commit`.
- If split is needed, use `Split plan` to provide one message per group and name the grouping basis.
- Keep the explanation brief and concrete.

## Examples

```text
feat(auth): add email login support
fix(api): handle empty response body on restore
docs(release): document release tagging workflow
chore(release): bump version to 1.4.0
```

When reviewing an existing message, return the original message, the corrected message, and the exact rule it violates.

Do not create extra docs or scripts unless the repository rules become too complex to apply reliably from the diff.
