"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  BrainCircuit, Activity, Upload, Calendar, Search, ShieldCheck, 
  Database, UserCheck, AlertTriangle, ChevronRight, LogOut, Lock
} from "lucide-react";
import MedicalViewer from "../../components/medical-viewer";
import ReportGenerator from "../../components/report-generator";
import ChatInterface from "../../components/chat-interface";

export default function Dashboard() {
  const router = useRouter();
  
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: number; username: string; email: string; role: string } | null>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [selectedScan, setSelectedScan] = useState<any | null>(null);
  
  // Upload states
  const [patientName, setPatientName] = useState("");
  const [scanType, setScanType] = useState("MRI");
  const [query, setQuery] = useState("Perform standard pathological lesion mapping.");

  // Auto-fill default query based on selected modality
  const handleModalityChange = (value: string) => {
    setScanType(value);
    const skinTypes = ["Skin-Melanoma", "Skin-Eczema", "Skin-Psoriasis", "Skin-Acne", "Skin-Rosacea", "Skin-BCC", "Skin-SCC", "Skin-Fungal"];
    const generalTypes = ["General-Diabetes", "General-Hypertension", "General-Anemia", "General-Thyroid", "General-COVID", "General-Fever", "General-Infection"];
    if (value === "Auto-Detect") {
      setQuery("Automatically identify the type of disease, condition, or abnormality visible in this image. Determine the modality, detect all symptoms, and provide a full clinical analysis with diagnosis, severity, precautions, and treatment recommendations.");
    } else if (skinTypes.includes(value)) {
      setQuery(`Analyze this dermatology image for ${value.replace("Skin-", "")} patterns. Identify lesion morphology, distribution, color, border irregularity, and severity grade.`);
    } else if (generalTypes.includes(value)) {
      setQuery(`Analyze this medical image or report for signs of ${value.replace("General-", "")}. Identify key clinical indicators, severity, and provide recommendations.`);
    } else {
      setQuery("Perform standard pathological lesion mapping.");
    }
  };
  const [uploadMode, setUploadMode] = useState<"auto" | "standard">("auto");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Sync scan type and query based on upload mode
  useEffect(() => {
    if (uploadMode === "auto") {
      setScanType("Auto-Detect");
      setQuery("Automatically identify the type of disease, condition, or abnormality visible in this image. Determine the modality, detect all symptoms, and provide a full clinical analysis with diagnosis, severity, precautions, and treatment recommendations.");
    } else {
      setScanType("MRI");
      setQuery("Perform standard pathological lesion mapping.");
    }
  }, [uploadMode]);

  // System stats & audit log (admin only)
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"workspace" | "audit" | "metrics">("workspace");

  // Mode override toggle (Doctors can toggle to preview what patient sees)
  const [clinicianMode, setClinicianMode] = useState(true);

  // Authenticate on load
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    
    // Parse JWT token manually to extract user ID and Role (safe fallback)
    try {
      const base64Url = savedToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      
      // Request details from backend or mock user state
      // (Since we want zero dependencies, we mock from decoded payload or simple fetch)
      const mockRole = payload.sub === "1" ? "admin" : payload.sub === "2" ? "doctor" : payload.sub === "3" ? "radiologist" : payload.sub === "4" ? "patient" : "doctor";
      const mockUsername = payload.sub === "1" ? "admin" : payload.sub === "2" ? "doctor" : payload.sub === "3" ? "radiologist" : payload.sub === "4" ? "patient" : "doctor_staff";
      
      const loggedUser = {
        id: parseInt(payload.sub),
        username: mockUsername,
        email: `${mockUsername}@cdss.org`,
        role: mockRole
      };
      
      setUser(loggedUser);
      setClinicianMode(loggedUser.role !== "patient");
      
      // Load scans list
      fetchScans(savedToken);

      // Load audit logs if admin
      if (mockRole === "admin") {
        fetchAuditLogs(savedToken);
      }
    } catch (err) {
      console.error("JWT parse failed", err);
      localStorage.removeItem("authToken");
      router.push("/login");
    }
  }, [router]);

  const fetchScans = async (authToken: string) => {
    try {
      const res = await fetch("/api/v1/scans/", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScans(data);
        if (data.length > 0 && !selectedScan) {
          setSelectedScan(data[data.length - 1]);
        }
      }
    } catch (err) {
      console.error("Failed to load scans", err);
    }
  };

  const fetchAuditLogs = async (authToken: string) => {
    try {
      const res = await fetch("/api/v1/audit/logs", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to load audit logs", err);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !token) return;
    
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("patient_name", patientName);
    formData.append("scan_type", scanType);
    formData.append("query", query);
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/scans/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const newScan = await res.json();
      setScans([newScan, ...scans]);
      setSelectedScan(newScan);
      
      // Reset form
      setPatientName("");
      setFile(null);
      // Reset input element
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      // Update logs if admin
      if (user?.role === "admin") {
        fetchAuditLogs(token);
      }
    } catch (err: any) {
      setUploadError(err.message || "An error occurred during scanning processing.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    router.push("/login");
  };

  if (!user || !token) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-slate-100 font-sans">
      {/* Top navbar */}
      <header className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-border bg-card sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 sm:p-2 bg-primary rounded-lg text-white">
            <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="text-xs sm:text-lg font-bold tracking-tight text-white">
            AI Clinical CDSS <span className="hidden sm:inline text-primary font-light">Platform</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Clinician preview toggle */}
          {user.role !== "patient" && (
            <div className="flex items-center bg-slate-900 border border-border p-0.5 sm:p-1 rounded-xl">
              <button 
                onClick={() => setClinicianMode(true)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${clinicianMode ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Clinician
              </button>
              <button 
                onClick={() => setClinicianMode(false)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all ${!clinicianMode ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Patient
              </button>
            </div>
          )}

          {user.role === "patient" && (
            <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-secondary bg-opacity-10 border border-secondary border-opacity-35 text-secondary text-[10px] sm:text-xs rounded-full font-semibold uppercase tracking-wider">
              Patient Portal
            </span>
          )}

          <div className="hidden sm:block h-6 w-[1px] bg-border"></div>

          <div className="hidden sm:block text-right">
            <span className="block text-xs font-bold text-white capitalize">{user.username}</span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">{user.role}</span>
          </div>

          <button 
            onClick={handleLogout}
            className="p-1.5 sm:p-2 bg-slate-900 border border-border rounded-lg text-slate-400 hover:text-red-400 hover:border-red-900 transition-all"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main dashboard body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left side: Upload & Scan selection list */}
        <aside className="w-full lg:w-96 border-r border-border bg-slate-950 flex flex-col p-4 sm:p-6 space-y-4 sm:space-y-6 shrink-0 lg:overflow-y-auto">
          {/* Admin Navigation */}
          {user.role === "admin" && (
            <div className="grid grid-cols-3 gap-1 bg-slate-900 border border-border p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab("workspace")}
                className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${activeTab === 'workspace' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Diagnostic
              </button>
              <button 
                onClick={() => setActiveTab("audit")}
                className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${activeTab === 'audit' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Audit Log
              </button>
              <button 
                onClick={() => setActiveTab("metrics")}
                className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${activeTab === 'metrics' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Analytics
              </button>
            </div>
          )}

          {activeTab === "workspace" && (
            <>
              {/* Scan Upload Widget */}
              {user.role !== "patient" && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                    <Upload className="h-4 w-4 text-primary" />
                    <span>Upload New Diagnostic Scan</span>
                  </div>
                  
                  {/* Mode Selector */}
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 border border-border p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setUploadMode("auto")}
                      className={`py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                        uploadMode === "auto" ? "bg-primary text-white shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      🔍 Auto-Detect Triage
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("standard")}
                      className={`py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                        uploadMode === "standard" ? "bg-primary text-white shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      📋 Known Modality
                    </button>
                  </div>
                  
                  {uploadError && (
                    <div className="p-3 bg-red-950 bg-opacity-20 border border-red-900 border-opacity-40 text-red-400 text-xs rounded-lg">
                      {uploadError}
                    </div>
                  )}

                  <form onSubmit={handleUploadSubmit} className="space-y-3">
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Patient Name</label>
                      <input 
                        type="text" 
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="w-full bg-slate-900 border border-border text-white text-xs px-3 py-2.5 rounded-lg focus:border-primary focus:outline-none"
                      />
                    </div>
                    
                    <div className={uploadMode === "standard" ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
                      {uploadMode === "standard" && (
                        <div>
                          <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Modality</label>
                          <select
                            value={scanType}
                            onChange={(e) => handleModalityChange(e.target.value)}
                            className="w-full bg-slate-900 border border-border text-white text-xs px-3 py-2.5 rounded-lg focus:border-primary focus:outline-none"
                          >
                            <option value="Auto-Detect">🔍 Auto-Detect (AI identifies disease)</option>
                            <optgroup label="── Radiology / Imaging">
                              <option value="MRI">MRI Scan</option>
                              <option value="CT">CT Scan</option>
                              <option value="X-ray">Chest X-ray</option>
                              <option value="Ultrasound">Ultrasound</option>
                              <option value="PET">PET Scan</option>
                              <option value="Mammography">Mammography</option>
                            </optgroup>
                            <optgroup label="── Dermatology / Skin">
                              <option value="Skin-Melanoma">Melanoma Detection</option>
                              <option value="Skin-Eczema">Eczema / Atopic Dermatitis</option>
                              <option value="Skin-Psoriasis">Psoriasis</option>
                              <option value="Skin-Acne">Acne Vulgaris</option>
                              <option value="Skin-Rosacea">Rosacea</option>
                              <option value="Skin-BCC">Basal Cell Carcinoma (BCC)</option>
                              <option value="Skin-SCC">Squamous Cell Carcinoma (SCC)</option>
                              <option value="Skin-Fungal">Fungal Infection (Tinea)</option>
                            </optgroup>
                            <optgroup label="── General / Systemic Conditions">
                              <option value="General-Diabetes">Diabetes Indicators</option>
                              <option value="General-Hypertension">Hypertension / BP</option>
                              <option value="General-Anemia">Anemia / Blood Disorders</option>
                              <option value="General-Thyroid">Thyroid Conditions</option>
                              <option value="General-COVID">COVID-19 / Respiratory</option>
                              <option value="General-Fever">Fever / Viral Infection</option>
                              <option value="General-Infection">Bacterial / Parasitic Infection</option>
                            </optgroup>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                          {uploadMode === "standard" ? "Scan Image" : "Upload Scan / Image / Photo"}
                        </label>
                        <input 
                          type="file" 
                          id="file-input"
                          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                          accept="image/*"
                          required
                          className="w-full bg-slate-900 border border-border text-white text-xs px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Prompt / Query</label>
                      <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-border text-white text-xs px-3 py-2 rounded-lg focus:border-primary focus:outline-none h-14 resize-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={uploading}
                      className="w-full py-2.5 bg-primary hover:bg-opacity-95 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      {uploading ? (
                        <>
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                          <span>Processing Multi-Agent Audit...</span>
                        </>
                      ) : (
                        <span>Upload & Analyze</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Scans selection list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Diagnostic Scan Log ({scans.length})</span>
                  <Activity className="h-3.5 w-3.5 text-slate-500" />
                </div>

                <div className="space-y-2">
                  {scans.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border rounded-xl">
                      <span className="text-xs text-slate-500">No scans cataloged in history.</span>
                    </div>
                  ) : (
                    scans.map((scan) => (
                      <button
                        key={scan.id}
                        onClick={() => setSelectedScan(scan)}
                        className={`w-full p-4 border rounded-xl text-left transition-all flex justify-between items-center ${selectedScan?.id === scan.id ? 'bg-primary bg-opacity-5 border-primary shadow-lg' : 'bg-card border-border hover:border-slate-700'}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{scan.patient_name}</span>
                            <span className="px-2 py-0.5 bg-slate-900 text-[10px] text-primary border border-border rounded-full font-bold uppercase">
                              {scan.scan_type}
                            </span>
                          </div>
                          <span className="block text-[10px] text-slate-400 flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-slate-500" />
                            {new Date(scan.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${selectedScan?.id === scan.id ? 'text-primary transform translate-x-1' : 'text-slate-500'}`} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "audit" && user.role === "admin" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Security Audit logs</span>
                <Lock className="h-3.5 w-3.5 text-accent" />
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-card border border-border rounded-lg space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-semibold text-accent">{log.action}</span>
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{log.details}</p>
                    <span className="block text-[8px] text-slate-500">IP: {log.ip_address || "127.0.0.1"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "metrics" && user.role === "admin" && (
            <div className="space-y-5">
              <div className="text-slate-400 text-xs font-semibold">AI Diagnostic Usage Analytics</div>
              
              <div className="p-4 bg-card border border-border rounded-xl space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Operational Success Rate</span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-white">99.8%</span>
                  <span className="text-[10px] text-secondary">▲ 0.4% this month</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: "99.8%" }}></div>
                </div>
              </div>

              <div className="p-4 bg-card border border-border rounded-xl space-y-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Modality Breakdown</span>
                <div className="space-y-2">
                  {[
                    { label: "MRI Scans", val: 32, color: "bg-primary" },
                    { label: "CT Scans", val: 22, color: "bg-secondary" },
                    { label: "Chest X-ray", val: 16, color: "bg-accent" },
                    { label: "Ultrasound", val: 10, color: "bg-slate-400" },
                    { label: "Melanoma / Skin Cancer", val: 9, color: "bg-rose-500" },
                    { label: "Eczema / Psoriasis", val: 6, color: "bg-orange-400" },
                    { label: "Other Dermatology", val: 5, color: "bg-amber-400" },
                  ].map((m, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{m.label}</span>
                        <span>{m.val}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.val}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Right side: Medical Viewer, Report tabs, Literature search, Chat follow-up */}
        <main className="flex-1 bg-background p-4 sm:p-6 flex flex-col lg:overflow-y-auto space-y-4 sm:space-y-6">
          {!selectedScan ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl p-12 text-center">
              <BrainCircuit className="h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-white font-bold text-lg">CDSS Diagnostic Workspace</h3>
              <p className="text-slate-500 text-sm max-w-sm mt-2">
                Upload a diagnostic medical imaging scan (X-ray, MRI, CT, Ultrasound) on the sidebar left panel to populate the workspace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              
              {/* Column 1: Image Viewer & Dynamic Chat Panel */}
              <div className="space-y-6">
                {/* 1. Medical Image Viewer component */}
                <MedicalViewer scan={selectedScan} />
                
                {/* 2. Chat interface component */}
                <ChatInterface scan={selectedScan} token={token} />
              </div>

              {/* Column 2: Dual Reports, Evidence & Literature */}
              <div className="space-y-6">
                {/* 1. Report generator & editor */}
                <ReportGenerator 
                  scan={selectedScan} 
                  clinicianMode={clinicianMode} 
                  token={token} 
                  onReportUpdated={() => fetchScans(token)}
                />
              </div>

            </div>
          )}
        </main>

      </div>
    </div>
  );
}
