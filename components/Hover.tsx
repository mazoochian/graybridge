"use client";

import { useState, type ElementType, type ReactNode } from "react";
import { s } from "@/lib/style";

interface HvProps {
  as?: ElementType;
  css: string;
  hover: string;
  children?: ReactNode;
  [key: string]: unknown;
}

/** Element with a hover style, mirroring the design's `style-hover` attribute. */
export function Hv({ as, css, hover, children, ...rest }: HvProps) {
  const [on, setOn] = useState(false);
  const Tag = (as || "div") as ElementType;
  return (
    <Tag
      {...rest}
      style={{ ...s(css), ...(on ? s(hover) : null) }}
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
    >
      {children}
    </Tag>
  );
}
