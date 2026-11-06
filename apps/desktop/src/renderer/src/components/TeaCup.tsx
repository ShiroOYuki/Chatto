import { useMessages } from '../i18n';

export type TeaCupMood = 'sleepy' | 'happy' | 'busy' | 'worried';

/**
 * The cup is the brand mark, so it keeps the brand palette in light and dark mode
 * (docs/visual-identity.md). Only the steam and the "z" follow the theme, to stay
 * visible on either background.
 */
const BRAND = { matcha: '#6b9b2e', body: '#c0dd97', face: '#27500a', blush: '#f4c0d1' } as const;

const STEAM = ['M36 22q-3-5 0-10', 'M48 20q-3-5 0-10', 'M60 22q-3-5 0-10'] as const;

/** Chatto's mascot. Its face reflects the connection state. */
export function TeaCup({ mood = 'happy', size = 96 }: { mood?: TeaCupMood; size?: number }) {
  const label = useMessages().shell.teaCup;
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

  // Each wisp is its own <svg> so the browser can animate it on the compositor.
  // Animating paths inside one SVG repaints the whole cup every frame, which kept the
  // panel busy while idle.
  return (
    <span
      role="img"
      aria-label={label}
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 96 96" width={size} height={size} color={BRAND.face} aria-hidden className="block">
        <path d="M72 40h4a10 10 0 0 1 0 20h-6" stroke={BRAND.matcha} strokeWidth="5" fill="none" />
        <path d="M18 30h60v26a26 26 0 0 1-26 26h-8A26 26 0 0 1 18 56z" fill={BRAND.body} />
        <path d="M18 30h60v6H18z" fill={BRAND.matcha} />
        {eyes}
        {mouth}
        <circle cx="30" cy="54" r="4" fill={BRAND.blush} opacity="0.8" />
        <circle cx="66" cy="54" r="4" fill={BRAND.blush} opacity="0.8" />
        {mood === 'sleepy' ? (
          <text x="74" y="22" fontSize="12" fill="var(--c-ink-faint)" fontWeight="700">
            z
          </text>
        ) : null}
      </svg>
      {mood !== 'sleepy'
        ? STEAM.map((d, index) => (
            <svg
              key={d}
              viewBox="0 0 96 96"
              width={size}
              height={size}
              aria-hidden
              className="steam absolute inset-0"
              style={{ animationDelay: `${index * 0.8}s` }}
            >
              <path d={d} stroke="var(--c-ink-faint)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
          ))
        : null}
    </span>
  );
}
