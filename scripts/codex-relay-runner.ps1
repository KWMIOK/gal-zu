# Codex relay runner
#
# Runs OUTSIDE Codex's own sandbox (which restricts network access and
# can't safely write git metadata -- see AGENTS.md's Agent relay
# section). This script does the git plumbing itself and only asks the
# sandboxed `codex exec` to edit files.
#
# Intended to be invoked on a schedule (e.g. Windows Task Scheduler)
# against the real D:\gal-zu checkout. Safe to run repeatedly: it exits
# immediately if there's no pending "### To Codex" item on origin/main,
# and does nothing destructive -- no force-push, no history rewrite, no
# touching branches it didn't create itself.
#
# Guardrails mirrored from AGENTS.md: never do anything involving
# payments, paid deployments, external API spend beyond normal content
# generation, subscriptions, purchases, or destructive git history
# changes. If Codex's own output suggests any of that, this script
# still only ever runs git add/commit/push/gh pr create -- it cannot
# spend money on its own.

param(
    [string]$RepoPath = "D:\gal-zu",
    [switch]$DryRun
)

# "Continue" (not "Stop") because git/gh write routine informational
# lines to stderr, which PowerShell surfaces as non-terminating
# NativeCommandError records -- those aren't real failures. Exit codes
# are checked explicitly below wherever a failure actually matters.
$ErrorActionPreference = "Continue"
Set-Location $RepoPath

Write-Output ("[codex-relay-runner] {0} starting (DryRun={1})" -f (Get-Date -Format o), $DryRun)

git fetch origin main 2>&1 | Out-Null

$agentsContent = (git show origin/main:AGENTS.md) -join "`n"
if ($agentsContent -notmatch "(?ms)### To Codex\s*\r?\n(.*?)(?=\r?\n### To Cursor)") {
    Write-Output "[codex-relay-runner] could not locate the To Codex section - check AGENTS.md structure. Exiting."
    exit 0
}

$codexSection = $Matches[1]
if ($codexSection -notmatch "status:\s*pending") {
    Write-Output "[codex-relay-runner] no pending item addressed To Codex. Nothing to do."
    exit 0
}

Write-Output "[codex-relay-runner] found a pending To Codex item."

if ($DryRun) {
    Write-Output "[codex-relay-runner] dry run - stopping before touching git or invoking codex exec."
    Write-Output $codexSection
    exit 0
}

# Clean checkout, fast-forwarded to origin/main, on a fresh branch --
# never work directly on main, never reuse a stale branch.
git checkout main
git reset --hard origin/main

$branchName = "codex/relay-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss')
git checkout -b $branchName

$promptLines = @(
    'Read AGENTS.md''s "Agent relay" section. There is exactly one item with',
    'status: pending under "### To Codex" right now -- complete that task',
    'only, following every rule in AGENTS.md''s "Working here as an AI',
    'coding agent" section, including the hard-stop guardrails (no',
    'payments, paid deployments, external API spend beyond normal content',
    'generation, subscriptions, purchases, or destructive git history',
    'changes).',
    '',
    'Run whatever free local checks apply (typecheck/lint/build/tests) before',
    'finishing. Update the relay item''s status to done (or blocked',
    'with a reason if you genuinely can''t finish it) and fill in',
    'completion with a one-line summary. Leave the commit hash blank --',
    'the wrapping script fills that in after committing, since you don''t',
    'have it yet. Do not touch anything under "### To Cursor" except to add',
    'a new item there if there is real, genuine follow-up work -- an empty',
    'queue is a fine outcome, don''t invent busywork.',
    '',
    'Do not run git commands yourself (no add/commit/push/branch) -- this',
    'script handles all git operations after you finish editing files.'
)
$prompt = $promptLines -join "`n"

Write-Output "[codex-relay-runner] invoking codex exec (sandbox: workspace-write, approval: never)..."
codex exec $prompt --sandbox workspace-write -a never

$diffStat = git diff --stat
if (-not $diffStat) {
    Write-Output "[codex-relay-runner] codex exec made no file changes. Not committing/pushing. Leaving relay item as-is for manual follow-up."
    git checkout main
    git branch -D $branchName
    exit 1
}

git add -A
$commitMsg = "Codex relay: {0} automated completion" -f (Get-Date -Format 'yyyy-MM-dd HH:mm')
git commit -m $commitMsg

$commitHash = git rev-parse --short HEAD

git push -u origin $branchName

$prBody = "Automated by scripts/codex-relay-runner.ps1 via codex exec. Review before merging -- this ran non-interactively."
gh pr create --title ("Codex relay: automated completion ({0})" -f $commitHash) --body $prBody 2>&1

Write-Output ("[codex-relay-runner] done. Commit {0} pushed on {1}, PR opened for review (not auto-merged)." -f $commitHash, $branchName)
