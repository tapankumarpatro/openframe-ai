"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { authSignin, authSignup, authResetPassword } from "@/lib/api";

const AUTH_TOKEN_KEY = "openframe-auth-token";
const AUTH_USER_KEY = "openframe-auth-user";

interface AuthPageProps {
  onAuthenticated: (user: { id: string; email: string; name: string }, token: string) => void;
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setResetSuccess("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
        await authResetPassword(email.trim(), password);
        setResetSuccess("Password reset successfully! You can now sign in.");
        setTimeout(() => { setMode("signin"); setPassword(""); setResetSuccess(""); }, 2000);
        setLoading(false);
        return;
      }
      const result =
        mode === "signin"
          ? await authSignin(email.trim(), password)
          : await authSignup(email.trim(), password, name.trim());

      localStorage.setItem(AUTH_TOKEN_KEY, result.token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
      onAuthenticated(result.user, result.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#fafbfc]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-[440px] bg-white rounded-2xl shadow-[0_8px_60px_-12px_rgba(0,0,0,0.12)] border border-neutral-200/60 overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-2">
          <h1 className="text-[22px] font-extralight tracking-wide text-neutral-800 leading-tight">
            OpenFrame AI
          </h1>
          <p className="text-[12px] text-neutral-400 mt-1.5 font-light tracking-wide leading-relaxed">
            {mode === "signin" ? "Sign in to your account" : mode === "signup" ? "Create a new account" : "Reset your password"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {mode === "signup" && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-[10px] font-light uppercase tracking-[0.15em] text-neutral-400 mb-1.5">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-3 py-2.5 text-[13px] text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300 transition-all font-light"
                    disabled={loading}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-[10px] font-light uppercase tracking-[0.15em] text-neutral-400 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-3 py-2.5 text-[13px] text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300 transition-all font-light"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-light uppercase tracking-[0.15em] text-neutral-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder={mode === "signup" ? "Min 6 characters" : mode === "forgot" ? "New password (min 6 chars)" : "Your password"}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-10 pr-10 py-2.5 text-[13px] text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300 transition-all font-light"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot password link (signin only) */}
          {mode === "signin" && (
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setResetSuccess(""); }}
                className="text-[11px] text-neutral-400 hover:text-[#23809e] transition-colors font-light"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Success */}
          {resetSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12px] text-emerald-600 font-light bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2"
            >
              {resetSuccess}
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12px] text-red-500 font-light bg-red-50 border border-red-100 rounded-lg px-3 py-2"
            >
              {error}
            </motion.div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-white font-semibold text-[14px] shadow-lg hover:shadow-xl active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            style={{ background: "linear-gradient(135deg, #23809e 0%, #3ecfff 100%)" }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Toggle mode */}
          <div className="text-center mt-1">
            <span className="text-[12px] text-neutral-400 font-light">
              {mode === "forgot" ? "Remember your password?" : mode === "signin" ? "Don't have an account?" : "Already have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setResetSuccess(""); }}
              className="text-[12px] text-[#23809e] font-medium hover:underline"
            >
              {mode === "forgot" ? "Sign in" : mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export { AUTH_TOKEN_KEY, AUTH_USER_KEY };
