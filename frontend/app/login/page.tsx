"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrainCircuit, Activity, CheckCircle, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("doctor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Seed default database accounts when page loads
  useEffect(() => {
    fetch("/api/v1/auth/seed", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        console.log("Database seeded successfully", data);
      })
      .catch(err => {
        console.warn("Database seeding failed or already done", err);
      });
      
    // Set view from query params
    if (searchParams.get("mode") === "register") {
      setIsRegister(true);
    }
  }, [searchParams]);

  const safeJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // The server returned non-JSON (HTML error page, plain text, etc.)
      // Surface the raw text so the developer can see what went wrong.
      throw new Error(`Server error (${res.status}): ${text.slice(0, 300)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      if (isRegister) {
        // Register API Call
        const response = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password, role }),
        });

        const data = await safeJson(response);
        if (!response.ok) {
          throw new Error(data.detail || "Registration failed");
        }

        setInfo("Registration successful! You can now log in.");
        setIsRegister(false);
        setPassword("");
      } else {
        // Login API Call (OAuth Form Urlencoded)
        const params = new URLSearchParams();
        params.append("username", username);
        params.append("password", password);

        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params,
        });

        const data = await safeJson(response);
        if (!response.ok) {
          throw new Error(data.detail || "Invalid login credentials");
        }

        // Save access token to storage
        localStorage.setItem("authToken", data.access_token);
        
        // Push to dashboard
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Demo user quick login triggers
  const handleQuickLogin = async (type: "doctor" | "radiologist" | "patient" | "admin") => {
    setLoading(true);
    setError("");
    
    let u = "doctor";
    let p = "D0ct0r$CDSS#99";
    
    if (type === "radiologist") {
      u = "radiologist";
      p = "R4d!0l0g!st@CDSS#7";
    } else if (type === "patient") {
      u = "patient";
      p = "P4t!ent$Care#2024";
    } else if (type === "admin") {
      u = "admin";
      p = "Adm!n@CDSS#2024";
    }

    try {
      const params = new URLSearchParams();
      params.append("username", u);
      params.append("password", p);

      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });

      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data.detail || "Failed to log in.");
      }

      localStorage.setItem("authToken", data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary bg-opacity-10 blur-3xl pointer-events-none"></div>
        
        {/* Head */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <div className="p-2 bg-primary rounded-xl text-white">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">AI Clinical Decision Support Platform <span className="text-primary font-light">(CDSS)</span></span>
          </div>
          <h2 className="text-lg font-semibold text-slate-300 mt-2">
            {isRegister ? "Create Clinical Account" : "Access Decision Platform"}
          </h2>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-red-950 bg-opacity-20 border border-red-900 border-opacity-40 text-red-400 text-xs rounded-xl mb-6 flex items-start space-x-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="p-4 bg-emerald-950 bg-opacity-20 border border-emerald-900 border-opacity-40 text-emerald-400 text-xs rounded-xl mb-6 flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        {/* Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. doctor_smith"
              required
              className="w-full bg-slate-900 border border-border text-white px-4 py-3 rounded-xl focus:border-primary focus:outline-none transition-colors text-sm"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. smith@hospital.org"
                required
                className="w-full bg-slate-900 border border-border text-white px-4 py-3 rounded-xl focus:border-primary focus:outline-none transition-colors text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-900 border border-border text-white px-4 py-3 rounded-xl focus:border-primary focus:outline-none transition-colors text-sm"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">User Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-900 border border-border text-white px-4 py-3 rounded-xl focus:border-primary focus:outline-none transition-colors text-sm"
              >
                <option value="doctor">Medical Doctor</option>
                <option value="radiologist">Radiologist / Imaging Specialist</option>
                <option value="patient">Patient / Care Receiver</option>
                <option value="admin">CDSS System Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-opacity-95 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary/20 text-sm mt-4 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <span>{isRegister ? "Register Credentials" : "Sign In"}</span>
            )}
          </button>
        </form>

        {/* Toggle link */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setInfo("");
            }}
            className="text-xs text-primary hover:underline font-medium"
          >
            {isRegister ? "Already registered? Sign In instead" : "Create new healthcare staff credentials"}
          </button>
        </div>

        {/* Demo Fast Track Login */}
        <div className="border-t border-border mt-8 pt-6">
          <div className="flex items-center space-x-2 text-slate-400 text-xs mb-4 font-semibold">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Fast Track Demo Profiles (Auto-Seeded)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin("doctor")}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-border text-left transition-colors flex flex-col"
            >
              <span className="font-semibold text-white">Doctor View</span>
              <span className="text-[10px] text-slate-500">Full clinical summary</span>
            </button>
            <button
              onClick={() => handleQuickLogin("radiologist")}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-border text-left transition-colors flex flex-col"
            >
              <span className="font-semibold text-white">Radiologist</span>
              <span className="text-[10px] text-slate-500">Grad-CAM thresholds</span>
            </button>
            <button
              onClick={() => handleQuickLogin("patient")}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-border text-left transition-colors flex flex-col"
            >
              <span className="font-semibold text-white">Patient View</span>
              <span className="text-[10px] text-slate-500">Plain-language translate</span>
            </button>
            <button
              onClick={() => handleQuickLogin("admin")}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl border border-border text-left transition-colors flex flex-col"
            >
              <span className="font-semibold text-white">Administrator</span>
              <span className="text-[10px] text-slate-500">Security audit logs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-slate-400">Loading CDSS Portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
