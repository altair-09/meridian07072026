import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";
import { BollingerBands, RSI } from "technicalindicators";

export default function CandlestickChart({ candles, indicators }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "transparent" }, textColor: "#a8a8a8" },
      grid: { vertLines: { color: "#222222" }, horzLines: { color: "#222222" } },
      width: containerRef.current.clientWidth,
      height: 320,
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#33d17a",
      downColor: "#ff4d4d",
      borderVisible: false,
      wickUpColor: "#33d17a",
      wickDownColor: "#ff4d4d",
    });
    candleSeries.setData(candles);

    if (indicators.bollinger) {
      const closes = candles.map((c) => c.close);
      const bb = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
      const offset = candles.length - bb.length;
      const upper = chart.addSeries(LineSeries, { color: "#1a26ff", lineWidth: 1 });
      const lower = chart.addSeries(LineSeries, { color: "#1a26ff", lineWidth: 1 });
      upper.setData(bb.map((v, i) => ({ time: candles[i + offset].time, value: v.upper })));
      lower.setData(bb.map((v, i) => ({ time: candles[i + offset].time, value: v.lower })));
    }

    chart.timeScale().fitContent();

    const handleResize = () => chart.applyOptions({ width: containerRef.current.clientWidth });
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, indicators.bollinger]);

  return <div ref={containerRef} style={{ width: "100%" }} />;
}

export function computeRsi(candles) {
  const closes = candles.map((c) => c.close);
  const rsi = RSI.calculate({ period: 14, values: closes });
  return rsi[rsi.length - 1]?.toFixed(1) ?? "—";
}
