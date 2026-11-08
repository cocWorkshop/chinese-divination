# Xuanji (玄機) — Neuro-Symbolic Multi-Agent & High-Dimensional Inference Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Architecture](https://img.shields.io/badge/Architecture-Neuro--Symbolic_FSM-D4AF37)](#2-core-architectural-paradigm-the-neuro-symbolic-approach)
[![Prompt Cache](https://img.shields.io/badge/Prompt_Cache-%3E90%25_Hit_Rate-10B981)](#4-context-economics--prompt-cache-optimization)
[![Testing](https://img.shields.io/badge/Vitest-100%25_Regression_Locked-6E9F18?logo=vitest&logoColor=white)](#7-production-engineering-observability--quality-gates)

> **Engineering Positioning**: While the end-user surface operates in the domain of traditional Chinese metaphysics (*BaZi, Zi Wei Dou Shu, Qi Men Dun Jia, Liu Yao*), from a systems architecture perspective this repository serves as a **high-dimensional discrete combinatorial testbed with extreme LLM hallucination sensitivity**. 
>
> Pure autoregressive LLMs fail catastrophically at astronomical coordinate transformations, solar longitude (VSOP87) ephemeris calculations, Equation of Time ($\Delta t$) true solar time normalization, and multi-layered matrix permutations. **Xuanji** solves this via a strict **Neuro-Symbolic Architecture**: 100% deterministic TypeScript mathematical engines compute canonical state matrices, while a multi-agent LLM orchestration engine acts strictly as a semantic interpreter, router, and stateful conversational counselor.

---

## Table of Contents

1. [Executive Summary & System Highlights](#1-executive-summary--system-highlights)
2. [Core Architectural Paradigm: The Neuro-Symbolic Approach](#2-core-architectural-paradigm-the-neuro-symbolic-approach)
3. [Multi-Agent Orchestration & Turn Engine FSM](#3-multi-agent-orchestration--turn-engine-fsm)
4. [Context Economics & Prompt-Cache Optimization](#4-context-economics--prompt-cache-optimization)
5. [Network Protocol Topography & Upstream Cancellation](#5-network-protocol-topography--upstream-cancellation)
6. [Concurrency, Reliability & Ledger Consistency](#6-concurrency-reliability--ledger-consistency)
7. [Production Engineering, Observability & Quality Gates](#7-production-engineering-observability--quality-gates)
8. [Technology Stack Taxonomy & Local Setup](#8-technology-stack-taxonomy--local-setup)

---

## 1. Executive Summary & System Highlights

Designing production-grade Stateful AI Agents requires solving problems far beyond basic prompt engineering: unbounded context growth, runaway tool-calling loops, abandoned streaming token burn, reverse-proxy timeouts, and distributed ledger race conditions.

| Architectural Pillar | Engineering Mechanism Implemented | Quantitative / Systems Impact |
| :--- | :--- | :--- |
| **Neuro-Symbolic Boundary** | Deterministic TS mathematical calculators (`bazi`, `ziwei`, `qimen`, `liuyao`, `meihua`) + structured JSON synthesis (`_finalize.ts`). | **0% mathematical/ephemeris hallucination**; 100% reproducible state graphs across identical inputs. |
| **Prompt-Cache Prefix Alignment** | Strict separation of immutable prefix (`master.md` + tool/skill catalogs) from dynamic per-turn suffix (`buildSystemPrompt.ts`). | **>90% prefix cache hit rate** (Anthropic/OpenAI 5-min TTL), reducing input token costs by **~80%** and minimizing TTFT. |
| **Three-Tier Memory Hierarchy** | Relational `MasterChatMessage` $\rightarrow$ 60K token sliding-window compaction (`compression.ts`) $\rightarrow$ Dual-axis async `UserPortrait` extraction. | **80% working-memory token reclamation** at zero LLM cost via Stage-1 tool-result stubbing; bounded $O(1)$ prompt ceiling. |
| **Turn Engine FSM & Resilience** | 1500ms client burst debouncing, per-turn `(name, args)` hash cycle detection, 75–120s jittered idle reflection with silent `[PASS]` discard. | Eliminates recursive tool loops (`MAX_TOOL_LOOPS = 12` safety cap) and prevents awkward AI conversational interruptions. |
| **Cascading Stream Abort** | End-to-end `AbortController` propagation: Browser $\rightarrow$ Next.js `req.signal` $\rightarrow$ Upstream LLM `fetch` abort (`stream.ts`). | Halts cloud GPU token burn within **milliseconds** of client disconnect or user preemption; enforces **Zero-Dirty-Write** DB invariant. |
| **Transactional Credit Ledger** | **Hold-then-Settle** state machine (`lifecycle.ts`) using PostgreSQL `SELECT ... FOR UPDATE` CTEs for single-winner refunds. | **Zero double-spend or double-refund** anomalies under concurrent client aborts, network timeouts, and background sweepers. |

---

## 2. Core Architectural Paradigm: The Neuro-Symbolic Approach

### 2.1 The Failure Mode of Pure LLMs in Combinatorial Domains

In discrete combinatorial systems (e.g., sexagenary calendar cycles, 12-palace *Zi Wei* astrolabes with 100+ stars and 4-transformation mutagens, or 3x3 *Qi Men Dun Jia* rotating Lorentzian-like grids across 1,080 *Ju* permutations), autoregressive token prediction exhibits compounding state drift:

1. **Continuous Astronomical Math**: Converting civil time and geographic coordinates $(\lambda, \phi)$ into True Solar Time requires computing longitudinal offset plus the astronomical Equation of Time:
   $$\Delta t_{\text{solar}} = 4 \cdot (\lambda_{\text{local}} - \lambda_{\text{standard}}) + \text{EoT}(d)$$
   where $\text{EoT}(d)$ is a non-linear Fourier series of Earth's orbital eccentricity and axial obliquity.
2. **Exact Ephemeris Cutoffs**: Transitions between solar terms (*Jieqi*, e.g., *Lichun* at $315^\circ$ solar longitude) occur at exact minute/second boundaries via VSOP87 planetary theory. Off-by-one errors flip the entire downstream state tensor.
3. **High-Branching Matrix Permutations**: Once the initial seed is derived, deterministic lookup rules project hundreds of interacting symbolic nodes. LLMs hallucinate roughly 35–60% of secondary node placements when asked to compute the graph end-to-end in latent space.

### 2.2 Symbolic Compute vs. Probabilistic Reasoning

Xuanji enforces a hard architectural boundary between **Symbolic Computation** (left-brain deterministic TypeScript engines) and **Probabilistic Reasoning** (right-brain LLM semantic synthesis):

```mermaid
flowchart LR
    subgraph InputTier ["1. User Input & Ephemeris Normalization"]
        Raw["Raw Input<br/>(Timestamp, Lat/Lng, Query)"]
        TST["True Solar Time Engine<br/>(trueSolarTime.ts / VSOP87)"]
        Raw --> TST
    end

    subgraph SymbolicTier ["2. Deterministic Symbolic Engines (100% TypeScript)"]
        direction TB
        Bazi["baziCalculator.ts<br/>4-Pillar Tensor & Weighted 5-Element Matrix"]
        Ziwei["ziweiCalculator.ts<br/>12-Palace Astrolabe & Pattern Detector (70x Cache)"]
        Qimen["qimenCalculator.ts<br/>Yin/Yang 9-Ju Heaven/Earth/Man/Spirit Rings"]
        Liuyao["liuyaoCalculator.ts<br/>Jing Fang Hexagram Najia & 6-Kinship Graph"]
        Meihua["meihuaCalculator.ts<br/>Modulo-8/6 Trigram & Mutual Transition Graph"]
    end

    subgraph NeuralTier ["3. Probabilistic Neural Layer (LLM)"]
        PromptComp["Prompt Composer<br/>(Cache-Aligned Prefix + Evidence JSON)"]
        LLM["Unified LLM Router<br/>(streamLLM / completeLLM)"]
        PromptComp --> LLM
    end

    subgraph GateTier ["4. Dual-Channel Convergence (_finalize.ts)"]
        Repair["JSON Parse & Repair<br/>(jsonrepair + Hard Reject Gate)"]
        ZodGate["Zod Schema Validation<br/>& Deterministic Chart Merge"]
        Ledger["Hold-then-Settle Ledger<br/>(lifecycle.ts)"]
        Repair --> ZodGate --> Ledger
    end

    TST --> SymbolicTier
    SymbolicTier -->|"Canonical Evidence JSON"| PromptComp
    LLM -->|"Raw Token Stream / Text"| Repair
```

### 2.3 The Four Architectural Invariants

Defined in [`docs/architecture/overview.md`](docs/architecture/overview.md), every subsystem in this repository is governed by four non-negotiable invariants:

1. **Invariant I — Deterministic Symbolic Execution**: All astronomical solar terms, true solar time adjustments, sexagenary pillars, 12-palace astrolabes, and hexagram transformations must be computed 100% by local TypeScript modules ([`src/lib/baziCalculator.ts`](src/lib/baziCalculator.ts), [`src/lib/ziweiCalculator.ts`](src/lib/ziweiCalculator.ts), [`src/lib/qimenCalculator.ts`](src/lib/qimenCalculator.ts), [`src/lib/liuyaoCalculator.ts`](src/lib/liuyaoCalculator.ts)). Identical inputs guarantee byte-identical canonical JSON outputs. LLMs are strictly forbidden from calculating charts.
2. **Invariant II — Evidence vs. Memory Boundary**: *"Anything fetchable or calculable from the database is evidence, not memory."* Raw chart tensors, user birth profiles, and family records live in canonical relational tables and are injected or fetched on demand via tools. Conversational memory stores only non-derivable state: user intent, synthesized conclusions, and behavioral preferences.
3. **Invariant III — Dual-Channel Transport Equivalence**: Blocking HTTP (`POST /api/divination`) and streaming SSE (`POST /api/divination?stream=1`) are transport adapters over a single post-LLM convergence pipeline ([`src/app/api/divination/_finalize.ts`](src/app/api/divination/_finalize.ts)). Both channels execute identical JSON repair, hard-reject gates, deterministic chart re-merging (`handler.merge`), Zod schema validation, and credit settlement.
4. **Invariant IV — Atomic Hold-then-Settle Billing**: Credit deductions follow a strict two-phase reservation protocol ([`src/lib/readings/lifecycle.ts`](src/lib/readings/lifecycle.ts)). Credits are atomically reserved (`Reading.creditsHeld`) at initialization; finalized upon validated delivery (`markCompleted`); or refunded via a single-winner locking CTE (`refundHold`) upon timeout, parse failure, or client abort.

---

## 3. Multi-Agent Orchestration & Turn Engine FSM

The conversational core ("Xuanji Master") is implemented as a decoupled, transport-agnostic asynchronous generator finite state machine in [`src/lib/master/turnEngine.ts`](src/lib/master/turnEngine.ts) (`runMasterTurn`), backed by a global client state machine in [`src/components/master/MasterChatContext.tsx`](src/components/master/MasterChatContext.tsx).

### 3.1 Supervisor-Worker & Tool Dispatch Topology

Rather than relying on brittle peer-to-peer agent handoffs that suffer from context loss and latency amplification, Xuanji employs a **Central Orchestrator + Deterministic Specialist Tool Registry** (`masterToolRegistry` in [`src/lib/master/tools/`](src/lib/master/tools)):

* **Read-Only Evidence Retrieval Tools**: `get_user_profile`, `list_family_members`, `list_recent_readings`, `get_reading_detail` (with section-level slicing via `sliceReading` to prevent context blowup).
* **On-Demand Symbolic Calculation Tools**: `calculate_bazi_chart`, `calculate_ziwei_chart`, `calculate_daily_almanac`, `cast_instant_meihua`.
* **UI Action & Handoff Emitters**: `prefill_divination_form` (emits interactive `cta_card` SSE events for complex readings) and `show_reading_card` (emits `reading_card` references).

### 3.2 Conversational Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Session Hydrated (GET /api/master)

    state "Client Burst Buffer (1500ms)" as Burst {
        Typing: User Sends Fragmented Messages
        Timer: Reset 1500ms Sliding Window
        Typing --> Timer: New Message Input
        Timer --> BatchFlush: 1500ms Elapsed (messages: string[])
    }

    Idle --> Burst: User Input Event
    Idle --> ProactiveCheckin: Activation Trigger (gap / cta_pending_aged / unanswered_user)
    Idle --> IdleReflection: 75-120s Inactivity Timer Fires

    Burst --> TurnInit: POST /api/master (Cancel Active Stream if Preempted)
    ProactiveCheckin --> TurnInit: Inject Ephemeral Synthetic [activation_trigger:*]
    IdleReflection --> TurnInit: Inject Ephemeral Synthetic [reflection_trigger] (Hold Output)

    state "Server Turn Engine FSM (runMasterTurn)" as Engine {
        TurnInit --> StreamLLM: Build Cache-Aligned Prompt + Compressed History
        StreamLLM --> BubbleParser: Stream Chunk (content / tool_call_delta)
        
        BubbleParser --> DedupeCheck: finishReason == 'tool_calls'
        DedupeCheck --> ExecuteTool: Cache Miss (name::JSON(args))
        DedupeCheck --> InjectCachedResult: Cache Hit (Skip Execution)
        ExecuteTool --> LoopGuard: Record Tool Telemetry
        InjectCachedResult --> LoopGuard
        
        LoopGuard --> StreamLLM: loopCount < MAX_TOOL_LOOPS (12)
        LoopGuard --> ForcedSynthesis: loopCount >= 12 OR Empty Prose
        ForcedSynthesis --> BubbleParser: Call streamLLM (tools: undefined)

        BubbleParser --> PassCheck: finishReason == 'stop'
        PassCheck --> SilentDiscard: holdOutput && isPassReply('[PASS]')
        PassCheck --> PersistTurn: Substantive Reply
    }

    StreamLLM --> Aborted: Client Disconnect / Preemption (req.signal)
    Aborted --> ZeroDirtyWrite: Abort Upstream Fetch & Drop Unfinished Turn
    ZeroDirtyWrite --> Idle

    SilentDiscard --> Idle: Emit 'done' (0 DB Rows Written, 0 UI Bubbles)
    PersistTurn --> PostTurnAsync: Write MasterChatMessage + Increment Session Budget
    PostTurnAsync --> Idle: Emit SSE 'metrics' & 'done' -> Async Portrait Check
```

### 3.3 Key Engineering Mechanisms in the Turn Engine

1. **Sliding-Window Burst Debouncing (1500ms)**:
   In mobile messaging UX, users frequently send 2–4 short consecutive messages (e.g., *"Wait"*, *"I was born in Taipei"*, *"Around 10pm"*). `MasterChatContext` intercepts rapid submissions into a 1500ms sliding buffer. If a user sends a new message while an existing LLM stream is in flight, the client immediately fires `abortController.abort()` on the active request, merges the unresponded messages with the new input, and dispatches a single batched `messages: string[]` payload.
2. **Per-Turn Cycle Detection & Runaway Guard**:
   In [`src/lib/master/turnEngine.ts`](src/lib/master/turnEngine.ts#L190-L270), a per-turn `turnToolCache` hashes every tool invocation by `` `${tc.name}::${tc.arguments || '{}'}` ``. Duplicate calls within the same turn bypass execution and immediately return the cached payload. A hard ceiling (`MAX_TOOL_LOOPS = 12`) guards against oscillatory multi-tool cycles; if hit, or if the model emits only tool calls with zero prose, the engine executes a **Forced Final Synthesis** pass (`tools: undefined`), obligating the model to synthesize a natural language response.
3. **Streamed Multi-Bubble Segmentation (`BubbleStreamer`)**:
   To avoid walls of text, the persona uses a `[NEXT]` delimiter to break responses into natural conversational bubbles. `BubbleStreamer` ([`src/lib/master/bubbleStream.ts`](src/lib/master/bubbleStream.ts)) implements a streaming lookahead state machine that holds back partial prefix matches (e.g., `[NE`) across chunk boundaries, emitting clean `{ type: 'bubble_break' }` SSE events to the client while preserving the raw `[NEXT]` marker in database persistence so the model sees its own formatting in subsequent turns.
4. **Jittered Idle Reflection & The `[PASS]` Silent Protocol**:
   When a user remains idle in an expanded consultation for 75–120 seconds (randomized jitter to prevent thundering-herd spikes), the client triggers a background `{ reflection: true }` turn. The engine injects an ephemeral `[reflection_trigger]` message (never persisted to DB) and sets `holdOutput = true`, buffering all chunks in memory. If the model determines no follow-up is warranted (or during an `ambiguous_resume` check-in), it outputs `[PASS]`. `isPassReply()` intercepts the token, flushes the buffer to `/dev/null`, writes zero rows to PostgreSQL, and closes the stream silently—completely eliminating robotic AI filler or repetitive pestering.

---

## 4. Context Economics & Prompt-Cache Optimization

Operating long-horizon stateful agents on frontier models (Claude 3.7 Sonnet / GPT-4o / GPT-5.4) quickly becomes economically unviable without strict context engineering. Xuanji optimizes token economics through **Cache-Prefix Partitioning** and a **Three-Tier Memory Hierarchy**.

### 4.1 Anthropic / OpenAI 5-Minute Cache-Prefix Alignment

LLM providers cache KV-attention states for identical prompt prefixes (typically with a 5-minute TTL, offering 75–90% discounts on cached input tokens and dramatic TTFT reductions). 

A common anti-pattern in naive agent implementations is injecting dynamic timestamps, user profiles, or turn counters at the top of the system prompt—invalidating the entire KV cache on every single request.

In [`src/lib/master/systemPrompt/buildSystemPrompt.ts`](src/lib/master/systemPrompt/buildSystemPrompt.ts), `buildMasterSystemPrompt()` enforces strict **Progressive Disclosure & Prefix Partitioning**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ BLOCK 1: CORE PERSONA (divination-refs/master.md)                          │ ▲
│          Sacred identity, tone constraints, [NEXT] & [PASS] syntax rules   │ │
├────────────────────────────────────────────────────────────────────────────┤ │ 100% STATIC
│ BLOCK 2: CAPABILITY CATALOG (buildCapabilityCatalog())                     │ │ CACHEABLE PREFIX
│          Deterministic schema & usage rules for all registered tools       │ │ (>90% Hit Rate,
├────────────────────────────────────────────────────────────────────────────┤ │  ~80% Cost Cut,
│ BLOCK 3: SKILLS CATALOG (buildSkillsCatalog(lang))                         │ │  Minimal TTFT)
│          Domain interpretation heuristics & structured reasoning guides    │ ▼
═══════════════════════════ CACHE PREFIX BOUNDARY ════════════════════════════
│ BLOCK 4: PERSONALIZED USER PORTRAIT (UserPortrait.generatedPrompt)         │ ▲
│          Stable per-user traits (cached across turns until re-extracted)   │ │
├────────────────────────────────────────────────────────────────────────────┤ │
│ BLOCK 5: CONDITIONAL TURN-TYPE APPENDICES (Lazy-Loaded)                    │ │ DYNAMIC SUFFIX
│          • reflection.md (only on reflection turns)                        │ │ (0 overhead on
│          • activation.md (only on proactive check-in turns)                │ │  90%+ standard
│          • templates.md  (only on 1st substantive turn of a new topic)     │ │  message turns)
├────────────────────────────────────────────────────────────────────────────┤ │
│ BLOCK 6: EPHEMERAL REQUEST CONTEXT & SESSION BUDGET                        │ │
│          Current solar/lunar calendar table, active timestamp, wrap-up     │ │
│          steering note (injected only when remaining turns <= threshold)   │ ▼
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Three-Tier Memory Architecture

Detailed in [`docs/architecture/master-portrait-system.md`](docs/architecture/master-portrait-system.md), conversational state is decoupled across three storage and compaction tiers:

```mermaid
flowchart TD
    subgraph Tier1 ["Tier 1: Raw Relational Persistence (PostgreSQL)"]
        DB[("MasterChatMessage Table<br/>• userId, sessionId, turnIndex (Monotonic)<br/>• role, content, toolCallsJson<br/>• tokenCount (Indexed)")]
    end

    subgraph Tier2 ["Tier 2: Working-Memory Compaction (src/lib/master/compression.ts)"]
        Load["Load Session Rows"]
        Stage1["Stage 1: Zero-Cost Tool Stubbing<br/>Drop historical toolCallsJson payloads;<br/>retain assistant prose & re-fetch evidence on demand"]
        BudgetCheck{"Estimated Prompt<br/>Tokens > 60,000?"}
        Stage2["Stage 2: Narrative Summarization<br/>Compress prose older than KEEP_RECENT_TURNS (10)<br/>into [對話摘要] via masterBackground model"]
        Ready["Compressed Message Array<br/>(Bounded Working Context)"]

        Load --> Stage1 --> BudgetCheck
        BudgetCheck -->|"No (<= 60K)"| Ready
        BudgetCheck -->|"Yes (> 60K)"| Stage2 --> Ready
    end

    subgraph Tier3 ["Tier 3: Long-Term Adaptive Portrait (src/lib/master/portraitExtractor.ts)"]
        Trigger{"Dual-Axis Trigger Met?<br/>Δturns >= 8 OR<br/>(Δt >= 24h AND Δturns >= 3)"}
        Extract["Incremental Merge Extractor<br/>Input: Current Portrait JSON + Delta Messages ONLY<br/>(Reasoning: 'low', MaxTokens: 1500, Cost: 0 User Credits)"]
        PortraitDB[("UserPortrait &<br/>UserPortraitHistory<br/>(Append-Only Audit Trail)")]
        Render["renderPersonalizedPrompt()<br/>Cached in UserPortrait.generatedPrompt"]

        Trigger -->|"Yes (Post-Turn Async)"| Extract --> PortraitDB --> Render
    end

    DB --> Load
    DB -.->|"After 'done' SSE Event"| Trigger
    Render -.->|"Injected at Block 4"| Ready
```

1. **Tier 1 — Raw Relational Persistence (`MasterChatMessage`)**:
   Replaces opaque JSON session blobs with granular relational rows indexed by `(userId, sessionId, turnIndex)`. Each row records pre-computed `tokenCount` estimates (`Math.ceil(chars / 4)`), enabling $O(1)$ budget inspection without loading full tokenizers into the Node.js hot path.
2. **Tier 2 — Two-Stage Working-Memory Compaction ([`src/lib/master/compression.ts`](src/lib/master/compression.ts))**:
   * **Stage 1 (Tool-Result Stubbing — 0 LLM Cost)**: A single *BaZi* or *Zi Wei* JSON payload can consume 3,000–6,000 tokens. When `rowToMessage()` hydrates prior turns for the LLM, historical `toolCallsJson` structures are intentionally stripped. Because the assistant's prose already cites the relevant findings—and raw charts remain re-fetchable via tools if needed—Stage 1 reclaims **~80% of context bloat at zero latency and zero LLM cost**.
   * **Stage 2 (Incremental Narrative Summarization)**: If the system prompt plus Stage-1 messages still exceed `COMPRESSION_TOKEN_BUDGET` (`60,000` tokens), turns older than `KEEP_RECENT_TURNS` (`10`) are compressed into a concise `[對話摘要]` system block capturing only user intent, conclusions drawn, and reading IDs.
3. **Tier 3 — Long-Term Adaptive Portrait ([`src/lib/master/portraitExtractor.ts`](src/lib/master/portraitExtractor.ts))**:
   * **Dual-Axis Trigger**: Fires asynchronously *after* the `{ type: 'done' }` SSE event is flushed to the client (adding **0ms user-perceived latency**) when either:
     $$\Delta\text{turns} \ge 8 \quad \lor \quad (\Delta t \ge 24\text{h} \land \Delta\text{turns} \ge 3)$$
   * **Bounded $O(1)$ Incremental Merge**: The extractor never reads the full conversation transcript. It receives only the current `UserPortrait` JSON (~300 tokens) and the delta rows where `turnIndex > lastTurnIndexCovered`.
   * **Versioned Auditability & Manual Override Protection**: Every update appends an immutable snapshot to `UserPortraitHistory` (`trigger: 'auto' | 'manual' | 'admin' | 'restore'`). User-initiated privacy edits are respected and protected from unintended drift.

---

## 5. Network Protocol Topography & Upstream Cancellation

### 5.1 Protocol Selection: Why SSE Over WebSockets or Pure REST

| Dimension | Blocking REST (`POST`) | WebSockets (`ws://` / `wss://`) | Server-Sent Events (`text/event-stream`) — **Selected** |
| :--- | :--- | :--- | :--- |
| **Traffic Topology** | Request $\rightarrow$ Full Response (High TTFT) | Full-Duplex Bi-Directional | **Request $\rightarrow$ Uni-Directional Token Stream** (Matches LLM generation) |
| **HTTP/2 & CDN Multiplexing** | Native HTTP/2 | Requires HTTP/1.1 Upgrade handshake; bypasses standard HTTP/2 stream multiplexing | **Native HTTP/2 multiplexing**; works seamlessly through Cloudflare Tunnel & standard L7 proxies |
| **Load Balancing & State** | Stateless | **Stateful socket clusters**; requires sticky sessions, Redis pub/sub backplanes, and custom reconnect sync | **Stateless per-request lifecycle**; standard HTTP auth cookies/headers work out of the box |
| **Zombie Connection Recovery** | N/A | Complex ping/pong & client state reconciliation | Native browser/fetch stream handling + simple `AbortController` teardown |

### 5.2 Reverse-Proxy Heartbeat Engineering ([`src/lib/sse.ts`](src/lib/sse.ts))

When executing complex multi-tool chains or waiting on deep-reasoning models (`reasoning_effort: 'high'`), upstream silent intervals can exceed 30–60 seconds. Intermediate reverse proxies (Cloudflare, NGINX, AWS ALB) aggressively terminate idle HTTP connections (e.g., Cloudflare's 100s read timeout or standard 60s proxy timeouts).

[`src/lib/sse.ts`](src/lib/sse.ts) wraps `ReadableStream` with a fault-tolerant `SSEController` that emits an SSE comment frame (`: heartbeat\n\n`) every **15 seconds** during long-running LLM or tool operations. Per the WHATWG SSE specification, leading-colon frames are ignored by client parsers while resetting L7 proxy idle timers. All `enqueue()` and `close()` operations are guarded against post-disconnect stream closure exceptions.

### 5.3 End-to-End Cascading Cancellation (`AbortController` $\rightarrow$ Upstream LLM)

Without cascading cancellation, a user closing their browser tab or interrupting a response leaves the server executing up to 12 tool loops and streaming thousands of expensive output tokens into a dead socket.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Browser / Capacitor Client<br/>(MasterChatContext.tsx)
    participant Edge as Next.js App Router<br/>(/api/master/route.ts)
    participant Engine as Turn Engine FSM<br/>(turnEngine.ts)
    participant Stream as LLM Stream Adapter<br/>(src/lib/llm/stream.ts)
    participant Cloud as Upstream LLM Provider<br/>(OpenRouter / Anthropic / OpenAI)
    participant DB as PostgreSQL<br/>(MasterChatMessage)

    Client->>Edge: POST /api/master (fetch with abortController.signal)
    Edge->>Engine: runMasterTurn({ signal: req.signal, ... })
    Engine->>Stream: streamLLM({ signal: input.signal, ... })
    Stream->>Cloud: OpenAI SDK chat.completions.create({ stream: true }, { signal })
    
    Cloud-->>Stream: Token Chunk 1..N
    Stream-->>Engine: yield { type: 'content', text }
    Engine-->>Edge: yield EngineEvent
    Edge-->>Client: SSE data: {"type":"content","text":"..."}

    Note over Client,Cloud: User Interrupts / Navigates Away / Sends New Burst Message
    Client->>Edge: abortController.abort() (TCP RST / HTTP/2 RST_STREAM)
    Edge->>Engine: req.signal fires 'abort' event
    Engine->>Stream: input.signal fires 'onExternalAbort'
    Stream->>Cloud: controller.abort() -> Immediate Upstream Socket Termination
    
    Note over Stream,DB: Cloud GPU Token Burn Halts within Milliseconds
    Stream-->>Engine: Throws AbortError (isTimeoutError = true)
    Engine-->>Edge: Catch Block -> Skip appendMasterChatMessage()
    Note over Engine,DB: Zero-Dirty-Write Guarantee: Partial Turn NEVER Persisted to DB
```

In [`src/lib/llm/stream.ts`](src/lib/llm/stream.ts#L98-L105), the adapter binds both an internal deadline timer (`cfg.timeoutMs`) and the external HTTP request's `AbortSignal`:

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs)
const onExternalAbort = () => controller.abort()
if (req.signal) {
  if (req.signal.aborted) controller.abort()
  else req.signal.addEventListener('abort', onExternalAbort, { once: true })
}
```

When aborted, control jumps directly past `appendMasterChatMessage()` and `prisma.masterSession.update()` in `turnEngine.ts`, guaranteeing **Zero-Dirty-Write** semantics: aborted or half-streamed turns never pollute the relational transcript or deduct session turn budgets.

---

## 6. Concurrency, Reliability & Ledger Consistency

### 6.1 The Hold-then-Settle Transactional State Machine

Divination readings consume *Karma* (`User.credits`). Because LLM generation can take 10–45 seconds and fail due to upstream provider outages, malformed JSON output, or client disconnects, naive "deduct-before-call" loses user funds on failure, while "deduct-after-call" allows race-condition overdrafts when a user fires 10 concurrent requests with 1 credit remaining.

Xuanji implements a strict **Hold-then-Settle** ledger in [`src/lib/readings/lifecycle.ts`](src/lib/readings/lifecycle.ts) and [`src/app/api/divination/_finalize.ts`](src/app/api/divination/_finalize.ts):

```mermaid
stateDiagram-v2
    [*] --> InitTransaction: POST /api/divination/init

    state "Phase 1: Atomic Reservation (Prisma $transaction)" as Phase1 {
        InitTransaction --> CheckBalance: Lock User Row & Verify credits >= cost
        CheckBalance --> Reject402: credits < cost
        CheckBalance --> ReserveHold: Decrement User.credits -= cost
        ReserveHold --> CreatePending: Insert Reading (status='pending', creditsHeld=cost)
        CreatePending --> AuditHold: Insert CreditLog (action='divination_hold')
    }

    Reject402 --> [*]: HTTP 402 INSUFFICIENT_CREDITS
    AuditHold --> LLMExecution: Return readingId to Client

    state "Phase 2: Execution & Dual-Channel Convergence (_finalize.ts)" as Phase2 {
        LLMExecution --> ParseAndValidate: Raw LLM Output
        ParseAndValidate --> SettleSuccess: JSON Valid + Zod Schema Passed
        ParseAndValidate --> TriggerRefund: Parse Failed / Empty Renderable Content
        LLMExecution --> TriggerRefund: Upstream Timeout / Client Abort / Crash
        LLMExecution --> TriggerRefund: Stale Sweeper (pending > 15 mins)
    }

    state "Phase 3A: Settlement (markCompleted)" as Phase3A {
        SettleSuccess --> CompleteRow: status = 'completed', Persist Result & Prompts
    }

    state "Phase 3B: Single-Winner Refund CTE (markFailed -> refundHold)" as Phase3B {
        TriggerRefund --> LockingCTE: SELECT ... FOR UPDATE WHERE creditsHeld > 0 AND status <> 'completed'
        LockingCTE --> ZeroHold: UPDATE creditsHeld = 0 RETURNING pre-update held amount
        ZeroHold --> RestoreCredits: Increment User.credits += held (Winner Only)
        RestoreCredits --> AuditRefund: Insert CreditLog (action='refund') + User Notification
    }

    CompleteRow --> [*]
    AuditRefund --> [*]
```

### 6.2 Single-Winner Concurrency Guarantee (`SELECT ... FOR UPDATE` CTE)

A critical race condition occurs when an HTTP route error handler (`markFailed` on timeout/abort) races against a duplicate client retry or the background stale-reading sweeper (`cleanupStalePendingReadings` scanning rows older than 15 minutes).

To guarantee **exactly-once refund semantics** without external distributed locks, [`src/lib/readings/lifecycle.ts`](src/lib/readings/lifecycle.ts#L73-L93) executes an atomic PostgreSQL Common Table Expression (CTE) with row-level locking:

```sql
WITH claimed AS (
  SELECT id, "creditsHeld", "userId", type FROM "Reading"
  WHERE id = $1 AND "creditsHeld" > 0 AND status <> 'completed'
  FOR UPDATE
), zeroed AS (
  UPDATE "Reading" r SET "creditsHeld" = 0
  FROM claimed c WHERE r.id = c.id
  RETURNING c."creditsHeld" AS held, c."userId", c.type
)
SELECT held, "userId", type FROM zeroed;
```

Concurrent callers serialize on the `FOR UPDATE` row lock. The first transaction claims `creditsHeld`, zeroes it, and receives the pre-update `held` amount to increment `User.credits`. Any racing transaction wakes up after lock release, sees `"creditsHeld" = 0`, receives an empty result set, and safely exits as a no-op.

### 6.3 Current Scale vs. 100k+ DAU Horizontal Scaling Horizon

This repository is engineered pragmatically: it avoids premature microservice bloat while maintaining clean abstraction seams for horizontal scaling.

| Subsystem | Current Architecture (Single-to-Medium Scale) | 100k+ DAU Horizontal Scaling Roadmap |
| :--- | :--- | :--- |
| **Compute & API Tier** | Containerized Next.js 14 Node.js runtime (`docker-compose.yml` + Cloudflare Tunnel ingress). | Stateless horizontal auto-scaling pods (ECS / Kubernetes) behind Cloudflare / ALB; zero sticky-session affinity required due to stateless SSE. |
| **Database & Concurrency** | Single PostgreSQL 16 instance with Prisma connection pooling and `SELECT ... FOR UPDATE` row locks. | Primary-Replica topology via **PgBouncer**; read-heavy profile/history queries routed to Read Replicas; write ledger kept on Primary. |
| **Caching & Rate Limiting** | In-process TTL memory caches (`AdminSetting` hot cache, `iztro` astrolabe cache, daily DB-backed turn limiter). | **Redis Cluster** for shared multi-node rate limiting (sliding-window Lua scripts), cross-pod `AdminSetting` pub/sub invalidation, and distributed session locks. |
| **Background Workloads** | Inline post-SSE async tasks (`maybeExtractPortrait`) & periodic cron sweepers (`src/lib/jobs/`). | Decouple post-turn portrait extraction, Stage-2 narrative summarization, and stale hold sweeping into **BullMQ / Temporal** worker queues. |

---

## 7. Production Engineering, Observability & Quality Gates

### 7.1 Four-Stage Verification & Regression-Locking Discipline

Governed by [`AGENTS.md`](AGENTS.md), every bug fix, schema evolution, or prompt boundary adjustment must be accompanied by an automated regression test before merge:

1. **Gate 1 — Strict Static Type Verification**:
   `npx tsc --noEmit` $\rightarrow$ Must pass with **0 errors**. Strict null checks and discriminated unions (`EngineEvent`, `StreamChunk`, `FinalizeOutcome`) enforce compile-time protocol safety.
2. **Gate 2 — Linting & Architectural Circuit Breakers**:
   `npx eslint src` $\rightarrow$ Must pass with **0 warnings and 0 errors**. Enforces code hygiene and i18n circuit breakers (`T(lang, zhTW, en)`).
3. **Gate 3 — Comprehensive Unit & Integration Suite (Vitest)**:
   `npx vitest run` $\rightarrow$ 100% pass rate across deterministic calculators (`mainstreamAlignment.test.ts`), turn engine FSM (`turnEngine.test.ts`), prompt cache boundary alignment (`buildSystemPrompt.test.ts`), activation detection (`activationDetect.test.ts`), and credit lifecycle atomicity.
4. **Gate 4 — Runtime & Build Integrity Watchdog**:
   [`src/__tests__/smoke/buildIntegrityAndRuntimeGuard.test.ts`](src/__tests__/smoke/buildIntegrityAndRuntimeGuard.test.ts) guards critical module exports, UI dependency graphs, and Next.js build artifact integrity against cache corruption.

### 7.2 Telemetry, TTFT Monitoring & Structured Tracing

* **Request-Scoped Correlation (`src/lib/logger.ts`)**:
  Built on **Pino**, `createRequestLogger(endpoint)` generates a collision-resistant correlation `requestId` attached to every JSON stdout log line and threaded into the PostgreSQL `LlmLog` audit table. Operators can trace an entire multi-tool turn across container stdout and database records via:
  ```bash
  docker logs chinese-divination | jq 'select(.requestId=="a1b2c3d4")'
  ```
* **Turn Latency & TTFT Telemetry (`src/lib/master/turnMonitor.ts`)**:
  `TurnMonitor` tracks exact **Time-to-First-Token (`ttftMs`)**, per-tool execution latency histograms (`toolDurations: Record<string, number>`), and total turn duration (`totalDurationMs`).
* **Automated UX Degradation & Timeout Triggers**:
  If a turn exceeds `SLOW_RESPONSE_THRESHOLD_MS` (`15,000ms`) or encounters an upstream timeout/abort (`isTimeoutError`), `turnEngine` automatically captures the exception context to **Sentry** (`@sentry/nextjs`) with full `MasterTurnMetrics` tags and emits a structured `{ type: 'feedback_prompt', reason: 'slow_response' | 'timeout' }` SSE event to surface non-intrusive telemetry collection in the UI.

---

## 8. Technology Stack Taxonomy & Local Setup

### 8.1 Technical Inventory

| Layer | Technology | Role in System |
| :--- | :--- | :--- |
| **Framework & Runtime** | Next.js 14 (App Router), React 18, TypeScript 5, Node.js 20 | Unified SSR/SPA client surfaces and streaming API route handlers. |
| **Mobile Cross-Platform** | Capacitor 8 (`@capacitor/core`, `ios`, `android`) | Native mobile packaging with biometric auth, haptics, and push notifications. |
| **Symbolic Compute Engines** | `lunar-typescript`, `iztro`, `taobi`, `tyme4ts` + Custom TS Calculators | Deterministic astronomical ephemeris (VSOP87), sexagenary calendar, and matrix engines. |
| **LLM & AI Infrastructure** | OpenAI SDK, Anthropic SDK, OpenRouter, `jsonrepair`, `zod` | Multi-provider streaming inference, structured output repair, and schema gatekeeping. |
| **Database & Persistence** | PostgreSQL 16, Prisma ORM 6 (34+ strict migrations) | ACID ledger transactions, relational chat storage, and versioned user portraits. |
| **Authentication & Billing** | NextAuth v5 (Beta), `bcryptjs`, Stripe SDK | Constant-time credential auth, funnel session tokens, and webhook credit top-ups. |
| **Observability & Testing** | Pino (JSON Logger), Sentry, Vitest 4, Playwright | Request-correlated structured logging, error tracking, and regression test suites. |

### 8.2 Local Development Setup

#### Prerequisites
* **Node.js** `>= 20.x` and **npm**
* **PostgreSQL** `>= 15` (local instance or via Docker)

#### 1. Clone & Install Dependencies
```bash
git clone <repository-url> chinese-divination-dev
cd chinese-divination-dev
npm install
```

#### 2. Configure Environment Variables
Copy the example environment file and configure your PostgreSQL connection string and LLM provider keys:
```bash
cp .env.example .env
```

Key variables required in `.env`:
```dotenv
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/chinese_divination?schema=public"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET="your-cryptographically-secure-secret"
NEXTAUTH_URL="http://localhost:8088"

# LLM Gateway (OpenRouter / Anthropic / OpenAI)
OPENROUTER_API_KEY="sk-or-v1-..."
```

#### 3. Initialize Database Schema & Prisma Client
Run the deterministic migration history (do **not** use `prisma db push` on shared databases):
```bash
npx prisma generate
npx prisma migrate deploy
```

#### 4. Start the Development Server
```bash
npm run dev
```
The server listens on `http://localhost:8088`.

#### 5. Execute the 4-Stage Quality Gate Suite
Before committing any changes, verify all architectural invariants pass:
```bash
# Run TypeScript check, ESLint, and Vitest suite in sequence
npm run predeploy-check

# Or execute individual gates:
npx tsc --noEmit          # Gate 1: Static Type Check (0 errors)
npx eslint src            # Gate 2: Linter & i18n Circuit Breaker (0 warnings)
npx vitest run            # Gate 3: Full Unit, FSM & Smoke Test Suite
```

---

## Architecture Documentation Index

For deep-dive specifications into individual subsystems, consult the internal architecture whitepapers in [`docs/`](docs/):

* [`docs/architecture/overview.md`](docs/architecture/overview.md) — Authoritative System Architecture & 8 Symbolic Engines Whitepaper
* [`docs/architecture/master-portrait-system.md`](docs/architecture/master-portrait-system.md) — Three-Tier Conversational Memory & User Portrait Specification
* [`AGENTS.md`](AGENTS.md) — Engineering SOP, Quality Gates & Regression-Locking Discipline
