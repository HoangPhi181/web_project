import { createChart, ColorType } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const PriceChart = ({ symbol = 'BTC/USD', orders = [], onPriceChange }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();
    const linesRef = useRef([]); // 👈 lưu line để clear

    const lastCandleRef = useRef(null);
    const [activeTF, setActiveTF] = useState('1m');

    const [activeOrderId, setActiveOrderId] = useState(null);

    const toTimestamp = (dateStr) => {
        const ts = Math.floor(new Date(dateStr).getTime() / 1000);
        return isNaN(ts) ? null : ts;
    };

    // =========================
    // 1. INIT CHART
    // =========================
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2f2f2f' },
                horzLines: { color: '#2f2f2f' },
            },
            timeScale: {
                timeVisible: true,
                rightOffset: 20,
                barSpacing: 10,
            },
            width: chartContainerRef.current.clientWidth,
            height: 600,
        });

        const series = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        chartRef.current = chart;
        seriesRef.current = series;

        const handleResize = () => {
            chart.applyOptions({
                width: chartContainerRef.current.clientWidth
            });
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []);

    // =========================
    // 2. FETCH HISTORY
    // =========================
    useEffect(() => {
        const fetchHistory = async () => {
            if (!seriesRef.current) return;

            try {
                const apiSymbol = symbol.replace('/', '-').toUpperCase();

                const res = await axios.get(
                    `http://localhost:5000/api/market/candles/${apiSymbol}`,
                    {
                        params: { timeframe: activeTF, limit: 300 }
                    }
                );

                const data = res.data?.data || [];

                const formatted = data
                    .map(item => ({
                        time: toTimestamp(item.timestamp),
                        open: Number(item.open_price),
                        high: Number(item.high_price),
                        low: Number(item.low_price),
                        close: Number(item.close_price),
                    }))
                    .filter(i => i.time)
                    .sort((a, b) => a.time - b.time);

                seriesRef.current.setData(formatted);

                if (formatted.length > 0) {
                    lastCandleRef.current = formatted[formatted.length - 1];
                }

                chartRef.current.timeScale().fitContent();

            } catch (err) {
                console.error("History error:", err.message);
            }
        };

        fetchHistory();
    }, [symbol, activeTF]);

    // =========================
    // 3. REALTIME
    // =========================
    useEffect(() => {
        const socket = new WebSocket("ws://localhost:5000");
        const apiSymbol = symbol.replace('/', '-').toUpperCase();

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.symbol !== apiSymbol) return;

            const price = Number(msg.price || msg.data?.close_price);
            if (onPriceChange) onPriceChange(price);
            const ts = toTimestamp(msg.timestamp || msg.data?.timestamp);

            const tfSec = parseInt(activeTF) * 60;
            const rounded = Math.floor(ts / tfSec) * tfSec;

            let candle;
            const last = lastCandleRef.current;

            if (last && last.time === rounded) {
                candle = {
                    ...last,
                    close: price,
                    high: Math.max(last.high, price),
                    low: Math.min(last.low, price),
                };
            } else {
                candle = {
                    time: rounded,
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                };
            }

            lastCandleRef.current = candle;
            seriesRef.current.update(candle);
        };

        return () => socket.close();
    }, [symbol, activeTF]);
    /*-------------------------------------Draw line--------------------------------- */
    useEffect(() => {
        if (!chartRef.current || !seriesRef.current) return;

        const chart = chartRef.current;

        const handleClick = (param) => {
            if (!param || !param.point) return;

            const y = param.point.y;

            let closest = null;
            let minDiff = Infinity;

            orders.forEach(order => {
                const yOrder = seriesRef.current.priceToCoordinate(
                    Number(order.open_price)
                );

                if (yOrder == null) return;

                const diff = Math.abs(y - yOrder);

                if (diff < minDiff) {
                    minDiff = diff;
                    closest = order;
                }
            });

            const THRESHOLD = 12; // pixel (10–20 là đẹp)

            if (closest && minDiff < THRESHOLD) {
                setActiveOrderId(closest.id || closest.open_price);
            } else {
                setActiveOrderId(null);
            }
        };

        chart.subscribeClick(handleClick);

        return () => chart.unsubscribeClick(handleClick);

    }, [orders]);

    useEffect(() => {
        if (!seriesRef.current) return;

        // ❌ clear line cũ
        linesRef.current.forEach(line => {
            seriesRef.current.removePriceLine(line);
        });
        linesRef.current = [];

        if (!orders || orders.length === 0) return;

        orders.forEach(order => {
            const entryPrice = Number(order.open_price);
            const key = order.id || order.open_price;
            const isActive = key === activeOrderId;

            // ===== ENTRY =====
            const entryLine = seriesRef.current.createPriceLine({
                price: entryPrice,
                color: "#2962ff",
                lineWidth: isActive ? 4 : 2,
                lineStyle: 0,
                axisLabelVisible: true,
                title: `${order.side} ${Number(order.volume).toFixed(2) || 0.01}`,
            });

            linesRef.current.push(entryLine);

            // ===== TP =====
            if (order.take_profit) {
                const tp = Number(order.take_profit);

                const tpLine = seriesRef.current.createPriceLine({
                    price: tp,
                    color: "#00c853",
                    lineWidth: isActive ? 3 : 1,
                    lineStyle: 2,
                    axisLabelVisible: isActive, // chỉ hiện khi active
                    title: `${((tp - entryPrice)*order.volume).toFixed(2)} USD`,
                });

                linesRef.current.push(tpLine);
            }

            // ===== SL =====
            if (order.stop_loss) {
                const sl = Number(order.stop_loss);

                const slLine = seriesRef.current.createPriceLine({
                    price: sl,
                    color: "#ff9800",
                    lineWidth: isActive ? 3 : 1,
                    lineStyle: 2,
                    axisLabelVisible: isActive, // chỉ hiện khi active
                    title: `${((sl - entryPrice)*order.volume).toFixed(2)} USD`,
                });

                linesRef.current.push(slLine);
            }
        });

    }, [orders, activeOrderId]);

    // =========================
    // UI
    // =========================
    return (
        <div style={{ width: '100%', background: '#131722' }}>
            <div style={{ padding: 10, display: 'flex', gap: 10 }}>
                {['1m','5m','15m','1h'].map(tf => (
                    <button
                        key={tf}
                        onClick={() => setActiveTF(tf)}
                        style={{
                            background: activeTF === tf ? '#2962ff' : '#2a2e39',
                            color: 'white'
                        }}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            <div ref={chartContainerRef} style={{ height: 600 }} />
        </div>
    );
};

export default PriceChart;