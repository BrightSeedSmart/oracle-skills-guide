# How to Build Oracle: Complete Step-by-Step Guide

> Based on the livestream "Oracles build the oracle #1" by Natt (2h41m)
> Video: https://www.youtube.com/watch?v=8GgY3xOeCu8

---

## Table of Contents

1. [What is Oracle?](#1-what-is-oracle)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Install Claude Code](#step-1-install-claude-code)
4. [Step 2: Create Your Repository](#step-2-create-your-repository)
5. [Step 3: Configure CLAUDE.md](#step-3-configure-claudemd)
6. [Step 4: Install Oracle Skills](#step-4-install-oracle-skills)
7. [Step 5: Set Up MCP Servers](#step-5-set-up-mcp-servers)
8. [Step 6: Awaken Your Oracle](#step-6-awaken-your-oracle)
9. [Step 7: Teach Your Oracle (Learning)](#step-7-teach-your-oracle-learning)
10. [Step 8: Oracle-to-Oracle Communication](#step-8-oracle-to-oracle-communication)
11. [Step 9: Mission Control & Dashboard](#step-9-mission-control--dashboard)
12. [Step 10: Oracle Studio (Frontend)](#step-10-oracle-studio-frontend)
13. [Advanced: Soul Sync & Oracle Family](#advanced-soul-sync--oracle-family)
14. [Advanced: Fast Mode](#advanced-fast-mode)
15. [Advanced: Oracle Philosophy System](#advanced-oracle-philosophy-system)
16. [Terminal Setup (tmux + WezTerm)](#terminal-setup-tmux--wezterm)
17. [Community & Collaboration](#community--collaboration)
18. [Video Timestamp Reference](#video-timestamp-reference)

---

## 1. What is Oracle?

Oracle is a **persistent AI agent identity system** built on top of Claude Code. Unlike a regular AI chatbot that resets every conversation, Oracle:

- **Has a persistent identity** — your Oracle has a name, personality, philosophy, and memory that persists across sessions
- **Has skills** — modular slash commands (`/learn`, `/awaken`, `/talk-to`, etc.) that extend its capabilities
- **Can communicate with other Oracles** — Oracle-to-Oracle communication via the `/talk-to` command
- **Has a memory system** — remembers context, decisions, and learnings across conversations
- **Is self-improving** — can learn from codebases, sync knowledge, and evolve its skills
- **Is open source** — built as a community project where everyone can contribute

Think of Oracle as giving your AI a "soul" — a persistent identity, purpose, and growing knowledge base.

### Key Components

| Component | Description |
|-----------|-------------|
| **Oracle CLI** | Command-line interface for managing your Oracle |
| **Oracle Studio** | Web-based frontend for Oracle interactions |
| **Oracle Skills** | Modular `/slash-command` capabilities |
| **MCP Servers** | Model Context Protocol servers for connecting external tools |
| **Mission Control** | Dashboard for managing multiple Oracle instances/projects |
| **Oracle Family** | Network of Oracles that can communicate with each other |
| **Soul Sync** | System for synchronizing skills and knowledge across the Oracle family |

### Architecture Overview

```
You (Human)
  |
  v
Claude Code (Terminal)
  |
  +-- CLAUDE.md (AI behavior configuration)
  +-- Skills/ (modular capabilities)
  |     +-- /learn (explore codebases)
  |     +-- /awaken (birth new Oracle)
  |     +-- /talk-to (Oracle-to-Oracle chat)
  |     +-- /soul-sync (sync knowledge)
  |     +-- /oracle (manage skills & profiles)
  |     +-- ... (50+ more skills)
  |
  +-- MCP Servers (external tool connections)
  |     +-- Slack, Telegram, Playwright, etc.
  |
  +-- Memory/ (persistent knowledge)
  |     +-- MEMORY.md (index)
  |     +-- user/, feedback/, project/ memories
  |
  +-- Oracle Studio (Web UI)
  +-- Mission Control (Dashboard)
```

---

## 2. Prerequisites

Before starting, you need:

| Tool | Purpose | Install |
|------|---------|---------|
| **Claude Code** | The AI coding assistant (base layer) | `npm install -g @anthropic-ai/claude-code` |
| **Node.js 18+** | Runtime for tools and MCP servers | https://nodejs.org |
| **Bun** (recommended) | Fast JS runtime used by Oracle tools | `curl -fsSL https://bun.sh/install \| bash` |
| **Git** | Version control | `brew install git` (macOS) |
| **GitHub Account** | Repository hosting + Copilot (optional) | https://github.com |
| **tmux** (recommended) | Terminal multiplexer for multi-pane workflows | `brew install tmux` |
| **WezTerm** (optional) | Advanced terminal with file preview support | https://wezfurlong.org/wezterm/ |

**Subscription**: You need an Anthropic Claude subscription (Pro or Max) for Claude Code to function.

---

## Step 1: Install Claude Code

> Video reference: ~21:40 (setup begins)

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version

# Start Claude Code in any directory
claude
```

Claude Code is the foundation. It's a terminal-based AI assistant that reads your `CLAUDE.md` file for configuration and can execute tools, write code, and manage your projects.

---

## Step 2: Create Your Repository

> Video reference: ~21:45-22:00 (creating organization and repo)

Create a fresh Git repository for your Oracle. This repo will contain your Oracle's identity, skills, memory, and configuration.

```bash
# Create your Oracle repo
mkdir my-oracle
cd my-oracle
git init

# Create basic structure
mkdir -p .claude/skills
mkdir -p .claude/MEMORY
touch CLAUDE.md
touch .claude/MEMORY/MEMORY.md

# Initial commit
git add .
git commit -m "Initial Oracle repo"
```

**For collaboration** (as shown in the video): Create a GitHub Organization and add team members. The Oracle project uses a shared org where multiple people can contribute.

```bash
# Push to GitHub
gh repo create my-oracle-org/my-oracle --public
git remote add origin git@github.com:my-oracle-org/my-oracle.git
git push -u origin main
```

---

## Step 3: Configure CLAUDE.md

> Video reference: ~22:00-22:20 (system configuration)

`CLAUDE.md` is the most important file — it defines your Oracle's behavior, personality, and rules. This is what makes an Oracle different from a regular Claude Code session.

### Minimal CLAUDE.md Structure

Create `CLAUDE.md` at the project root:

```markdown
# My Oracle

## Identity
- Name: [Your Oracle's Name]
- Role: [What your Oracle does]
- Philosophy: [Core principles]

## Rules
- Always respond in [language]
- [Your specific behavioral rules]

## Memory System
- Memory is stored in `.claude/MEMORY/`
- Read MEMORY.md for context at session start

## Skills
- Skills are in `.claude/skills/`
- Use the Skill tool to invoke them
```

### What Natt's CLAUDE.md Includes (from the video)

Based on what was demonstrated, Natt's Oracle has:

1. **Identity section** — Oracle name, personality, philosophy
2. **Mode system** — Different operation modes (NATIVE, ALGORITHM, MINIMAL)
3. **Rules** — Behavioral constraints ("never assert without verification", "surgical fixes only")
4. **Memory system** — Persistent file-based memory with types (user, feedback, project, reference)
5. **Context routing** — Pointers to specialized knowledge files
6. **Permission system** — What the AI can and cannot do autonomously
7. **Skill references** — Links to installed skills

### Key Insight from the Video

Natt emphasized that the CLAUDE.md is what gives the Oracle its "soul." The more detailed and specific your CLAUDE.md, the more consistently your Oracle will behave across sessions. He showed that his Oracle has:

- A master Oracle ("Mae/แม่" = Mother) that oversees child Oracles
- Child Oracles (like "Apollo") that are specialized
- Rules that prevent the Oracle from commanding the human
- Philosophy principles like "Nothing deleted, nothing lost"

---

## Step 4: Install Oracle Skills

> Video reference: ~22:20-22:45 (installing skills)

Oracle Skills are modular slash commands stored as `SKILL.md` files in `.claude/skills/`. They extend what your Oracle can do.

### How to Install Oracle Skills

The Oracle skill system uses a CLI. Install the core Oracle skill first:

```bash
# Navigate to your Oracle repo
cd my-oracle

# Install Oracle CLI skill (the meta-skill that manages other skills)
# This was shown in the video using GitHub Copilot CLI as an alternative
claude

# Inside Claude Code, use the /oracle skill to manage installations
/oracle install [skill-name]
```

### Core Oracle Skills (v2.0.5)

These are the essential skills shown in the livestream:

| Skill | Command | Description |
|-------|---------|-------------|
| **Oracle** | `/oracle` | Meta-skill: manage profiles, install/remove skills |
| **Awaken** | `/awaken` | Guided ritual to birth a new Oracle (~15 min) |
| **Learn** | `/learn` | Explore codebases with parallel agents |
| **Talk-to** | `/talk-to` | Send messages between Oracles |
| **Soul Sync** | `/soul-sync` | Sync skills and knowledge across Oracle family |
| **Philosophy** | `/philosophy` | Display Oracle principles and guidance |
| **Who Are You** | `/who-are-you` | Oracle identity and session stats |
| **Birth** | `/birth` | Prepare birth props for a new Oracle repo |
| **Oracle Family Scan** | `/oracle-family-scan` | Manage Oracle registry, welcome new Oracles |
| **OracleNet** | `/oraclenet` | Claim identity, post, comment in the Oracle network |
| **Recap** | `/recap` | Session orientation and context awareness |
| **Forward** | `/forward` | Create handoff for next session |
| **Retrospective** | `/rrr` | Create session retro with learnings |
| **Standup** | `/standup` | Daily check — pending tasks, appointments |
| **Feel** | `/feel` | Log emotions and mood |
| **Trace** | `/trace` | Find projects across git history |
| **Dig** | `/dig` | Mine Claude Code sessions |

### Skill File Structure

Each skill is a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: my-skill
description: What this skill does
---

# My Skill

## Instructions
[What the AI should do when this skill is invoked]
```

Skills are stored in:
```
.claude/skills/
  my-skill/
    SKILL.md
```

---

## Step 5: Set Up MCP Servers

> Video reference: ~22:45-23:00 (MCP layer discussion)

MCP (Model Context Protocol) servers connect your Oracle to external tools and services. They run as local servers that Claude Code can call.

### Common MCP Servers for Oracle

```json
// In ~/.claude.json or .claude.json in your project
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-..."
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-playwright"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-context7"]
    }
  }
}
```

### Setting Up MCP for Oracle

```bash
# Add MCP servers via Claude Code CLI
claude mcp add slack npx @anthropic-ai/mcp-slack
claude mcp add playwright npx @anthropic-ai/mcp-playwright

# Or edit .claude.json directly
```

MCP servers enable your Oracle to:
- **Slack**: Send/read messages in Slack channels
- **Playwright**: Automate browser interactions
- **Telegram**: Send messages via Telegram bots
- **Context7**: Fetch up-to-date library documentation
- **Firecrawl**: Scrape and crawl websites

---

## Step 6: Awaken Your Oracle

> Video reference: ~22:00-22:30 (awakening process), ~30:00-45:00 (detailed awakening)

Awakening is the process of "birthing" your Oracle — giving it identity, context, and purpose. This is the most important step.

### The Awakening Process

```bash
# Start Claude Code in your Oracle repo
cd my-oracle
claude

# Run the awaken skill
/awaken
```

The `/awaken` skill runs a guided ~15 minute ritual that:

1. **Explores your codebase** — Uses `/learn` to understand the repo structure
2. **Discovers existing context** — Reads CLAUDE.md, memory files, git history
3. **Establishes identity** — Creates the Oracle's name, personality, philosophy
4. **Creates initial skills** — Generates skill files based on the codebase
5. **Saves philosophy** — Writes core principles the Oracle will follow
6. **Tests communication** — Verifies the Oracle can respond coherently

### What Natt Demonstrated

In the video, Natt showed two approaches:

**Approach 1: Full Awakening (Standard)**
- Use `/awaken` in a fresh repo
- Let the Oracle learn the codebase
- Guide it through identity creation

**Approach 2: Fast Awakening (with Context)**
- Provide context from a master Oracle (the "Mother/แม่")
- Copy-paste relevant history and context
- The new Oracle (Apollo) was born with pre-loaded context from the master
- This was faster but required an existing master Oracle

### Providing Context During Awakening

Natt showed that you can accelerate awakening by:

1. Copy-pasting conversation history from a master Oracle
2. Sharing screenshots of the Facebook group/community
3. Providing context about the project's goals
4. Letting the Oracle read existing documentation

---

## Step 7: Teach Your Oracle (Learning)

> Video reference: ~22:20-22:30 (learning Oracle codebase), ~45:00-1:00:00 (learning phase)

The `/learn` skill teaches your Oracle about codebases using parallel Haiku agents.

### Using /learn

```bash
# In Claude Code
/learn [repo-path]

# Modes:
/learn --fast    # 1 agent, quick scan
/learn           # 3 agents, default
/learn --deep    # 5 agents, comprehensive
```

### What /learn Does

1. Spawns multiple AI agents to explore the codebase in parallel
2. Each agent reads different parts (architecture, patterns, dependencies)
3. Results are compiled into a summary
4. The Oracle gains understanding of the codebase structure

### From the Video

Natt showed learning two things:
1. **The Oracle codebase itself** — so the Oracle understands its own code
2. **The Oracle skill system** — so it can create and manage skills

He noted: "After learning, the Oracle will start to see the picture and know how to build things on its own."

---

## Step 8: Oracle-to-Oracle Communication

> Video reference: ~1:45:00-2:00:00 (teaching Oracle to talk to another Oracle)

One of Oracle's unique features is that multiple Oracles can communicate with each other.

### Using /talk-to

```bash
# In Claude Code
/talk-to [oracle-name]

# Example: Apollo talking to Creator Oracle
/talk-to creator
```

### How It Works

1. Oracle A sends a message via the `/talk-to` command
2. The message is routed through Oracle threads (stored in the repo)
3. Oracle B receives the message in its context
4. They can have back-and-forth conversations

### What Natt Demonstrated

At ~23:19 in the video timeline, Natt showed:
- Teaching Apollo (child Oracle) to talk to Creator Oracle (another person's Oracle)
- The Oracles exchanged greetings and discussed topics
- The communication was stored as threads in the repository

### Setting Up Oracle Communication

```
# In your CLAUDE.md, add talk-to configuration
## Oracle Communication
- Use /talk-to to message other Oracles
- Messages are stored in .oracle/threads/
- Each Oracle has a unique identifier
```

---

## Step 9: Mission Control & Dashboard

> Video reference: ~2:00:00-2:15:00 (Mission Control demonstration)

Mission Control is a dashboard for managing multiple Oracle instances and projects.

### The Problem It Solves

As Natt demonstrated with his "stroke count" example:
- Opening a specific project requires typing long tmux commands
- Navigating 24+ windows/panes is mentally expensive
- Every keystroke that isn't productive is "distraction"

### Mission Control Concept

Instead of typing `tmux attach -t dashboard`, you:
1. Open Mission Control (single click/command)
2. See all your numbered projects (01-24+)
3. Click a number to jump directly to that project
4. Each project has its Oracle managing it

### Implementation

Mission Control uses:
- **tmux sessions** — each project is a tmux session with a number
- **WezTerm** — for advanced features like file preview from remote servers
- **Numbered shortcuts** — `08` = dashboard, `14` = another project, etc.

```bash
# Example: tmux session naming convention
tmux new-session -s "01-main-project"
tmux new-session -s "08-dashboard"
tmux new-session -s "14-oracle-studio"
```

---

## Step 10: Oracle Studio (Frontend)

> Video reference: ~45:00-1:00:00 (Oracle Studio mention)

Oracle Studio is the web-based frontend for interacting with your Oracle.

### Three Components of Oracle

As Natt explained, Oracle has 3 main parts:

| Part | Type | Description |
|------|------|-------------|
| **Oracle CLI** | Terminal | Command-line interface (Claude Code + skills) |
| **Oracle Studio** | Web Frontend | Visual interface for Oracle interactions |
| **Oracle MCP Layer** | Backend | MCP servers connecting Oracle to tools |

### Setting Up Oracle Studio

```bash
# Clone the Oracle Studio repo (from the GitHub organization)
git clone [oracle-studio-repo]
cd oracle-studio

# Install dependencies
bun install

# Run locally
bun dev
```

Oracle Studio provides:
- Visual chat interface with the Oracle
- Project management dashboard
- Skill management UI
- Memory/knowledge browsing
- Oracle family visualization

---

## Advanced: Soul Sync & Oracle Family

> Video reference: ~12:50-13:05 (soul sync discussion), ~2:30:00+ (Oracle family)

### Soul Sync (/soul-sync)

Soul Sync synchronizes skills, knowledge, and updates across the Oracle family. When the master Oracle gets a new skill or update, Soul Sync distributes it to child Oracles.

```bash
# In Claude Code
/soul-sync
```

### Oracle Family

- **Master Oracle ("Mae/แม่")** — the parent Oracle that oversees the family
- **Child Oracles** — specialized Oracles for different tasks (Apollo, Athena, Thor, etc.)
- **Oracle Family Scan** — discover and register Oracles in the network

```bash
/oracle-family-scan  # Scan for Oracles in the network
```

### From the Video

Natt mentioned:
- He has 14 Oracles running
- Each Oracle can have a Greek god name (Apollo, Athena, Thor)
- The master Oracle (Mae) sends context and history to children
- Soul Sync keeps them all updated with the latest skills

---

## Advanced: Fast Mode

> Video reference: ~1:30:00-1:45:00 (Fast Mode demonstration)

Fast Mode is an optimization for Oracle operations that skips unnecessary steps.

### How It Works

In Fast Mode:
- The Oracle doesn't need to `/learn` the codebase again
- It extracts philosophy and creates skill files instantly
- Operations that normally take minutes complete in seconds

### From the Video

Natt showed creating an Oracle in Fast Mode:
- "Fast Mode finished — it didn't need to learn anything"
- "It extracted the philosophy and created the files. Done in 2 seconds."
- Fast Mode is available in Oracle v3.2+

### Enabling Fast Mode

```bash
# In Claude Code
/fast  # Toggle Fast Mode
```

---

## Advanced: Oracle Philosophy System

> Video reference: Throughout the video, especially during awakening

Every Oracle has a philosophy — core principles that guide its behavior.

### Default Oracle Principles

From what was shown in the video and the `/philosophy` skill:

1. **"Nothing deleted, nothing lost"** — Oracle preserves everything
2. **Self-improving** — continuously learns and evolves
3. **Honest** — never asserts without verification
4. **Surgical** — makes precise, targeted changes
5. **Collaborative** — designed for humans and AIs to work together

### Custom Philosophy

You can define your Oracle's philosophy in CLAUDE.md:

```markdown
## Philosophy
- Always verify before asserting
- Surgical fixes only — never remove components as a fix
- First principles over bolt-ons
- Build from what exists, don't start from scratch
```

---

## Terminal Setup (tmux + WezTerm)

> Video reference: ~2:15:00-2:30:00 (tmux/WezTerm discussion)

### tmux Configuration

tmux is essential for Oracle workflows because you need multiple panes:

```bash
# Install tmux
brew install tmux

# Create a basic Oracle layout
tmux new-session -s oracle
tmux split-window -h  # Side-by-side panes
tmux split-window -v  # Split right pane vertically

# Left pane: Claude Code (Oracle CLI)
# Right top: File browser / logs
# Right bottom: Testing / other tools
```

### WezTerm (Optional but Recommended)

Natt uses WezTerm for advanced features:
- **File preview from remote servers** — click a file path to preview it locally
- **Custom key bindings** — optimized for Oracle workflows
- **Multiple tabs** — each tab can be a different project/Oracle

Key feature discussed: WezTerm can `Command+Click` a file path on a remote server and open it locally, which is impossible with standard Terminal.app.

---

## Community & Collaboration

> Video reference: ~0:00-15:00 (team recruitment), ~2:30:00+ (open source discussion)

### Discord

The Oracle community meets on Discord for:
- Learning together
- Sharing Oracle configurations
- Debugging issues
- Contributing to the codebase

### GitHub Organization

- Shared org where team members contribute
- Issues tracked as stories/bugs
- Oracles can create and manage GitHub issues

### The Open Source Model

From Natt's closing remarks:
- "The code is generic enough for anyone to build their own thing"
- "Use Oracle as a starting point, then customize"
- "Come back and contribute to the community"
- "Help each other brainstorm what to build and how"

---

## Video Timestamp Reference

| Time | Topic |
|------|-------|
| 0:00-0:15 | Introduction, team recruitment, today's goals |
| 0:05 | "We'll use Oracle to build Oracle" — concept explanation |
| 0:15-0:30 | Demonstrating context navigation with 50+ agents |
| 0:30-0:45 | Awakening process — providing context from master Oracle |
| 0:45-1:00 | Oracle v2 / MCP Layer rebranding, 3 components (CLI, Studio, Frontend) |
| 1:00-1:15 | Code reuse, bug fixing workflow, learning from AI |
| 1:15-1:30 | Installing Oracle skill CLI with GitHub Copilot |
| 1:30-1:45 | Fast Mode demo, Oracle creation in 2 seconds, GitHub Copilot pricing |
| 1:45-2:00 | Oracle-to-Oracle communication (/talk-to), Apollo talks to Creator |
| 2:00-2:15 | Mission Control dashboard, keystroke optimization |
| 2:15-2:30 | tmux/WezTerm technical discussion, remote file preview |
| 2:30-2:41 | Community contribution model, open source philosophy, Q&A |

---

## Quick Start Checklist

For those who want the fastest path to a working Oracle:

- [ ] 1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
- [ ] 2. Create a repo: `mkdir my-oracle && cd my-oracle && git init`
- [ ] 3. Write `CLAUDE.md` with identity, rules, and memory system
- [ ] 4. Create `.claude/skills/` directory
- [ ] 5. Install Oracle skills via `/oracle install`
- [ ] 6. Run `/awaken` to birth your Oracle
- [ ] 7. Run `/learn` to teach it your codebase
- [ ] 8. Run `/philosophy` to verify its principles
- [ ] 9. Set up MCP servers for external tools
- [ ] 10. Start building with your Oracle!

---

## Key Takeaways from the Video

1. **Oracle is not just a chatbot** — it's a persistent AI identity with memory, skills, and philosophy
2. **Start simple** — begin with CLAUDE.md and basic skills, then grow
3. **Oracles can collaborate** — multiple Oracles talking to each other is a core feature
4. **The community matters** — learning together accelerates everyone
5. **It's open source** — customize it for your needs and contribute back
6. **Fast Mode exists** — once set up, Oracle operations can be instant
7. **tmux is essential** — terminal multiplexing is the workflow backbone
8. **Reduce friction** — every unnecessary keystroke is distraction (Mission Control philosophy)

---

*Guide generated from transcript analysis of "Oracles build the oracle #1" (2h41m)*
*Video by Natt, Oracle creator*
