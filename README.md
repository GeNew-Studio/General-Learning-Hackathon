# FakerAI

FakerAI sits on a dating app and keeps scammers away from the person using it. It screens
matches before any contact, watches every conversation that does open, and the moment the
other side reaches for the user's money it takes the keyboard, plays the victim, and works
the scammer for the one thing a bank or the police can actually act on: the account the
money was going to.

Three stages, same as the commercial scam-baiting systems this is modelled on:

1. **Bait** — Ava Lin stays in character and keeps the conversation alive.
2. **Extract** — every turn, the model pulls structured intelligence out of what they said.
3. **File** — confident cases land in a local database, searchable and exportable.

---

# Read this first: you are the scammer

Whichever surface you open, **everything you type is the scammer's side of the chat.** You
are the match the user swiped on. Nobody is asking you to play the victim — the victim is
the software.

| | Who it is | Who writes it |
|---|---|---|
| Left bubbles, your input box | The match — a romance / crypto / advance-fee scammer | **You** (judge, tester, teammate) |
| Right bubbles | The user's dating account: their own words at first, Faker's words after the takeover | The model |

So: swipe through the deck, open someone Faker let through, chat like a scammer would, and
then reach for the money — a loan, a top-up, a "customs fee", an investment platform, a
gift card, or ask them to receive a transfer for you. That money ask is the moment the
product exists for. Give an account number or wallet when Faker asks for it and you will
watch your own details get packed into a fraud report.

Both UIs say this on screen: the phone prints **You play the scammer — type as \<name\>**
above the keyboard, the console prints the same line above its composer.

---

# Two surfaces, one engine

The same FastAPI service (`app/main.py`) serves two completely different views. They share
one brain, one scoring pipeline, and one case database — they just show different halves
of it. Both run at the same time on port 8787.

| | **Analyst console** (`/`) | **Tinder demo** (`/tinder`) |
|---|---|---|
| What it is | The back office. What a fraud desk, a police cyber unit, or our own team sees. | The product. What the person on the dating app sees on their phone. |
| Who is typing | You play the scammer. The user's account answers. | You play the scammer. The user's account answers. |
| What it shows | The same three stages as numbered readouts — pre-screen card, phase card, score and verdict, the fraud report filling in field by field — plus every stored case. | A deck of screened matches, a chat, a live monitor bar, the takeover banner, the handover animation. |
| Why it exists | Proves the detection and evidence are real, not scripted. | Proves the experience: the user never has to judge anyone. |
| How to open | `http://127.0.0.1:8787/` | `http://127.0.0.1:8787/tinder`, or the **Open the dating app ↗** button in the console header |
| Built from | `static/index.html` + `static/app.js` + `static/styles.css` | `static/tinder.html` + `static/tinder.js` + `static/tinder.css` |

Shared by both: `app/agent.py` (one model call per turn), `app/signals.py` (rule hits),
`app/intel.py` (evidence extraction), `app/db.py` (case storage), and `static/handover.js`
(the "ship the case" animation).

## 1. Analyst console — `/`

Two tabs.

**Live chat.** Pick a match from the **Match** dropdown at the top — it is the same deck the
dating app shows, so the console runs the identical pipeline. You then type as that match,
i.e. as the scammer, and the user's account replies. The right-hand panel is the analyst view and the decoy never
sees it. It reads top to bottom as the three stages:

- **Stage 1 · Pre-screen** — the chosen profile's risk, verdict and the exact checks that
  fired. Pick a blocked profile (e.g. Marcus Crowe) and the console refuses to open a
  session at all: the card turns red, the card below says **BLOCKED BEFORE CONTACT**, and
  the composer is disabled. Same 403 the dating app gets.
- **Stage 2 · Owner is replying** — the phase card while the chat is still ordinary. Faker
  is scoring but not intervening.
- **Stage 3 · Faker has taken over** — the same card flips cyan the turn the takeover
  fires, and prints the reason that triggered it.
- **Score dial + verdict** (`scammer` / `uncertain` / `benign`), recomputed every turn.
- **Case gate** under the flag button: *"Case stays open until a bank account or wallet
  lands"* until one does, then the filed case ID.
- **Why** — the model's evidence, in its own words, plus any regex rule hits.
- **Fraud report** — five groups (identity, contact, payment rails, infrastructure,
  playbook) that tick over as the conversation gives things away. `0/5` becomes `3/5` only
  because the other side actually said something, never because a timer fired.
- **Flag as swindler** to file a case by hand at any point.

`/?match=p09` opens the console already bound to a profile, so it can sit next to
`/tinder?open=p09` on the same match.

**Case files.** Every filed case: verdict, analyst notes, full transcript, and all extracted
values. Search across IDs, categories, summaries and any indicator; export to JSON or CSV.
A value seen in more than one case surfaces as **shared infrastructure** — that is how one
mule account links separate victims.

## 2. Tinder demo — `/tinder`

The whole user journey, in four beats.

**1. Pre-screen, before any contact.** `app/profiles.py` scores all 14 deck profiles on
what a dating app can see before a word is typed: synthetic-photo confidence, whether the
three photos are even the same face, reverse image hits (p05 is running p01's photos),
account age, photo verification, an off-app push in the bio, and known bio scripts
(widower on an oil rig, guaranteed daily returns). Each card shows the score and the exact
reasons.

- **risk ≥ 70 → blocked.** The card is greyed out, the button is dead, and there is no chat
  to open. The server enforces it too: `POST /api/session` with that profile returns **403**.
  5 of the 14 profiles are blocked this way.
- **risk 30–69 → caution.** The chat opens with the monitor already warmed up.
- **risk < 30 → clear.** Opens normally.

**2. You talk, Faker watches.** A clear profile opens an ordinary thread. The replies from
the user's account are the user's own ordinary dating chat — Faker is not baiting yet, it
is only scoring. The strip above the thread shows the live score and what it thinks.

This is the point the pre-screen cannot solve: a scammer with real stolen-but-clean photos
and a two-year-old account passes screening. Intent only shows up in what they say.

**3. Faker takes over.** When the conversation turns into a scam (rules below), the thread
drops a banner — **FAKER HAS TAKEN OVER THIS CHAT** — and from that turn on the account is
run by the decoy, not the user. It plays willing and slightly flustered, stalls on actually
sending anything, and pushes for their bank, FPS, PayMe or wallet. Its messages are marked
*Sent by Faker*.

**4. Case sealed and shipped.** Once there is an account or wallet on the record, the case
is written to the database and the handover animation packs the evidence and sends it to
the police cyber unit and the bank fraud desk, with a case ID.

The person at the keyboard plays the match — the scammer — so their lines land on the left
and the user's account answers on the right. `/tinder?open=p09` jumps straight into a thread and
`/tinder?script=1` replays canned turns if there is no network. Profile art is generated by
`python scripts/make_photos.py` into `static/photos/`.

---

# How FakerAI decides

Every threshold below is in the code, not in a slide.

| Decision | Rule | Where |
|---|---|---|
| **Block before contact** | Pre-screen risk ≥ 70. Chat never opens; API returns 403. | `app/profiles.py`, `main._match_context` |
| **Watch but allow** | Pre-screen risk 30–69. The monitor starts at 40% of the pre-screen risk instead of zero. | `main._opening_detection` |
| **Takeover — money route** | The newest message hits any money pattern. Checked *before* the model is called, so the very reply to the money ask is already the decoy's. | `signals.MONEY_SIGNALS`, `main.chat` |
| **Takeover — judgement route** | No money named yet, but the model returns `scammer` and the blended score is ≥ 65 — a fake identity unravelling, isolation pressure, a push off the app. | `main.chat` |
| **Score** | 72% model judgement + 28% rule hits, 0–100. Capped to 92 once a payment rail lands. | `main._blend_score` |
| **Close the case** | Verdict `scammer` **and** score ≥ 70 **and** confidence ≥ 60 **and** a bank account or wallet is in the intel. | `main._maybe_record` |
| **Do not close** | Everything else. A verdict on its own is not a case — with no account there is nothing to freeze — so the decoy keeps stalling and asking. | `TAKEOVER_PROMPT` in `app/agent.py` |
| **Drop it** | Ordinary chat: ≥ 3 turns, score ≤ 32, verdict `benign`, no rule hits, no takeover. The decoy wraps up and goes quiet, and nothing is stored. | `main.chat` |

**"Any move at the user's money" is the trigger, not the word "transfer".** A scammer rarely
asks for a transfer first. `app/signals.py` covers lend / borrow / cover it for me, top-ups
and recharges, gift cards and store codes, advance fees (customs, clearance, handling,
unfreeze, 解凍金 / 手續費 / 保證金), investment platforms and "guaranteed returns", crypto
wallets, job fees, and money-mule asks ("my account is frozen, can I receive it through
yours"), in English and in Chinese.

**Escalation is never faked.** The score, the ticking fraud report, the takeover banner and
the handover all come from `/api/chat` responses. If the model is unreachable the decoy says
nothing at all rather than inventing a line.

## Try it in two minutes

Open `/tinder` and play the scammer.

1. Scroll the deck. Five profiles are already **blocked** with reasons — try the button, it
   does nothing. That is the time FakerAI just saved the user.
2. Open a clear one, e.g. **Ivan Sze**. Say something normal: *"hey! you cycle too?"*
   The reply is ordinary, the monitor sits low.
3. Go for the money in any wrapper: *"my card got frozen, can you top up 5000 for me
   tonight? i'll pay you back tmr"*. The banner fires on that same turn and the reply is
   already asking which app and whose account.
4. Hand over an account: *"hsbc 004-887231-838, name IVAN SZE, or fps 92345678"*. The score
   locks at 92, the case is filed, and the packet ships to police and bank.

Same run without a browser: `python scripts/flow_check.py`.

## Setup

Needs Node (for `npm run dev`) and Python 3.

```bash
cd FakerAI
```

Copy `.env.example` to `.env` and fill in a key. First `npm run dev` will create `.venv`, install Python deps, and copy `.env.example` if `.env` is missing.

## Run

```bash
npm run dev
```

One server, two views. Open them in two browser tabs and put them side by side — the
console is the back office for the very chat running in the phone.

| | URL | How to get there |
|---|---|---|
| Analyst console | [http://127.0.0.1:8787/](http://127.0.0.1:8787/) | the root page |
| Tinder demo | [http://127.0.0.1:8787/tinder](http://127.0.0.1:8787/tinder) | **Open the dating app ↗** in the console header |

Each surface links to the other, so nobody has to be told the URL: the console has the
button in its top bar, and the phone screen has **← Analyst console** captioned next to it.

Port 8000 is blocked on this machine.

Same server, without npm:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8787
```

## The brain

`app/llm.py` walks a provider chain and uses the first one that answers:

| Order | Provider | Env |
|---|---|---|
| 1 | Poe | `POE_API_KEY` (https://poe.com/api/keys) |
| 2 | DeepSeek | `DEEPSEEK_API_KEY` |
| 3 | Ling / InclusionAI | `LING_API_KEY` (+ `LING_BASE_URL`, `LING_MODEL`) |
| 4 | OpenRouter | `OPENROUTER_API_KEY` |
| 5 | Any OpenAI-compatible endpoint | `LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL` |
| 6 | Offline heuristics, only if `DECOY_ALLOW_FALLBACK=1` | — |

Not sure which host issued a key? `python scripts/check_key.py` sends one tiny request
to each candidate and reports which one accepts it.

A provider that fails to connect is put on a two-minute cooldown so one blocked host does
not slow down every later turn. `GET /api/health` shows the current state of the chain.

**When no provider answers, the decoy says nothing.** The chat returns HTTP 503, a red
banner appears above the conversation, and your message is put back in the input box. It
will not invent a reply — a canned line that ignores what you wrote is worse than an honest
error. Set `DECOY_ALLOW_FALLBACK=1` if you want the offline heuristics to answer anyway;
they are fixed strings and cannot read context.

### If DeepSeek is unreachable

On this machine `api.deepseek.com` is reset during the TLS handshake as soon as the
hostname appears in the ClientHello. TCP to the IP connects fine, so it is SNI filtering on
the network path, not a bad key. Either use a VPN, or route through OpenRouter:

1. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Add `OPENROUTER_API_KEY=sk-or-...` to `.env`.
3. Press **Recheck** in the red banner — it re-reads `.env` without a server restart.

`deepseek/deepseek-v4-flash` is about $0.09 per million input tokens, so a demo costs a
fraction of a cent. With no credit on the account, set `OPENROUTER_MODEL` to a free model
such as `z-ai/glm-5.2:free` instead.

## Persona and the two phases

Every session is **Ava Lin**, a 29-year-old graphic designer in Hong Kong on Tinder. She is
the account owner, and the model writes her side of the conversation in one of two modes
(`app/agent.py`):

- **`phase: "user"`** — she is just herself. Short, warm, ordinary dating chat. No baiting,
  no fishing for bank details, no suspicion. This is what a real user's thread looks like.
- **`phase: "takeover"`** — Faker is running her account. It plays naive and willing, stalls
  on the actual handover with practical friction (the HSBC app is spinning, the FPS limit,
  a mistyped digit), and pushes for *their* bank, account name, FPS / PayMe, or wallet.

In both phases the decoy never sends money, OTPs, seed phrases, or ID, and never tells them
they have been detected. Ordinary chat with no fraud pattern: after a few turns she wraps
up and goes quiet, and nothing is stored.

## Case files

A case is filed automatically when the verdict is `scammer`, the score clears
`DECOY_AUTO_RECORD_SCORE` (70), confidence clears `DECOY_AUTO_RECORD_CONFIDENCE` (60), **and**
a payment rail — a bank account or a wallet — is in the intel. A verdict on its own is not a
case: without an account there is nothing for a bank to freeze, so the decoy keeps baiting.
You can also file one by hand at any point with **Flag as swindler**. Benign conversations
are never stored. Cases upsert as the chat continues, so a case grows instead of duplicating.

Each case holds the verdict and analyst notes, the full transcript, and the extracted
intelligence: identity, contact, payment rails, infrastructure, and playbook. Values that
appear in more than one case surface as **shared infrastructure** on the case detail page.

The **Case files** tab searches across IDs, categories, summaries, and any extracted value,
and exports to JSON or CSV.

### Database

SQLite at `data/decoy.db` (override with `DECOY_DB_PATH`), three tables: `cases`,
`case_iocs`, `case_messages`. `data/` is gitignored.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/profiles` | the deck with its pre-screen verdicts |
| GET | `/api/profiles/{id}` | one profile plus its screening checks |
| POST | `/api/session` | new session, optional `persona_id` (`dating` only) and `profile_id` |
| POST | `/api/chat` | send a message, get reply + verdict + intel |
| POST | `/api/session/{id}/persona` | confirm the decoy (`dating` only) |
| POST | `/api/session/{id}/flag` | file the case by hand |
| GET | `/api/cases?q=` | search cases |
| GET | `/api/cases/{case_id}` | full case with IOCs, transcript, related cases |
| DELETE | `/api/cases/{case_id}` | remove a case |
| GET | `/api/cases/export.json` / `.csv` | export |
| GET | `/api/stats` | totals, categories, shared infrastructure |
| GET | `/api/health` | provider chain state |
| POST | `/api/providers/reload` | re-read `.env` and rebuild the provider chain |
| POST | `/api/providers/configure` | save `POE_API_KEY` locally and rebuild the chain |

`/api/chat` returns the decoy's `reply` plus everything the two UIs draw from:
`detection` (score, verdict, confidence, reasons, rule hits), `intel` (the five evidence
groups), `phase` and `takeover_now`, `case_ready` (a payment rail exists), and `case_id` /
`recorded_now` once the case is filed.

## Checking it without a browser

```bash
python scripts/smoke_test.py dating
python scripts/api_check.py          # against a running server
python scripts/flow_check.py         # deck → chat → takeover → case, end to end
python scripts/repro.py "hey ava, I matched you on tinder"   # one turn, prints which brain answered
```

## Scope

Defensive research demo, local only. There is no outbound routing to banks, telcos, or
messaging platforms — the decoy talks to whoever is in the chat window and nothing leaves
the machine.
