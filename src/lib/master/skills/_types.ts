/**
 * Skills — named composite workflows that combine read-only tools into
 * higher-level capabilities. Skills are pure metadata + prose recipes
 * injected into the master system prompt. They are NOT executed by code;
 * they are orchestration knowledge consumed by the master LLM.
 *
 * To add a new skill: create a file in this directory, import it in
 * skills/index.ts, and append to the skills array. Adding a skill is
 * ZERO code change beyond the file and the registry line — no new tool
 * primitives needed.
 */

export type DivinationType =
  | 'bazi' | 'ziwei' | 'iching' | 'qimen' | 'meihua' | 'fengshui' | 'liuyao'

export interface SkillPrerequisites {
  /** Reading types required from the user themselves. */
  self?: DivinationType[]
  /** Reading types required from at least one family member. */
  family?: DivinationType[]
  /** Minimum number of distinct readings needed across all subjects. */
  minTotal?: number
  /** Human-readable explanation of what's needed, shown to LLM. */
  summary_zh: string
  summary_en: string
}

export interface SkillDef {
  /** Stable machine id, snake_case. */
  readonly id: string
  readonly name_zh: string
  readonly name_en: string
  readonly description_zh: string
  readonly description_en: string
  readonly prerequisites: SkillPrerequisites
  /**
   * The recipe — a prose block the master follows step-by-step. Write it as
   * explicit numbered tool calls (`1. Call list_readings(...) → 2. Call
   * get_reading(...) → ...`). Keep under ~800 chars. If a prerequisite is
   * not met, the recipe should explicitly instruct the master to stop and
   * use prefill_divination_form.
   */
  readonly recipe: string
  /** Optional — trigger phrases that suggest this skill is applicable. Used by the LLM as cues. */
  readonly triggers?: readonly string[]
}
