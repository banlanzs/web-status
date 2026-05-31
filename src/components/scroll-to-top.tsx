"use client";

import { useEffect, useState } from "react";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => { window.removeEventListener("scroll", toggleVisibility); };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: "fixed",
        bottom: "32px",
        right: "32px",
        zIndex: 50,
        display: "flex",
        height: "48px",
        width: "48px",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface)",
        color: "var(--fg-2)",
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--elev-raised)",
        cursor: "pointer",
        transition: "transform var(--motion-fast) var(--ease-standard), background var(--motion-fast) var(--ease-standard)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.background = "color-mix(in oklab, var(--surface), var(--fg) 4%)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.background = "var(--surface)";
      }}
      aria-label="返回顶部"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="m18 15-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
