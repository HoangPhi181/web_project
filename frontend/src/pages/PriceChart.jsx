import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function PriceChart() {
  const chartRef = useRef();

  useEffect(() => {
    if (!chartRef.current) return;

    // tạo chart
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: "#0b1e26" },
        textColor: "#ccc",
      },
      grid: {
        vertLines: { color: "#1f3a44" },
        horzLines: { color: "#1f3a44" },
      },
    });

    // thêm candlestick series
    const candleSeries = chart.addCandlestickSeries();

    // dữ liệu demo
    candleSeries.setData([
      { time: "2024-01-01", open: 100, high: 110, low: 90, close: 105 },
      { time: "2024-01-02", open: 105, high: 115, low: 95, close: 100 },
      { time: "2024-01-03", open: 100, high: 120, low: 98, close: 115 },
    ]);

    return () => chart.remove();
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}
