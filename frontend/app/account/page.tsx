"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

const IS_LOCAL = process.env.NEXT_PUBLIC_MODE === "local";
const NAV    = "#1F4E78";
const BORDER = "#e2e8f0";
const WHITE  = "#ffffff";
const TEXT   = "#1a2332";
const MUTED  = "#64748b";
const INPUT_STYLE: React.CSSProperties = {
  padding: "10px 12px",
  border: `1px solid ${BORDER}`,
  borderRadius: "8px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
  backgroundColor: WHITE,
  boxSizing: "border-box",
};
const CARD: React.CSSProperties = {
  backgroundColor: WHITE,
  border: `1px solid ${BORDER}`,
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

function SaveButton({ saving, disabled, label, savingLabel }: {
  saving: boolean; disabled: boolean; label: string; savingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={saving || disabled}
      style={{
        padding: "9px 20px", backgroundColor: NAV, color: WHITE,
        border: "none", borderRadius: "8px", cursor: (saving || disabled) ? "default" : "pointer",
        fontWeight: "600", fontSize: "13px", opacity: (saving || disabled) ? 0.6 : 1,
      }}
    >
      {saving ? savingLabel : label}
    </button>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [nameErr, setNameErr] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !IS_LOCAL) {
        router.replace("/login");
        return;
      }
      setEmail(user?.email ?? "dev@localhost");
      const dn = (user?.user_metadata?.display_name as string | undefined) ?? "";
      setDisplayName(dn);
      setNameInput(dn);

      try {
        const res = await apiFetch("/users/me");
        if (res.ok) {
          const data = await res.json();
          setRole(data.role ?? "");
        }
      } catch {
        // role 取得失敗は無視
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(""); setNameErr(""); setNameSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { display_name: nameInput.trim() },
      });
      if (error) { setNameErr(error.message); return; }
      setDisplayName(nameInput.trim());
      setNameMsg("表示名を更新しました");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(""); setEmailErr(""); setEmailSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) { setEmailErr(error.message); return; }
      setEmailMsg(`確認メールを ${newEmail.trim()} に送信しました。メール内のリンクをクリックすると変更が完了します。`);
      setNewEmail("");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(""); setPwErr("");
    if (newPassword.length < 6) { setPwErr("パスワードは6文字以上にしてください"); return; }
    if (newPassword !== confirmPassword) { setPwErr("パスワードが一致しません"); return; }
    setPwSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPwErr(error.message); return; }
      setPwMsg("パスワードを変更しました");
      setNewPassword(""); setConfirmPassword("");
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "40px 24px", color: MUTED, fontSize: "14px" }}>読み込み中...</div>;
  }

  return (
    <main style={{ padding: "32px 24px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
        <Link href="/" style={{ color: MUTED, textDecoration: "none", fontSize: "13px" }}>← トップ</Link>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT, margin: 0 }}>アカウント設定</h1>
      </div>

      {IS_LOCAL && (
        <div style={{
          backgroundColor: "#fff7ed", border: "1px solid #fed7aa",
          borderRadius: "10px", padding: "14px 18px", marginBottom: "20px",
          fontSize: "13px", color: "#9a3412",
        }}>
          ローカルモードでは認証機能が無効なため、メールアドレス・パスワード・表示名の変更はできません。
        </div>
      )}

      {/* アカウント情報（読み取り専用） */}
      <div style={{ ...CARD, marginBottom: "20px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "16px" }}>
          アカウント情報
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: MUTED, marginBottom: "3px" }}>メールアドレス</div>
            <div style={{ fontSize: "14px", color: TEXT }}>{email}</div>
          </div>
          {displayName && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: MUTED, marginBottom: "3px" }}>表示名</div>
              <div style={{ fontSize: "14px", color: TEXT }}>{displayName}</div>
            </div>
          )}
          {role && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: MUTED, marginBottom: "3px" }}>権限</div>
              <span style={{
                display: "inline-block",
                backgroundColor: role === "admin" ? "#dbeafe" : "#f1f5f9",
                color: role === "admin" ? "#1d4ed8" : MUTED,
                fontSize: "12px", fontWeight: "700", padding: "2px 10px", borderRadius: "4px",
              }}>
                {role === "admin" ? "管理者" : "メンバー"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 表示名変更 */}
      <div style={{ ...CARD, marginBottom: "20px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
          表示名
        </h2>
        <p style={{ fontSize: "12px", color: MUTED, marginTop: 0, marginBottom: "16px" }}>
          アプリ内で表示される名前です。未設定の場合はメールアドレスが表示されます。
        </p>
        <form onSubmit={handleNameSave}>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="例: 田中みつる"
            maxLength={50}
            disabled={IS_LOCAL}
            style={{ ...INPUT_STYLE, marginBottom: "12px", opacity: IS_LOCAL ? 0.5 : 1 }}
          />
          {nameErr && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "10px" }}>{nameErr}</p>}
          {nameMsg && <p style={{ color: "#0e6657", fontSize: "13px", marginBottom: "10px" }}>{nameMsg}</p>}
          <SaveButton saving={nameSaving} disabled={IS_LOCAL} label="表示名を保存" savingLabel="保存中..." />
        </form>
      </div>

      {/* メールアドレス変更 */}
      <div style={{ ...CARD, marginBottom: "20px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
          メールアドレスの変更
        </h2>
        <p style={{ fontSize: "12px", color: MUTED, marginTop: 0, marginBottom: "16px" }}>
          新しいアドレスに確認メールを送ります。メール内のリンクをクリックすると変更が完了します。
        </p>
        <form onSubmit={handleEmailSave}>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="新しいメールアドレス"
            required
            disabled={IS_LOCAL}
            style={{ ...INPUT_STYLE, marginBottom: "12px", opacity: IS_LOCAL ? 0.5 : 1 }}
          />
          {emailErr && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "10px" }}>{emailErr}</p>}
          {emailMsg && <p style={{ color: "#0e6657", fontSize: "13px", marginBottom: "10px" }}>{emailMsg}</p>}
          <SaveButton saving={emailSaving} disabled={IS_LOCAL} label="確認メールを送信" savingLabel="送信中..." />
        </form>
      </div>

      {/* パスワード変更 */}
      <div style={{ ...CARD, marginBottom: "20px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: "8px" }}>
          パスワードの変更
        </h2>
        <p style={{ fontSize: "12px", color: MUTED, marginTop: 0, marginBottom: "16px" }}>
          6文字以上のパスワードを設定してください。
        </p>
        <form onSubmit={handlePasswordSave}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード"
              required
              disabled={IS_LOCAL}
              style={{ ...INPUT_STYLE, opacity: IS_LOCAL ? 0.5 : 1 }}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="新しいパスワード（確認）"
              required
              disabled={IS_LOCAL}
              style={{ ...INPUT_STYLE, opacity: IS_LOCAL ? 0.5 : 1 }}
            />
          </div>
          {pwErr && <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "10px" }}>{pwErr}</p>}
          {pwMsg && <p style={{ color: "#0e6657", fontSize: "13px", marginBottom: "10px" }}>{pwMsg}</p>}
          <SaveButton saving={pwSaving} disabled={IS_LOCAL} label="パスワードを変更" savingLabel="変更中..." />
        </form>
      </div>
    </main>
  );
}
