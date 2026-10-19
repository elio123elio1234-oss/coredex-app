import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/* A figure that counts up from zero the first time it is seen.
   Screen readers get the final value at once; the moving digits are
   decoration. Tabular figures keep the width still while it runs. */

type Props = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
};

export default function CountUp({ value, decimals = 0, prefix = "", suffix = "", className, duration = 1.6 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const final = `${prefix}${value.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    if (!seen || reduce) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [seen, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">
        {prefix}
        {shown.toFixed(decimals)}
        {suffix}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}

// v0.6.0 — count-up figure (once, on first sight; reduced motion shows the value)
