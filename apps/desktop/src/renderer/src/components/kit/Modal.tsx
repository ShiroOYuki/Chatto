import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMessages } from '../../i18n';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';

/** shadcn/ui dialog styled for Chatto: a title row with a close button, then free content. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const m = useMessages().common;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`gap-4 rounded-2xl border-line bg-tile p-6 text-ink shadow-xl sm:max-w-2xl ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="mt-1 text-xs text-ink-faint">{description}</DialogDescription>
            ) : null}
          </div>
          <DialogClose
            aria-label={m.close}
            className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-tile-muted hover:text-ink [&>svg]:size-4"
          >
            <X />
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
