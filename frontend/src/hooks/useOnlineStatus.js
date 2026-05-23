import { useEffect } from "react";

/**
 * Hook này gửi "identify" qua WebSocket ngay khi user đã đăng nhập
 */
export default function useOnlineStatus() {
    useEffect(() => {
        const userId = localStorage.getItem("userId");
        if (!userId) return; // Chưa đăng nhập → không cần kết nối

        const wsUrl =
            (typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_URL) ||
            "wss://web-trading-project.onrender.com";

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "identify", userId: parseInt(userId) }));
        };

        ws.onerror = () => {};

        return () => ws.close();
    }, []); 
}
