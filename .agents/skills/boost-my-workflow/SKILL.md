---
name: boost-my-workflow
description: Run all four developer workflow plugins (Ponytail, Impeccable, Obsidian CLI, Graphify) in a single unified command. Invoke when the user says "boost my workflow" or wants to set up/run the full productivity stack.
---

# Boost My Workflow — Unified Plugin Orchestrator

## Overview
This skill orchestrates **four developer plugins** in a single command to maximize code quality, design fidelity, codebase understanding, and knowledge capture:

1. **Ponytail** — Enforces minimal, clean code ("lazy senior developer" philosophy)
2. **Impeccable** — Eliminates AI design slop and enforces premium UI/UX standards
3. **Obsidian CLI** — Captures decisions, logs, and context into an Obsidian vault
4. **Graphify** — Builds a queryable knowledge graph of the codebase

## When to Invoke
- User says **"boost my workflow"**
- User asks to "set up all plugins" or "run the full workflow"
- At the start of a new development session on this project

---

## Execution Sequence

### Step 1: Verify Prerequisites
Check that all four tools are installed. If any are missing, install them:

```bash
# Check Ponytail
# Ponytail integrates as an AI agent skill — verify skill files exist
# If not present, create ponytail configuration

# Check Impeccable
npx impeccable --version 2>/dev/null || echo "Impeccable not installed"

# Check Obsidian CLI
obsidian --version 2>/dev/null || echo "Obsidian CLI not installed"

# Check Graphify
pip show graphifyy 2>/dev/null || pip install graphifyy
graphify --version 2>/dev/null || echo "Graphify not installed"
```

### Step 2: Install Missing Tools
For each missing tool, run the appropriate installer:

```bash
# Ponytail: Create agent rules in .agents/AGENTS.md
# (Ponytail's core logic is embedded as agent rules below)

# Impeccable: Install via npx
npx impeccable install

# Obsidian CLI: Requires manual install from https://obsidian.md/cli
# Skip if not available — log session notes to project markdown instead

# Graphify: Install via pip
pip install graphifyy && graphify install
```

### Step 3: Run the Boost Sequence

Execute in this order:

#### 3a. Graphify — Build/Update Knowledge Graph
```bash
# Build or update the codebase knowledge graph
graphify . --update
```
This creates/updates `graphify-out/` with:
- `graph.html` — Interactive codebase visualization
- `GRAPH_REPORT.md` — AI-readable architecture summary
- `graph.json` — Structured graph data

#### 3b. Impeccable — Initialize Design System
```bash
# Initialize or refresh design context
npx impeccable init
```
This creates/updates:
- `PRODUCT.md` — Product identity and brand voice
- `DESIGN.md` — Design system tokens, patterns, constraints

#### 3c. Ponytail — Apply Code Simplification Rules
The agent should now apply Ponytail's decision ladder to any code being written:
1. Does it need to exist? (YAGNI)
2. Does the stdlib do it? (Use it)
3. Is there a native platform feature? (Use it)
4. Is there an existing dependency? (Use it)
5. Can it be one line? (One line)
6. Only then: Write minimal code

#### 3d. Obsidian / Session Logging
Log the current session context to the project:
```bash
# If Obsidian CLI is available:
obsidian daily:append content="- [$(date)] AeroSphere dev session started. Plugins: Ponytail ✓, Impeccable ✓, Graphify ✓"

# Fallback: Append to project dev log
echo "## $(date) — Dev Session" >> docs/dev-log.md
echo "- Graphify graph updated" >> docs/dev-log.md
echo "- Impeccable design context refreshed" >> docs/dev-log.md
echo "- Ponytail simplification rules active" >> docs/dev-log.md
```

### Step 4: Report Results
After all steps complete, report to the user:
```
✅ Workflow Boosted!
├── 📊 Graphify: Knowledge graph updated (X nodes, Y edges)
├── 🎨 Impeccable: Design system initialized (DESIGN.md, PRODUCT.md)
├── 🧹 Ponytail: Code simplification rules ACTIVE
└── 📝 Obsidian: Session logged
```

---

## Ponytail Rules (Embedded)
These rules are always active after boosting:

> **BEFORE writing any code, traverse this ladder. Stop at the first rung that works:**
> 1. Skip it entirely (YAGNI)
> 2. Use stdlib / built-in
> 3. Use existing dependency
> 4. Write it in one line
> 5. Write the minimum that works
>
> **NEVER**: Add abstractions "for later", create wrapper classes around simple APIs, add configuration for things with one valid value, or split a 10-line function into 3 files.

---

## Integration with AeroSphere Studio
When boosting the AeroSphere Studio project specifically:
- Graphify indexes: `src/`, `docs/`, `*.md` (excludes `node_modules/`, `.git/`, `graphify-out/`)
- Impeccable enforces: dark glassmorphism theme, Outfit typography, HSL color palette
- Ponytail prevents: over-abstraction of SimConnect wrappers, unnecessary middleware layers
- Session log captures: which pillar (LOD/SharedCockpit/Career) is being worked on
