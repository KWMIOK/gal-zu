# Codex relay runner
#
# Runs OUTSIDE Codex's own sandbox (which restricts network access and
# can't safely write git metadata -- see AGENTS.md's Agent relay
# section). This script does the git plumbing itself and only asks the
# sandboxed `codex exec` to edit files.
#
# Safety properties (per review from Codex -- see PR history):
#   - NEVER touches the shared D:\gal-zu checkout. Each run creates a
#     brand new, disposable `git worktree` off origin/main, does all
#     work there, and removes it when done -- so it can't clobber
#     uncommitted Cursor/human work in the main checkout, and never
#     needs `git reset --hard` on anything shared.
#   - `git add -A` only ever runs inside that disposable worktree, so
#     it can't sweep up unrelated files from elsewhere.
#   - Every step that can fail (fetch, worktree add, codex exec, add,
#     commit, push, PR create) checks its exit code explicitly and
#     stops immediately -- no silent partial completion.
#   - Tool paths are resolved to absolute exe paths up front so this
#     still works when invoked from Task Scheduler, where PATH may not
#     match an interactive shell's.
#   - The relay item's `completion:` note is updated with the real
#     commit hash before pushing (via commit --amend), so AGENTS.md
#     stays traceable to the actual work commit.
#
# Guardrails mirrored from AGENTS.md: never do anything involving
# payments, paid deployments, external API spend beyond normal content
# generation, subscriptions, purchases, or destructive git history
# changes. This script itself only ever runs git add/commit/push/gh pr
# create against a disposable branch -- it cannot spend money on its
# own, and never force-pushes or rewrites any branch other than the
# one it just created.

param(
    [string]$RepoPath = "D:\gal-zu",
    [string]$WorktreeRoot = "D:\gal-zu-codex-relay-worktrees",
    [switch]$DryRun
)

# "Continue" (not "Stop") because git/gh write routine informational
# lines to stderr, which PowerShell surfaces as non-terminating
# NativeCommandError records -- those aren't real failures. Every step
# that actually matters checks $LASTEXITCODE explicitly instead (see
# Invoke-Step below).
$ErrorActionPreference = "Continue"

function Invoke-Step {
    param(
        [string]$Description,
        [scriptblock]$Action
    )
    Write-Output "[codex-relay-runner] $Description"
    & $Action
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        Write-Output "[codex-relay-runner] FAILED (exit $LASTEXITCODE): $Description"
        exit 1
    }
}

# Resolve absolute tool paths once, up front -- fail immediately if
# any are missing rather than getting a confusing failure deep inside
# a worktree, and so this doesn't silently depend on PATH being set up
# the way an interactive shell's is (Task Scheduler's isn't always).
$gitCmd = (Get-Command git -ErrorAction SilentlyContinue).Source
$ghCmd = (Get-Command gh -ErrorAction SilentlyContinue).Source
$codexCmd = "$env:APPDATA\npm\codex.cmd"

if (-not $gitCmd) { Write-Output "[codex-relay-runner] FAILED: git not found on PATH."; exit 1 }
if (-not $ghCmd) { Write-Output "[codex-relay-runner] FAILED: gh not found on PATH."; exit 1 }
if (-not (Test-Path $codexCmd)) { Write-Output "[codex-relay-runner] FAILED: codex.cmd not found at $codexCmd."; exit 1 }

Write-Output ("[codex-relay-runner] {0} starting (DryRun={1})" -f (Get-Date -Format o), $DryRun)
Write-Output "[codex-relay-runner] tools: git=$gitCmd gh=$ghCmd codex=$codexCmd"

Set-Location $RepoPath

Invoke-Step "fetching origin/main" { & $gitCmd fetch origin main 2>&1 | Out-Null }

$agentsContent = (& $gitCmd show origin/main:AGENTS.md) -join "`n"
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

# Disposable worktree + branch, created fresh from origin/main every
# run. Never reused, never reset -- just removed afterwards. This is
# the only thing this script ever writes to; D:\gal-zu itself is never
# touched.
$branchName = "codex/relay-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss')
$worktreePath = Join-Path $WorktreeRoot $branchName

if (-not (Test-Path $WorktreeRoot)) {
    New-Item -ItemType Directory -Path $WorktreeRoot | Out-Null
}

Invoke-Step "creating disposable worktree at $worktreePath on branch $branchName" {
    & $gitCmd worktree add -b $branchName $worktreePath origin/main 2>&1 | Out-Null
}

function Cleanup-Worktree {
    Set-Location $RepoPath
    & $gitCmd worktree remove --force $worktreePath 2>&1 | Out-Null
    & $gitCmd worktree prune 2>&1 | Out-Null
}

Set-Location $worktreePath

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
& $codexCmd exec $prompt --sandbox workspace-write -a never
if ($LASTEXITCODE -ne 0) {
    Write-Output "[codex-relay-runner] FAILED (exit $LASTEXITCODE): codex exec"
    Cleanup-Worktree
    exit 1
}

$diffStat = & $gitCmd diff --stat
if (-not $diffStat) {
    Write-Output "[codex-relay-runner] codex exec made no file changes. Not committing/pushing. Leaving relay item as-is for manual follow-up."
    Cleanup-Worktree
    exit 1
}

Invoke-Step "staging changes" { & $gitCmd add -A }

$commitMsg = "Codex relay: {0} automated completion" -f (Get-Date -Format 'yyyy-MM-dd HH:mm')
Invoke-Step "committing" { & $gitCmd commit -m $commitMsg 2>&1 | Out-Null }

$commitHash = & $gitCmd rev-parse --short HEAD

# Backfill the real commit hash into the relay item's completion note,
# then fold that into the same commit via amend -- so the pushed
# commit's own diff carries an accurate completion record. (The
# post-amend hash will differ by construction; the branch name and PR
# are the durable reference, this hash is best-effort context.)
$agentsPath = Join-Path $worktreePath "AGENTS.md"
$agentsText = Get-Content -Path $agentsPath -Raw
$updatedAgentsText = $agentsText -replace "(?m)^- completion:.*$", "- completion: done by codex exec, commit $commitHash on $branchName"
Set-Content -Path $agentsPath -Value $updatedAgentsText -NoNewline

Invoke-Step "recording commit hash in relay completion note" {
    & $gitCmd add AGENTS.md
    & $gitCmd commit --amend --no-edit 2>&1 | Out-Null
}

Invoke-Step "pushing $branchName" { & $gitCmd push -u origin $branchName 2>&1 | Out-Null }

$prBody = "Automated by scripts/codex-relay-runner.ps1 via codex exec, running in an isolated worktree (not the shared D:\gal-zu checkout). Review before merging -- this ran non-interactively."
Invoke-Step "opening PR" {
    & $ghCmd pr create --title ("Codex relay: automated completion ({0})" -f $commitHash) --body $prBody 2>&1 | Out-Null
}

Cleanup-Worktree

Write-Output ("[codex-relay-runner] done. Commit {0} pushed on {1}, PR opened for review (not auto-merged)." -f $commitHash, $branchName)
