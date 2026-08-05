export function VoxpactLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M5 8L14 4L23 8V16L14 24L5 16V8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 4V24M5 8L14 16L23 8"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
