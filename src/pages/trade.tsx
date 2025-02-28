"use client";

import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";

import { Time } from "lightweight-charts";

const calculateSMA = (data: { time: Time; close: number }[], period: number) => {
  const smaData = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
    smaData.push({ time: data[i].time, value: sum / period });
  }
  return smaData;
};

const Trade = () => {
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

      // Add a candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: "#4caf50",
        downColor: "#f44336",
        borderVisible: false,
        wickUpColor: "#4caf50",
        wickDownColor: "#f44336",
      });

      candlestickSeriesRef.current = candlestickSeries;

      // Add a moving average series
      const movingAverageSeries = chart.addLineSeries({
        color: "blue",
      });

      movingAverageSeriesRef.current = movingAverageSeries;

      // Fetch and set data
      fetch("/api/finance")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.quotes && Array.isArray(data.quotes)) {
            const formattedData = data.quotes
              .filter((entry: { open: number; high: number; low: number; close: number; date: string }) => 
                typeof entry.open === 'number' &&
                typeof entry.high === 'number' &&
                typeof entry.low === 'number' &&
                typeof entry.close === 'number'
              )
              .map((entry: { open: number; high: number; low: number; close: number; date: string }) => ({
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

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Chart with Indicators</h1>
      <div ref={chartContainerRef} style={{ position: "relative" }} />
    </div>
  );
};

export default Trade;