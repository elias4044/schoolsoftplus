"use client";

import { useEffect, useState } from "react";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";
import { KeyRound, Plus, Trash2, Loader2, ShieldCheck, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface CredentialRow {
  id: string;
  deviceName: string;
  deviceType: string;
  backedUp: boolean;
  createdAt: number;
  lastUsedAt: number;
}

type RegisterStep = "idle" | "naming" | "authenticating" | "saving" | "done" | "error";

export default function PasskeyManager() {
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);

  const [registerStep, setRegisterStep] = useState<RegisterStep>("idle");
  const [deviceName, setDeviceName] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    fetchCredentials();
  }, []);

  async function fetchCredentials() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/passkey/credentials");
      const data = await res.json();
      if (data.success) setCredentials(data.credentials);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  function startAdd() {
    // Guess a default device name from the browser UA
    const ua = navigator.userAgent;
    let guess = "My device";
    if (/iphone/i.test(ua))    guess = "iPhone";
    else if (/ipad/i.test(ua)) guess = "iPad";
    else if (/android/i.test(ua)) guess = "Android device";
    else if (/windows/i.test(ua)) guess = "Windows device";
    else if (/macintosh/i.test(ua)) guess = "Mac";
    else if (/linux/i.test(ua)) guess = "Linux device";
    setSuggestedName(guess);
    setDeviceName(guess);
    setRegisterError(null);
    setRegisterStep("naming");
  }

  async function handleRegister() {
    setRegisterError(null);
    setRegisterStep("authenticating");

    try {
      // 1. Get options from server
      const beginRes = await fetch("/api/auth/passkey/register/begin", { method: "POST" });
      const beginData = await beginRes.json();
      if (!beginData.success) throw new Error(beginData.error ?? "Failed to start registration.");

      const options = beginData.options as PublicKeyCredentialCreationOptionsJSON;

      // 2. Prompt the browser
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch (err) {
        const e = err as Error;
        if (e.name === "NotAllowedError") throw new Error("Registration was cancelled.");
        throw new Error("Could not access your authenticator. Please try again.");
      }

      setRegisterStep("saving");

      // 3. Send result to server
      const completeRes = await fetch("/api/auth/passkey/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attResp, deviceName: deviceName.trim() || suggestedName }),
      });
      const completeData = await completeRes.json();
      if (!completeData.success) throw new Error(completeData.error ?? "Failed to save passkey.");

      setRegisterStep("done");
      await fetchCredentials();
      setTimeout(() => setRegisterStep("idle"), 2000);
    } catch (err) {
      setRegisterError((err as Error).message);
      setRegisterStep("error");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/auth/passkey/credentials/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to remove passkey.");
      setCredentials(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(ms: number) {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Your browser does not support passkeys. Try a modern browser like Chrome, Safari, or Edge.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing credentials */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading passkeys...
        </div>
      ) : credentials.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No passkeys registered yet. Add one below to sign in with Face ID, fingerprint, or a security key.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {credentials.map(cred => (
            <div
              key={cred.id}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border"
              style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(1 0 0 / 2%)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.65 0.22 278 / 12%)", color: "oklch(0.75 0.22 278)" }}
                >
                  <MonitorSmartphone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{cred.deviceName}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Added {formatDate(cred.createdAt)}
                    {cred.lastUsedAt !== cred.createdAt && (
                      <> &middot; Last used {formatDate(cred.lastUsedAt)}</>
                    )}
                    {cred.backedUp && <> &middot; Synced</>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(cred.id)}
                disabled={deletingId === cred.id}
                className="ml-3 p-1.5 rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-40"
                style={{ color: "oklch(0.65 0.19 24)" }}
                aria-label={`Remove ${cred.deviceName}`}
              >
                {deletingId === cred.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteError && (
        <p className="text-xs text-destructive">{deleteError}</p>
      )}

      {/* Add passkey flow */}
      <AnimatePresence mode="wait">
        {registerStep === "idle" || registerStep === "done" ? (
          <motion.div key="add-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {registerStep === "done" && (
              <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: "oklch(0.72 0.18 148)" }}>
                <ShieldCheck className="w-3.5 h-3.5" /> Passkey added successfully.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={startAdd}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              Add a passkey
            </Button>
          </motion.div>
        ) : registerStep === "naming" ? (
          <motion.div
            key="naming"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3 rounded-xl border p-4"
            style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(1 0 0 / 2%)" }}
          >
            <div>
              <p className="text-sm font-medium mb-1">Name this passkey</p>
              <p className="text-[11px] text-muted-foreground">
                Give it a name you will recognise, like &ldquo;Work laptop&rdquo; or &ldquo;iPhone&rdquo;.
              </p>
            </div>
            <Input
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder={suggestedName}
              maxLength={64}
              className="text-sm h-9"
              style={{ background: "oklch(1 0 0 / 4%)", borderColor: "oklch(1 0 0 / 10%)" }}
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleRegister(); }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRegister} className="gap-1.5 text-xs h-8">
                <KeyRound className="w-3.5 h-3.5" />
                Continue
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRegisterStep("idle")}
                className="text-xs h-8"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : registerStep === "authenticating" || registerStep === "saving" ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {registerStep === "authenticating"
              ? "Follow the prompt on your device..."
              : "Saving passkey..."}
          </motion.div>
        ) : registerStep === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-destructive">{registerError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegisterStep("idle")}
              className="text-xs h-8"
            >
              Try again
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
