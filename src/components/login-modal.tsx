"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { t, language } = useLanguage();
    const { login } = useAuth();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setPassword("");
            setError("");
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setIsSubmitting(true);
        setError("");

        const result = await login(password);

        if (result.success) {
            onClose();
        } else {
            setError(result.error || "Login failed");
        }
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "var(--space-4)",
                background: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(4px)",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "420px",
                    overflow: "hidden",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--elev-floating)",
                    border: "1px solid var(--border)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ padding: "var(--space-8)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                        <h3 style={{ fontSize: "var(--text-2xl)", fontWeight: 600, color: "var(--fg)", letterSpacing: "var(--tracking-display)" }}>
                            {t("auth.loginTitle")}
                        </h3>
                        <button
                            onClick={onClose}
                            style={{
                                padding: "var(--space-2)",
                                color: "var(--muted)",
                                borderRadius: "var(--radius-sm)",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "color-mix(in oklab, var(--fg), transparent 92%)";
                                e.currentTarget.style.color = "var(--fg)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "var(--muted)";
                            }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--text-sm)", color: "var(--muted)" }}>
                        {t("auth.loginDescription")}
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-4)" }}>
                        <div className="field">
                            <label htmlFor="login-password" style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--fg)" }}>
                                {language === "zh" ? "密码" : "Password"}
                            </label>
                            <input
                                ref={inputRef}
                                id="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t("auth.passwordPlaceholder")}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    color: "var(--fg)",
                                    background: "var(--surface)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "var(--text-base)",
                                    outline: "none",
                                    transition: "border-color var(--motion-fast) var(--ease-standard)",
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = "var(--accent)";
                                    e.currentTarget.style.boxShadow = "var(--focus-ring)";
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = "var(--border)";
                                    e.currentTarget.style.boxShadow = "";
                                }}
                            />
                            {error && (
                                <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>
                                    {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !password}
                            className="btn btn--primary btn--block"
                            style={{ marginTop: "var(--space-2)" }}
                        >
                            {isSubmitting ? (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                                    <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
                                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {t("auth.loggingIn")}
                                </span>
                            ) : (
                                t("auth.loginButton")
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
