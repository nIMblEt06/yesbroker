import type { MsgPrefs } from "./local";
import { formatPhone, phoneDigits } from "./phone";
import { PROPERTY_LABELS, PROPERTY_TAGS } from "./budget";

export function telLink(phoneE164: string): string {
  return `tel:${phoneDigits(phoneE164).slice(-10)}`;
}

export function displayPhone(phoneE164: string): string {
  return formatPhone(phoneE164);
}

export interface WaContext {
  areaNames?: string[];
  areaCounts?: Record<string, number>;
}

const FURNISHING_LABEL: Record<string, string> = {
  semi: "semi furnished",
  full: "fully furnished",
  none: "unfurnished",
};

export function composeMessage(prefs: MsgPrefs): string {
  const areas = prefs.areas.filter(Boolean);
  const bhkList = (Array.isArray(prefs.bhk) ? prefs.bhk : [])
    .filter(Boolean)
    .sort((a, b) => PROPERTY_TAGS.indexOf(a as (typeof PROPERTY_TAGS)[number]) - PROPERTY_TAGS.indexOf(b as (typeof PROPERTY_TAGS)[number]));
  const bhkText = bhkList
    .map((t) => PROPERTY_LABELS[t] ?? t.toLowerCase().replace("_", " "))
    .join("/");
  const furn = prefs.furnishing ? FURNISHING_LABEL[prefs.furnishing] : "";
  const hasBudget =
    Number.isFinite(prefs.budgetMinK) &&
    Number.isFinite(prefs.budgetMaxK) &&
    (prefs.budgetMinK > 0 || prefs.budgetMaxK > 0);
  const hasCriteria = Boolean(areas.length || bhkList.length || furn || hasBudget);

  const lines: string[] = [];

  const intro = prefs.tenant === "family" ? "Hi, we're a family" : "Hi, I'm a bachelor";
  lines.push(`${intro} and I found your contact through YesBroker.`);

  if (hasCriteria) {
    const subject = prefs.tenant === "family" ? "We're looking for" : "I'm looking for";
    let what = bhkText ? `a ${bhkText} place` : "a place";
    if (bhkList.length) what += " to live";
    let sentence = `${subject} ${what}`;
    if (areas.length) sentence += ` in and around ${areas.join("/")}`;
    if (furn) sentence += `, ${furn} preferred`;
    if (hasBudget) {
      sentence +=
        prefs.budgetMinK === prefs.budgetMaxK
          ? `, budget around ₹${prefs.budgetMaxK}k`
          : `, budget between ₹${prefs.budgetMinK}k and ₹${prefs.budgetMaxK}k`;
    }
    sentence += ".";
    lines.push(sentence);
    lines.push("Would really appreciate your help with this!");
  } else {
    lines.push("I'm looking for a rental.");
    lines.push("Would love your help finding one!");
  }

  lines.push("Thank you!");
  return lines.join("\n");
}

export function buildWhatsAppLink(phoneE164: string, message: string): string {
  return `https://wa.me/${phoneDigits(phoneE164)}?text=${encodeURIComponent(message)}`;
}
