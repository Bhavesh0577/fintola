"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, LineData, CandlestickData } from "lightweight-charts";

interface Quote {
  open: number;
  high: number;
  low: number;
  close: number;
  date: string;
}

interface Marker {
  time: UTCTimestamp;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "arrowUp" | "arrowDown";
  text: string;
}

interface StatsChartProps {
  data?: Quote[];
}

export function StatsChart({ data = [] }: StatsChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Local state to hold the formatted candlestick data and indicator toggles
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  // Helper function to calculate a Simple Moving Average (SMA)
  const calculateSMA = (data: CandlestickData[], period: number): LineData[] => {
    const sma: LineData[] = [];
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

  // Helper function to calculate an Exponential Moving Average (EMA)
  const calculateEMA = (data: CandlestickData[], period: number): LineData[] => {
    const ema: LineData[] = [];
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

  // Calculate Relative Strength Index (RSI)
  const calculateRSI = (data: CandlestickData[], period: number = 14): LineData[] => {
    const rsi: LineData[] = [];
    if (data.length <= period) return rsi;

    let gains = 0;
    let losses = 0;

    // Calculate first average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i-1].close;
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI for initial period
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsiValue = 100 - (100 / (1 + rs));
    rsi.push({ time: data[period].time, value: rsiValue });

    // Calculate RSI for remaining data
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i-1].close;
      let currentGain = 0;
      let currentLoss = 0;

      if (change >= 0) currentGain = change;
      else currentLoss = Math.abs(change);

      // Use Wilder's smoothing method
      avgGain = ((avgGain * (period - 1)) + currentGain) / period;
      avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsiValue = 100 - (100 / (1 + rs));
      rsi.push({ time: data[i].time, value: rsiValue });
    }

    return rsi;
  };

  // Calculate MACD (Moving Average Convergence Divergence)
  const calculateMACD = (data: CandlestickData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): {
    macdLine: LineData[];
    signalLine: LineData[];
    histogram: LineData[];
  } => {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    
    // Create MACD line (fast EMA - slow EMA)
    const macdLine: LineData[] = [];
    const validDataStartIndex = Math.max(fastPeriod, slowPeriod) - 1;
    
    for (let i = validDataStartIndex; i < data.length; i++) {
      const fastEmaIndex = i - (slowPeriod - fastPeriod);
      if (fastEmaIndex >= 0 && fastEMA[fastEmaIndex]) {
        const fastValue = fastEMA[fastEmaIndex].value;
        const slowValue = slowEMA[i - slowPeriod + 1].value;
        macdLine.push({
          time: data[i].time,
          value: fastValue - slowValue
        });
      }
    }
    
    // Calculate signal line (EMA of MACD line)
    const signalLine: LineData[] = [];
    let signalSum = 0;
    for (let i = 0; i < macdLine.length; i++) {
      if (i < signalPeriod - 1) {
        signalSum += macdLine[i].value;
        continue;
      }
      
      if (i === signalPeriod - 1) {
        signalSum += macdLine[i].value;
        const signalValue = signalSum / signalPeriod;
        signalLine.push({
          time: macdLine[i].time,
          value: signalValue
        });
        continue;
      }
      
      // EMA calculation for signal line
      const k = 2 / (signalPeriod + 1);
      const lastSignal = signalLine[signalLine.length - 1].value;
      const currentSignal = macdLine[i].value * k + lastSignal * (1 - k);
      signalLine.push({
        time: macdLine[i].time,
        value: currentSignal
      });
    }
    
    // Calculate histogram (MACD line - signal line)
    const histogram: LineData[] = [];
    for (let i = 0; i < signalLine.length; i++) {
      const idx = i + signalPeriod - 1;
      if (idx < macdLine.length) {
        histogram.push({
          time: signalLine[i].time,
          value: macdLine[idx].value - signalLine[i].value
        });
      }
    }
    
    return { macdLine, signalLine, histogram };
  };

  // Generate improved buy/sell signals based on multiple indicators
  const generateSignals = (data: CandlestickData[]): Marker[] => {
    if (data.length < 50) return []; // Need enough data for accurate signals
    
    const ema20 = calculateEMA(data, 20);
    const ema50 = calculateEMA(data, 50);
    const rsi = calculateRSI(data);
    const macd = calculateMACD(data);
    
    const markers: Marker[] = [];
    let lastSignalIndex = 0;
    const minSignalDistance = 5; // Minimum bars between signals to avoid noise
    
    // The actual signals generation loop
    for (let i = 50; i < data.length; i++) {
      if (i - lastSignalIndex < minSignalDistance) continue;
      
      // Find corresponding indicator values
      const currEma20 = ema20.find(e => e.time === data[i].time)?.value;
      const currEma50 = ema50.find(e => e.time === data[i].time)?.value;
      const prevEma20 = ema20.find(e => e.time === data[i-1].time)?.value;
      const prevEma50 = ema50.find(e => e.time === data[i-1].time)?.value;
      const currRsi = rsi.find(r => r.time === data[i].time)?.value;
      
      // Find MACD values
      const histIndex = macd.histogram.findIndex(h => h.time === data[i].time);
      const currHist = histIndex >= 0 ? macd.histogram[histIndex].value : null;
      const prevHist = histIndex > 0 ? macd.histogram[histIndex-1].value : null;
      
      // BUY SIGNAL (3 conditions must be met)
      if (
        // Condition 1: EMA20 crosses above EMA50 (golden cross)
        currEma20 && currEma50 && prevEma20 && prevEma50 &&
        prevEma20 <= prevEma50 && currEma20 > currEma50 &&
        
        // Condition 2: RSI is coming out of oversold territory
        currRsi && currRsi > 40 && currRsi < 60 &&
        
        // Condition 3: MACD histogram turns positive or showing momentum
        currHist && prevHist && 
        (currHist > 0 && prevHist < 0 || (currHist > 0 && currHist > prevHist * 1.2))
      ) {
        markers.push({
          time: data[i].time as UTCTimestamp,
          position: "belowBar",
          color: "#22c55e", // Green
          shape: "arrowUp",
          text: "BUY"
        });
        lastSignalIndex = i;
      }
      
      // SELL SIGNAL (3 conditions must be met)
      else if (
        // Condition 1: EMA20 crosses below EMA50 (death cross)
        currEma20 && currEma50 && prevEma20 && prevEma50 &&
        prevEma20 >= prevEma50 && currEma20 < currEma50 &&
        
        // Condition 2: RSI is overbought or dropping from high levels
        currRsi && currRsi < 60 && currRsi > 40 &&
        
        // Condition 3: MACD histogram turns negative or showing downward momentum
        currHist && prevHist &&
        (currHist < 0 && prevHist > 0 || (currHist < 0 && currHist < prevHist * 1.2))
      ) {
        markers.push({
          time: data[i].time as UTCTimestamp,
          position: "aboveBar",
          color: "#ef4444", // Red
          shape: "arrowDown",
          text: "SELL"
        });
        lastSignalIndex = i;
      }
    }
    
    return markers;
  };

  useEffect(() => {
    // Process incoming data prop if provided
    if (data && data.length > 0) {
      const formattedData: CandlestickData[] = data
        .filter(
          (entry: Quote) =>
            typeof entry.open === "number" &&
            typeof entry.high === "number" &&
            typeof entry.low === "number" &&
            typeof entry.close === "number"
        )
        .map((entry: Quote) => ({
          time: new Date(entry.date).getTime() / 1000 as UTCTimestamp, // UNIX timestamp (seconds)
          open: entry.open,
          high: entry.high,
          low: entry.low,
          close: entry.close,
        }));
        
      if (formattedData.length > 0 && candlestickSeriesRef.current) {
        setChartData(formattedData);
        candlestickSeriesRef.current.setData(formattedData);
        
        // Generate and set improved buy/sell signals
        const signals = generateSignals(formattedData);
        candlestickSeriesRef.current.setMarkers(signals);
      }
    }
  }, [data]);

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
      upColor: "#22c55e", // Green
      downColor: "#ef4444", // Red
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candlestickSeriesRef.current = candlestickSeries;

    // If no data is passed in props, fetch from API
    if (!data || data.length === 0) {
      fetch("/api/finance")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.quotes && Array.isArray(data.quotes)) {
            const formattedData: CandlestickData[] = data.quotes
              .filter(
                (entry: Quote) =>
                  typeof entry.open === "number" &&
                  typeof entry.high === "number" &&
                  typeof entry.low === "number" &&
                  typeof entry.close === "number"
              )
              .map((entry: Quote) => ({
                time: new Date(entry.date).getTime() / 1000 as UTCTimestamp,
                open: entry.open,
                high: entry.high,
                low: entry.low,
                close: entry.close,
              }));
            setChartData(formattedData);
            candlestickSeries.setData(formattedData);
            
            // Generate and set improved buy/sell signals
            const signals = generateSignals(formattedData);
            candlestickSeries.setMarkers(signals);
          } else {
            console.error("Unexpected data format:", data);
          }
        })
        .catch((err) => console.error("Error fetching data:", err));
    }

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
      chart?.remove();
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
    
    // Toggle RSI indicator
    if (showRSI) {
      if (!rsiSeriesRef.current) {
        const rsiSeries = chart.addLineSeries({
          color: "#9333ea", // Purple for RSI
          lineWidth: 2,
          priceScaleId: "right",
          pane: 1,
        });
        rsiSeriesRef.current = rsiSeries;
      }
      const rsiData = calculateRSI(chartData);
      rsiSeriesRef.current?.setData(rsiData);
    } else {
      if (rsiSeriesRef.current) {
        chart.removeSeries(rsiSeriesRef.current);
        rsiSeriesRef.current = null;
      }
    }
    
    // Toggle MACD indicator
    if (showMACD) {
      const { macdLine, signalLine, histogram } = calculateMACD(chartData);
      
      if (!macdLineRef.current) {
        const macdLineSeries = chart.addLineSeries({
          color: "#0284c7", // Blue for MACD line
          lineWidth: 2,
        });
        macdLineRef.current = macdLineSeries;
      }
      
      if (!macdSignalRef.current) {
        const macdSignalSeries = chart.addLineSeries({
          color: "#ea580c", // Orange for signal line
          lineWidth: 2,
        });
        macdSignalRef.current = macdSignalSeries;
      }
      
      if (!macdHistRef.current) {
        const macdHistSeries = chart.addHistogramSeries({
          color: "#84cc16", // Green for histogram
          priceFormat: {
            type: "price",
            precision: 2,
          },
        });
        macdHistRef.current = macdHistSeries;
      }
      
      macdLineRef.current?.setData(macdLine);
      macdSignalRef.current?.setData(signalLine);
      macdHistRef.current?.setData(histogram);
    } else {
      if (macdLineRef.current) {
        chart.removeSeries(macdLineRef.current);
        macdLineRef.current = null;
      }
      if (macdSignalRef.current) {
        chart.removeSeries(macdSignalRef.current);
        macdSignalRef.current = null;
      }
      if (macdHistRef.current) {
        chart.removeSeries(macdHistRef.current);
        macdHistRef.current = null;
      }
    }
  }, [chartData, showSMA, showEMA, showRSI, showMACD]);

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded mr-2"
          onClick={() => setShowSMA((prev) => !prev)}
        >
          {showSMA ? "Hide SMA" : "Show SMA"}
        </button>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded mr-2"
          onClick={() => setShowEMA((prev) => !prev)}
        >
          {showEMA ? "Hide EMA" : "Show EMA"}
        </button>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded mr-2"
          onClick={() => setShowRSI((prev) => !prev)}
        >
          {showRSI ? "Hide RSI" : "Show RSI"}
        </button>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded"
          onClick={() => setShowMACD((prev) => !prev)}
        >
          {showMACD ? "Hide MACD" : "Show MACD"}
        </button>
      </div>
      <div ref={chartContainerRef} style={{ position: "relative" }} />
    </div>
  );
}

export default StatsChart;