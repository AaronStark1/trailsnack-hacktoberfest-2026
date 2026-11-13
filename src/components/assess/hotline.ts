export interface CallEntry {
  /** The entry exactly as written in the safety database, e.g. "NHS 111 (UK)". */
  text: string;
  /** tel: href, or null when the entry carries no dialable digits ("varies by country"). */
  href: string | null;
}

/**
 * Regional strings in the bundled safety database can hold several numbers
 * ("999 / 112", "NHS 111 (UK) / 01 809 2166 (IE)"). Each slash-separated entry
 * becomes its own tap-to-call target so a tap never dials the concatenation.
 * Entries without a real number come back with href null and must be shown as
 * plain text — the app never invents a number to dial.
 */
export function callEntries(raw: string): CallEntry[] {
  return raw
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const digits = part.replace(/[^+\d]/g, "");
      return { text: part, href: digits.length >= 3 ? `tel:${digits}` : null };
    });
}
