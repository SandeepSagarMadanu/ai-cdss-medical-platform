"use client";

import { useState, useEffect } from "react";
import { 
  FileText, ShieldAlert, Award, Globe, Edit3, Check, RefreshCw, Stethoscope, Pill, AlertTriangle
} from "lucide-react";

interface ReportGeneratorProps {
  scan: {
    id: number;
    patient_name: string;
    scan_type: string;
    reports: any[];
  };
  clinicianMode: boolean;
  token: string;
  onReportUpdated: () => void;
}

const SKIN_TYPES = ["Skin-Melanoma","Skin-Eczema","Skin-Psoriasis","Skin-Acne","Skin-Rosacea","Skin-BCC","Skin-SCC","Skin-Fungal"];
const GENERAL_TYPES = ["General-Diabetes","General-Hypertension","General-Anemia","General-Thyroid","General-COVID","General-Fever","General-Infection"];
const AUTO_DETECT = "Auto-Detect";

/** Lightweight markdown → JSX renderer supporting ##/###, **bold**, and bullet lists */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const parseLine = (line: string, key: number) => {
    // Replace **bold** with <strong>
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return <span key={key}>{parts}</span>;
  };

  while (i < lines.length) {
    const line = lines[i];

    // H2 (##)
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-white mt-5 mb-2 border-b border-border pb-1.5 flex items-center space-x-2">
          <span className="w-1 h-4 bg-primary rounded-full inline-block shrink-0" />
          <span>{line.slice(3)}</span>
        </h2>
      );
    }
    // H3 (###)
    else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xs font-bold text-primary mt-4 mb-1.5 uppercase tracking-wider">
          {line.slice(4)}
        </h3>
      );
    }
    // Horizontal rule
    else if (line.trim() === "---") {
      elements.push(<hr key={i} className="border-border my-4" />);
    }
    // Bullet list item (- or *)
    else if (/^[\-\*] /.test(line.trim())) {
      const bullets: React.ReactNode[] = [];
      while (i < lines.length && /^[\-\*] /.test(lines[i].trim())) {
        bullets.push(
          <li key={i} className="flex items-start space-x-2 text-xs text-slate-300 leading-relaxed">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>{parseLine(lines[i].trim().slice(2), i)}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-1.5 my-2 ml-1">{bullets}</ul>);
      continue;
    }
    // Empty line → spacer
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="text-xs text-slate-300 leading-relaxed">
          {parseLine(line, i)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

export default function ReportGenerator({ scan, clinicianMode, token, onReportUpdated }: ReportGeneratorProps) {
  const report = scan.reports && scan.reports.length > 0 ? scan.reports[0] : null;
  const isSkin = SKIN_TYPES.includes(scan.scan_type);
  const isGeneral = GENERAL_TYPES.includes(scan.scan_type);
  const isAuto = scan.scan_type === AUTO_DETECT;

  const [isEditing, setIsEditing] = useState(false);
  const [editedClinicianText, setEditedClinicianText] = useState("");
  const [editedPatientText, setEditedPatientText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (report) {
      setEditedClinicianText(report.clinician_summary || "");
      setEditedPatientText(report.patient_summary || "");
      setIsEditing(false);
    }
  }, [report]);

  if (!report) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center text-slate-500">
        <FileText className="h-10 w-10 mx-auto text-slate-700 mb-3" />
        <span className="text-xs">No clinical decision support summaries generated for this scan.</span>
      </div>
    );
  }

  const handleSaveOverride = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/v1/reports/${report.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          clinician_summary: editedClinicianText,
          patient_summary: editedPatientText,
          confidence_score: report.confidence_score
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setIsEditing(false);
        onReportUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update report", err);
    } finally {
      setSaving(false);
    }
  };

  const confidencePercentage = Math.round(report.confidence_score * 100);
  const displayText = clinicianMode ? (report.clinician_summary || "") : (report.patient_summary || "");

  return (
    <div className="space-y-6">

      {/* Metrics Card */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
            <Award className="h-4 w-4 text-primary" />
            <span>Calibrated AI System Confidence</span>
          </div>
          <p className="text-2xl font-black text-white">{confidencePercentage}%</p>
          {isSkin && (
            <div className="flex items-center space-x-1.5 mt-1">
              <Stethoscope className="h-3 w-3 text-rose-400" />
              <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">
                Dermatology AI — {scan.scan_type.replace("Skin-", "")}
              </span>
            </div>
          )}
          {isGeneral && (
            <div className="flex items-center space-x-1.5 mt-1">
              <Stethoscope className="h-3 w-3 text-teal-400" />
              <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">
                Systemic Condition — {scan.scan_type.replace("General-", "")}
              </span>
            </div>
          )}
          {isAuto && (
            <div className="flex items-center space-x-1.5 mt-1">
              <Stethoscope className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                🔍 AI Auto-Detected Diagnosis
              </span>
            </div>
          )}
          <span className="text-[10px] text-slate-500 block">Calibrated temperature scaling model margins.</span>
        </div>

        {/* SVG Circle Gauge */}
        <div className="relative h-16 w-16">
          <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
            <path className="text-slate-900" strokeWidth="3.5" stroke="currentColor" fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className={isAuto ? "text-blue-400" : isSkin ? "text-rose-500" : isGeneral ? "text-teal-400" : "text-primary"}
              strokeDasharray={`${confidencePercentage}, 100`}
              strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white font-mono">
            {confidencePercentage}%
          </div>
        </div>
      </div>

      {/* Auto-Detect Banner */}
      {isAuto && (
        <div className="flex items-start space-x-3 p-4 bg-blue-950 bg-opacity-20 border border-blue-900 border-opacity-40 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300 space-y-0.5">
            <span className="font-bold block">AI Auto-Detection Report</span>
            <span className="text-blue-400">The AI identified the disease type and condition automatically from your uploaded image. Review findings with a qualified doctor before any action.</span>
          </div>
        </div>
      )}

      {/* Skin Warning Banner */}
      {isSkin && (
        <div className="flex items-start space-x-3 p-4 bg-rose-950 bg-opacity-20 border border-rose-900 border-opacity-40 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-300 space-y-0.5">
            <span className="font-bold block">Dermatology AI Report</span>
            <span className="text-rose-400">This report contains AI-detected symptoms, precautions, and treatment recommendations for skin conditions. Always confirm with a licensed dermatologist before treatment.</span>
          </div>
        </div>
      )}

      {/* General Condition Banner */}
      {isGeneral && (
        <div className="flex items-start space-x-3 p-4 bg-teal-950 bg-opacity-20 border border-teal-900 border-opacity-40 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="text-xs text-teal-300 space-y-0.5">
            <span className="font-bold block">Systemic Condition Report — {scan.scan_type.replace("General-", "")}</span>
            <span className="text-teal-400">This report covers AI-detected clinical indicators, precautions, lifestyle modifications, and treatment options. Always confirm findings with a specialist.</span>
          </div>
        </div>
      )}

      {/* Main Report Document */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-border bg-slate-950 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {isAuto ? <Pill className="h-4 w-4 text-blue-400" /> : isSkin ? <Pill className="h-4 w-4 text-rose-400" /> : isGeneral ? <Pill className="h-4 w-4 text-teal-400" /> : <FileText className="h-4 w-4 text-secondary" />}
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              {clinicianMode
                ? (isAuto ? "AI Auto-Detected Triage Report" : isSkin ? "Dermatology Clinical Report" : isGeneral ? `${scan.scan_type.replace("General-","")} Clinical Report` : "Clinician Support Summary")
                : (isAuto ? "Your AI Health Summary" : isSkin ? "Your Skin Health Report" : isGeneral ? `Your ${scan.scan_type.replace("General-","")} Health Guide` : "Simplified Patient Translation")}
            </span>
          </div>

          {clinicianMode && (
            <div className="flex items-center space-x-2">
              {saveSuccess && (
                <span className="text-[10px] text-secondary font-bold flex items-center space-x-1">
                  <Check className="h-3.5 w-3.5" /><span>Report Overridden</span>
                </span>
              )}
              {isEditing ? (
                <div className="flex space-x-1.5">
                  <button onClick={handleSaveOverride} disabled={saving}
                    className="p-1.5 bg-secondary hover:bg-opacity-95 text-white rounded-lg text-xs font-semibold flex items-center space-x-1">
                    {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    <span className="text-[10px]">Save</span>
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditedClinicianText(report.clinician_summary || ""); }}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-border text-slate-400 hover:text-white rounded-lg text-[10px] font-bold">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-border text-slate-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center space-x-1">
                  <Edit3 className="h-3 w-3" /><span>Override Summary</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Report Content */}
        <div className="p-6">
          {clinicianMode ? (
            isEditing ? (
              <textarea
                value={editedClinicianText}
                onChange={(e) => setEditedClinicianText(e.target.value)}
                className="w-full h-80 bg-slate-950 border border-border text-white text-xs p-4 rounded-xl focus:border-primary focus:outline-none resize-none font-mono"
              />
            ) : (
              renderMarkdown(report.clinician_summary || "")
            )
          ) : (
            <div className="space-y-4">
              {renderMarkdown(report.patient_summary || "")}
              <div className="mt-6 p-4 bg-blue-950 bg-opacity-20 border border-blue-900 border-opacity-40 text-blue-400 text-xs rounded-xl flex items-start space-x-2.5">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <span>
                  <strong>Patient Guidance:</strong> This report was generated by an AI health assistant.
                  It does not substitute for a consultation with your {isSkin ? "dermatologist" : "medical care team"}.
                  Please review these details directly with your doctor before starting any treatment.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Literature Citations */}
      {clinicianMode && report.citations && report.citations.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 border-b border-border pb-2.5">
            <Globe className="h-4 w-4 text-primary" />
            <span>Authoritative Clinical References ({report.citations.length})</span>
          </div>
          <div className="space-y-3">
            {report.citations.map((cit: any, idx: number) => (
              <div key={cit.id} className="text-xs border-b border-border border-opacity-50 pb-3 last:border-b-0 last:pb-0 space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-white leading-normal hover:text-primary transition-all">
                    [{idx + 1}] {cit.source_title}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-900 border border-border text-[9px] font-bold text-secondary rounded">
                    Score: {Math.round(cit.similarity_score * 100)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {cit.authors ? `${cit.authors} | ` : ""}{cit.journal || "Medical Index"} ({cit.publication_year})
                </div>
                <p className="text-[11px] text-slate-400 italic bg-slate-950 p-2.5 rounded-lg border border-border">
                  "{cit.snippet}"
                </p>
                {cit.url && (
                  <a href={cit.url} target="_blank" rel="noopener noreferrer"
                    className="inline-block text-[10px] text-primary hover:underline font-bold mt-1">
                    View Source Literature Link →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

