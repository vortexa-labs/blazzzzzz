import { TokenFormData } from '../types/token';

interface ScrapedData {
  name?: string;
  ticker?: string;
  description?: string;
  image?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export const detectPageType = (url: string): 'twitter' | 'blog' | 'website' | null => {
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  // Add more providers here as we implement them
  return null;
};

export const scrapeTwitterData = async (): Promise<ScrapedData> => {
  return new Promise((resolve) => {
    // Listen for messages from the content script
    const messageHandler = (message: any) => {
      if (message.type === 'TWEET_SELECTED') {
        chrome.runtime.onMessage.removeListener(messageHandler);
        resolve(message.data);
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    // If no message is received within 5 seconds, resolve with empty data
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(messageHandler);
      resolve({});
    }, 5000);
  });
};

export const scrapePageData = async (): Promise<ScrapedData> => {
  const url = window.location.href;
  const pageType = detectPageType(url);

  switch (pageType) {
    case 'twitter':
      return await scrapeTwitterData();
    // Add more cases as we implement other providers
    default:
      return {};
  }
};

export const mapScrapedDataToForm = (scrapedData: ScrapedData): TokenFormData => {
  return {
    name: scrapedData.name || '',
    ticker: scrapedData.ticker || '',
    description: scrapedData.description || '',
    image: scrapedData.image || '',
    website: scrapedData.website || '',
    twitter: scrapedData.twitter || '',
    telegram: scrapedData.telegram || '',
  };
}; 