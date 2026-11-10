"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  Activity,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

interface PredictionResult {
  filename: string | null;
  label: "fresh" | "spoiled";
  confidence: number;
  spoiled_probability: number;
  is_uncertain: boolean;
  message: string;
  latency_ms?: number;
}

const SAMPLE_FRUITS = [
  {
    name: "Fresh Orange",
    path: "/samples/fresh-orange.jpg",
    expected: "fresh",
    desc: "Vibrant color, intact peel",
  },
  {
    name: "Fresh Banana",
    path: "/samples/fresh-banana.jpg",
    expected: "fresh",
    desc: "Even yellowing, no lesions",
  },
  {
    name: "Spoiled Apple",
    path: "/samples/spoiled-apple.jpg",
    expected: "spoiled",
    desc: "Discoloration, tissue breakdown",
  },
  {
    name: "Spoiled Banana",
    path: "/samples/spoiled-banana.jpg",
    expected: "spoiled",
    desc: "Severe browning, soft peel",
  },
];

const SUPPORTED_FRUITS = [
  "Apple",
  "Banana",
  "Grape",
  "Guava",
  "Jujube",
  "Orange",
  "Pomegranate",
  "Strawberry",
];

export default function FruitFreshnessDashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"detector" | "architecture" | "metrics">("detector");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Check backend health
  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/health`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        setBackendOnline(Boolean(data.model_loaded));
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }
    setErrorMessage(null);
    setResult(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const loadSampleImage = async (samplePath: string, name: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setResult(null);
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const file = new File([blob], `${name.toLowerCase().replace(/\s+/g, "_")}.jpg`, {
        type: "image/jpeg",
      });
      setSelectedFile(file);
      setPreviewUrl(samplePath);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
      setErrorMessage("Could not load sample image.");
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`${apiUrl}/predict`, {
        method: "POST",
        body: formData,
      });

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned error status ${res.status}`);
      }

      const data: PredictionResult = await res.json();
      data.latency_ms = latency;
      setResult(data);
      setBackendOnline(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to connect to the backend API. Please make sure the FastAPI server is running.";
      setErrorMessage(message);
      setBackendOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                FruitGuard AI
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0 • 99.84% Acc
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("detector")}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === "detector"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Freshness Scanner
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === "architecture"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Model Architecture
            </button>
            <button
              onClick={() => setActiveTab("metrics")}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === "metrics"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Test Benchmarks
            </button>
          </div>

          {/* Backend Status indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                backendOnline === true
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : backendOnline === false
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline === true
                    ? "bg-emerald-400 animate-pulse"
                    : backendOnline === false
                    ? "bg-rose-400"
                    : "bg-amber-400"
                }`}
              />
              <span className="hidden sm:inline">
                {backendOnline === true
                  ? "API Online (Port 8000)"
                  : backendOnline === false
                  ? "API Disconnected"
                  : "Checking Backend..."}
              </span>
            </div>
            <button
              onClick={checkBackendHealth}
              title="Refresh connection"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> MobileNetV2 Deep Learning Vision
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Intelligent Fruit Quality &{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Freshness Detection
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Upload an image of a fruit to instantly detect whether it is{" "}
            <span className="text-emerald-400 font-semibold">Fresh</span> or{" "}
            <span className="text-rose-400 font-semibold">Spoiled</span>. Tested with 99.84% accuracy across 12,000+ images.
          </p>
        </div>

        {/* Tab 1: Freshness Scanner */}
        {activeTab === "detector" && (
          <div className="space-y-8">
            {/* Quick Sample Selector */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick Test Samples (Click to load)
                </span>
                <span className="text-xs text-slate-500">From unseen test set</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SAMPLE_FRUITS.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadSampleImage(sample.path, sample.name)}
                    className="flex flex-col items-center p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition-all text-left group"
                  >
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-slate-900 mb-2 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sample.path}
                        alt={sample.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span
                        className={`absolute top-1.5 right-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                          sample.expected === "fresh"
                            ? "bg-emerald-500/90 text-white"
                            : "bg-rose-500/90 text-white"
                        }`}
                      >
                        {sample.expected}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{sample.name}</span>
                    <span className="text-[11px] text-slate-400 truncate w-full">{sample.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Core Interactive Scanner Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Upload Zone */}
              <div className="lg:col-span-6 space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all min-h-[380px] ${
                    previewUrl
                      ? "border-slate-700 bg-slate-900/40"
                      : "border-slate-800 hover:border-emerald-500/50 bg-slate-900/20 hover:bg-slate-900/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {previewUrl ? (
                    <div className="relative w-full flex flex-col items-center">
                      <div className="relative w-full max-w-sm h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Fruit Preview"
                          className="w-full h-full object-contain"
                        />
                        {isLoading && (
                          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                            <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-3" />
                            <span className="text-sm font-semibold text-white">Running MobileNetV2...</span>
                            <span className="text-xs text-slate-400 mt-1">Analyzing texture & spoilage cues</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <span className="text-xs font-medium text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                          {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : "Sample Image"}
                        </span>
                        <button
                          onClick={resetAll}
                          className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center max-w-sm">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">Upload a Fruit Photo</h3>
                      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                        Drag and drop your image here, or browse from your device. Supports JPG, PNG, WebP up to 10MB.
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
                      >
                        Browse Image
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {previewUrl && (
                  <div className="flex gap-3">
                    <button
                      onClick={analyzeImage}
                      disabled={isLoading}
                      className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Classifying Fruit...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-slate-950" />
                          <span>Inspect Freshness</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium text-sm transition-colors"
                      title="Change image"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-rose-200">Analysis Error</p>
                      <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
                      {backendOnline === false && (
                        <div className="mt-2 text-xs bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                          <p className="font-semibold text-emerald-400 mb-1">To start the backend API:</p>
                          <code className="text-[11px] text-slate-400 block font-mono">
                            cd backend_files; uv run uvicorn main:app --reload --port 8000
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Prediction Results Card */}
              <div className="lg:col-span-6">
                {result ? (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                    {/* Top Glow Accent */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        result.label === "fresh"
                          ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500"
                          : "bg-gradient-to-r from-rose-500 via-amber-500 to-orange-500"
                      }`}
                    />

                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" /> Classification Output
                      </span>
                      {result.latency_ms && (
                        <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                          ⚡ {result.latency_ms} ms
                        </span>
                      )}
                    </div>

                    {/* Verdict Hero Banner */}
                    <div
                      className={`p-6 rounded-2xl border mb-6 flex items-center gap-5 ${
                        result.label === "fresh"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                          result.label === "fresh"
                            ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
                            : "bg-rose-500 text-white shadow-rose-500/30"
                        }`}
                      >
                        {result.label === "fresh" ? (
                          <CheckCircle2 className="w-8 h-8" />
                        ) : (
                          <AlertTriangle className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                          Detected Freshness
                        </span>
                        <h2 className="text-3xl font-black capitalize tracking-tight text-white">
                          {result.label === "fresh" ? "Fresh & Crisp" : "Spoiled / Rotten"}
                        </h2>
                        <p className="text-xs text-slate-300 mt-1">{result.message}</p>
                      </div>
                    </div>

                    {/* Confidence Meter */}
                    <div className="space-y-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-medium">Model Confidence</span>
                        <span className="text-lg font-bold text-white font-mono">
                          {(result.confidence * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            result.label === "fresh"
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-gradient-to-r from-rose-500 to-amber-500"
                          }`}
                          style={{ width: `${Math.max(result.confidence * 100, 5)}%` }}
                        />
                      </div>

                      {/* Probability Breakdown */}
                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block mb-1">P(Fresh)</span>
                          <span className="font-mono font-semibold text-emerald-400 text-sm">
                            {((1.0 - result.spoiled_probability) * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                          <span className="text-slate-400 block mb-1">P(Spoiled)</span>
                          <span className="font-mono font-semibold text-rose-400 text-sm">
                            {(result.spoiled_probability * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quality Insights */}
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                        <span>Classification Model</span>
                        <span className="text-slate-200 font-medium">MobileNetV2 Transfer Learning</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                        <span>Input Resolution</span>
                        <span className="text-slate-200 font-mono">224 × 224 px (RGB)</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span>Inference Engine</span>
                        <span className="text-slate-200 font-medium">FastAPI + TensorFlow Keras</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[380px]">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
                      <Cpu className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">Awaiting Image</h3>
                    <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                      Select or upload an image on the left, then click &ldquo;Inspect Freshness&rdquo; to see the AI classification and confidence scores.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Supported Fruits Carousel / Pill List */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> 8 Trained Fruit Varieties in Dataset
              </h4>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_FRUITS.map((fruit) => (
                  <span
                    key={fruit}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-medium hover:border-slate-700 transition-colors"
                  >
                    🍎 {fruit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Model Architecture */}
        {activeTab === "architecture" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <Cpu className="w-6 h-6 text-emerald-400" /> Pipeline & Neural Architecture
              </h2>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                The fruit freshness detection system uses a two-phase transfer-learning architecture built on top of Google&apos;s MobileNetV2 pretrained on ImageNet.
              </p>

              {/* Step By Step Architecture Flow */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Client Upload & Preprocessing</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Raw images are decoded, converted to RGB, resized to 224×224 pixels with bilinear interpolation, and preprocessed into tensor batches of shape (1, 224, 224, 3).
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">In-Graph Data Augmentation & Rescaling</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Random horizontal/vertical flips, rotation (±20%), zoom, contrast, and brightness adjustments provide invariant feature extraction. Rescaling maps pixels from [0, 255] to [-1, 1].
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">MobileNetV2 Feature Extractor</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Inverted residual blocks with depthwise separable convolutions extract high-level visual representations of fruit skin texture, spotting, and rot. Top 40 layers fine-tuned.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Classification Head & Sigmoid Inference</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      GlobalAveragePooling2D → BatchNormalization → Dropout(0.4) → Dense(128, ReLU) → Dropout(0.2) → Dense(1, Sigmoid) outputs the exact probability of spoilage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Test Benchmarks */}
        {activeTab === "metrics" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-emerald-400" /> Held-Out Test Set Performance (1,850 Images)
              </h2>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                The model was rigorously evaluated on a 15% completely held-out test split of 1,850 images (929 Fresh, 921 Spoiled) that were never seen during training or validation.
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Accuracy</span>
                  <span className="text-3xl font-extrabold text-emerald-400 font-mono">99.84%</span>
                  <span className="text-[11px] text-slate-500 block mt-1">1,847 / 1,850 correct</span>
                </div>
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Fresh Recall</span>
                  <span className="text-3xl font-extrabold text-teal-400 font-mono">100.0%</span>
                  <span className="text-[11px] text-slate-500 block mt-1">0 fresh misclassified</span>
                </div>
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Spoiled Recall</span>
                  <span className="text-3xl font-extrabold text-cyan-400 font-mono">99.67%</span>
                  <span className="text-[11px] text-slate-500 block mt-1">918 / 921 caught</span>
                </div>
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">F1-Score</span>
                  <span className="text-3xl font-extrabold text-indigo-400 font-mono">0.9984</span>
                  <span className="text-[11px] text-slate-500 block mt-1">Harmonic mean</span>
                </div>
              </div>

              {/* Confusion Matrix Table */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-semibold text-white mb-4">Confusion Matrix Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2.5">Actual \ Predicted</th>
                        <th className="py-2.5 text-center text-emerald-400">Predicted Fresh</th>
                        <th className="py-2.5 text-center text-rose-400">Predicted Spoiled</th>
                        <th className="py-2.5 text-right">Total Support</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-200">
                      <tr>
                        <td className="py-3 font-semibold text-emerald-400">Actual Fresh</td>
                        <td className="py-3 text-center font-mono font-bold text-emerald-400 bg-emerald-500/10 rounded">
                          929 (100%)
                        </td>
                        <td className="py-3 text-center font-mono text-slate-500">0 (0%)</td>
                        <td className="py-3 text-right font-mono text-slate-400">929</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-rose-400">Actual Spoiled</td>
                        <td className="py-3 text-center font-mono text-slate-500">3 (0.33%)</td>
                        <td className="py-3 text-center font-mono font-bold text-rose-400 bg-rose-500/10 rounded">
                          918 (99.67%)
                        </td>
                        <td className="py-3 text-right font-mono text-slate-400">921</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">FruitGuard AI</span>
            <span>•</span>
            <span>FastAPI + TensorFlow + Next.js</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Trained on 12,335 Images across 8 Fruit Species</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
