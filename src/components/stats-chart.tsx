"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";

export function StatsChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Local state to hold the formatted candlestick data and indicator toggles
  const [chartData, setChartData] = useState<any[]>([]);
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);

  // Helper function to calculate a 14-period Simple Moving Average (SMA)
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















useEffect(() => {
  if (!chartData.length || !chartRef.current) return;
  const chart = chartRef.current;

  // Calculate short and long EMAs
  const shortEMA = calculateEMA(chartData, 3);
  const longEMA = calculateEMA(chartData, 30);

  // Find crossover points for buy/sell signals
  const markers = [];
  for (let i = 1; i < shortEMA.length && i < longEMA.length; i++) {
    if (shortEMA[i - 1].value < longEMA[i - 1].value && shortEMA[i].value > longEMA[i].value) {
      markers.push({ time: shortEMA[i].time, position: "belowBar", color: "green", shape: "arrowUp", text: "BUY" });
    } else if (shortEMA[i - 1].value > longEMA[i - 1].value && shortEMA[i].value < longEMA[i].value) {
      markers.push({ time: shortEMA[i].time, position: "aboveBar", color: "red", shape: "arrowDown", text: "SELL" });
    }
  }

  // Add EMA series to the chart
  const shortEMASeries = chart.addLineSeries({ color: "#00ff00", lineWidth: 2 });
  const longEMASeries = chart.addLineSeries({ color: "#ff0000", lineWidth: 2 });

  shortEMASeries.setData(shortEMA);
  longEMASeries.setData(longEMA);

  // Add buy/sell markers to the candlestick series
  candlestickSeriesRef.current?.setMarkers(markers);

  return () => {
    chart.removeSeries(shortEMASeries);
    chart.removeSeries(longEMASeries);
  };
}, [chartData]);






















  // Helper function to calculate a 14-period Exponential Moving Average (EMA)
  const calculateEMA = (data: any[], period: number) => {
    const ema = [];
    const k = 2 / (period + 1);
    let prevEma = 0;
    for (let i = 0; i < data.length; i++) {
      if (i === period - 1) {
        // Initialize EMA using the SMA of the first 'period' data points
        const sum = data.slice(0, period).reduce((acc, curr) => acc + curr.close, 0);
        prevEma = sum / period;
        ema.push({ time: data[i].time, value: prevEma });
      } else if (i >= period) {
        const currentEma = data[i].close * k + prevEma * (1 - k);
        ema.push({ time: data[i].time, value: currentEma });
        prevEma = currentEma;
      }
    }
    return ema;
  };

  // Chart creation and data fetching (runs once on mount)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart with a dark theme
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.offsetWidth,
      height: 400,
      layout: {
        background: { color: "#1e1e1e" },
        textColor: "#d1d1d1",
      },
      grid: {
        vertLines: { color: "#333333" },
        horzLines: { color: "#333333" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#333333" },
      timeScale: { borderColor: "#333333" },
    });
    chartRef.current = chart;

    // Add the candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#00ff00",
      downColor: "#ff0000",
      borderVisible: false,
      wickUpColor: "#00ff00",
      wickDownColor: "#ff0000",
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Fetch candlestick data from the API
    fetch("/api/finance")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.quotes && Array.isArray(data.quotes)) {
          const formattedData = data.quotes
            .filter(
              (entry: { open: number; high: number; low: number; close: number; date: string }) =>
                typeof entry.open === "number" &&
                typeof entry.high === "number" &&
                typeof entry.low === "number" &&
                typeof entry.close === "number"
            )
            .map((entry: any) => ({
              time: new Date(entry.date).getTime() / 1000, // UNIX timestamp (seconds)
              open: entry.open,
              high: entry.high,
              low: entry.low,
              close: entry.close,
            }));
          setChartData(formattedData);
          candlestickSeries.setData(formattedData);
        } else {
          console.error("Unexpected data format:", data);
        }
      })
      .catch((err) => console.error("Error fetching data:", err));

    // Handle responsive resizing
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.offsetWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.remove();
    };
  }, []);

  // Effect to add or remove indicators when toggles change or when data is available
  useEffect(() => {
    if (!chartData.length || !chartRef.current) return;
    const chart = chartRef.current;

    // Toggle SMA indicator
    if (showSMA) {
      if (!smaSeriesRef.current) {
        const smaSeries = chart.addLineSeries({
          color: "#ffa500", // Orange for SMA
          lineWidth: 2,
        });
        smaSeriesRef.current = smaSeries;
      }
      const smaData = calculateSMA(chartData, 14);
      smaSeriesRef.current?.setData(smaData);
    } else {
      if (smaSeriesRef.current) {
        chart.removeSeries(smaSeriesRef.current);
        smaSeriesRef.current = null;
      }
    }

    // Toggle EMA indicator
    if (showEMA) {
      if (!emaSeriesRef.current) {
        const emaSeries = chart.addLineSeries({
          color: "#00aaff", // Blue for EMA
          lineWidth: 2,
        });
        emaSeriesRef.current = emaSeries;
      }
      const emaData = calculateEMA(chartData, 14);
      emaSeriesRef.current?.setData(emaData);
    } else {
      if (emaSeriesRef.current) {
        chart.removeSeries(emaSeriesRef.current);
        emaSeriesRef.current = null;
      }
    }
  }, [chartData, showSMA, showEMA]);

  return (
    <div>
      <h1 style={{ textAlign: "center", color: "#d1d1d1" }}>
        Chart with Toggleable Indicators
      </h1>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <button
          onClick={() => setShowSMA((prev) => !prev)}
          style={{ marginRight: "1rem" }}
        >
          {showSMA ? "SMA" : "SMA"}
        </button>
        <button onClick={() => setShowEMA((prev) => !prev)}>
          {showEMA ? "EMA" : "EMA"}
        </button>
        
      </div>
      <div ref={chartContainerRef} style={{ position: "relative" }} />
    </div>
  );
}

export default StatsChart;
