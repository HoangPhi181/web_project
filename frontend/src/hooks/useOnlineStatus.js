import { useEffect, useRef } from "react";

const WS_URL =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_URL) ||
    "wss://web-trading-project.onrender.com";

/**
 * Chỉ kết nối WebSocket khi đăng nhập.
 * Tự ngắt kết nối khi userId đăng xuất hoặc đóng tab.
 */
export default function useOnlineStatus(userId) {
    const wsRef = useRef(null);

    useEffect(() => {
        if (!userId) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "identify", userId }));
        };

        ws.onerror = (err) => {
            console.warn("WebSocket lỗi (online status):", err);
        };

        return () => {
            try { ws.close(); } catch (_) {}
            wsRef.current = null;
        };
    }, [userId]); 
}
