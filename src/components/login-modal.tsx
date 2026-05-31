"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { t } = useLanguage();
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
                    maxWidth: "384px",
                    overflow: "hidden",
                    background: "var(--surface)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--elev-raised)",
                    border: "1px solid var(--border)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ padding: "var(--space-6)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
                        <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--fg)" }}>
                            {t("auth.loginTitle")}
                        </h3>
                        <button
                            onClick={onClose}
                            style={{
                                padding: "var(--space-1)",
                                color: "var(--meta)",
                                borderRadius: "var(--radius-sm)",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: "20px", height: "20px" }} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--text-sm)", color: "var(--muted)" }}>
                        {t("auth.loginDescription")}
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "var(--space-4)" }}>
                        <div>
                            <input
                                ref={inputRef}
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t("auth.passwordPlaceholder")}
                                style={{
                                    width: "100%",
                                    padding: "var(--space-2) var(--space-4)",
                                    color: "var(--fg)",
                                    background: "var(--surface-warm)",
                                    border: "1px solid var(--border-soft)",
                                    borderRadius: "var(--radius-md)",
                                    fontSize: "var(--text-base)",
                                    outline: "none",
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.boxShadow = "var(--focus-ring)";
                                    e.currentTarget.style.borderColor = "var(--accent)";
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.boxShadow = "";
                                    e.currentTarget.style.borderColor = "var(--border-soft)";
                                }}
                            />
                            {error && (
                                <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--danger)" }}>
                                    {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !password}
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                        >
                            {isSubmitting ? (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                                    <svg style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
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
