import { useEffect } from "react";

/**
 * Hook gửi "identify" qua WebSocket ngay khi user đã đăng nhập.
 */
export default function useOnlineStatus() {
    useEffect(() => {
        const rawId = localStorage.getItem("userId");

        if (!rawId || rawId === "null" || rawId === "undefined") return;

        const userId = parseInt(rawId, 10);
        if (isNaN(userId)) return; 

        const wsUrl =
            (typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_URL) ||
            "wss://web-trading-project.onrender.com";

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "identify", userId }));
        };

        ws.onerror = (err) => {
            console.warn("WebSocket lỗi (online status):", err);
        };

        // Gửi lại identify nếu kết nối bị gián đoạn rồi mở lại
        ws.onclose = () => {};

        return () => {
            try { ws.close(); } catch (_) {}
        };
    }, []);
}
