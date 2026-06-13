import { useState } from "react";

export interface VisibilityEvent {
  type: string;
  score?: number;
  keyword?: string;
  message?: string;
  timestamp?: number;
}

export interface HistoryPoint {
  time: number;
  score: number;
}

/**
 * Live Visibility Store (WebSocket + Chart Data)
 */
export function useVisibilityStore() {
  const [events, setEvents] = useState<VisibilityEvent[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const addEvent = (event: VisibilityEvent) => {
    const timestamp = Date.now();

    // Create safe enriched event
    const enrichedEvent: VisibilityEvent = {
      ...event,
      timestamp,
    };

    // Update event feed
    setEvents((prev) => [enrichedEvent, ...prev]);

    // ✅ SAFE EXTRACTION (fixes TS error permanently)
    const score = event.score;

    // Only push valid numeric scores
    if (typeof score === "number" && !isNaN(score)) {
      setHistory((prev) => [
        ...prev.slice(-49), // keep last 50 points
        {
          time: timestamp,
          score: score,
        },
      ]);
    }
  };

  return {
    events,
    history,
    addEvent,
  };
}