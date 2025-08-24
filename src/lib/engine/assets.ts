export async function fetchJSON<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function loadGamePack(
  onProgress?: (pct: number, label: string) => void,
): Promise<Record<string, unknown>> {
  const manifest = await fetchJSON<{ json: string[] }>("/assets/manifest.json");

  const total = (manifest.json?.length ?? 0) + 1;
  let done = 0;
  const tick = (label: string) => {
    const pct = Math.round((done / total) * 100);
    onProgress?.(pct, label);
  };

  tick("Downloading JSON manifest");
  done++;

  const loaded: Record<string, unknown> = {};
  for (const url of manifest.json) {
    tick(`Downloading ${url}`);
    const data = await fetchJSON(url);
    const key =
      url
        .split("/")
        .pop()
        ?.replace(/\.json$/i, "") || url;
    loaded[key] = data;
    done++;
    tick(`Downloaded ${url}`);
  }

  onProgress?.(100, "Assets ready");
  return loaded;
}
