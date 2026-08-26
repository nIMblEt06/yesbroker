export function HouseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 232 232" className={className} aria-hidden="true" focusable="false">
      <rect width="232" height="232" fill="#FAFAFA" />
      <rect width="232" height="232" rx="4" fill="#111111" />
      <path d="M72 232 V112 A44 44 0 0 1 160 112 V232 Z" fill="#FAFAFA" />
      <circle cx="142" cy="164" r="11" fill="#111111" />
      <rect x="137" y="168" width="10" height="28" fill="#111111" />
    </svg>
  );
}
