importScripts("/wasm_exec.js");

const go = new Go();
let ready = false;

(async () => {
  const r = await fetch("/engine.wasm");
  const buf = await r.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(buf, go.importObject);
  go.run(instance);
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

  if (!ready) {
    reply({ type: "error", payload: "worker not ready" });
    return;
  }

  if (type === "loadPack") {
    const res = self.LoadGamePack(toU8(payload));
    reply({ type: "loaded", payload: fromU8(res), request: payload });
  } else if (type === "build") {
    const res = self.BuildGraph(toU8(payload.actor), toU8(payload.target));
    reply({ type: "built", payload: fromU8(res) });
  } else if (type === "eval") {
    const res = self.Evaluate(toU8(payload));
    reply({
      type: "evaluated",
      payload: fromU8(res),
    });
  } else if (type === "explain") {
    const res = self.Explain(payload);
    reply({
      type: "explained",
      payload: fromU8(res),
    });
  } else {
    reply({ type: "error", payload: "unknown message type " + type });
  }
};
