import { createChart, ColorType } from 'lightweight-charts';
import React, { useEffect, useRef, useState } from 'react';

const PriceChart = () => {
    const chartContainerRef = useRef();
    const chartInstance = useRef();
    const seriesRef = useRef();
    const [activeTF, setActiveTF] = useState('D');

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Khởi tạo Chart với chiều cao an toàn
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0b161e' },
                textColor: '#d1d4dc',
            },
            // Nếu clientHeight = 0, nó sẽ lấy 500px làm dự phòng
            width: chartContainerRef.current.clientWidth || 800,
            height: chartContainerRef.current.clientHeight || 500,
            grid: {
                vertLines: { color: 'rgba(30, 34, 45, 0.5)' },
                horzLines: { color: 'rgba(30, 34, 45, 0.5)' },
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        seriesRef.current = candlestickSeries;

        const data = [
            { time: '2024-04-01', open: 4235.1, high: 4260.5, low: 4230.8, close: 4250.5 },
            { time: '2024-04-02', open: 4250.5, high: 4275.2, low: 4248.1, close: 4265.2 },
            { time: '2024-04-03', open: 4265.2, high: 4288.8, low: 4260.4, close: 4280.8 },
            { time: '2024-04-04', open: 4280.8, high: 4310.4, low: 4275.9, close: 4300.4 },
            { time: '2024-04-05', open: 4300.4, high: 4305.1, low: 4285.3, close: 4295.9 },
        ];
        candlestickSeries.setData(data);
        chart.timeScale().fitContent();

        // Xử lý Resize tự động cực chuẩn
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ 
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight 
                });
            }
        };

        window.addEventListener('resize', handleResize);
        
        // Gọi thử một lần sau 100ms để chắc chắn layout đã render xong
        setTimeout(handleResize, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px' }}>
            <div style={{
                position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                display: 'flex', gap: '5px', background: 'rgba(27, 42, 50, 0.8)',
                padding: '5px', borderRadius: '4px'
            }}>
                {['M1', 'M5', 'M15', 'H1', 'H4', 'D', 'W', 'M'].map(tf => (
                    <button key={tf} onClick={() => setActiveTF(tf)}
                        style={{
                            background: activeTF === tf ? '#f5c400' : 'transparent',
                            color: activeTF === tf ? '#000' : '#fff',
                            border: 'none', padding: '2px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
                        }}>{tf}</button>
                ))}
            </div>
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default PriceChart;