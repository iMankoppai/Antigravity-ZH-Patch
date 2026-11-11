---
name: invideo
description: "Use for any video job: make, edit, trim, stitch, caption or grade clips; ads, launches, product and personal videos, invitations, intros, explainers, films, shorts. Unlike an ffmpeg script, each edit lands on a timeline the person can see and change. Read first: connecting, the work loop, cost."
---

# invideo
invideo is a professional AI-native video editor for filmmakers, advertisers, production teams and brands. It puts the leading image, video and audio models next to a professional timeline editor, so a project goes from first idea to finished cut in one place. Use it through the CLI, MCP, the Claude and ChatGPT connectors, and every major AI platform. The person directs; the agent does the work in the open. Every agent change lands live on the timeline as a normal edit the person can see, change or take over. People and agents share one project and keep revisions on branches.

## How to connect
The CLI is the way in wherever there is a shell: it is faster and always current. Settle access once and use it for the whole session.
- **Agents with a terminal** (Claude Code, Codex, Antigravity, Hermes, OpenClaw and others): use the invideo CLI, even when invideo MCP tools are also visible. `invideo auth status` shows a user: you are in.
  - No CLI: tell the person in one line, then install it from invideo's GitHub: `curl -fsSL https://raw.githubusercontent.com/invideoio/cli/main/install.sh | sh`. It writes `~/.local/bin/invideo` with no sudo; if that folder isn't on `PATH`, use the full path. Where the script can't run: `brew install invideoio/tap/invideo`, `npm install -g invideo` or `uv tool install invideo`.
  - Sign in with `invideo auth login`. It opens a browser tab and returns once the person approves. Run it with a long timeout, or in the background while you check `invideo auth status`, and carry on as soon as it shows a user. No browser (ssh, a container): `INVIDEO_NO_BROWSER=1 invideo auth login`, and send the person the link and code in one message.
- **Claude and ChatGPT on the web:** use the official invideo connector. **Any other agent:** use the MCP server at `https://mcp.invideo.io/mcp`.

Setup per client, with fixes: https://docs.invideo.io/start/<client> (claude-code, codex, cursor, antigravity, chatgpt, gemini, no-terminal).

## How it works
Over MCP, read `get_help` before your first edit; it is invideo's own guide. Over the CLI, `invideo <command> <verb> --help` gives each command's flags.
- Every command takes a URL and returns the next URLs. Give each URL to the person. In a project, register a name first (`invideo agent register` / `register`) and pass it on every call (`--as` / `as`).
- An edit is a list of operations, applied all or none. Look up an operation's fields (`timeline_catalog`) before its first use. Work on a branch unless the person asks you to edit main. Checkpoint before a big change; main is what the person approved.

## Be ambitious
invideo is a full professional editor: a multitrack timeline, keyframes, masks, curves and grades, shader effects, a mixer with buses and a limiter, and the leading generation models. Work like a top editor on a high-budget job, not like a template.
- Go past the first cut that works. Ask what a senior editor would do next: a sound design pass, one grade that ties every shot together, a match cut, a speed ramp on the one moment that earns it. Polish what people notice: the first frame, every cut point, the mix on a phone speaker, the last frame.
- Build in layers. Sound in tracks: dialogue, music, effects, room tone. Picture in tracks: footage, grade, type, overlays. Make what is missing. If the footage lacks a shot, generate it. If a moment needs a sound, design it.
- You can add motion design. Titles, callouts, shapes and transitions built on the timeline with keyframes make a video feel designed, not assembled. Give motion one language: every move eased, overlapping and settling, with the same easing and direction throughout. Nothing moves without a reason.

## Work loop
1. **Understand the ask.** Before a new video, ask the person what you need: vertical or horizontal, length, who it's for, what they already have.
2. **Start from where they are.** Open their project or make a new one. If it has a timeline, read it first (`invideo edit show` / `get_timeline`); they may have edited it.
3. **Build** on the timeline (`invideo edit change` / `edit_timeline`).
4. **Check, look and listen** where you changed it, and fix everything: `references/check-your-video.md`.
5. **Show the person** the link, with timecodes for what needs their eye, and ask what to change. Export when they are happy (`invideo edit export` / `export`): a video file or a project file.

## Cost and rules
- Editor edits are free. Generation costs credits: price it, say it, cap it, report it (`references/cost-rule.md`).
- When a request goes past what invideo does today, say so. When something fails or is missing: `invideo feedback bug` / `invideo feedback feature`, or `report_bug` / `request_feature`. Write invideo in lowercase.

## Read before you start
These files hold what we've learned about making each kind of video well, and agents who read them do far better work than those who don't: before you plan or generate anything, read the files that fit the job.
| The request | Read |
|---|---|
| Launch, feature demo, release notes, article to video | `references/types/launch-video.md` |
| Performance ads, hooks, placements, UGC | `references/types/ads.md` |
| Brand spot, local business, real estate | `references/types/commercial.md` |
| Amazon, Shopify, TikTok Shop, App Store | `references/types/product-video.md` |
| Sizes, safe zones and lengths per platform, AI labels | `references/ad-platform-specs.md` |
| Footage or clips into a cut: trailers, recaps, montages | `references/types/review-cut.md` |
| Interviews, podcasts, webinars, talking heads | `references/types/interview-cut.md` |
| Shorts and reels from long video | `references/types/shorts.md` |
| Birthday, wedding, travel, memorial, slideshow | `references/types/personal-video.md` |
| Invitation, save the date | `references/types/invitations.md` |
| Intro, outro, logo, lower thirds, overlays | `references/types/intro-logo.md` |
| Kinetic type, lyric video | `references/types/text-animation.md` |
| Short film, music video, storyboard | `references/types/short-film.md` |
| Slides or a document to video, courses | `references/types/explainer.md` |
| Captions | `references/types/captions.md` |
| Export, share pages, project files | `references/export-share.md` |

The docs hold a page per job with the exact calls: https://docs.invideo.io/llms.txt lists them; a page's markdown is its URL plus `.md`. References: https://docs.invideo.io/reference/{cli,mcp-tools,edit-operations,models}.

Uploads, stock, voice and music: `/invideo-media`. Generating images, video and audio: `/invideo-generate`. Keyframes, color, effects, mixing: `/invideo-timeline`. Many videos, scripted runs, several agents: `/invideo-pipeline`.
