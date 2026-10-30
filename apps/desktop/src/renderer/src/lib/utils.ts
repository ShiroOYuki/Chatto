import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind classes, used by shadcn/ui and Magic UI components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
