import { cva, type VariantProps } from 'class-variance-authority';
import { h } from 'vue';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        success: 'bg-emerald-100 text-emerald-700',
        info: 'bg-sky-100 text-sky-700',
        warning: 'bg-amber-100 text-amber-700',
        destructive: 'bg-red-100 text-red-700',
        muted: 'bg-muted text-muted-foreground',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeProps = VariantProps<typeof badgeVariants> & { class?: string };

/** 基础徽标（ui/badge） */
export const Badge = (props: BadgeProps, { slots }: { slots: any }) =>
  h(
    'span',
    { class: cn(badgeVariants({ variant: props.variant }), props.class) },
    slots.default?.(),
  );
Badge.props = ['variant'];
