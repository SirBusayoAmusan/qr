/**
 * Rate limiting and write scheduling.
 *
 * Two separate problems live here:
 *
 *  1. Abuse control  — a public page can be hit by a bot submitting the lead
 *     form in a loop. tokenBucket() caps that per page, per session.
 *
 *  2. Backpressure   — the storage backend is rate limited. Typing in a text
 *     field fires an update on every keystroke; naively persisting each one
 *     would issue ~10 writes/second and get us throttled. WriteQueue coalesces
 *     writes per key and drains them on a schedule.
 *
 * Both are honest client-side guards. They protect the app from itself and
 * from casual abuse. They are NOT a substitute for server-side limits, which
 * are documented in ARCHITECTURE.md.
 */

export function tokenBucket({ capacity, refillPerSec, name = "bucket" }) {
  let tokens = capacity;
  let last = Date.now();

  return {
    name,
    take(n = 1) {
      const now = Date.now();
      tokens = Math.min(capacity, tokens + ((now - last) / 1000) * refillPerSec);
      last = now;
      if (tokens >= n) {
        tokens -= n;
        return { ok: true, remaining: Math.floor(tokens) };
      }
      const retryInMs = Math.ceil(((n - tokens) / refillPerSec) * 1000);
      return { ok: false, retryInMs, remaining: 0 };
    },
    peek() {
      const now = Date.now();
      return Math.floor(
        Math.min(capacity, tokens + ((now - last) / 1000) * refillPerSec)
      );
    },
  };
}

/**
 * Serializes writes, coalesces repeated writes to the same key, and retries
 * transient failures with exponential backoff.
 *
 * Coalescing is the important part: 40 keystrokes in a text field produce
 * exactly one persisted write, not 40.
 */
export class WriteQueue {
  constructor({ adapter, flushMs = 350, maxRetries = 3, onError } = {}) {
    this.adapter = adapter;
    this.flushMs = flushMs;
    this.maxRetries = maxRetries;
    this.onError = onError || (() => {});
    this.pending = new Map(); // key -> () => value  (latest wins)
    this.timer = null;
    this.draining = false;
    this.stats = { queued: 0, written: 0, coalesced: 0, failed: 0 };
  }

  /** Schedule a write. Later calls for the same key replace earlier ones. */
  set(key, valueFn) {
    if (this.pending.has(key)) this.stats.coalesced++;
    this.pending.set(key, valueFn);
    this.stats.queued++;
    this.#schedule();
  }

  /** Write immediately, bypassing the debounce. Use for lead capture. */
  async setNow(key, valueFn) {
    this.pending.set(key, valueFn);
    await this.flush();
  }

  #schedule() {
    if (this.timer || this.draining) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.flushMs);
  }

  async flush() {
    if (this.draining) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.draining = true;
    try {
      while (this.pending.size > 0) {
        const [key, valueFn] = this.pending.entries().next().value;
        this.pending.delete(key);
        // Resolve the value at write time so we always persist latest state.
        let value;
        try {
          value = valueFn();
        } catch (err) {
          this.stats.failed++;
          this.onError(key, err);
          continue;
        }
        await this.#writeWithRetry(key, value);
      }
    } finally {
      this.draining = false;
      if (this.pending.size > 0) this.#schedule();
    }
  }

  async #writeWithRetry(key, value) {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.adapter.set(key, value);
        this.stats.written++;
        return true;
      } catch (err) {
        if (attempt === this.maxRetries) {
          this.stats.failed++;
          this.onError(key, err);
          return false;
        }
        const backoff = Math.min(2000, 120 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    return false;
  }

  /** Flush synchronously-ish on unload so nothing in flight is lost. */
  async drain() {
    await this.flush();
  }
}
