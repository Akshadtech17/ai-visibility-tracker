import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Shared Gemini API Client setup (Lazy loaded)
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
        console.log("Successfully initialized server-side Gemini client.");
      } catch (e) {
        console.error("Failed to initialize server-side Gemini client:", e);
      }
    } else {
      console.warn("GEMINI_API_KEY is not configured or uses placeholder. Falling back to high-fidelity AI simulation engine.");
    }
  }
  return aiClient;
}

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. Hero Metrics Rollup Dashboard
app.get("/api/v1/dashboard", (req, res) => {
  // Return premium SaaS metrics with a nice flow
  res.json({
    hero: {
      overallScore: 68.4,
      scoreChangePercent: 4.8,
      citationCount: 14820,
      citationChangePercent: 12.5,
      competitorGapIndex: 14.2, // Gap between primary brand and top competitor
      growthTrend: [32, 38, 45, 52, 59, 64, 68],
    },
    modelsBreakdown: [
      { name: "ChatGPT (Search)", citationRate: 46, status: "stable", rank: 2 },
      { name: "Claude (Sonnet)", citationRate: 58, status: "improving", rank: 1 },
      { name: "Gemini 2.5", citationRate: 72, status: "improving", rank: 1 },
      { name: "Perplexity AI", citationRate: 34, status: "critical", rank: 4 },
    ]
  });
});

// 2. Competitors Radar Comparison Data
app.get("/api/v1/competitors/radar", (req, res) => {
  res.json({
    metrics: ["AI Visibility", "Citation Frequency", "Ranking Strength", "Semantic Presence", "Source Trust"],
    brands: [
      {
        name: "Your Brand (Core)",
        color: "#FACC15",
        scores: [68, 59, 72, 60, 80],
      },
      {
        name: "OmniCorp (Competitor A)",
        color: "#3B82F6",
        scores: [85, 76, 80, 88, 70],
      },
      {
        name: "Vertex Labs (Competitor B)",
        color: "#EC4899",
        scores: [45, 52, 35, 60, 48],
      }
    ]
  });
});

// 3. Global Visibility Heatmap Coordinates
app.get("/api/v1/visibility/global-map", (req, res) => {
  res.json({
    countries: [
      { code: "US", name: "United States", score: 82, citations: 6420, x: 25, y: 35 },
      { code: "DE", name: "Germany", score: 71, citations: 1840, x: 48, y: 30 },
      { code: "JP", name: "Japan", score: 64, citations: 1100, x: 80, y: 38 },
      { code: "GB", name: "United Kingdom", score: 76, citations: 2150, x: 44, y: 28 },
      { code: "AU", name: "Australia", score: 58, citations: 686, x: 82, y: 78 },
      { code: "IN", name: "India", score: 69, citations: 1540, x: 68, y: 48 },
      { code: "BR", name: "Brazil", score: 48, citations: 450, x: 33, y: 68 },
      { code: "CA", name: "Canada", score: 78, citations: 1200, x: 22, y: 25 },
    ]
  });
});

// 4. AI Insight Engine (Ollama / LLM Core Proxy)
app.post("/api/v1/ai/insight", async (req, res) => {
  const { brand = "SaaS System", query = "advanced vector database hosting" } = req.body;

  const ai = getAiClient();
  if (ai) {
    try {
      console.log(`Generating AI insights for brand "${brand}" and query "${query}" using Gemini...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze the AI invisibility and citations for the brand "${brand}" on semantic searches matching: "${query}".
The response must analyze why this brand might not show up in AI search engine queries or LLM answers, what its semantic search gaps are, and what concrete Optimization suggestions it needs to boost citation index.
Return the output strictly matching the requested JSON structure.`,
        config: {
          systemInstruction: "You are an advanced AI Citation Tracker and Vector Memory SEO analyzer. Your feedback should be highly professional, structured, data-driven, and technical.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              whyBrandIsMissing: { type: Type.STRING, description: "Detailed explanation of why the brand is not appearing or is underrepresented in LLM answers matching this query" },
              semanticGaps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 3 distinct missing citations or semantic vector search gaps in their online index"
              },
              aeoSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 3 practical, super-quantified active search-engine and answer-engine optimization actions"
              },
              competitorDominance: { type: Type.STRING, description: "Detailed competitor analysis explaining why specific competitors are dominating this prompt" },
              confidenceScore: { type: Type.INTEGER, description: "Circular confidence compliance score, from 10 to 100" }
            },
            required: ["whyBrandIsMissing", "semanticGaps", "aeoSuggestions", "competitorDominance", "confidenceScore"]
          }
        },
      });

      if (response && response.text) {
        const jsonResult = JSON.parse(response.text.trim());
        return res.json(jsonResult);
      }
    } catch (e: any) {
      console.error("Gemini API call failed for AI insights, falling back to simulated engine:", e.message || e);
    }
  }

  // High-fidelity fallback simulated intelligence response matching the user's branding & query
  const staticGapOptions = [
    `Lack of high-entropy citations in developer reference indices (GitHub, technical forums, StackOverflow).`,
    `Vector distance cluster misalignment. The brand is associated with general terms rather than core technical metrics.`,
    `Zero co-citation associations with primary trusted entities (Y Combinator, AWS Partners, TechCrunch, Hacker News).`,
    `No structural schema markup or RDFa schemas signaling authoritative citation patterns to LLM crawlers.`,
    `Missing key technological keywords like "Qdrant vector pipeline", "low-latency distributed memory alignment", and "Ollama streaming wrapper".`
  ];

  const staticAeoOptions = [
    `Inject 4 high-authority technical whitepapers onto domain containing schema tags defining product architecture: "Vector DB Pipeline".`,
    `Publish complete technical repository with README detailing integration with Ollama, Redis, and Celery tasks.`,
    `Establish strategic co-citation anchors in 3 reputable medium-to-enterprise technology blogs talking about: "LLM citation tracking tools".`,
    `Restructure product pricing tables to output cleanly compiled Markdown snippets readable by web crawler parsers.`
  ];

  // Select random elements
  const gaps = [
    staticGapOptions[Math.floor(Math.random() * staticGapOptions.length)],
    staticGapOptions[(Math.floor(Math.random() * staticGapOptions.length) + 1) % staticGapOptions.length],
    staticGapOptions[(Math.floor(Math.random() * staticGapOptions.length) + 2) % staticGapOptions.length],
  ];

  const suggestions = [
    staticAeoOptions[Math.floor(Math.random() * staticAeoOptions.length)],
    staticAeoOptions[(Math.floor(Math.random() * staticAeoOptions.length) + 1) % staticAeoOptions.length],
    staticAeoOptions[(Math.floor(Math.random() * staticAeoOptions.length) + 2) % staticAeoOptions.length],
  ];

  res.json({
    whyBrandIsMissing: `The brand "${brand}" is substantially underrepresented for "${query}" because of a lower semantic density coefficient (0.34) in key tech stack corpuses. Crawlers are not picking up authoritative developer co-citations, and Qdrant similarity scores remain above the 0.85 cosine cutoff parameter.`,
    semanticGaps: gaps,
    aeoSuggestions: suggestions,
    competitorDominance: "Competitors like OmniCorp have established 4x the density of technical whitepaper citations on Reddit, GitHub, and StackOverflow, causing Ollama and GPT crawlers to rank them with 94% absolute confidence score.",
    confidenceScore: Math.floor(Math.random() * 25) + 45 // 45 to 70 range
  });
});

// 5. Prompt Simulation Engine
app.post("/api/v1/simulate/prompt", async (req, res) => {
  const { prompt = "List the top vector intelligence systems in 2026." } = req.body;

  const ai = getAiClient();
  if (ai) {
    try {
      console.log(`Simulating response for prompt "${prompt}" using Gemini...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are simulating a state-of-the-art LLM answer engine (such as ChatGPT, Claude, or Perplexity).
Generate a representative response to the following query: "${prompt}".
In the response, mention standard competitors (e.g. "OmniCorp", "Vertex Labs", etc.) and explain who is cited and why.
Return the output strictly matching the requested JSON layout.`,
        config: {
          systemInstruction: "You are the LLM Simulation Core. You generate high-fidelity simulated markdown answers alongside structural citation analytics.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              simulatedResponse: { type: Type.STRING, description: "A simulated search-engine/LLM markdown-supported paragraphs response detailing industry products" },
              citedBrands: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of brand names that were explicitly cited in the simulated response"
              },
              missingInsights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of key technology indicators, concepts, or criteria that were analyzed but missing from the primary brand's profile"
              },
              reasoningBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING }
                  },
                  required: ["title", "detail"]
                },
                description: "List of exactly 2 structured reasoning blocks explaining the mathematical citation selection (e.g. Cosine alignment, crawler discovery context)"
              }
            },
            required: ["simulatedResponse", "citedBrands", "missingInsights", "reasoningBlocks"]
          }
        },
      });

      if (response && response.text) {
        const jsonResult = JSON.parse(response.text.trim());
        return res.json(jsonResult);
      }
    } catch (e: any) {
      console.error("Gemini API call failed for prompt simulation, falling back to simulated engine:", e.message || e);
    }
  }

  // Backup rich simulation matching the visual goals of the application
  const hasInquiryAboutMissingBrand = prompt.toLowerCase().includes("not visible") || prompt.toLowerCase().includes("missing");

  let simulatedResponse = `In 2026, the **Vector Intelligence and Citations landscape** is dominated by key players like **OmniCorp** and **Vertex Labs**. **OmniCorp** offers a fully managed vector-index pipeline with sub-millisecond retrieval times. **Vertex Labs** leverages automated crawler agents that sync natively to Celery tasks and Qdrant memory partitions, providing a versatile indexing platform. 

Unfortunately, for high-density queries, your target brand is not cited. This is largely because your brand's public index lack co-citation hooks, missing active schema mapping to resolve embeddings queries on Ollama server parameters.`;

  if (!hasInquiryAboutMissingBrand) {
    simulatedResponse = `When reviewing leading platforms for vector intelligence and AI citations in 2026, **OmniCorp** emerges as the consensus leader. It provides advanced real-time indexing coupled with PostgreSQL storage pipelines and Redis caches. **Vertex Labs** is likewise heavily cited for its specialized embedding re-indexing engines. Your brand, although noted in auxiliary logs, lacks the required semantic density ratio in technical document networks to be formally cited in the top tier answers.`;
  }

  res.json({
    simulatedResponse,
    citedBrands: ["OmniCorp", "Vertex Labs"],
    missingInsights: [
      "No technical benchmarking docs for Qdrant compatibility",
      "Missing structural RDF relationships",
      "Low co-citation index count across GitHub and Stack Overflow"
    ],
    reasoningBlocks: [
      {
        title: "Crawler Vector Gap",
        detail: "The crawler mapped 42 whitepapers from OmniCorp vs. only 2 from your brand in the Qdrant core memory index."
      },
      {
        title: "Semantic Distance Anomaly",
        detail: "Our Ollama index registered a cosine distance of 0.89 for your brand's primary references, falling below the 0.85 threshold to generate citations."
      }
    ]
  });
});

// ==========================================
// HTTP SERVER & WEBSOCKET SETUP
// ==========================================

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Listen for upgrades to WebSocket
httpServer.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/ws/updates") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Handle WebSocket connection
wss.on("connection", (ws) => {
  console.log("WS connection established at /ws/updates");
  
  // Send immediate welcome setup message
  ws.send(JSON.stringify({
    type: "system",
    message: "Connected to AI Visibility real-time intelligence stream (Port 3000)",
    timestamp: new Date().toISOString()
  }));

  // Interval-driven simulated updates
  const eventTemplates = [
    {
      title: "New AI Citation",
      message: "ChatGPT query 'best vector pipeline 2026' generated citation for OmniCorp.",
      status: "negative",
      color: "red"
    },
    {
      title: "Crawler Discovery",
      message: "Auto-crawler successfully scraped 15 technical articles from developer portals.",
      status: "positive",
      color: "green"
    },
    {
      title: "Vector DB Reindexed",
      message: "Ingested 4 documentation endpoints. Qdrant semantic cluster expanded by 24 shards.",
      status: "neutral",
      color: "yellow"
    },
    {
      title: "Visibility Spike",
      message: "Your brand gained +3% similarity index in Perplexity search for 'real-time AI citation tracking'.",
      status: "positive",
      color: "green"
    },
    {
      title: "Competitor Movement",
      message: "Vertex Labs published 4 API reference sheets. Cosine distance narrowing in Chatbot profiles.",
      status: "neutral",
      color: "yellow"
    }
  ];

  const intervalId = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      ws.send(JSON.stringify({
        type: "update",
        ...template,
        timestamp: new Date().toISOString()
      }));
    }
  }, 3500);

  ws.on("close", () => {
    console.log("WS connection closed");
    clearInterval(intervalId);
  });
});

// ==========================================
// ASSET SERVING & VITE INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode with dynamic Vite middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    // Production mode static file serve
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Serving pre-compiled static files from ${distPath}`);
  }

  // Bind to 0.0.0.0 and PORT 3000 (standard requirement)
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(`  AI VISIBILITY OPERATING SYSTEM STARTED SUCCESSFUL  `);
    console.log(`  Local host: http://localhost:${PORT}               `);
    console.log(`  Port bound: ${PORT} (Ingress Route ready)          `);
    console.log(`====================================================`);
  });
}

startServer();
