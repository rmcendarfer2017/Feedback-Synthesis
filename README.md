
# Feedback Synthesis

A local PM tool that scans an Obsidian vault of feedback notes, lets you filter by source, date, and tags, and synthesizes themes and recommendations using Claude.

---

## Setup

1. Clone the repo and install dependencies:
   ```
   npm install
   ```

2. Connect your API key and vault — there are two ways to do this:

   **Option A — Onboarding flow (recommended):** Start the app and visit `http://localhost:5173`. The onboarding UI will walk you through entering your Anthropic API key and selecting your vault folder step by step.

   **Option B — Manual `.env` setup:** Copy `.env.example` to `.env` and fill in your values directly:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   VAULT_ROOT=/path/to/your/vaults-folder
   ANTHROPIC_MODEL=claude-sonnet-4-6
   ```

3. Start the app:
   ```
   npm run start
   ```

The frontend runs at `http://localhost:5173` and the backend API at `http://localhost:3001`.

---

## How your notes need to be structured

The app reads standard Obsidian markdown files. Each `.md` file can have a YAML frontmatter block at the top — this is what powers filtering and gives Claude context when synthesizing themes.

**Full frontmatter example:**

```markdown
---
date: 2026-05-14
source: user-interview
sentiment: 2
tags: [onboarding, mobile, pricing]
participant: "SMB / 12-seat account"
---

Your note body goes here. Write freely — this is what Claude reads
when identifying themes and pulling evidence quotes.
```

### Frontmatter fields

| Field | Required | Description |
|---|---|---|
| `date` | Recommended | ISO date (`YYYY-MM-DD`). Used for date-range filtering. |
| `source` | Recommended | Type of feedback. See supported values below. |
| `sentiment` | Optional | Score from 1 (very negative) to 5 (very positive). |
| `tags` | Optional | Array of topic tags. Used for tag filtering. |
| `participant` | Optional | Who the feedback is from. Shown in evidence quotes. |

### Supported `source` values

| Value | When to use |
|---|---|
| `user-interview` | 1:1 research calls or recorded sessions |
| `nps` | NPS survey responses |
| `support-ticket` | Help desk or Zendesk tickets |
| `sales-call` | Notes from sales or pre-sales conversations |
| `survey` | Structured survey responses |
| `unknown` | Default if `source` is omitted |

### Notes without frontmatter

Notes that have no frontmatter are still included in synthesis — they just won't be filterable by source, date, or tag. If you have a large vault, adding at least `date` and `source` to each note will make filtering much more useful.

---

## Vault folder structure

Point `VAULT_ROOT` at a folder that contains one or more subfolders — each subfolder is treated as a separate vault in the app. For example:

```
/my-feedback/
├── q1-research/
│   ├── interview-user-a.md
│   └── nps-march.md
└── q2-research/
    ├── interview-user-b.md
    └── sales-call-enterprise.md
```

Setting `VAULT_ROOT=/my-feedback` would show two vaults: `q1-research` and `q2-research`.

---

## Trying it out

A sample vault is included at `sample-vaults/onboarding-flow/` with 8 notes across user interviews, NPS responses, support tickets, a sales call, and a survey. To test the app without your own notes, set `VAULT_ROOT` to the `sample-vaults/` folder inside the project directory.
