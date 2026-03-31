import init, { LoadGamePack, BuildGraph, Evaluate, Explain } from "/wasm_bindings.js";

let ready = false;

(async () => {
  await init("/engine.wasm");
  ready = true;
  postMessage({ type: "ready" });
})();

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  const reply = (msg) => postMessage({ id, ...msg });

  const toU8 = (obj) =>
    new TextEncoder().encode(
      obj instanceof Uint8Array
        ? obj
        : typeof obj === "string"
          ? obj
          : JSON.stringify(obj),
    );

  const fromU8 = (u8) => {
    try {
      return JSON.parse(new TextDecoder().decode(u8));
    } catch (e) {
      return u8;
    }
  };

  const processResult = (res) => {
    if (res === null || res === undefined) return null;
    if (res instanceof Uint8Array) return fromU8(res);
    return res;
  };

  if (!ready) {
    reply({ type: "error", payload: "worker not ready" });
    return;
  }

  if (type === "loadPack") {
    const res = LoadGamePack(toU8(payload));
    reply({ type: "loaded", payload: processResult(res), request: payload });
  } else if (type === "build") {
    const res = BuildGraph(toU8(payload.entities));
    reply({ type: "built", payload: processResult(res) });
  } else if (type === "eval") {
    const res = Evaluate(toU8(payload));
    reply({ type: "evaluated", payload: processResult(res) });
  } else if (type === "explain") {
    const res = Explain(payload.entityId, payload.output);
    reply({ type: "explained", payload: processResult(res) });
  } else {
    reply({ type: "error", payload: "unknown message type " + type });
  }
};
