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
    const [wsStatus, setWsStatus] = useState("connecting");

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

    // ─── Init chart ─────────────────────────────────────────────────────────────
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
                barSpacing: 10,

                secondsVisible: false,
            },
            localization: {
                timeFormatter: ts => new Date(ts * 1000).toLocaleTimeString(),
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

    // ─── Fetch history ───────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchHistory = async () => {
            if (!seriesRef.current) return;

            try {
                const apiSymbol = symbol.replace("/", "-").toUpperCase();

                const res = await axiosClient.get(`/market/candles/${apiSymbol}`, {
                    params: { timeframe: activeTF, limit: 300 }
                });

                const now = Math.floor(Date.now() / 1000);

                const formatted = (res.data?.data || [])
                    .map(item => ({
                        time:  Math.floor(new Date(item.timestamp).getTime() / 1000),
                        open:  Number(item.open_price),
                        high:  Number(item.high_price),
                        low:   Number(item.low_price),
                        close: Number(item.close_price)
                    }))
                    .filter(i => i.time && !isNaN(i.open) && i.time <= now) // ✅ bỏ candle tương lai
                    .sort((a, b) => a.time - b.time);
                
                seriesRef.current.setData(formatted);

                if (formatted.length) {
                    const last    = formatted[formatted.length - 1];
                    const tfSec   = getTimeframeSeconds(activeTF);
                    const rounded = Math.floor(Date.now() / 1000 / tfSec) * tfSec;

                    // ✅ Tất cả field đều là primitive number — không có Object
                    lastCandleRef.current = {
                        time:  rounded,
                        open:  Number(last.open),
                        high:  Number(last.high),
                        low:   Number(last.low),
                        close: Number(last.close)
                    };
                }

                chartRef.current.timeScale().fitContent();
            } catch (err) {
                console.error("History fetch error:", err.message);
            }
        };

        fetchHistory();
    }, [symbol, activeTF]);

    // ─── WebSocket realtime ──────────────────────────────────────────────────────
    useEffect(() => {
        const apiSymbol = symbol.replace("/", "-").toUpperCase();
        let socket;
        let reconnectTimer;
        let isMounted = true;

        const connect = () => {
            if (!isMounted) return;

            socket = new WebSocket(import.meta.env.VITE_WS_URL);
            setWsStatus("connecting");

            socket.onopen = () => {
                if (!isMounted) return;
                console.log("✅ WebSocket connected");
                setWsStatus("connected");

                socket.send(JSON.stringify({
                    type: "subscribe",
                    symbols: [apiSymbol]
                }));
            };

            socket.onmessage = event => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type !== "price_update" && msg.type !== "candle_update") return;
                    if (msg.symbol !== apiSymbol) return;

                    const price = Number(
                        msg.price         ??
                        msg.candle?.close ??
                        msg.data?.close_price
                    );
                    if (!price || isNaN(price)) return;

                    if (onPriceChange) onPriceChange(price);

                    const tfSec   = getTimeframeSeconds(activeTF);
                    const rounded = Math.floor(Math.floor(Date.now() / 1000) / tfSec) * tfSec;
                    const last    = lastCandleRef.current;

                    // ✅ Không dùng ...spread — khai báo từng field là number tường minh
                    let candle;
                    if (last && last.time === rounded) {
                        candle = {
                            time:  rounded,
                            open:  Number(last.open),
                            high:  Math.max(Number(last.high), price),
                            low:   Math.min(Number(last.low),  price),
                            close: price
                        };
                    } else {
                        candle = {
                            time:  rounded,
                            open:  last ? Number(last.close) : price,
                            high:  price,
                            low:   price,
                            close: price
                        };
                    }
                    
                    if (!last || candle.time >= last.time) {
                        lastCandleRef.current = candle;
                        //console.log("CANDLE:", JSON.stringify(candle)); 
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

    // ─── Click chọn order ────────────────────────────────────────────────────────
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

    // ─── Vẽ price lines cho orders ───────────────────────────────────────────────
    useEffect(() => {
        if (!seriesRef.current) return;

        linesRef.current.forEach(line => seriesRef.current.removePriceLine(line));
        linesRef.current = [];

        if (!orders.length) return;

        orders.forEach(order => {
            const entry    = Number(order.open_price);
            const volume   = Number(order.volume);
            const key      = order.id || order.open_price;
            const isActive = key === activeOrderId;

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

    const statusColor = {
        connecting:   "#f59e0b",
        connected:    "#22c55e",
        disconnected: "#ef4444"
    }[wsStatus];

    return (
        <div style={{ width: "100%", background: "#131722" }}>
            <div style={{ padding: "10px", display: "flex", gap: 10, alignItems: "center" }}>
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

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                        width: 8, height: 8,
                        borderRadius: "50%",
                        background: statusColor
                    }} />
                    <span style={{ color: statusColor, fontSize: 12 }}>
                        {wsStatus === "connected"  ? "Live"          :
                         wsStatus === "connecting" ? "Connecting…"   :
                                                     "Reconnecting…"}
                    </span>
                </div>
            </div>

            <div ref={chartContainerRef} style={{ height: 600 }} />
        </div>
    );
};

export default PriceChart;