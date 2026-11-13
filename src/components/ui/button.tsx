import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[#6aafff] shadow-[0_0_0_1px_rgba(76,158,255,0.4),0_8px_24px_-8px_rgba(76,158,255,0.6)]",
        fire: "bg-gradient-to-r from-[#ff8a3d] to-[#ff4d3d] text-white hover:brightness-110 shadow-[0_8px_28px_-8px_rgba(255,92,47,0.7)]",
        outline: "border border-border-strong bg-surface/60 text-foreground hover:bg-surface-2 hover:border-primary/50",
        ghost: "text-muted hover:text-foreground hover:bg-surface-2",
        subtle: "bg-surface-2 text-foreground hover:bg-surface-3",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
