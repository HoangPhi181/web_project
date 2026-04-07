import { createChart, ColorType } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

const PriceChart = () => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();

    const [activeTF, setActiveTF] = useState('D');

    // 🔥 convert time -> timestamp (fix lỗi H1)
    const toTimestamp = (dateStr) => {
        return Math.floor(new Date(dateStr).getTime() / 1000);
    };

    // DATA D
    const dataD = [
        { time: '2017-04-01', open: 4235.1, high: 4260.5, low: 4230.8, close: 4250.5 },
        { time: '2017-04-02', open: 4250.5, high: 4275.2, low: 4248.1, close: 4265.2 },
        { time: '2017-04-03', open: 4265.2, high: 4288.8, low: 4260.4, close: 4280.8 },
        { time: '2017-04-04', open: 4280.8, high: 4310.4, low: 4275.9, close: 4300.4 },
        { time: '2017-04-05', open: 4300.4, high: 4335.1, low: 4276, close: 4295.9 },
    ];

    // DATA H1 (đã fix format)
    const dataH1 = [
        { time: toTimestamp('2017-04-05 08:00:00'), open: 4290.1, high: 4290.5, low: 4285.3, close: 4287.5 },
        { time: toTimestamp('2017-04-05 09:00:00'), open: 4287.5, high: 4332.1, low: 4287.5, close: 4297.2 },
        { time: toTimestamp('2017-04-05 10:00:00'), open: 4297.2, high: 4335.1, low: 4286.5, close: 4287 },
        { time: toTimestamp('2017-04-05 11:00:00'), open: 4287, high: 4330, low: 4276, close: 4281 },
        { time: toTimestamp('2017-04-05 12:00:00'), open: 4281, high: 4295, low: 4276.5, close: 4295.90 },
    ];

    // 🚀 INIT CHART
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0b161e' },
                textColor: '#d1d4dc',
            },
            width: chartContainerRef.current.clientWidth || 800,
            height: chartContainerRef.current.clientHeight || 500,

            // 🔥 grid rõ hơn
            grid: {
                vertLines: { color: 'rgba(255,255,255,0.08)' },
                horzLines: { color: 'rgba(255,255,255,0.08)' },
            },

            crosshair: {
                mode: 1,
            },
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

        // default load D
        series.setData(dataD);
        chart.timeScale().fitContent();

        // resize chuẩn
        const handleResize = () => {
            chart.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // 🔥 CHANGE TIMEFRAME
    useEffect(() => {
        if (!seriesRef.current || !chartRef.current) return;

        let newData;

        switch (activeTF) {
            case 'H1':
                newData = dataH1;
                break;
            case 'D':
            default:
                newData = dataD;
                break;
        }

        seriesRef.current.setData(newData);
        chartRef.current.timeScale().fitContent();

    }, [activeTF]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px' }}>
            
            {/* 🔥 TIMEFRAME BUTTON */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                zIndex: 10,
                display: 'flex',
                gap: '5px',
                background: 'rgba(27, 42, 50, 0.8)',
                padding: '5px',
                borderRadius: '4px'
            }}>
                {['M1', 'M5', 'M15', 'H1', 'H4', 'D', 'W', 'M'].map(tf => (
                    <button
                        key={tf}
                        onClick={() => setActiveTF(tf)}
                        style={{
                            background: activeTF === tf ? '#f5c400' : 'transparent',
                            color: activeTF === tf ? '#000' : '#fff',
                            border: 'none',
                            padding: '3px 10px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderRadius: '3px'
                        }}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            {/* CHART */}
            <div
                ref={chartContainerRef}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default PriceChart;