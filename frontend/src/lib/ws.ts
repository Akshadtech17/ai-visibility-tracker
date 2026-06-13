const WS_URL = import.meta.env.VITE_WS_URL;

export function connectWS(onMessage: (data: any) => void) {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("🚀 WebSocket connected");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error("Invalid WS message:", event.data);
    }
  };

  ws.onerror = (err) => {
    console.error("WS error:", err);
  };

  ws.onclose = () => {
    console.log("❌ WebSocket disconnected");
  };

  return ws;
}