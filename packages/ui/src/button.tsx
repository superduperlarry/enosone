import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "accent" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-evergreen text-white hover:bg-evergreen-700 focus-visible:outline-evergreen",
  accent:
    "bg-lime text-evergreen-950 hover:bg-lime-300 focus-visible:outline-lime-600",
  ghost:
    "bg-transparent text-evergreen hover:bg-evergreen-50 border border-evergreen-100 focus-visible:outline-evergreen",
  danger:
    "bg-danger text-white hover:opacity-90 focus-visible:outline-danger",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-ui font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "px-4 py-1.5 text-sm" : "px-6 py-2.5 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
