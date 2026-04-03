/**
 * @param {string | null | undefined} raw
 * @returns {{ alex: string, mia: string } | null}
 */
export function parseFarmDialogueJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    const alex = String(o.alex ?? "").trim();
    const mia = String(o.mia ?? "").trim();
    if (!alex || !mia) return null;
    return {
      alex: alex.slice(0, 280),
      mia: mia.slice(0, 280)
    };
  } catch {
    return null;
  }
}
