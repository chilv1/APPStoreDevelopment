"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(t.login.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const demoAccounts = [
    { role: t.role.admin,       email: "admin@telecom.vn",   color: "#ef4444" },
    { role: t.role.areaManager, email: "manager@telecom.vn", color: "#8b5cf6" },
    { role: t.role.pm,          email: "pm@telecom.vn",      color: "#3b82f6" },
    { role: t.role.surveyStaff, email: "survey@telecom.vn",  color: "#10b981" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #080c14 0%, #0d1728 50%, #080c14 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background decorations */}
      <div style={{
        position: "absolute", width: 600, height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
        top: -200, right: -100, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
        bottom: -100, left: -100, pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 16,
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            marginBottom: 16, boxShadow: "0 8px 32px rgba(59,130,246,0.3)",
          }}>
            <span style={{ fontSize: 28 }}>📡</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
            {t.login.appTitle}
          </h1>
          <p style={{ fontSize: 14, color: "#8b9ab5" }}>
            {t.login.tagline}
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Login Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: 32,
          backdropFilter: "blur(12px)",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", marginBottom: 24 }}>
            {t.login.title}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8b9ab5", marginBottom: 8 }}>
                {t.login.email}
              </label>
              <input
                className="input"
                type="email"
                placeholder="email@telecom.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#8b9ab5", marginBottom: 8 }}>
                {t.login.password}
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                color: "#fca5a5", fontSize: 13,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gradient-btn"
              style={{
                width: "100%", padding: "12px 24px",
                borderRadius: 10, border: "none", cursor: "pointer",
                color: "#fff", fontSize: 15, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  {t.login.submitting}
                </>
              ) : t.login.submit}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 12, color: "#4a5568", marginBottom: 12, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {t.login.demoTitle}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword("123456"); }}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${acc.color}30`,
                    borderRadius: 8, padding: "8px 10px",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${acc.color}15`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: acc.color, marginBottom: 2 }}>
                    {acc.role}
                  </div>
                  <div style={{ fontSize: 10, color: "#4a5568" }}>{acc.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
