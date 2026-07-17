import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight " +
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime " +
  "disabled:pointer-events-none disabled:opacity-40 active:translate-y-px select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  // lime is a rare accent — reserved for THE action on a surface
  solid: "bg-lime text-ink hover:brightness-[0.94]",
  outline: "border border-bone-16 text-bone hover:border-bone-32 hover:bg-bone-06",
  ghost: "text-bone-64 hover:text-bone hover:bg-bone-06",
  quiet: "text-bone-46 hover:text-bone",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[0.9375rem]",
};

export function buttonClasses(variant: Variant = "outline", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", className, ...props },
  ref,
) {
  return <button ref={ref} className={buttonClasses(variant, size, className)} {...props} />;
});
