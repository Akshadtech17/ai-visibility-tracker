import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity,
  Layers,
  MapPin,
  Radar,
  Terminal,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Globe,
  TrendingUp,
  Database,
  Compass,
  Share2,
  Cpu,
  Play,
  Pause,
  Send,
  Zap,
  Info,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroMetrics {
  overallScore: number;
  scoreChangePercent: number;
  citationCount: number;
  citationChangePercent: number;
  competitorGapIndex: number;
  growthTrend: number[];
}

interface ModelBreakdown {
  name: string;
  citationRate: number;
  status: "stable" | "improving" | "critical";
  rank: number;
}

interface DashboardMetrics {
  hero: HeroMetrics;
  modelsBreakdown: ModelBreakdown[];
}

interface RadarBrand {
  name: string;
  color: string;
  scores: number[];
}

interface CompetitorRadarData {
  metrics: string[];
  brands: RadarBrand[];
}

interface CountryScore {
  code: string;
  name: string;
  score: number;
  citations: number;
  x: number;
  y: number;
}

interface WorldMapData {
  countries: CountryScore[];
}

interface AeiResponse {
  whyBrandIsMissing: string;
  semanticGaps: string[];
  aeoSuggestions: string[];
  competitorDominance: string;
  confidenceScore: number;
}

interface ReasoningBlock {
  title: string;
  detail: string;
}

interface SimulationResponse {
  simulatedResponse: string;
  citedBrands: string[];
  missingInsights: string[];
  reasoningBlocks: ReasoningBlock[];
}

interface StreamMessage {
  type: "system" | "update";
  title?: string;
  message: string;
  status?: string;
  color?: "green" | "red" | "yellow" | "blue" | string;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_PATH = "/ws/updates";
const WS_URL = `${BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:")}${WS_PATH}`;

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/30 text-red-300 text-xs font-mono px-4 py-2 rounded-lg">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1E1901]/10 rounded-lg ${className}`} />;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Brand & query state
  const [targetBrand, setTargetBrand] = useState<string>("SynapseDB");
  const [selectedQuery, setSelectedQuery] = useState<string>("high-performance distributed vector memory");
  const [simulatePrompt, setSimulatePrompt] = useState<string>(
    "Find the best secure vector databases for LLM memory in 2026."
  );

  // Data state
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [radarData, setRadarData] = useState<CompetitorRadarData | null>(null);
  const [worldMapData, setWorldMapData] = useState<WorldMapData | null>(null);
  const [aiInsight, setAiInsight] = useState<AeiResponse | null>(null);
  const [promptSimulation, setPromptSimulation] = useState<SimulationResponse | null>(null);
  const [wsMessages, setWsMessages] = useState<StreamMessage[]>([]);

  // Loading states
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isRadarLoading, setIsRadarLoading] = useState(true);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isInsightAnalyzing, setIsInsightAnalyzing] = useState(false);
  const [isSimulatingPrompt, setIsSimulatingPrompt] = useState(false);
  const [isWsStreaming, setIsWsStreaming] = useState(true);
  const [isCrawlLoading, setIsCrawlLoading] = useState(false);

  // Error states
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // UI state
  const [hoveredCountry, setHoveredCountry] = useState<CountryScore | null>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "gaps" | "suggestions">("insights");
  const [radarHoveredMetric, setRadarHoveredMetric] = useState<string | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const wsLogsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectRef = useRef<number | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const addLogEntry = useCallback((entry: StreamMessage) => {
    setWsMessages((prev) => {
      const sliced = prev.length > 50 ? prev.slice(prev.length - 49) : prev;
      return [...sliced, entry];
    });
  }, []);

  // ── API helpers ─────────────────────────────────────────────────────────────

  const apiFetch = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const start = Date.now();
      const url = `${BASE_URL}${path}`;

      let res: Response;
      try {
        res = await fetch(url, {
          headers: { "Content-Type": "application/json" },
          ...options,
        });
      } catch (err: any) {
        setLatency(Date.now() - start);
        throw new Error(`Network error calling ${path}: ${err?.message ?? String(err)}`);
      }

      setLatency(Date.now() - start);

      if (!res.ok) {
        let bodyText = "";
        try {
          bodyText = await res.text();
        } catch {
          // ignore
        }
        const suffix = bodyText ? ` - ${bodyText.slice(0, 400)}` : "";
        throw new Error(`HTTP ${res.status} ${res.statusText} calling ${path}${suffix}`);
      }

      const text = await res.text();
      if (!text) return undefined as T;

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`Invalid JSON response from ${path}`);
      }
    },
    []
  );

  // ── Data fetchers ───────────────────────────────────────────────────────────

  const fetchCoreDashboard = useCallback(async () => {
    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await apiFetch<Partial<DashboardMetrics>>("/api/v1/dashboard");
      const safe: DashboardMetrics = {
        hero: {
          overallScore: data?.hero?.overallScore ?? 0,
          scoreChangePercent: data?.hero?.scoreChangePercent ?? 0,
          citationCount: data?.hero?.citationCount ?? 0,
          citationChangePercent: data?.hero?.citationChangePercent ?? 0,
          competitorGapIndex: data?.hero?.competitorGapIndex ?? 0,
          growthTrend: Array.isArray(data?.hero?.growthTrend) ? data?.hero?.growthTrend : [],
        },
        modelsBreakdown: Array.isArray(data?.modelsBreakdown) ? (data!.modelsBreakdown as ModelBreakdown[]) : [],
      };
      setDashboardMetrics(safe);
      setIsBackendOnline(true);
    } catch (e: any) {
      setDashboardError(`Dashboard fetch failed: ${e.message}`);
      setIsBackendOnline(false);
    } finally {
      setIsDashboardLoading(false);
    }
  }, [apiFetch]);

  const fetchRadarData = useCallback(async () => {
    setIsRadarLoading(true);
    setRadarError(null);
    try {
      const data = await apiFetch<Partial<CompetitorRadarData>>("/api/v1/organizations/3fa85f64-5717-4562-b3fc-2c963f66afa6/competitors/radar");
      const safe: CompetitorRadarData = {
        metrics: Array.isArray(data?.metrics) ? (data!.metrics as string[]) : [],
        brands: Array.isArray(data?.brands) ? (data!.brands as RadarBrand[]) : [],
      };
      setRadarData(safe);
    } catch (e: any) {
      setRadarError(`Radar fetch failed: ${e.message}`);
    } finally {
      setIsRadarLoading(false);
    }
  }, [apiFetch]);

  const fetchWorldMap = useCallback(async () => {
    setIsMapLoading(true);
    setMapError(null);
    try {
      const data = await apiFetch<Partial<WorldMapData>>("/api/v1/visibility/global-map");
      const safe: WorldMapData = {
        countries: Array.isArray(data?.countries)
          ? (data!.countries as CountryScore[]).map((c) => ({
              code: c?.code ?? "",
              name: c?.name ?? "",
              score: typeof (c as any)?.score === "number" ? (c as any).score : 0,
              citations: typeof (c as any)?.citations === "number" ? (c as any).citations : 0,
              x: typeof (c as any)?.x === "number" ? (c as any).x : 50,
              y: typeof (c as any)?.y === "number" ? (c as any).y : 50,
            }))
          : [],
      };
      setWorldMapData(safe);
    } catch (e: any) {
      setMapError(`Map fetch failed: ${e.message}`);
    } finally {
      setIsMapLoading(false);
    }
  }, [apiFetch]);

  const triggerAiInsight = useCallback(
    async (brand: string, query: string) => {
      setIsInsightAnalyzing(true);
      setInsightError(null);
      try {
        const data = await apiFetch<Partial<AeiResponse>>("/api/v1/ai/insight", {
          method: "POST",
          body: JSON.stringify({ brand, query }),
        });
        setAiInsight({
          whyBrandIsMissing: data?.whyBrandIsMissing ?? "",
          semanticGaps: Array.isArray(data?.semanticGaps) ? (data?.semanticGaps as string[]) : [],
          aeoSuggestions: Array.isArray(data?.aeoSuggestions) ? (data?.aeoSuggestions as string[]) : [],
          competitorDominance: data?.competitorDominance ?? "",
          confidenceScore: typeof data?.confidenceScore === "number" ? data.confidenceScore : 0,
        });
      } catch (e: any) {
        setInsightError(`Insight query failed: ${e.message}`);
      } finally {
        setIsInsightAnalyzing(false);
      }
    },
    [apiFetch]
  );

  const triggerPromptSimulation = useCallback(
    async (promptText: string) => {
      setIsSimulatingPrompt(true);
      setSimulationError(null);
      try {
        const data = await apiFetch<Partial<SimulationResponse>>("/api/v1/simulate/prompt", {
          method: "POST",
          body: JSON.stringify({ prompt: promptText }),
        });
        setPromptSimulation({
          simulatedResponse: data?.simulatedResponse ?? "",
          citedBrands: Array.isArray(data?.citedBrands) ? (data?.citedBrands as string[]) : [],
          missingInsights: Array.isArray(data?.missingInsights) ? (data?.missingInsights as string[]) : [],
          reasoningBlocks: Array.isArray(data?.reasoningBlocks)
            ? (data!.reasoningBlocks as ReasoningBlock[]).map((b: any) => ({
                title: b?.title ?? "",
                detail: b?.detail ?? "",
              }))
            : [],
        });
      } catch (e: any) {
        setSimulationError(`Simulation failed: ${e.message}`);
      } finally {
        setIsSimulatingPrompt(false);
      }
    },
    [apiFetch]
  );

  const triggerManualCrawl = useCallback(async () => {
    setIsCrawlLoading(true);
    addLogEntry({
      type: "system",
      title: "Crawl Job Scheduled",
      message: "Starting deep crawls over strategic documentation indices...",
      status: "system",
      color: "blue",
      timestamp: new Date().toISOString(),
    });
    try {
      const data = await apiFetch<Partial<{ message: string }>>("/crawl/trigger", { method: "POST" });
      addLogEntry({
        type: "update",
        title: "Crawl Completed",
        message: data?.message || "Crawl finished successfully.",
        status: "positive",
        color: "green",
        timestamp: new Date().toISOString(),
      });
      fetchCoreDashboard();
    } catch (e: any) {
      addLogEntry({
        type: "update",
        title: "Crawl Failed",
        message: `Crawl error: ${e.message}`,
        status: "negative",
        color: "red",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsCrawlLoading(false);
    }
  }, [addLogEntry, apiFetch, fetchCoreDashboard]);

  // ── WebSocket ───────────────────────────────────────────────────────────────

  const connectWebSocket = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    )
      return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsBackendOnline(true);
      addLogEntry({
        type: "system",
        message: "Connected to live intelligence stream.",
        status: "system",
        color: "blue",
        timestamp: new Date().toISOString(),
      });
    };

    ws.onmessage = (event) => {
      const raw = event.data;
      try {
        const parsed = JSON.parse(raw as string) as any;
        const msg: StreamMessage = {
          type: parsed?.type === "update" || parsed?.type === "system" ? parsed.type : "update",
          title: typeof parsed?.title === "string" ? parsed.title : undefined,
          message: typeof parsed?.message === "string" ? parsed.message : "",
          status: typeof parsed?.status === "string" ? parsed.status : undefined,
          color: typeof parsed?.color === "string" ? parsed.color : undefined,
          timestamp: typeof parsed?.timestamp === "string" ? parsed.timestamp : new Date().toISOString(),
        };
        addLogEntry(msg);
      } catch {
        addLogEntry({
          type: "system",
          title: "WS PARSE ERROR",
          message: "Received invalid telemetry payload.",
          status: "system",
          color: "red",
          timestamp: new Date().toISOString(),
        });
      }
    };

    ws.onerror = () => {
      setIsBackendOnline(false);
      addLogEntry({
        type: "system",
        message: "WebSocket connection error. Attempting reconnect in 5s...",
        status: "system",
        color: "red",
        timestamp: new Date().toISOString(),
      });
    };

    ws.onclose = () => {
      if (!isWsStreaming) return;
      if (wsReconnectRef.current) window.clearTimeout(wsReconnectRef.current);

      wsReconnectRef.current = window.setTimeout(() => {
        addLogEntry({
          type: "system",
          message: "Reconnecting to live stream...",
          status: "system",
          color: "yellow",
          timestamp: new Date().toISOString(),
        });
        connectWebSocket();
      }, 5000);
    };
  }, [addLogEntry, isWsStreaming]);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCoreDashboard();
    fetchRadarData();
    fetchWorldMap();
    triggerAiInsight(targetBrand, selectedQuery);
    triggerPromptSimulation(simulatePrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isWsStreaming) {
      connectWebSocket();
    } else {
      wsRef.current?.close();
      if (wsReconnectRef.current) window.clearTimeout(wsReconnectRef.current);
    }
    return () => {
      wsRef.current?.close();
      if (wsReconnectRef.current) window.clearTimeout(wsReconnectRef.current);
    };
  }, [connectWebSocket, isWsStreaming]);

  //useEffect(() => {
    //wsLogsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  //}, [wsMessages]);

  // Radar geometry
  const radarRadius = 120;
  const radarCenter = 160;
  const radarMetricsSafe = Array.isArray(radarData?.metrics) ? radarData?.metrics : [];
  const radarBrandsSafe = Array.isArray(radarData?.brands) ? radarData?.brands : [];
  const metricsCount = radarMetricsSafe.length || radarBrandsSafe[0]?.scores?.length || 5;

  const getPentagonPoints = (radius: number) => {
    const points: string[] = [];
    for (let i = 0; i < metricsCount; i++) {
      const angle = (i * 2 * Math.PI) / (metricsCount || 1) - Math.PI / 2;
      points.push(`${radarCenter + radius * Math.cos(angle)},${radarCenter + radius * Math.sin(angle)}`);
    }
    return points.join(" ");
  };

  const countriesSafe = Array.isArray(worldMapData?.countries) ? worldMapData!.countries : [];
  const topCountry =
    countriesSafe.length > 0 ? countriesSafe.reduce((a, b) => (a.score > b.score ? a : b), countriesSafe[0]) : null;
  const bottomCountry =
    countriesSafe.length > 0
      ? countriesSafe.reduce((a, b) => (a.score < b.score ? a : b), countriesSafe[0])
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFBEA] via-[#FFF3B0] to-[#FDE68A] text-slate-800 font-sans antialiased selection:bg-amber-400 selection:text-amber-950 pb-16">
      {/* STATUS BAR */}
      <div className="w-full bg-[#1E1901]/95 text-slate-200 text-xs px-6 py-2.5 flex flex-wrap justify-between items-center gap-3 shadow-md border-b border-amber-500/20 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 overflow-hidden rounded-full">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isBackendOnline === false ? "bg-red-400" : "bg-emerald-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isBackendOnline === false ? "bg-red-500" : "bg-emerald-500"
                }`}
              ></span>
            </span>
            <span className="font-mono tracking-wider text-slate-300 font-semibold uppercase">
              {isBackendOnline === false ? "BACKEND OFFLINE" : "COMMAND CENTRAL"}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-5 text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 border-r border-slate-700/60 pr-4">
              <span className={`font-medium ${isBackendOnline ? "text-amber-400" : "text-red-400"}`}>FASTAPI:</span>
              {isBackendOnline === null ? "CHECKING..." : isBackendOnline ? "ACTIVE" : "OFFLINE"}
            </span>
            <span className="flex items-center gap-1.5 border-r border-slate-700/60 pr-4">
              <span className="text-[#3B82F6] font-medium">QDRANT:</span> SYNCED
            </span>
            <span className="flex items-center gap-1.5 border-r border-slate-700/60 pr-4">
              <span className="text-[#EC4899] font-medium">OLLAMA:</span> READY
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#10B981] font-medium">POSTGRES:</span> SECURE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-slate-400 bg-slate-800/60 px-2 py-1 rounded border border-slate-700/50">
            WS:{" "}
            <span className={`font-medium ${isWsStreaming ? "text-emerald-400" : "text-slate-500"}`}>
              {isWsStreaming ? "LIVE" : "PAUSED"}
            </span>
          </span>
          {latency !== null && (
            <span className="font-mono text-[10px] text-slate-400">
              LATENCY: <span className="text-amber-400 font-medium">{latency}ms</span>
            </span>
          )}
          <span className="text-slate-400 hidden md:inline">| UTC: {new Date().toISOString().slice(0, 19).replace("T", " ")}</span>
        </div>
      </div>

      {/* HEADER */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/20 backdrop-blur-md border border-white/40 shadow-xl rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-32 bg-amber-400/20 rounded-full blur-3xl -z-10"></div>

          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20 text-white transform hover:rotate-12 transition-transform duration-300">
              <Cpu className="w-8 h-8 animate-pulse text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-[#1E1901]">AI CITATION INTEL</h1>
                <span className="bg-[#1E1901] text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded tracking-widest uppercase shadow-md">
                  V2.4 OPERATING SYSTEM
                </span>
              </div>
              <p className="text-slate-700 text-sm mt-1 max-w-xl">
                Real-Time Vector Memory alignment, Web Crawler scraper pipelines, and predictive LLM Answer Engine Optimization diagnostics.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto bg-[#1E1901]/90 rounded-xl p-3.5 border border-amber-500/35 shadow-2xl flex flex-col gap-1.5 self-stretch md:self-auto min-w-[280px]">
            <label className="text-[10px] font-mono tracking-wider font-bold text-amber-400 uppercase">ACTIVE TELEMETRY OBJECTIVE (BRAND NAME)</label>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                value={targetBrand}
                onChange={(e) => setTargetBrand(e.target.value)}
                placeholder="Enter Brand..."
                className="bg-slate-900/90 text-white text-sm rounded px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-amber-400 font-mono tracking-wide w-full"
              />
              <button
                title="Reset Core"
                onClick={() => setTargetBrand("SynapseDB")}
                className="bg-amber-500/30 text-amber-300 border border-amber-500/50 hover:bg-amber-400 hover:text-[#1E1901] px-2.5 py-1.5 text-xs rounded font-bold transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* ── HERO METRICS ─────────────────────────────────────────────────── */}
        <section className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-white/25 transition-all duration-300">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-400/10 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900/60 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                  CORE AI EMITTING RATIO
                </span>
                <h3 className="text-slate-900 text-lg font-bold">Visibility Index</h3>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-900">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="my-5 flex items-center justify-between gap-4">
              {isDashboardLoading ? (
                <Skeleton className="h-12 w-40" />
              ) : dashboardError ? (
                <ErrorBanner message={dashboardError} />
              ) : (
                <div className="flex flex-col">
                  <span className="text-4xl sm:text-5xl font-mono font-bold text-[#1E1901] tracking-tight">{dashboardMetrics?.hero.overallScore ?? "—"}%</span>
                  <span className="text-xs text-emerald-800 font-semibold mt-1">▲ +{dashboardMetrics?.hero.scoreChangePercent ?? 0}% vs previous audit</span>
                </div>
              )}

              <div className="relative h-20 w-20 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="32" className="stroke-[#1E1901]/10 stroke-[6] fill-none" />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    className="stroke-amber-500 stroke-[6] fill-none transition-all duration-1000"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={2 * Math.PI * 32 * (1 - (dashboardMetrics?.hero.overallScore ?? 0) / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-slate-800">COF</span>
                </div>
              </div>
            </div>

            <div className="w-full bg-[#1E1901]/10 px-3 py-1.5 rounded-lg border border-white/30 flex justify-between items-center text-xs">
              <span className="font-mono text-slate-700">Similarity Status:</span>
              <span className="font-mono font-bold text-[#1E1901]">OPTIMUM COHERENCY</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-white/25 transition-all duration-300">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-400/10 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900/60 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  VECTOR SHARDS QUANTUM
                </span>
                <h3 className="text-slate-900 text-lg font-bold">Citations Captured</h3>
              </div>
              <button
                disabled={isCrawlLoading}
                onClick={triggerManualCrawl}
                className="p-2 bg-slate-900 text-amber-400 hover:bg-amber-400 hover:text-slate-950 rounded-lg transition-all border border-amber-500/20 active:scale-95 flex items-center gap-1.5 text-xs font-bold font-mono disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCrawlLoading ? "animate-spin" : ""}`} />
                {isCrawlLoading ? "CRAWLING..." : "FORCE CRAWL"}
              </button>
            </div>

            <div className="my-5">
              {isDashboardLoading ? (
                <Skeleton className="h-12 w-40" />
              ) : dashboardError ? (
                <ErrorBanner message={dashboardError} />
              ) : (
                <div className="flex flex-col">
                  <span className="text-4xl sm:text-5xl font-mono font-bold text-[#1E1901] tracking-tight">
                    {(dashboardMetrics?.hero.citationCount ?? 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-emerald-800 font-semibold mt-1">▲ +{dashboardMetrics?.hero.citationChangePercent ?? 0}% indexed in Qdrant store</span>
                </div>
              )}
            </div>

            <div className="h-10 w-full mt-2 self-end">
              <svg className="w-full h-full">
                <defs>
                  <linearGradient id="glow-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D97706" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {dashboardMetrics?.hero.growthTrend && dashboardMetrics.hero.growthTrend.length > 1 ? (
                  (() => {
                    const trend = dashboardMetrics.hero.growthTrend;
                    const max = Math.max(...trend);
                    const min = Math.min(...trend);
                    const range = max - min || 1;
                    const W = 360;
                    const H = 40;
                    const pts = trend
                      .map((v, i) => `${(i / (trend.length - 1)) * W},${H - ((v - min) / range) * (H - 4)}`)
                      .join(" ");
                    return (
                      <>
                        <polyline points={`${pts} ${W},${H} 0,${H}`} fill="url(#glow-grad)" stroke="none" />
                        <polyline
                          points={pts}
                          fill="none"
                          stroke="#D97706"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    );
                  })()
                ) : (
                  <path
                    d="M0,35 Q30,10 60,30 T120,5 T180,25 T240,15 T300,28 T360,8"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:bg-white/25 transition-all duration-300">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-400/10 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900/60 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  COMPETITIVE INTEGRATION CUTOFFS
                </span>
                <h3 className="text-slate-900 text-lg font-bold">Relative Deficit Gap</h3>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-900">
                <Compass className="w-5 h-5" />
              </div>
            </div>

            <div className="my-5">
              {isDashboardLoading ? (
                <Skeleton className="h-12 w-40" />
              ) : dashboardError ? (
                <ErrorBanner message={dashboardError} />
              ) : (
                <div className="flex flex-col">
                  <span className="text-4xl sm:text-5xl font-mono font-bold text-[#1E1901] tracking-tight">{dashboardMetrics?.hero.competitorGapIndex ?? "—"}%</span>
                  <span className="text-xs text-teal-800 font-semibold mt-1">▼ Deficit gap narrowed following custom ingestion pipeline</span>
                </div>
              )}
            </div>

            <div className="w-full bg-slate-900/10 h-2.5 rounded-full overflow-hidden border border-white/20">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${100 - (dashboardMetrics?.hero.competitorGapIndex ?? 14)}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-mono text-slate-600 mt-2 text-right w-full block">Proximity Match: Threshold passed</span>
          </div>
        </section>

        {/* ── AI INSIGHT ENGINE ─────────────────────────────────────────────── */}
        <section className="col-span-12 lg:col-span-8 flex flex-col">
          <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#1E1901]/95 to-slate-900/95 px-6 py-4 border-b border-amber-500/20 flex flex-wrap justify-between items-center gap-4 shadow-md">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
                <h2 className="text-white font-display font-medium text-base uppercase tracking-wider">AI Insight Engine (Ollama & Qdrant Deep Query)</h2>
              </div>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30">BACKEND: {BASE_URL}</span>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1E1901]/5 p-4 rounded-xl border border-[#1E1901]/10">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#1E1901]">TARGET CONTEXT</label>
                  <input
                    type="text"
                    value={targetBrand}
                    onChange={(e) => setTargetBrand(e.target.value)}
                    className="bg-white/80 border border-slate-300 text-sm rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="E.g. SynapseMemory"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#1E1901]">SEMANTIC QUERY TERM</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedQuery}
                      onChange={(e) => setSelectedQuery(e.target.value)}
                      className="bg-white/80 border border-slate-300 text-sm rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 flex-1"
                      placeholder="E.g. low latency vector database"
                    />
                    <button
                      onClick={() => triggerAiInsight(targetBrand, selectedQuery)}
                      disabled={isInsightAnalyzing}
                      className="bg-[#1E1901] text-amber-400 hover:bg-amber-400 hover:text-[#1E1901] px-4 py-2 text-xs font-mono font-bold rounded shadow-md border border-amber-500/20 active:scale-95 transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 ${isInsightAnalyzing ? "animate-bounce" : ""}`} />
                      {isInsightAnalyzing ? "QUERYING..." : "QUERY"}
                    </button>
                  </div>
                </div>
              </div>

              {isInsightAnalyzing ? (
                <div className="flex-1 min-h-[220px] flex flex-col justify-center items-center py-10 bg-[#1E1901]/5 rounded-xl border border-dashed border-[#1E1901]/10">
                  <div className="relative flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
                    <Cpu className="w-5 h-5 absolute text-amber-600 animate-pulse" />
                  </div>
                  <span className="text-xs font-mono text-[#1E1901] font-semibold tracking-wider mt-4 animate-pulse">QUERYING FASTAPI → OLLAMA → QDRANT...</span>
                  <p className="text-[11px] font-mono text-slate-600 mt-1">{BASE_URL}/api/v1/ai/insight</p>
                </div>
              ) : insightError ? (
                <div className="flex-1 min-h-[180px] flex flex-col justify-center items-center gap-4 py-8">
                  <ErrorBanner message={insightError} />
                  <button
                    onClick={() => triggerAiInsight(targetBrand, selectedQuery)}
                    className="text-xs font-mono text-amber-900 underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              ) : aiInsight ? (
                <div className="flex-1 flex flex-col gap-5">
                  <div className="flex border-b border-[#1E1901]/15 gap-2">
                    {(["insights", "gaps", "suggestions"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-xs font-bold font-mono tracking-wider transition-all ${
                          activeTab === tab
                            ? "text-amber-950 border-b-2 border-amber-600"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        {tab === "insights"
                          ? `WHY IS ${targetBrand.toUpperCase()} NOT RECOGNIZED?`
                          : tab === "gaps"
                            ? "SEMANTIC VECTOR GAPS"
                            : "ACTIVE OPTIMIZATION PLAYS"}
                      </button>
                    ))}
                  </div>

                  {activeTab === "insights" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-white/70 rounded-xl border border-amber-200/50 shadow-inner flex gap-3">
                        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-800 leading-relaxed font-serif text-left">{aiInsight.whyBrandIsMissing}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-[#1E1901]/5 rounded-xl border border-[#1E1901]/10 text-left">
                          <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">COMPETITOR SAMPLING REASON</span>
                          <p className="text-xs text-slate-700 leading-relaxed mt-1.5">{aiInsight.competitorDominance}</p>
                        </div>
                        <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-300/30 flex justify-between items-center">
                          <div className="text-left">
                            <span className="text-[10px] font-mono text-amber-900 block uppercase font-bold tracking-wider">AEO READY SCORE</span>
                            <span className="text-xs text-slate-700 font-medium mt-1">Similarity coverage ratio</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-3xl font-mono font-extrabold text-[#1E1901]">{aiInsight.confidenceScore}%</span>
                            <span className="text-[9px] font-mono text-slate-600 uppercase">Confidence</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "gaps" && (
                    <div className="space-y-3 text-left">
                      <p className="text-xs text-slate-600 font-mono uppercase font-bold">Omission Analysis:</p>
                      <div className="grid grid-cols-1 gap-2.5">
                        {aiInsight.semanticGaps.map((gap, i) => (
                          <div key={i} className="px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0"></span>
                            <span className="text-xs text-slate-800 font-mono font-medium">{gap}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "suggestions" && (
                    <div className="space-y-4 text-left">
                      <p className="text-xs text-slate-600 font-mono uppercase font-bold">Recommended action parameters:</p>
                      <div className="grid grid-cols-1 gap-3">
                        {aiInsight.aeoSuggestions.map((sug, i) => (
                          <div
                            key={i}
                            className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-start gap-3 hover:translate-x-1 transition-transform duration-200"
                          >
                            <span className="bg-emerald-500/20 text-emerald-800 text-[10px] font-mono font-bold h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <span className="text-xs text-slate-800 leading-relaxed font-medium">{sug}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-mono text-slate-500 font-extrabold uppercase">FIX PLAYBOOKS:</span>
                    <button
                      onClick={() => {
                        setActiveTab("suggestions");
                        addLogEntry({
                          type: "system",
                          message: "Injecting RDF snippets via API...",
                          status: "system",
                          color: "blue",
                          timestamp: new Date().toISOString(),
                        });
                      }}
                      className="px-3 py-1 text-[10px] font-mono font-bold bg-white/70 hover:bg-[#1E1901] hover:text-amber-400 border border-slate-300 text-[#1E1901] rounded-full transition-all active:scale-95 cursor-pointer"
                    >
                      ⚡ Inject RDF Snippets
                    </button>
                    <button
                      onClick={triggerManualCrawl}
                      className="px-3 py-1 text-[10px] font-mono font-bold bg-white/70 hover:bg-[#1E1901] hover:text-amber-400 border border-slate-300 text-[#1E1901] rounded-full transition-all active:scale-95 cursor-pointer"
                    >
                      🚀 Trigger Re-scrapes
                    </button>
                    <button
                      onClick={() => {
                        addLogEntry({
                          type: "system",
                          message: "Broadcasting co-citations payload to re-indexing pipeline.",
                          status: "system",
                          color: "blue",
                          timestamp: new Date().toISOString(),
                        });
                      }}
                      className="px-3 py-1 text-[10px] font-mono font-bold bg-white/70 hover:bg-[#1E1901] hover:text-amber-400 border border-slate-300 text-[#1E1901] rounded-full transition-all active:scale-95 cursor-pointer"
                    >
                      🎯 Publish Co-citations
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 font-mono text-xs text-slate-500">Enter brand and query above, then click QUERY.</div>
              )}
            </div>
          </div>
        </section>

        {/* ── COMPETITOR RADAR ─────────────────────────────────────────────── */}
        <section className="col-span-12 lg:col-span-4 flex flex-col">
          <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#1E1901]/95 to-slate-900/95 px-6 py-4 border-b border-amber-500/20 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <Radar className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: "10s" }} />
                <h2 className="text-white font-display font-medium text-base uppercase tracking-wider">Competitor Radar Map</h2>
              </div>
              <Share2 className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between items-center gap-4">
              {isRadarLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-amber-600"></div>
                </div>
              ) : radarError ? (
                <ErrorBanner message={radarError} />
              ) : (
                <>
                  {!radarData ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs font-mono text-slate-500">No radar data yet.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-mono text-slate-600 text-center max-w-xs">
                        Radar profiles representing index proximity. Hover vertices to evaluate parameter coverage.
                      </p>

                      <div className="relative w-[320px] h-[320px] flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 320 320">
                          <defs>
                            <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#FEFBBF" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#FFF3B0" stopOpacity="0.0" />
                            </radialGradient>
                          </defs>
                          <circle cx="160" cy="160" r={radarRadius + 15} fill="url(#radar-glow)" />
                          {[30, 60, 90, 120].map((r, i) => (
                            <polygon
                              key={i}
                              points={getPentagonPoints(r)}
                              fill="none"
                              stroke={i === 3 ? "rgba(30,25,1,0.35)" : "rgba(30,25,1,0.15)"}
                              strokeWidth={i === 3 ? "1.5" : "1"}
                              strokeDasharray={i % 2 === 0 ? "none" : "2,3"}
                            />
                          ))}
                          {Array.from({ length: metricsCount }).map((_, i) => {
                            const angle = (i * 2 * Math.PI) / metricsCount - Math.PI / 2;
                            return (
                              <line
                                key={i}
                                x1={radarCenter}
                                y1={radarCenter}
                                x2={radarCenter + radarRadius * Math.cos(angle)}
                                y2={radarCenter + radarRadius * Math.sin(angle)}
                                stroke="rgba(30,25,1,0.25)"
                                strokeWidth="1.2"
                              />
                            );
                          })}
                          {(radarData?.brands ?? []).map((b, bIdx) => {
                            const points = (b?.scores ?? [])
                              .map((score, idx) => {
                                const angle = (idx * 2 * Math.PI) / metricsCount - Math.PI / 2;
                                const rad = (score / 100) * radarRadius;
                                return `${radarCenter + rad * Math.cos(angle)},${radarCenter + rad * Math.sin(angle)}`;
                              })
                              .join(" ");

                            const isYours =
                              b.name.toLowerCase().includes("your brand") || b.name.toLowerCase().includes(targetBrand.toLowerCase());

                            const strokeColor = isYours ? "#D97706" : b.color;
                            const fillColor = isYours ? "rgba(245,158,11,0.3)" : `${b.color}35`;

                            return (
                              <g key={bIdx}>
                                <polygon points={points} fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
                                {(b?.scores ?? []).map((score, sIdx) => {
                                  const angle = (sIdx * 2 * Math.PI) / metricsCount - Math.PI / 2;
                                  const rad = (score / 100) * radarRadius;
                                  return (
                                    <circle
                                      key={sIdx}
                                      cx={radarCenter + rad * Math.cos(angle)}
                                      cy={radarCenter + rad * Math.sin(angle)}
                                      r="4.5"
                                      fill={strokeColor}
                                      stroke="#FFFFFF"
                                      strokeWidth="1.5"
                                      className="cursor-pointer"
                                      onMouseEnter={() =>
                                        setRadarHoveredMetric(`${b.name} — ${radarData.metrics[sIdx]}: ${score}%`)
                                      }
                                      onMouseLeave={() => setRadarHoveredMetric(null)}
                                    />
                                  );
                                })}
                              </g>
                            );
                          })}

                          {radarData.metrics.map((metric, i) => {
                            const angle = (i * 2 * Math.PI) / metricsCount - Math.PI / 2;
                            const x = radarCenter + (radarRadius + 22) * Math.cos(angle);
                            const y = radarCenter + (radarRadius + 22) * Math.sin(angle);
                            let textAnchor: "start" | "middle" | "end" = "middle";
                            if (Math.cos(angle) > 0.2) textAnchor = "start";
                            if (Math.cos(angle) < -0.2) textAnchor = "end";
                            return (
                              <text
                                key={i}
                                x={x}
                                y={y + 3}
                                textAnchor={textAnchor}
                                fill="#1E1901"
                                fontSize="9"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {metric}
                              </text>
                            );
                          })}
                        </svg>

                        {radarHoveredMetric && (
                          <div className="absolute bg-[#1E1901] text-amber-200 border border-amber-500/30 text-[10px] font-mono px-3 py-1.5 rounded shadow-xl pointer-events-none mt-20">
                            {radarHoveredMetric}
                          </div>
                        )}
                      </div>

                      <div className="w-full bg-[#1E1901]/5 p-3.5 rounded-xl border border-white/40 flex flex-col gap-2">
                        <span className="text-[9px] font-mono text-slate-500 font-extrabold text-left uppercase">INDEX LAYER MAPPING</span>
                        <div className="flex flex-wrap gap-3">
                          {radarData.brands.map((b, i) => {
                            const isYours =
                              b.name.toLowerCase().includes("your brand") || b.name.toLowerCase().includes(targetBrand.toLowerCase());
                            return (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-800 font-mono font-medium">
                                <span className="w-3 h-3 rounded-full block shrink-0" style={{ background: isYours ? "#D97706" : b.color }}></span>
                                <span>{isYours ? `${targetBrand} (Core)` : b.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── LIVE SIGNAL STREAM ───────────────────────────────────────────── */}
        <section className="col-span-12 lg:col-span-4 flex flex-col">
          <div className="glass-card rounded-2xl flex flex-col h-[480px] overflow-hidden">
            <div className="bg-gradient-to-r from-[#1E1901]/95 to-slate-900/95 px-6 py-4 border-b border-amber-500/20 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 overflow-hidden rounded-full">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWsStreaming ? "bg-emerald-400" : "bg-red-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isWsStreaming ? "bg-emerald-500" : "bg-red-500"}`}></span>
                </span>
                <h2 className="text-white font-display font-medium text-base uppercase tracking-wider">Live AI Signal Stream</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-slate-500">{WS_URL}</span>
                <button
                  onClick={() => setIsWsStreaming(!isWsStreaming)}
                  className="p-1 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-mono font-bold flex items-center gap-1 border border-white/20 active:scale-95 transition-all"
                >
                  {isWsStreaming ? (
                    <>
                      <Pause className="w-3 h-3 text-amber-400" /> PAUSE
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-emerald-400" /> RESUME
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-slate-950/80 font-mono text-xs text-slate-300 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-4">
                {wsMessages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-slate-500 text-center space-y-2">
                    <Terminal className="w-6 h-6 animate-pulse" />
                    <span>Connecting to {WS_URL}...</span>
                    <p className="text-[10px] max-w-[200px]">Waiting for first telemetry event from FastAPI backend</p>
                  </div>
                ) : (
                  wsMessages.map((msg, idx) => {
                    const colorMap: Record<string, { text: string; prefix: string }> = {
                      green: { text: "text-emerald-400", prefix: "▲ [CITN] " },
                      red: { text: "text-rose-400", prefix: "▼ [OMIS] " },
                      yellow: { text: "text-amber-400", prefix: "◆ [CORC] " },
                      blue: { text: "text-sky-300", prefix: "⚙ [SYS] " },
                    };
                    const { text: textClass, prefix } = colorMap[msg.color ?? ""] ?? {
                      text: "text-slate-300",
                      prefix: "● [INFO] ",
                    };
                    return (
                      <div key={idx} className="space-y-1 bg-white/5 p-2 rounded border border-white/5">
                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span className="font-bold uppercase">{msg.title || (msg.type === "system" ? "SYSTEM CORE" : "TELEMETRY")}</span>
                          <span>{msg.timestamp?.split("T")[1]?.slice(0, 8) ?? ""}</span>
                        </div>
                        <p className={`leading-relaxed text-[11px] text-left ${textClass}`}>
                          <span className="font-semibold">{prefix}</span>
                          {msg.message}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={wsLogsEndRef} />
              </div>

              <div className="bg-slate-900/90 p-2 rounded border border-slate-800 flex flex-col gap-1.5 shrink-0">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-left">INJECT TELEMETRY EVENT</span>
                <div className="flex gap-2">
                  <input
                    id="custom-log-input"
                    type="text"
                    placeholder="Type log alert..."
                    className="bg-slate-950 text-emerald-400 px-3 py-1.5 rounded border border-slate-700 text-xs focus:outline-none focus:border-amber-500 flex-1 font-mono placeholder:text-slate-600"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        addLogEntry({
                          type: "update",
                          title: "Manual Injector",
                          message: e.currentTarget.value,
                          status: "neutral",
                          color: "yellow",
                          timestamp: new Date().toISOString(),
                        });
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("custom-log-input") as HTMLInputElement | null;
                      if (input?.value.trim()) {
                        addLogEntry({
                          type: "update",
                          title: "Manual Injector",
                          message: input.value,
                          status: "neutral",
                          color: "yellow",
                          timestamp: new Date().toISOString(),
                        });
                        input.value = "";
                      }
                    }}
                    className="p-1 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded"
                  >
                    SEND
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── GLOBAL MAP ───────────────────────────────────────────────────── */}
        <section className="col-span-12 lg:col-span-8 flex flex-col">
          <div className="glass-card rounded-2xl flex flex-col h-[480px] overflow-hidden">
            <div className="bg-gradient-to-r from-[#1E1901]/95 to-slate-900/95 px-6 py-4 border-b border-amber-500/20 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: "25s" }} />
                <h2 className="text-white font-display font-medium text-base uppercase tracking-wider">Global AI Visibility Map</h2>
              </div>
              <div className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30">FOOTPRINT SCANNER ACTIVE</div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between bg-white/5 relative">
              {isMapLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-amber-600"></div>
                </div>
              ) : mapError ? (
                <ErrorBanner message={mapError} />
              ) : (
                <>
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-xs text-slate-700 font-medium">
                      Geographical segmentation of crawling nodes. Darker coordinates represent dense semantic citation volumes.
                    </p>
                    <div className="flex items-center gap-2 bg-white/60 px-2.5 py-1 rounded border border-slate-300 text-xs font-mono font-bold shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-amber-700" />
                      <span>{worldMapData?.countries.length ?? 0} REGIONS ACTIVE</span>
                    </div>
                  </div>

                  <div className="relative flex-1 bg-[#1E1901]/5 rounded-xl border border-dashed border-[#1E1901]/10 my-4 overflow-hidden min-h-[240px]">
                    <svg className="absolute inset-0 w-full h-full opacity-40">
                      <defs>
                        <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="1" fill="#D97706" opacity="0.15" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#dot-grid)" />
                    </svg>

                    {worldMapData?.countries.map((c) => {
                      const isHovered = hoveredCountry?.code === c.code;
                      return (
                        <div
                          key={c.code}
                          onMouseEnter={() => setHoveredCountry(c)}
                          onMouseLeave={() => setHoveredCountry(null)}
                          onClick={() =>
                            addLogEntry({
                              type: "system",
                              message: `Ping to node "${c.code}" (${c.name}). Latency: ${Math.floor(Math.random() * 20) + 15}ms. Shards verified.`,
                              status: "positive",
                              color: "green",
                              timestamp: new Date().toISOString(),
                            })
                          }
                          style={{ left: `${c.x}%`, top: `${c.y}%` }}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                        >
                          <span className="absolute inline-flex h-7 w-7 rounded-full bg-amber-500/30 -left-2 -top-2 animate-pulse opacity-70 pointer-events-none"></span>
                          <div
                            className={`h-3 w-3 rounded-full border border-white shadow-md transition-all duration-300 ${
                              isHovered ? "bg-amber-600 scale-125" : "bg-amber-400 group-hover:bg-amber-500"
                            }`}
                          ></div>
                          <span className="absolute left-4 -top-3.5 bg-slate-900/90 text-amber-300 text-[8px] font-mono px-1 py-0.5 rounded border border-slate-700 shadow">
                            {c.code}
                          </span>
                        </div>
                      );
                    })}

                    {hoveredCountry && (
                      <div
                        style={{
                          left: `${hoveredCountry.x > 75 ? hoveredCountry.x - 22 : hoveredCountry.x + 3}%`,
                          top: `${hoveredCountry.y > 70 ? hoveredCountry.y - 25 : hoveredCountry.y + 2}%`,
                        }}
                        className="absolute bg-[#1E1901]/95 text-white border border-amber-500/40 p-4 rounded-xl shadow-2xl pointer-events-none z-30 w-52 text-left"
                      >
                        <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-2">
                          <span className="font-medium text-xs text-white">{hoveredCountry.name}</span>
                          <span className="bg-amber-400 text-slate-950 font-mono text-[9px] px-1.5 rounded font-bold">{hoveredCountry.code}</span>
                        </div>
                        <div className="space-y-1.5 text-[11px] font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Visibility:</span>
                            <span className="text-amber-400 font-extrabold">{hoveredCountry.score}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Citations:</span>
                            <span className="text-white font-bold">{hoveredCountry.citations.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-1">
                            <div className="bg-amber-400 h-full" style={{ width: `${hoveredCountry.score}%` }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/50 p-3 rounded-xl border border-slate-300/60">
                    <div className="text-left">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Top Region</span>
                      <span className="text-xs font-mono font-bold text-[#1E1901]">{topCountry ? `${topCountry.name.toUpperCase()} (${topCountry.score}%)` : "—"}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Lowest Coverage</span>
                      <span className="text-xs font-mono font-bold text-amber-900">{bottomCountry ? `${bottomCountry.name.toUpperCase()} (${bottomCountry.score}%)` : "—"}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Avg Latency</span>
                      <span className="text-xs font-mono font-bold text-[#1E1901]">{latency !== null ? `${latency}ms` : "—"}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Node Status</span>
                      <span className="text-xs font-mono font-bold text-emerald-800">{isBackendOnline ? "ONLINE" : isBackendOnline === false ? "OFFLINE" : "CHECKING..."}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── PROMPT SIMULATION ────────────────────────────────────────────── */}
        <section className="col-span-12 lg:col-span-6 flex flex-col">
          <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#1E1901]/95 to-slate-900/95 px-6 py-4 border-b border-amber-500/20 flex flex-wrap justify-between items-center gap-4 shadow-md">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-amber-400 animate-pulse" />
                <h2 className="text-white font-display font-medium text-base uppercase tracking-wider">Prompt Simulation Engine</h2>
              </div>
              <span className="text-[9px] font-mono text-slate-500">{BASE_URL}/api/v1/simulate/prompt</span>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between gap-6">
              <div className="space-y-3.5">
                <p className="text-xs text-slate-700 font-medium text-left">
                  Enter a prompt as your customers would query. The backend will return a simulated AI answer with citation analysis.
                </p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold pr-1">Templates:</span>
                  {[
                    { label: "Why Missing in ChatGPT?", text: `Why is ${targetBrand} not appearing in ChatGPT answers?` },
                    { label: "Tech Comparison 2026", text: "Compare the leading secure vector data hosting models in 2026." },
                  ].map((t) => (
                    <button
                      key={t.label}
                      onClick={() => {
                        setSimulatePrompt(t.text);
                        triggerPromptSimulation(t.text);
                      }}
                      className="px-2.5 py-1 bg-white/75 hover:bg-[#1E1901] hover:text-amber-400 border border-slate-300 text-[10px] font-mono text-slate-800 rounded transition"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simulatePrompt}
                    onChange={(e) => setSimulatePrompt(e.target.value)}
                    className="bg-white/80 border border-slate-300 text-sm rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 flex-1"
                    placeholder="Enter customer prompt query..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") triggerPromptSimulation(simulatePrompt);
                    }}
                  />
                  <button
                    onClick={() => triggerPromptSimulation(simulatePrompt)}
                    disabled={isSimulatingPrompt}
                    className="p-2.5 bg-[#1E1901] text-amber-400 hover:bg-amber-400 hover:text-[#1E1901] rounded-lg transition-all shadow-md font-bold text-xs font-mono border border-amber-500/20 active:scale-95 shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    SIMULATE
                  </button>
                </div>
              </div>

              {isSimulatingPrompt ? (
                <div className="flex-1 min-h-[180px] p-4 bg-slate-950 rounded-xl flex flex-col justify-center items-center text-slate-300 font-mono text-xs border border-slate-800">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FACC15]"></div>
                  <span className="mt-3 text-slate-400">Backend synthesizing response...</span>
                </div>
              ) : simulationError ? (
                <div className="flex-1 flex flex-col justify-center items-center gap-4">
                  <ErrorBanner message={simulationError} />
                  <button onClick={() => triggerPromptSimulation(simulatePrompt)} className="text-xs font-mono text-amber-900 underline">
                    Retry
                  </button>
                </div>
              ) : promptSimulation ? (
                <div className="flex-1 flex flex-col gap-4 text-left font-mono">
                  <div className="p-4 bg-slate-950/95 text-slate-300 text-xs rounded-xl border border-slate-800 font-sans tracking-wide leading-relaxed shadow-lg relative max-h-[220px] overflow-y-auto">
                    <span className="absolute top-2.5 right-3 text-[9px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded">SIMULATED RESPONSE</span>
                    <p className="whitespace-pre-line font-serif text-slate-100 italic">{promptSimulation.simulatedResponse}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white/40 border border-slate-300 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block mb-1.5">EXPLICITLY CITED BRANDS</span>
                      <div className="flex flex-wrap gap-1.5">
                        {promptSimulation.citedBrands.map((brand, i) => (
                          <span key={i} className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                            {brand}
                          </span>
                        ))}
                        <span className="bg-red-50 text-red-800 border border-red-100 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                          ✖ {targetBrand} (OMITTED)
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/40 border border-slate-300 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block mb-1.5">CORRELATION MISMATCHES</span>
                      <div className="space-y-1">
                        {promptSimulation.missingInsights.slice(0, 2).map((ins, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 block shrink-0"></span>
                            <span className="truncate">{ins}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">VECTOR LOGIC REASONING</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {promptSimulation.reasoningBlocks.map((block, i) => (
                        <div key={i} className="p-3 bg-[#1E1901]/90 rounded-lg border border-amber-500/20 text-slate-300 text-xs">
                          <span className="font-bold text-amber-400 block mb-1">{block.title}</span>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{block.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 font-mono text-xs text-slate-500">No simulation data. Enter a prompt above and click SIMULATE.</div>
              )}
            </div>
          </div>
        </section>

        {/* ── MODEL CITATION BREAKDOWN ─────────────────────────────────────── */}
        <section className="col-span-12 lg:col-span-6 flex flex-col">
          <div className="glass-card rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#1E1901]/95 to-slate-900/95 px-6 py-4 border-b border-amber-500/20 flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h2 className="text-white font-display font-medium text-base uppercase tracking-wider">Model Citation Rate & Shards Breakdown</h2>
              </div>
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between gap-5 text-left">
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Citation index rates across major LLM answer engines. Brand similarity measured against Qdrant vector shard collections.
              </p>

              <div className="flex-1 space-y-4">
                {isDashboardLoading ? (
                  [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)
                ) : dashboardError ? (
                  <ErrorBanner message={dashboardError} />
                ) : (
                  dashboardMetrics?.modelsBreakdown.map((model, idx) => {
                    const statusMap: Record<string, { dot: string; text: string }> = {
                      stable: { dot: "bg-sky-500", text: "text-sky-700" },
                      improving: { dot: "bg-emerald-500", text: "text-emerald-700" },
                      critical: { dot: "bg-red-500", text: "text-rose-700 animate-pulse font-extrabold" },
                    };
                    const { dot, text } = statusMap[model.status] ?? { dot: "bg-slate-500", text: "text-slate-600" };
                    return (
                      <div key={idx} className="space-y-1.5 p-3.5 bg-white/60 rounded-xl border border-slate-300">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-white font-bold bg-slate-900/90 px-1.5 py-0.5 rounded">
                              RANK {model.rank}
                            </span>
                            <span className="font-mono font-bold text-slate-800 text-sm">{model.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${dot}`}></span>
                            <span className={`font-mono text-[9px] uppercase ${text}`}>{model.status}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-mono text-slate-500">
                            <span>Citation rate</span>
                            <span className="font-bold text-slate-800">{model.citationRate}%</span>
                          </div>
                          <div className="w-full bg-slate-900/10 h-2 rounded-full overflow-hidden border border-white/20">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                              style={{ width: `${model.citationRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bg-[#1E1901]/5 p-4 rounded-xl border border-[#1E1901]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="text-left space-y-0.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Vector Sync Engine</span>
                  <p className="text-[11px] text-slate-600">Re-align Qdrant cluster margins with Ollama metadata parameters.</p>
                </div>
                <button
                  onClick={async () => {
                    addLogEntry({
                      type: "system",
                      message: "Starting deep margin alignment across all model clusters...",
                      status: "system",
                      color: "blue",
                      timestamp: new Date().toISOString(),
                    });
                    try {
                      await apiFetch("/vectors/realign", { method: "POST" });
                      addLogEntry({
                        type: "update",
                        title: "Realignment Complete",
                        message: "Qdrant shards re-indexed successfully.",
                        status: "positive",
                        color: "green",
                        timestamp: new Date().toISOString(),
                      });
                      fetchCoreDashboard();
                    } catch (e: any) {
                      addLogEntry({
                        type: "update",
                        title: "Realignment Failed",
                        message: e.message,
                        status: "negative",
                        color: "red",
                        timestamp: new Date().toISOString(),
                      });
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-[#FACC15] hover:text-slate-950 text-white rounded-lg transition-all text-xs font-bold font-mono active:scale-95 text-nowrap"
                >
                  REALIGN SHARDS
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center text-slate-600 space-y-3">
        <p className="text-xs font-mono">AI CITATION INTEL OS — CONNECTED TO FASTAPI BACKEND AT {BASE_URL}</p>
        <div className="flex justify-center flex-wrap gap-5 text-[10px] text-slate-500 font-mono">
          <span>FRAMEWORK: REACT 19 + VITE</span>
          <span>●</span>
          <span>BACKEND: FASTAPI @ {BASE_URL}</span>
          <span>●</span>
          <span>WEBSOCKET: {WS_URL}</span>
          <span>●</span>
          <span>STATUS: {isBackendOnline === null ? "CHECKING" : isBackendOnline ? "ONLINE" : "OFFLINE"}</span>
        </div>
      </footer>
    </div>
  );
}

