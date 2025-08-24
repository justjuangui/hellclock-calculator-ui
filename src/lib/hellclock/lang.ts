export type LangText = { langCode: string; langTranslation: string };

export function translate(list?: LangText[], langCode?: string): string {
	if (!list?.length) return "";
	const lc = (langCode || "en").toLowerCase();
	const m = new Map(
		list.map((x) => [
			x.langCode.toLowerCase(),
			x.langTranslation,
		]),
	);
	// try exact, then base language, then common canonicalizations, then en, then first
	const candidates = [
		lc,
		lc.split("-")[0], // 'es-CO' -> 'es'
		lc.replace("_", "-"),
		lc === "pt-br" ? "pt-br" : lc, // keep pt-br
		"en",
	].filter(Boolean);

	for (const k of candidates) {
		if (m.has(k)) {
			return m.get(k) as string;
		}
	}

	return list[0].langTranslation;
}
