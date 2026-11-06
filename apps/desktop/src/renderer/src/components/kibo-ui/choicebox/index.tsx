/**
 * Choicebox from Kibo UI (https://www.kibo-ui.com/components/choicebox), MIT © shadcnblocks.
 * Chatto changes: the item label draws no border or fill of its own (the item's className does).
 */
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { type ComponentProps, createContext, type HTMLAttributes, useContext } from 'react';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field';

export type ChoiceboxProps = ComponentProps<typeof RadioGroup>;

export const Choicebox = ({ className, ...props }: ChoiceboxProps) => (
  <RadioGroup className={cn('w-full', className)} {...props} />
);

type ChoiceboxItemContextValue = {
  value: ChoiceboxItemProps['value'];
  id?: ChoiceboxItemProps['id'];
};

const ChoiceboxItemContext = createContext<ChoiceboxItemContextValue | null>(null);

const useChoiceboxItemContext = () => {
  const context = useContext(ChoiceboxItemContext);

  if (!context) {
    throw new Error('useChoiceboxItemContext must be used within a ChoiceboxItem');
  }

  return context;
};

export type ChoiceboxItemProps = ComponentProps<typeof RadioGroupItem>;

export const ChoiceboxItem = ({ className, children, value, id }: ChoiceboxItemProps) => (
  <ChoiceboxItemContext.Provider value={{ value, id }}>
    {/* Chatto: the item's own className draws the card, so drop the label's second border and fill. */}
    <FieldLabel
      htmlFor={id}
      className="has-[>[data-slot=field]]:rounded-xl has-[>[data-slot=field]]:border-0 has-data-[state=checked]:bg-transparent dark:has-data-[state=checked]:bg-transparent"
    >
      <Field className={className} orientation="horizontal">
        {children}
      </Field>
    </FieldLabel>
  </ChoiceboxItemContext.Provider>
);

export type ChoiceboxItemHeaderProps = ComponentProps<typeof FieldContent>;

export const ChoiceboxItemHeader = ({ className, ...props }: ChoiceboxItemHeaderProps) => (
  <FieldContent className={className} {...props} />
);

export type ChoiceboxItemTitleProps = ComponentProps<typeof FieldTitle>;

export const ChoiceboxItemTitle = ({ className, ...props }: ChoiceboxItemTitleProps) => (
  <FieldTitle className={className} {...props} />
);

export type ChoiceboxItemSubtitleProps = HTMLAttributes<HTMLSpanElement>;

export const ChoiceboxItemSubtitle = ({ className, ...props }: ChoiceboxItemSubtitleProps) => (
  <span className={cn('font-normal text-muted-foreground text-xs', className)} {...props} />
);

export type ChoiceboxItemDescriptionProps = ComponentProps<typeof FieldDescription>;

export const ChoiceboxItemDescription = ({ className, ...props }: ChoiceboxItemDescriptionProps) => (
  <FieldDescription className={className} {...props} />
);

export type ChoiceboxIndicatorProps = Partial<ComponentProps<typeof RadioGroupItem>>;

export const ChoiceboxIndicator = (props: ChoiceboxIndicatorProps) => {
  const context = useChoiceboxItemContext();

  return <RadioGroupItem {...props} value={context.value} />;
};
