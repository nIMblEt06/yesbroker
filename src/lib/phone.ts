export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10) return null;
  if (!/^[6-9]/.test(d)) return null;
  return "+91" + d;
}

export function phoneDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}

export function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const d = digits.length > 10 ? digits.slice(-10) : digits;
  if (d.length !== 10) return e164;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}
