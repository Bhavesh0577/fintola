// filepath: /c:/Users/bhave/fintola/src/pages/api/finance.js
const yahooFinance = require('yahoo-finance2').default;

export default async function handler(req, res) {
  try {
    // Get current time
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

    // Convert to UNIX timestamps in seconds
    const period1 = Math.floor(oneYearAgo / 1000); // Start date
    const period2 = Math.floor(now / 1000); // Current date

    // Fetch live chart data
    const chartData = await yahooFinance.chart('TATASTEEL.NS', { period1, period2, interval: '1h' });

    res.status(200).json(chartData);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
