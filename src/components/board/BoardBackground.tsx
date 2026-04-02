"use client";

export function BoardBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(180,190,210,0.14) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(120,160,180,0.08) 1px, transparent 0)",
        backgroundSize: "16px 16px, 64px 64px",
        backgroundPosition: "0 0, 0 0",
      }}
    />
  );
}

