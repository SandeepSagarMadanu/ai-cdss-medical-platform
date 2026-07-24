"use client";

import Link from "next/link";
import { BrainCircuit, ShieldAlert, HeartHandshake, FileSearch, ShieldCheck, Activity } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-slate-100">
      {/* Header */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-border bg-card bg-opacity-70 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 sm:p-2 bg-primary rounded-lg text-white">
            <BrainCircuit className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <span className="text-sm sm:text-xl font-bold tracking-tight text-white">
            AI Clinical CDSS <span className="hidden sm:inline text-primary font-light">Platform</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link href="/login" className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/login?mode=register" className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary hover:bg-opacity-95 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-lg shadow-primary/20">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-border text-slate-400 text-xs font-medium mb-6">
          <Activity className="h-3 w-3 text-secondary" />
          <span>Next-Generation Clinician Decision Support</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Enterprise AI Clinical Decision Support Platform
        </h1>
        <p className="text-slate-400 text-base md:text-xl max-w-2xl mt-6 leading-relaxed">
          Empowering healthcare practitioners with automated multi-agent medical imaging analysis, 
          explainable activation mapping, and citation-backed clinical summaries.
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Link href="/login" className="px-6 py-3 bg-primary hover:bg-opacity-90 text-white font-medium rounded-lg transition-colors shadow-lg shadow-primary/20">
            Access Clinician Dashboard
          </Link>
          <a href="#compliance" className="px-6 py-3 bg-slate-900 border border-border text-slate-300 hover:text-white font-medium rounded-lg transition-all">
            Review Compliance & Safety
          </a>
        </div>

        {/* Regulatory Disclaimer Banner */}
        <div className="w-full max-w-4xl mt-12 p-5 bg-amber-950 bg-opacity-20 border border-accent border-opacity-30 rounded-xl flex items-start space-x-3 text-left">
          <ShieldAlert className="h-6 w-6 text-accent shrink-0 mt-0.5" />
          <div>
            <h4 className="text-accent font-semibold text-sm">Regulatory Notice & Clinical Disclaimer</h4>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              AI Clinical Decision Support Platform (CDSS) is an Artificial Intelligence-based Clinical Decision Support Tool designed for medical education and secondary diagnostic consultation. 
              <strong> It does not replace the professional clinical judgment of a licensed medical practitioner.</strong> 
              No therapeutic or diagnostic actions should be taken solely based on this system's summaries. Under FDA guidelines, 
              final responsibility for all diagnostic decisions rests strictly with the treating physician.
            </p>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-16 text-left">
          <div className="p-6 bg-card border border-border rounded-xl hover:border-slate-700 transition-colors">
            <div className="p-3 bg-primary bg-opacity-10 text-primary w-fit rounded-lg mb-4">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <h3 className="text-white font-semibold text-lg">Explainable AI (XAI)</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Delineate diagnostic focus zones using pre-trained convolutional backbones generating real-time Grad-CAM heatmaps overlaying lesions and anomalies.
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-xl hover:border-slate-700 transition-colors">
            <div className="p-3 bg-secondary bg-opacity-10 text-secondary w-fit rounded-lg mb-4">
              <FileSearch className="h-6 w-6" />
            </div>
            <h3 className="text-white font-semibold text-lg">Evidence-Backed RAG</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Automatically indexes authoritative literature (WHO, NIH, PubMed) to enrich diagnostic recommendations with citations and matching snippets.
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-xl hover:border-slate-700 transition-colors">
            <div className="p-3 bg-accent bg-opacity-10 text-accent w-fit rounded-lg mb-4">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <h3 className="text-white font-semibold text-lg">Clinician & Patient Modes</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Bifurcate outputs: detailed clinician diagnostics (ICD-10, pathology staging) versus plain-language patient translations with medical guidance.
            </p>
          </div>
        </div>
      </main>

      {/* Compliance / Footer */}
      <footer id="compliance" className="border-t border-border bg-slate-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 text-slate-500 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <ShieldCheck className="h-4 w-4 text-secondary" />
            <span>ISO 13485:2016 Compliant Architecture Framework</span>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Clinical Use</a>
            <a href="#" className="hover:text-slate-300">Regulatory Certifications</a>
          </div>
          <span>© {new Date().getFullYear()} AI Clinical Decision Support Platform (CDSS). All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
