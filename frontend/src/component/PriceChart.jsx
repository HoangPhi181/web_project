import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef, useState } from "react";
import axiosClient from "../api/axiosClient";

const PriceChart = ({ symbol = "BTC/USD", orders = [], onPriceChange }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();
    const linesRef = useRef([]);
    const lastCandleRef = useRef(null);

    const [activeTF, setActiveTF] = useState("1m");
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [wsStatus, setWsStatus] = useState("connecting"); // 'connecting' | 'connected' | 'disconnected'

    const toTimestamp = dateStr => {
        const ts = Math.floor(new Date(dateStr).getTime() / 1000);
        return isNaN(ts) ? null : ts;
    };

    const getTimeframeSeconds = tf => {
        switch (tf) {
            case "1m":  return 60;
            case "5m":  return 300;
            case "15m": return 900;
            case "1h":  return 3600;
            default:    return 60;
        }
    };

    const calcPnL = (target, entry, side, volume) => {
        const diff = side === "BUY" ? target - entry : entry - target;
        return (diff * volume).toFixed(2);
    };

    // ─── Init chart ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "#131722" },
                textColor: "#d1d4dc"
            },
            grid: {
                vertLines: { color: "#2f2f2f" },
                horzLines: { color: "#2f2f2f" }
            },
            timeScale: {
                timeVisible: true,
                rightOffset: 20,
                barSpacing: 10
            },
            width: chartContainerRef.current.clientWidth,
            height: 600
        });

        const series = chart.addCandlestickSeries({
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderVisible: false,
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350"
        });

        chartRef.current = chart;
        seriesRef.current = series;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []);

    // ─── Fetch history ─────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchHistory = async () => {
            if (!seriesRef.current) return;

            try {
                const apiSymbol = symbol.replace("/", "-").toUpperCase();

                const res = await axiosClient.get(`/market/candles/${apiSymbol}`, {
                    params: { timeframe: activeTF, limit: 300 }
                });

                const formatted = (res.data?.data || [])
                    .map(item => ({
                        time: toTimestamp(item.timestamp),
                        open:  Number(item.open_price),
                        high:  Number(item.high_price),
                        low:   Number(item.low_price),
                        close: Number(item.close_price)
                    }))
                    .filter(i => i.time && !isNaN(i.open))
                    .sort((a, b) => a.time - b.time);

                seriesRef.current.setData(formatted);

                if (formatted.length) {
                    lastCandleRef.current = formatted[formatted.length - 1];
                }

                chartRef.current.timeScale().fitContent();
            } catch (err) {
                console.error("History fetch error:", err.message);
            }
        };

        fetchHistory();
    }, [symbol, activeTF]);

    // ─── WebSocket realtime ─────────────────────────────────────────────────────
    useEffect(() => {
        const apiSymbol = symbol.replace("/", "-").toUpperCase();
        let socket;
        let reconnectTimer;
        let isMounted = true;

        const connect = () => {
            if (!isMounted) return;

            socket = new WebSocket("wss://web-trading-project.onrender.com");
            setWsStatus("connecting");

            socket.onopen = () => {
                if (!isMounted) return;
                console.log("✅ WebSocket connected");
                setWsStatus("connected");

                // Subscribe to the symbol after connection
                socket.send(JSON.stringify({
                    type: "subscribe",
                    symbols: [apiSymbol]
                }));
            };

            socket.onmessage = event => {
                try {
                    const msg = JSON.parse(event.data);
                        // console.log("RAW MSG:", msg);
                        // console.log("apiSymbol:", apiSymbol);
                        // console.log("match?", msg.symbol === apiSymbol);
                    // Only handle price/candle update messages
                    if (msg.type !== "price_update" && msg.type !== "candle_update") return;

                    // Filter by symbol
                    if (msg.symbol !== apiSymbol) return;

                    // Resolve price — support both message formats
                    const price = Number(
                        msg.price          ??   // price_update
                        msg.candle?.close  ??   // candle_update
                        msg.data?.close_price   // legacy fallback
                    );

                    if (!price || isNaN(price)) return;

                    if (onPriceChange) onPriceChange(price);

                    // Resolve timestamp
                    const rawTs =
                        msg.timestamp          ??
                        msg.candle?.timestamp  ??
                        msg.data?.timestamp;

                    const ts = toTimestamp(rawTs);
                    if (!ts) return;

                    const tfSec   = getTimeframeSeconds(activeTF);
                    const rounded = Math.floor(ts / tfSec) * tfSec;
                    const last    = lastCandleRef.current;

                    let candle;

                    if (last && last.time === rounded) {
                        // Update existing candle
                        candle = {
                            ...last,
                            close: price,
                            high:  Math.max(last.high, price),
                            low:   Math.min(last.low,  price)
                        };
                    } else {
                        // New candle — open = previous close so there's no gap
                        candle = {
                            time:  rounded,
                            open:  last?.close ?? price,
                            high:  price,
                            low:   price,
                            close: price
                        };
                    }

                    if (!last || candle.time >= last.time) {
                        lastCandleRef.current = candle;
                        seriesRef.current?.update(candle);
                    }
                } catch (err) {
                    console.error("WS message parse error:", err);
                }
            };

            socket.onerror = err => {
                console.error("❌ WebSocket error:", err);
            };

            socket.onclose = () => {
                if (!isMounted) return;
                console.warn("🔌 WebSocket disconnected — reconnecting in 3s…");
                setWsStatus("disconnected");

                // Auto-reconnect after 3 seconds
                reconnectTimer = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            isMounted = false;
            clearTimeout(reconnectTimer);
            socket?.close();
        };
    }, [symbol, activeTF]);

    // ─── Click on chart to select order ────────────────────────────────────────
    useEffect(() => {
        if (!chartRef.current || !seriesRef.current) return;

        const handleClick = param => {
            if (!param?.point) return;

            let closest = null;
            let minDiff = Infinity;

            orders.forEach(order => {
                const yOrder = seriesRef.current.priceToCoordinate(Number(order.open_price));
                if (yOrder == null) return;

                const diff = Math.abs(param.point.y - yOrder);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = order;
                }
            });

            setActiveOrderId(closest && minDiff < 12 ? (closest.id || closest.open_price) : null);
        };

        chartRef.current.subscribeClick(handleClick);
        return () => chartRef.current?.unsubscribeClick(handleClick);
    }, [orders]);

    // ─── Draw order price lines ─────────────────────────────────────────────────
    useEffect(() => {
        if (!seriesRef.current) return;

        linesRef.current.forEach(line => seriesRef.current.removePriceLine(line));
        linesRef.current = [];

        if (!orders.length) return;

        orders.forEach(order => {
            const entry  = Number(order.open_price);
            const volume = Number(order.volume);
            const key    = order.id || order.open_price;
            const isActive = key === activeOrderId;

            // Entry line
            linesRef.current.push(
                seriesRef.current.createPriceLine({
                    price: entry,
                    color: "#2962ff",
                    lineWidth: isActive ? 4 : 2,
                    lineStyle: 0,
                    axisLabelVisible: true,
                    title: `${order.side} ${volume.toFixed(2)}`
                })
            );

            // Take Profit line
            if (order.take_profit) {
                const tp = Number(order.take_profit);
                linesRef.current.push(
                    seriesRef.current.createPriceLine({
                        price: tp,
                        color: "#00c853",
                        lineWidth: isActive ? 3 : 1,
                        lineStyle: 2,
                        axisLabelVisible: isActive,
                        title: `TP ${calcPnL(tp, entry, order.side, volume)} USD`
                    })
                );
            }

            // Stop Loss line
            if (order.stop_loss) {
                const sl = Number(order.stop_loss);
                linesRef.current.push(
                    seriesRef.current.createPriceLine({
                        price: sl,
                        color: "#ff9800",
                        lineWidth: isActive ? 3 : 1,
                        lineStyle: 2,
                        axisLabelVisible: isActive,
                        title: `SL ${calcPnL(sl, entry, order.side, volume)} USD`
                    })
                );
            }
        });
    }, [orders, activeOrderId]);

    // ─── Status indicator color ─────────────────────────────────────────────────
    const statusColor = {
        connecting:   "#f59e0b",
        connected:    "#22c55e",
        disconnected: "#ef4444"
    }[wsStatus];

    return (
        <div style={{ width: "100%", background: "#131722" }}>
            {/* Toolbar */}
            <div style={{
                padding: "10px",
                display: "flex",
                gap: 10,
                alignItems: "center"
            }}>
                {["1m", "5m", "15m", "1h"].map(tf => (
                    <button
                        key={tf}
                        onClick={() => setActiveTF(tf)}
                        style={{
                            background: activeTF === tf ? "#2962ff" : "#2a2e39",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 12px",
                            cursor: "pointer"
                        }}
                    >
                        {tf}
                    </button>
                ))}

                {/* WebSocket status dot */}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: statusColor
                    }} />
                    <span style={{ color: statusColor, fontSize: 12 }}>
                        {wsStatus === "connected"    ? "Live"         :
                         wsStatus === "connecting"   ? "Connecting…"  :
                                                       "Reconnecting…"}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div ref={chartContainerRef} style={{ height: 600 }} />
        </div>
    );
};

export default PriceChart;