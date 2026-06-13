export interface DashboardMetrics {
  hero: {
    overallScore: number;
    scoreChangePercent: number;
    citationCount: number;
    citationChangePercent: number;
    competitorGapIndex: number;
    growthTrend: number[];
  };
  modelsBreakdown: Array<{
    name: string;
    citationRate: number;
    status: "stable" | "improving" | "critical";
    rank: number;
  }>;
}

export interface AeiResponse {
  whyBrandIsMissing: string;
  semanticGaps: string[];
  aeoSuggestions: string[];
  competitorDominance: string;
  confidenceScore: number;
}

export interface SimulationResponse {
  simulatedResponse: string;
  citedBrands: string[];
  missingInsights: string[];
  reasoningBlocks: Array<{
    title: string;
    detail: string;
  }>;
}

export interface StreamMessage {
  type: "system" | "update";
  title?: string;
  message: string;
  status?: "positive" | "negative" | "neutral" | "system";
  color?: "green" | "red" | "yellow" | "blue";
  timestamp: string;
}

export interface RadarBrand {
  name: string;
  color: string;
  scores: number[];
}

export interface CompetitorRadarData {
  metrics: string[];
  brands: RadarBrand[];
}

export interface CountryScore {
  code: string;
  name: string;
  score: number;
  citations: number;
  x: number; // Percent position from left of the world footprint representation
  y: number; // Percent position from top of the world footprint representation
}

export interface WorldMapData {
  countries: CountryScore[];
}
