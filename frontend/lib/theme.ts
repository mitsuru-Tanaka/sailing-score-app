import type React from "react";

export const T = {
  bg:       "#0d1117",
  surface:  "#161c2c",
  surface2: "#1e2639",
  border:   "#2a3450",
  text:     "#e8edf5",
  muted:    "#7c8fa6",
  accent:   "#f97316",
  accent2:  "#22c55e",
  white:    "#ffffff",
} as const;

export const CARD: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
};

export const INPUT: React.CSSProperties = {
  padding: "10px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: "8px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
  backgroundColor: T.surface2,
  color: T.text,
};

export const BTN_PRIMARY: React.CSSProperties = {
  padding: "9px 18px",
  backgroundColor: T.accent,
  color: T.white,
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px",
};

export const BTN_GHOST: React.CSSProperties = {
  padding: "9px 18px",
  backgroundColor: "transparent",
  color: T.muted,
  border: `1px solid ${T.border}`,
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px",
};
