interface MarketData {
  market_facts: {
    question: string;
    close_time?: string | number;
    volume?: number;
  };
}

export function selectOptimalHistoryInterval(marketData: MarketData): string {
  const now = Date.now();
  const closeTime = marketData.market_facts.close_time;
  const volume = marketData.market_facts.volume || 0;
  
  // Calculate time until market closes
  let timeUntilClose: number;
  if (typeof closeTime === 'number') {
    timeUntilClose = closeTime - now;
  } else if (typeof closeTime === 'string') {
    timeUntilClose = new Date(closeTime).getTime() - now;
  } else {
    timeUntilClose = 30 * 24 * 60 * 60 * 1000; // Default 30 days
  }
  
  const daysUntilClose = timeUntilClose / (24 * 60 * 60 * 1000);
  
  // Decision logic for optimal interval
  if (daysUntilClose <= 7) {
    // Short-term markets: need high resolution
    if (volume > 100000) {
      return '1h'; // High volume, short-term: hourly data
    } else {
      return '4h'; // Lower volume, short-term: 4-hour data
    }
  } else if (daysUntilClose <= 30) {
    // Medium-term markets
    if (volume > 500000) {
      return '4h'; // High volume medium-term: 4-hour data
    } else {
      return '1d'; // Standard daily data
    }
  } else {
    // Long-term markets: daily or weekly data sufficient
    if (daysUntilClose > 365) {
      return '1w'; // Very long-term: weekly data
    } else {
      return '1d'; // Standard daily data
    }
  }
}

export function explainIntervalChoice(interval: string, marketData: MarketData): string {
  const volume = marketData.market_facts.volume || 0;
  const closeTime = marketData.market_facts.close_time;
  
  let timeUntilClose: number;
  if (typeof closeTime === 'number') {
    timeUntilClose = closeTime - Date.now();
  } else if (typeof closeTime === 'string') {
    timeUntilClose = new Date(closeTime).getTime() - Date.now();
  } else {
    timeUntilClose = 30 * 24 * 60 * 60 * 1000;
  }
  
  const daysUntilClose = Math.round(timeUntilClose / (24 * 60 * 60 * 1000));
  
  switch (interval) {
    case '1h':
      return `Using hourly data due to high volume ($${volume.toLocaleString()}) and short timeframe (${daysUntilClose} days)`;
    case '4h':
      return `Using 4-hour intervals for medium-term analysis (${daysUntilClose} days until close)`;
    case '1d':
      return `Using daily data for standard analysis (${daysUntilClose} days timeframe)`;
    case '1w':
      return `Using weekly data for long-term trend analysis (${daysUntilClose} days timeframe)`;
    default:
      return `Using ${interval} intervals based on market characteristics`;
  }
}
