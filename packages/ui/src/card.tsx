import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "evergreen" | "lavender";
}

const tones = {
  default: "bg-white border border-evergreen-100",
  evergreen: "bg-evergreen text-white border border-evergreen-700",
  lavender: "bg-lavender-300 border border-lavender",
};

export function Card({ tone = "default", className, ...props }: CardProps) {
  return (
    <div
      className={cx("rounded-card p-6 shadow-sm", tones[tone], className)}
      {...props}
    />
  );
}
