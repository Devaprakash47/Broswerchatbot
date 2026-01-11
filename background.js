// Background service worker for the semantic chatbot extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(error => {
    console.error('Error opening side panel:', error);
  });
});

// Listen for messages from content script and side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'getPageContent') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'extractContent' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error getting page content:', chrome.runtime.lastError.message);
              sendResponse(null);
            } else {
              sendResponse(response);
            }
          });
        } else {
          sendResponse(null);
        }
      });
      return true;
    }
    
    if (request.action === 'analyzeText') {
      handleAIRequest(request.text, request.context, request.pageContent)
        .then(sendResponse)
        .catch(error => {
          console.error('Error in AI request:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
    if (request.action === 'getSelectedText') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelection' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error getting selection:', chrome.runtime.lastError.message);
              sendResponse({ text: '' });
            } else {
              sendResponse(response);
            }
          });
        } else {
          sendResponse({ text: '' });
        }
      });
      return true;
    }
    
    if (request.action === 'performWebSearch') {
      handleWebSearch(request.query)
        .then(sendResponse)
        .catch(error => {
          console.error('Error performing web search:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
    if (request.action === 'getCurrentTabInfo') {
      getCurrentTabInfo()
        .then(sendResponse)
        .catch(error => {
          console.error('Error getting current tab info:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
  } catch (error) {
    console.error('Error in message handler:', error);
    sendResponse(null);
  }
  
  return true;
});

// Get information about the currently opened website
async function getCurrentTabInfo() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      return { success: false, error: 'No active tab found' };
    }

    const tab = tabs[0];
    
    // Wait a bit for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract content from current tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractWebContent
    });
    
    if (results && results[0] && results[0].result) {
      const content = results[0].result;
      
      // Get website category/type
      const websiteType = identifyWebsiteType(tab.url, content.title);
      
      return {
        success: true,
        url: tab.url,
        title: content.title,
        content: content.content,
        snippet: content.snippet,
        websiteType: websiteType,
        domain: new URL(tab.url).hostname
      };
    }
    
    return { success: false, error: 'Could not extract content' };
    
  } catch (error) {
    console.error('Error in getCurrentTabInfo:', error);
    return { success: false, error: error.message };
  }
}

// Identify what type of website it is
function identifyWebsiteType(url, title) {
  const domain = url.toLowerCase();
  
  if (domain.includes('cricinfo') || domain.includes('cricbuzz') || domain.includes('cricket')) {
    return 'Cricket Sports Website';
  } else if (domain.includes('espn')) {
    return 'Sports News Website';
  } else if (domain.includes('techcrunch') || domain.includes('theverge') || domain.includes('wired')) {
    return 'Technology News Website';
  } else if (domain.includes('wikipedia')) {
    return 'Online Encyclopedia';
  } else if (domain.includes('bbc') || domain.includes('cnn') || domain.includes('reuters')) {
    return 'News Media Website';
  } else if (domain.includes('weather')) {
    return 'Weather Information Website';
  } else if (domain.includes('youtube')) {
    return 'Video Streaming Platform';
  } else if (domain.includes('github')) {
    return 'Code Repository Platform';
  } else if (domain.includes('stackoverflow')) {
    return 'Developer Q&A Forum';
  } else if (domain.includes('.gov')) {
    return 'Government Website';
  } else if (domain.includes('.edu')) {
    return 'Educational Institution Website';
  } else if (domain.includes('amazon') || domain.includes('flipkart') || domain.includes('shop')) {
    return 'E-commerce Shopping Website';
  } else if (domain.includes('blog')) {
    return 'Blog Website';
  } else {
    return 'General Website';
  }
}

// Handle web search by opening relevant website in CURRENT TAB
async function handleWebSearch(query) {
  try {
    console.log('Performing web search for:', query);
    
    // Get the best matching URL for the query
    const targetUrl = getBestUrlForQuery(query);
    
    // IMPORTANT: Open in the CURRENT tab (the one with sidebar)
    // This ensures the chatbot stays connected to the opened website
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs[0]) {
      // Update CURRENT tab with new URL
      await chrome.tabs.update(tabs[0].id, { 
        url: targetUrl,
        active: true // Keep this tab active
      });
      
      console.log('Opened URL in current tab:', targetUrl);
    } else {
      // Fallback: create new tab if no active tab found
      await chrome.tabs.create({ 
        url: targetUrl, 
        active: true 
      });
    }
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Get information about the opened website
    const tabInfo = await getCurrentTabInfo();
    
    if (tabInfo.success) {
      return {
        success: true,
        url: tabInfo.url,
        domain: tabInfo.domain,
        title: tabInfo.title,
        websiteType: tabInfo.websiteType,
        content: tabInfo.content,
        snippet: tabInfo.snippet
      };
    } else {
      return {
        success: true,
        url: targetUrl,
        domain: new URL(targetUrl).hostname,
        title: 'Website Opened',
        websiteType: 'Website',
        message: 'Website opened successfully. Click "Analyze Page" to extract content.'
      };
    }
    
  } catch (error) {
    console.error('Error in handleWebSearch:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get the best URL based on query
function getBestUrlForQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  console.log('Finding URL for query:', query);
  
  // Remove common prefixes
  const cleanQuery = query.replace(/search for|find|look up|google|search|open|show me|tell me about/gi, '').trim();
  
  // 1. CRICKET - High specificity
  if (lowerQuery.includes('cricket') || lowerQuery.includes('ipl') || 
      (lowerQuery.includes('match') && lowerQuery.includes('india'))) {
    if (lowerQuery.includes('live') || lowerQuery.includes('score') || lowerQuery.includes('today')) {
      console.log('Opening cricket live scores');
      return 'https://www.espncricinfo.com/live-cricket-score';
    }
    console.log('Opening cricket homepage');
    return 'https://www.espncricinfo.com/';
  }
  
  // 2. AI & TECHNOLOGY
  if (lowerQuery.includes('ai ') || lowerQuery.includes('artificial intelligence')) {
    if (lowerQuery.includes('news') || lowerQuery.includes('latest')) {
      console.log('Opening AI news');
      return 'https://techcrunch.com/category/artificial-intelligence/';
    }
    console.log('Opening AI Wikipedia');
    return 'https://en.wikipedia.org/wiki/Artificial_intelligence';
  }
  
  if (lowerQuery.includes('technology') || lowerQuery.includes('tech news') || 
      lowerQuery.includes('tech updates')) {
    console.log('Opening technology news');
    return 'https://techcrunch.com/';
  }
  
  // 3. NEWS
  if (lowerQuery.includes('news')) {
    if (lowerQuery.includes('india')) {
      console.log('Opening India news');
      return 'https://www.bbc.com/news/world/asia/india';
    }
    if (lowerQuery.includes('world') || lowerQuery.includes('international')) {
      console.log('Opening world news');
      return 'https://www.bbc.com/news/world';
    }
    console.log('Opening general news');
    return 'https://www.bbc.com/news';
  }
  
  // 4. WEATHER
  if (lowerQuery.includes('weather') || lowerQuery.includes('temperature') || 
      lowerQuery.includes('forecast')) {
    const city = extractCity(lowerQuery);
    if (city) {
      console.log('Opening weather for city:', city);
      return `https://www.weather.com/weather/today/l/${city}`;
    }
    console.log('Opening weather homepage');
    return 'https://www.weather.com/';
  }
  
  // 5. STOCK & FINANCE
  if (lowerQuery.includes('stock') || lowerQuery.includes('share') || 
      lowerQuery.includes('market') || lowerQuery.includes('finance')) {
    console.log('Opening finance/stock site');
    return 'https://finance.yahoo.com/';
  }
  
  // 6. YOUTUBE & VIDEO
  if (lowerQuery.includes('video') || lowerQuery.includes('youtube') || 
      lowerQuery.includes('watch')) {
    const searchTerm = cleanQuery.replace(/video|youtube|watch/gi, '').trim();
    if (searchTerm) {
      console.log('Opening YouTube search for:', searchTerm);
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`;
    }
    console.log('Opening YouTube homepage');
    return 'https://www.youtube.com/';
  }
  
  // 7. SOCIAL MEDIA
  if (lowerQuery.includes('twitter') || lowerQuery.includes('tweet')) {
    console.log('Opening Twitter');
    return 'https://twitter.com/';
  }
  if (lowerQuery.includes('facebook')) {
    console.log('Opening Facebook');
    return 'https://www.facebook.com/';
  }
  if (lowerQuery.includes('instagram')) {
    console.log('Opening Instagram');
    return 'https://www.instagram.com/';
  }
  
  // 8. SHOPPING
  if (lowerQuery.includes('amazon') || (lowerQuery.includes('buy') && lowerQuery.includes('online'))) {
    console.log('Opening Amazon');
    return 'https://www.amazon.in/';
  }
  if (lowerQuery.includes('flipkart')) {
    console.log('Opening Flipkart');
    return 'https://www.flipkart.com/';
  }
  
  // 9. KNOWLEDGE QUERIES (Wikipedia)
  if (lowerQuery.includes('what is') || lowerQuery.includes('who is') || 
      lowerQuery.includes('define') || lowerQuery.includes('meaning of')) {
    const searchTerm = cleanQuery.replace(/what is|who is|define|meaning of/gi, '').trim();
    if (searchTerm) {
      console.log('Opening Wikipedia for:', searchTerm);
      return `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm.replace(/\s+/g, '_'))}`;
    }
  }
  
  // 10. LEARNING & EDUCATION
  if (lowerQuery.includes('how to') || lowerQuery.includes('tutorial') || 
      lowerQuery.includes('learn')) {
    const searchTerm = cleanQuery;
    if (searchTerm) {
      console.log('Opening YouTube tutorial for:', searchTerm);
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm + ' tutorial')}`;
    }
  }
  
  // 11. SPORTS (non-cricket)
  if (lowerQuery.includes('football') || lowerQuery.includes('soccer') || 
      lowerQuery.includes('premier league')) {
    console.log('Opening football/soccer site');
    return 'https://www.espn.com/soccer/';
  }
  
  // 12. ENTERTAINMENT
  if (lowerQuery.includes('movie') || lowerQuery.includes('film') || 
      lowerQuery.includes('imdb')) {
    const movieName = cleanQuery.replace(/movie|film|imdb/gi, '').trim();
    if (movieName) {
      console.log('Opening IMDB search for:', movieName);
      return `https://www.imdb.com/find?q=${encodeURIComponent(movieName)}`;
    }
    console.log('Opening IMDB homepage');
    return 'https://www.imdb.com/';
  }
  
  // 13. RECIPES & FOOD
  if (lowerQuery.includes('recipe') || lowerQuery.includes('cook') || 
      lowerQuery.includes('food')) {
    const dish = cleanQuery.replace(/recipe|cook|food|how to make/gi, '').trim();
    if (dish) {
      console.log('Opening recipe search for:', dish);
      return `https://www.allrecipes.com/search?q=${encodeURIComponent(dish)}`;
    }
    console.log('Opening recipes homepage');
    return 'https://www.allrecipes.com/';
  }
  
  // DEFAULT: Google Search for everything else
  console.log('Using Google search for:', cleanQuery || query);
  return `https://www.google.com/search?q=${encodeURIComponent(cleanQuery || query)}`;
}

// Extract city name from query
function extractCity(query) {
  const cities = {
    'mumbai': 'Mumbai,IN',
    'delhi': 'Delhi,IN',
    'bangalore': 'Bangalore,IN',
    'bengaluru': 'Bangalore,IN',
    'chennai': 'Chennai,IN',
    'kolkata': 'Kolkata,IN',
    'hyderabad': 'Hyderabad,IN',
    'pune': 'Pune,IN',
    'ahmedabad': 'Ahmedabad,IN',
    'new york': 'New+York,NY',
    'london': 'London,UK',
    'tokyo': 'Tokyo,JP',
    'paris': 'Paris,FR'
  };
  
  for (const [key, value] of Object.entries(cities)) {
    if (query.toLowerCase().includes(key)) {
      return value;
    }
  }
  return null;
}

// Function to be injected into web pages to extract content
function extractWebContent() {
  try {
    const title = document.title || 'Untitled';
    
    // Extract main content
    let mainContent = '';
    const selectors = ['article', 'main', '[role="main"]', '.content', '#content', '.post-content', '.article-body'];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText) {
        mainContent = element.innerText;
        break;
      }
    }
    
    if (!mainContent) {
      mainContent = document.body.innerText;
    }
    
    // Clean and limit content
    mainContent = mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .slice(0, 5000);
    
    // Create snippet (first 300 characters)
    const snippet = mainContent.slice(0, 300) + '...';
    
    return {
      title: title,
      snippet: snippet,
      content: mainContent
    };
    
  } catch (error) {
    console.error('Error extracting content:', error);
    return null;
  }
}

// AI processing function
async function handleAIRequest(text, context, pageContent) {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let response = '';
    
    if (pageContent) {
      const { title, mainContent, headings } = pageContent;
      
      switch (context) {
        case 'summarize':
          response = `Summary of "${title}":\n\n`;
          if (headings && headings.length > 0) {
            response += `Key sections: ${headings.slice(0, 3).map(h => h.text).join(', ')}\n\n`;
          }
          response += `${mainContent ? mainContent.slice(0, 250) : 'Content available'}...\n\n`;
          response += 'This provides an overview of the main topics discussed on this page.';
          break;
          
        case 'explain':
          response = `Explanation of "${title}":\n\n`;
          response += `${mainContent ? mainContent.slice(0, 200) : 'This page contains'}...\n\n`;
          response += 'The content discusses various aspects of the topic. What specific part would you like me to explain further?';
          break;
          
        case 'simplify':
          response = `In simple terms:\n\n`;
          response += `This page about "${title}" covers: ${mainContent ? mainContent.slice(0, 150) : 'various topics'}...\n\n`;
          response += 'Let me know if you need any part explained more simply!';
          break;
          
        default:
          response = `Regarding "${title}":\n\n`;
          response += `${mainContent ? mainContent.slice(0, 200) : 'This page discusses'}...\n\n`;
          response += 'Feel free to ask me specific questions about the content!';
      }
    } else {
      const responses = {
        'summarize': 'I can help summarize content, but I need to analyze the page first. Please click "Analyze Page" and try again.',
        'explain': 'I\'d be happy to explain the content. First, let me analyze the page. Click "Analyze Page" to get started.',
        'simplify': 'I can simplify complex content for you. Please use "Analyze Page" first so I can access the content.',
        'default': 'I\'m here to help you understand web content. Click "Analyze Page" to get started, then ask me anything!'
      };
      
      response = responses[context] || responses['default'];
    }
    
    return {
      success: true,
      response: response
    };
  } catch (error) {
    console.error('Error in handleAIRequest:', error);
    return {
      success: false,
      response: 'Sorry, I encountered an error processing your request. Please try again.'
    };
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Semantic Web Assistant installed/updated');
  
  if (details.reason === 'install') {
    chrome.storage.local.set({
      settings: {
        theme: 'light',
        fontSize: 'medium',
        autoAnalyze: false,
        voiceEnabled: true,
        autoSearch: true
      }
    });
    
    console.log('Extension installed successfully!');
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Semantic Web Assistant started');
});

self.addEventListener('error', (event) => {
  console.error('Uncaught error in service worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in service worker:', event.reason);
});

console.log('Semantic Web Assistant background script loaded');