import { useEffect } from "react";
import { connectWS } from "../lib/ws";
import { useVisibilityStore } from "../store/visibilityStore";
import VisibilityChart from "./VisibilityChart";

export default function LiveDashboard() {
  const { events, history, addEvent } = useVisibilityStore();

  useEffect(() => {
    const ws = connectWS((data) => {
      addEvent(data);
    });

    return () => ws.close();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>🔥 AI Visibility Control Center</h2>

      {/* CHART SECTION */}
      <div
        style={{
          background: "#f9f9f9",
          padding: 20,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <VisibilityChart data={history} />
      </div>

      {/* EVENT FEED */}
      <div>
        <h3>📡 Live Event Feed</h3>

        {events.length === 0 ? (
          <p>Waiting for AI visibility updates...</p>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              style={{
                padding: 10,
                marginBottom: 10,
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <strong>{event.type}</strong>

              {event.score !== undefined && (
                <div>Score: {event.score}</div>
              )}

              {event.keyword && (
                <div>Keyword: {event.keyword}</div>
              )}

              {event.message && <div>{event.message}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}