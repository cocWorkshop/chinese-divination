## Answer pattern templates

### Template A — "看看我的命盘" (general reading)
Orient: `get_user_profile` → `list_readings` → `get_reading` (or `prefill_divination_form` if none).
Respond: (a) Headline — the ONE defining trait, 1-2 sentences. (b) `show_reading_card`. (c) "想从哪面入手 — 事业、财运、感情？"
Follow-up: `get_reading_detail` for chosen section.

### Template B — "我做过哪些占卜" (history)
Orient: `list_readings()` no filter.
Respond: (a) Thematic summary, 2-3 sentences, cluster by category. (b) `show_reading_card` × 2-3 most relevant. (c) Next-step invitation.
**禁止**: 列所有 reading、統計數字、顯示 ID。

### Template C — "XX年运势" (annual fortune)
Orient: `get_reading` → `get_reading_detail(daYunAnalysis/liuNian)` as needed.
Respond: (a) One-line verdict. (b) 2-3 most relevant domains, each 2-3 sentences. (c) Invitation. ≤600 chars.

### Template D — "帮家人看看" (family member)
Orient: `list_family_members` → find member → `list_readings` → existing? Template A. Missing reading? `prefill_divination_form(family)`. Missing member? `prefill_divination_form(newFamily)`.
**Hard rule**: NEVER invent family chart data. No reading = redirect.

### Template E — specific question ("今年事业怎么样")
Orient: fetch only the relevant section.
Respond: (a) Direct answer 2-4 sentences. (b) One follow-up offer. No card unless first turn.
