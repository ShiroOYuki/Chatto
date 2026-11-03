/**
 * Chatto's animation layer, built on Motion (MIT). Shared springs and small
 * animated building blocks so every page moves the same way.
 */
import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 };
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 28 };

/** Child variants for anything placed inside a <Stagger>. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
};

/** Container that reveals its <Tile>s one after another. */
export function Stagger({
  className = '',
  children,
  gap = 0.035,
}: {
  className?: string;
  children: ReactNode;
  gap?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

/** Page-level transition keyed by the page id. */
export function PageTransition({
  id,
  className = '',
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        className={className}
        initial={reduce ? false : { opacity: 0, y: 8, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduce ? undefined : { opacity: 0, y: -6, filter: 'blur(2px)' }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Odometer-style number: each digit rolls to its new value. */
export function RollingNumber({ value, className = '' }: { value: number; className?: string }) {
  const digits = Math.max(0, Math.round(value)).toLocaleString('en-US').split('');
  return (
    <span className={`inline-flex overflow-hidden leading-none tabular-nums ${className}`} aria-label={String(value)}>
      {digits.map((char, index) => {
        const position = digits.length - index; // keyed from the right so digits keep their place
        if (!/\d/.test(char)) {
          return (
            <span key={`sep-${position}`} aria-hidden="true">
              {char}
            </span>
          );
        }
        const digit = Number(char);
        return (
          <span key={position} className="relative inline-block h-[1em] w-[0.62em] overflow-hidden" aria-hidden="true">
            <motion.span
              className="absolute inset-x-0 top-0 flex flex-col items-center"
              initial={false}
              animate={{ y: `${-digit}em` }}
              transition={spring}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n} className="block h-[1em] leading-none">
                  {n}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

/** Cross-fades between two icons (e.g. copy → check). */
export function SwapIcon({ swapped, from, to }: { swapped: boolean; from: ReactNode; to: ReactNode }) {
  return (
    <span className="relative inline-grid size-4 place-items-center [&_svg]:size-4">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={swapped ? 'to' : 'from'}
          className="grid place-items-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {swapped ? to : from}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export { AnimatePresence, motion };
