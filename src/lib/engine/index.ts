import type { EngineWorkerMessage, EngineWorkerCommand } from "./types";

type Pending = {
  resolve: (v: any) => void;
  reject: (e: any) => void;
  timer?: number;
};

export class Engine {
  private worker: Worker;
  private _ready = false;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private sanitize<T>(v: T): T {
    try {
      if (v instanceof String) {
        return v
      }
      return structuredClone(v);
    } catch {
      return JSON.parse(JSON.stringify(v));
    }
  }
  onPush?: (m: EngineWorkerMessage) => void; // for 'ready' or unsolicited pushes

  constructor() {
    this.worker = new Worker("/workers/worker.js");

    this.worker.onmessage = (e: MessageEvent<any>) => {
      const { id, type, payload } = e.data ?? {};
      console.debug("Worker message:", e.data);

      if (type === "ready") {
        this._ready = true;
        this.onPush?.({ type: "ready" });
        return;
      }

      if (id != null && this.pending.has(id)) {
        const p = this.pending.get(id)!;
        if (p.timer) clearTimeout(p.timer);
        this.pending.delete(id);
        if (type === "error") p.reject(new Error(String(payload)));
        else p.resolve(payload);
        return;
      }

      // Fallback for any other pushed messages
      this.onPush?.({ type, payload } as EngineWorkerMessage);
    };

    this.worker.onerror = (err) => {
      // reject everything pending
      const error = new Error(String((err as ErrorEvent)?.message ?? err));
      for (const [id, p] of this.pending) {
        if (p.timer) clearTimeout(p.timer);
        p.reject(error);
        this.pending.delete(id);
      }
    };
  }

  isReady() {
    return this._ready;
  }

  onceReady(timeoutMs = 20000): Promise<void> {
    if (this._ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("Engine timeout")),
        timeoutMs,
      );
      const unsub = (m: EngineWorkerMessage) => {
        if (m.type === "ready") {
          clearTimeout(t);
          resolve();
        }
      };
      this.onPush = (m) => {
        unsub(m);
      };
    });
  }

  private call<T = unknown>(
    msg: Omit<EngineWorkerCommand, "id">,
    opts?: { timeoutMs?: number; signal?: AbortSignal },
  ): Promise<T> {
    const id = ++this.seq;

    if (opts?.signal?.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }

    const p = new Promise<T>((resolve, reject) => {
      const entry: Pending = { resolve, reject };
      if (opts?.timeoutMs && opts.timeoutMs > 0) {
        entry.timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`Worker call timed out after ${opts.timeoutMs}ms`));
        }, opts.timeoutMs) as unknown as number;
      }

      if (opts?.signal) {
        const onAbort = () => {
          if (entry.timer) clearTimeout(entry.timer);
          this.pending.delete(id);
          reject(new DOMException("Aborted", "AbortError"));
          opts.signal?.removeEventListener("abort", onAbort);
        };
        opts.signal.addEventListener("abort", onAbort, { once: true });
      }

      this.pending.set(id, entry);
      const safeMsg = this.sanitize({ id, ...msg });
      this.worker.postMessage(safeMsg);
    });

    return p;
  }

  // Convenience methods
  loadPack(pack: unknown, opts?: { timeoutMs?: number; signal?: AbortSignal }) {
    return this.call({ type: "loadPack", payload: pack }, opts);
  }
  build(
    entities: unknown,
    opts?: { timeoutMs?: number; signal?: AbortSignal },
  ) {
    return this.call({ type: "build", payload: { entities } }, opts);
  }
  eval(payload: unknown, opts?: { timeoutMs?: number; signal?: AbortSignal }) {
    return this.call({ type: "eval", payload }, opts);
  }
  explain(
    payload: unknown,
    opts?: { timeoutMs?: number; signal?: AbortSignal },
  ) {
    return this.call({ type: "explain", payload }, opts);
  }

  terminate() {
    this.worker.terminate();
  }
}
