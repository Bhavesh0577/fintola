"use client";

import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";

const TradeWithIndicators = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const movingAverageSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      // Initialize the chart
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.offsetWidth,
        height: 400,
        layout: {
          background: { color: "#ffffff" },
          textColor: "#000000",
        },
        grid: {
          vertLines: {
            color: "#e1e1e1",
          },
          horzLines: {
            color: "#e1e1e1",
          },
        },
        crosshair: {
          mode: 1, // Normal crosshair mode
        },
        rightPriceScale: {
          borderColor: "#cccccc",
        },
        timeScale: {
          borderColor: "#cccccc",
        },
      });

      chartRef.current = chart;

      // Add candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: "#4caf50",
        downColor: "#f44336",
        borderVisible: false,
        wickUpColor: "#4caf50",
        wickDownColor: "#f44336",
      });

      candlestickSeriesRef.current = candlestickSeries;

      // Add a line series for the moving average
      const movingAverageSeries = chart.addLineSeries({
        color: "#ff9800",
        lineWidth: 2,
      });

      movingAverageSeriesRef.current = movingAverageSeries;

      // Fetch and set data
      fetch("/api/finance")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.quotes && Array.isArray(data.quotes)) {
            const formattedData = data.quotes
              .filter((entry: any) => 
                typeof entry.open === 'number' &&
                typeof entry.high === 'number' &&
                typeof entry.low === 'number' &&
                typeof entry.close === 'number'
              )
              .map((entry: any) => ({
                time: new Date(entry.date).getTime() / 1000, // Convert to UNIX timestamp
                open: entry.open,
                high: entry.high,
                low: entry.low,
                close: entry.close,
              }));

            candlestickSeries.setData(formattedData);

            // Calculate a simple moving average (SMA)
            const sma = calculateSMA(formattedData, 14); // 14-period moving average
            movingAverageSeries.setData(sma);
          } else {
            console.error("Unexpected data format:", data);
          }
        })
        .catch((err) => console.error("Error fetching data:", err));
    }

    // Cleanup on unmount
    return () => {
      chartRef.current?.remove();
    };
  }, []);

  // Function to calculate a simple moving average (SMA)
  const calculateSMA = (data: any[], period: number) => {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i >= period - 1) {
        const sum = data
          .slice(i - period + 1, i + 1)
          .reduce((acc, curr) => acc + curr.close, 0);
        sma.push({ time: data[i].time, value: sum / period });
      }
    }
    return sma;
  };

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Chart with Indicators</h1>
      <div ref={chartContainerRef} style={{ position: "relative" }} />
    </div>
  );
};

export default TradeWithIndicators;
