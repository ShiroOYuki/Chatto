export type TeaCupMood = 'sleepy' | 'happy' | 'busy' | 'worried';

/** Chatto's mascot. Its face reflects the connection state. */
export function TeaCup({ mood = 'happy', size = 96 }: { mood?: TeaCupMood; size?: number }) {
  const eyes =
    mood === 'sleepy' ? (
      <>
        <path d="M33 47q4 3 8 0" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M55 47q4 3 8 0" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ) : mood === 'busy' ? (
      <>
        <path d="M33 48l4-4 4 4" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M55 48l4-4 4 4" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="37" cy="46" r="3" fill="currentColor" />
        <circle cx="59" cy="46" r="3" fill="currentColor" />
      </>
    );
  const mouth =
    mood === 'worried' ? (
      <path d="M43 58q5-4 10 0" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M43 55q5 5 10 0" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    );

  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={mood === 'sleepy' ? 'text-matcha-strong' : 'wobble text-matcha-strong'}
      role="img"
      aria-label="Chatto 茶杯"
    >
      {mood !== 'sleepy' ? (
        <g stroke="var(--c-ink-faint)" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path className="steam" d="M36 22q-3-5 0-10" />
          <path className="steam" d="M48 20q-3-5 0-10" />
          <path className="steam" d="M60 22q-3-5 0-10" />
        </g>
      ) : null}
      <path d="M72 40h4a10 10 0 0 1 0 20h-6" stroke="var(--c-matcha)" strokeWidth="5" fill="none" />
      <path d="M18 30h60v26a26 26 0 0 1-26 26h-8A26 26 0 0 1 18 56z" fill="var(--c-matcha-soft)" />
      <path d="M18 30h60v6H18z" fill="var(--c-matcha)" />
      {eyes}
      {mouth}
      <circle cx="30" cy="54" r="4" fill="var(--c-sakura)" opacity="0.8" />
      <circle cx="66" cy="54" r="4" fill="var(--c-sakura)" opacity="0.8" />
      {mood === 'sleepy' ? (
        <text x="74" y="22" fontSize="12" fill="var(--c-ink-faint)" fontWeight="700">
          z
        </text>
      ) : null}
    </svg>
  );
}
