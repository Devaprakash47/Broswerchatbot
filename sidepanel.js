// Side panel JavaScript for the semantic chatbot

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const pageInfo = document.getElementById('pageInfo');
const readingTime = document.getElementById('readingTime');
const headingsCount = document.getElementById('headingsCount');

// State
let currentPageContent = null;
let conversationHistory = [];
let isContentScriptReady = false;
let recognition = null;
let isListening = false;
let speechSynthesis = window.speechSynthesis;

// Initialize
init();

function init() {
  // Load settings
  loadSettings();
  
  // Initialize voice recognition
  initVoiceRecognition();
  
  // Show voice prompt to user on startup
  setTimeout(() => {
    const welcomeMsg = '🎤 Voice assistant is ready! Click the microphone button or type your question.';
    addMessage(welcomeMsg, 'bot');
  }, 1000);
  
  // Event listeners
  sendBtn.addEventListener('click', handleSendMessage);
  voiceBtn.addEventListener('click', toggleVoiceInput);
  
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  // Auto-resize textarea
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });
  
  // Quick action buttons
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });
  
  // Settings
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
  });
  
  closeSettings.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });
  
  document.getElementById('themeSelect').addEventListener('change', (e) => {
    setTheme(e.target.value);
  });
  
  document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
    setFontSize(e.target.value);
  });
  
  document.getElementById('autoAnalyze').addEventListener('change', (e) => {
    saveSettings({ autoAnalyze: e.target.checked });
  });
  
  document.getElementById('voiceEnabled').addEventListener('change', (e) => {
    saveSettings({ voiceEnabled: e.target.checked });
  });
  
  document.getElementById('autoSearch').addEventListener('change', (e) => {
    saveSettings({ autoSearch: e.target.checked });
  });
  
  // Wait a bit before trying to connect to content script
  setTimeout(() => {
    checkContentScriptReady();
  }, 500);
}

// Initialize voice recognition
function initVoiceRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('Voice recognition started');
      isListening = true;
      voiceBtn.classList.add('listening');
      
      // Show visual feedback
      const listeningMsg = document.createElement('div');
      listeningMsg.id = 'listeningIndicator';
      listeningMsg.className = 'message bot-message';
      listeningMsg.innerHTML = '<div class="message-content">🎤 <strong>Listening...</strong> (Speak now)</div>';
      chatMessages.appendChild(listeningMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    
    recognition.onresult = (event) => {
      console.log('Voice recognition result received');
      const transcript = event.results[0][0].transcript;
      console.log('Transcript:', transcript);
      
      // Remove listening indicator
      const indicator = document.getElementById('listeningIndicator');
      if (indicator) indicator.remove();
      
      // Set the input value
      userInput.value = transcript;
      
      // Show what user said
      addMessage(`You said: "${transcript}"`, 'user');
      
      // Process the message
      setTimeout(() => {
        handleSendMessage();
      }, 500);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isListening = false;
      voiceBtn.classList.remove('listening');
      
      // Remove listening indicator
      const indicator = document.getElementById('listeningIndicator');
      if (indicator) indicator.remove();
      
      if (event.error === 'no-speech') {
        addMessage('No speech detected. Please try again and speak clearly.', 'bot');
      } else if (event.error === 'not-allowed') {
        addMessage('⚠️ Microphone access denied. Please allow microphone permission in browser settings.', 'bot');
      } else {
        addMessage(`Voice error: ${event.error}. Please try again.`, 'bot');
      }
    };
    
    recognition.onend = () => {
      console.log('Voice recognition ended');
      isListening = false;
      voiceBtn.classList.remove('listening');
      
      // Remove listening indicator if still there
      const indicator = document.getElementById('listeningIndicator');
      if (indicator) indicator.remove();
    };
    
    console.log('Voice recognition initialized successfully');
  } else {
    console.warn('Speech recognition not supported in this browser');
    voiceBtn.style.opacity = '0.5';
    voiceBtn.style.cursor = 'not-allowed';
    voiceBtn.title = 'Voice not supported in this browser';
  }
}

// Toggle voice input
function toggleVoiceInput() {
  console.log('Microphone button clicked');
  
  // Check if recognition is available
  if (!recognition) {
    const errorMsg = '⚠️ Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.';
    addMessage(errorMsg, 'bot');
    alert(errorMsg);
    return;
  }
  
  if (isListening) {
    console.log('Stopping voice recognition');
    recognition.stop();
  } else {
    console.log('Starting voice recognition');
    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      addMessage('Error starting voice recognition. Please try again.', 'bot');
    }
  }
}

// Text-to-speech for responses
function speakText(text) {
  // Voice is always enabled by default
  if (!speechSynthesis) return;
  
  // Cancel any ongoing speech
  speechSynthesis.cancel();
  
  // Clean text for speech
  const cleanText = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\n/g, '. ')
    .replace(/📄|📝|🎤|💡|🔍|✓|🌐|⏳|✅|📊|🔗|📋|💬/g, '');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  
  speechSynthesis.speak(utterance);
}

// Check if content script is ready
async function checkContentScriptReady() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          isContentScriptReady = false;
        } else {
          isContentScriptReady = true;
          chrome.storage.local.get('settings', (result) => {
            if (result.settings?.autoAnalyze) {
              loadPageContent();
            }
          });
        }
      });
    }
  } catch (error) {
    console.log('Error checking content script:', error);
  }
}

// Ensure content script is injected
async function ensureContentScript() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      throw new Error('No active tab found');
    }

    const tabId = tabs[0].id;
    
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }).then(() => {
            setTimeout(() => {
              isContentScriptReady = true;
              resolve(true);
            }, 200);
          }).catch(error => {
            console.error('Failed to inject content script:', error);
            resolve(false);
          });
        } else {
          isContentScriptReady = true;
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error ensuring content script:', error);
    return false;
  }
}

// Handle sending messages
async function handleSendMessage() {
  const message = userInput.value.trim();
  if (!message) return;
  
  // Add user message
  addMessage(message, 'user');
  userInput.value = '';
  userInput.style.height = 'auto';
  
  // Show loading
  loadingIndicator.classList.remove('hidden');
  
  // Process message
  try {
    const response = await processUserMessage(message);
    addMessage(response, 'bot');
  } catch (error) {
    addMessage('Sorry, I encountered an error processing your request. Please try again.', 'bot');
  }
  
  // Hide loading
  loadingIndicator.classList.add('hidden');
}

// Handle quick actions
async function handleQuickAction(action) {
  loadingIndicator.classList.remove('hidden');
  
  await ensureContentScript();
  
  try {
    switch (action) {
      case 'analyze':
        await loadPageContent();
        if (currentPageContent) {
          const analysis = analyzePageContent();
          addMessage(analysis, 'bot');
          speakText('Page analysis complete');
          pageInfo.classList.remove('hidden');
        } else {
          addMessage('Unable to analyze this page. The page might not allow content extraction.', 'bot');
        }
        break;
        
      case 'summarize':
        await loadPageContent();
        if (currentPageContent) {
          const summary = await summarizeContent();
          addMessage(summary, 'bot');
          speakText(summary);
        } else {
          addMessage('Unable to load page content for summarization.', 'bot');
        }
        break;
        
      case 'explain':
        await loadPageContent();
        if (currentPageContent) {
          const msg = 'What would you like me to explain about this page? You can ask about specific sections or concepts.';
          addMessage(msg, 'bot');
          speakText(msg);
        } else {
          addMessage('Unable to load page content. Please try refreshing the page.', 'bot');
        }
        break;
        
      case 'selection':
        const selectedText = await getSelectedText();
        if (selectedText && selectedText.length > 0) {
          addMessage(`You selected: "${selectedText.slice(0, 100)}${selectedText.length > 100 ? '...' : ''}"`, 'user');
          const explanation = await explainText(selectedText);
          addMessage(explanation, 'bot');
          speakText(explanation);
        } else {
          const msg = 'No text is currently selected. Please select some text on the page and try again.';
          addMessage(msg, 'bot');
          speakText(msg);
        }
        break;
        
      case 'search':
        const searchMsg = 'What would you like me to search for? For example: "today India cricket match result" or "latest AI news"';
        addMessage(searchMsg, 'bot');
        speakText(searchMsg);
        break;
    }
  } catch (error) {
    console.error('Quick action error:', error);
    addMessage('Sorry, I encountered an error. Please make sure the page is fully loaded and try again.', 'bot');
  }
  
  loadingIndicator.classList.add('hidden');
}

// Load page content
async function loadPageContent() {
  try {
    await ensureContentScript();
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      console.error('No active tab found');
      return null;
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extractContent' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading page content:', chrome.runtime.lastError.message);
          currentPageContent = null;
          resolve(null);
        } else if (response) {
          currentPageContent = response;
          
          if (response.readingTime) {
            readingTime.textContent = `${response.readingTime} min`;
          }
          if (response.headings) {
            headingsCount.textContent = response.headings.length;
          }
          resolve(response);
        } else {
          currentPageContent = null;
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error in loadPageContent:', error);
    return null;
  }
}

// Get selected text from page
async function getSelectedText() {
  try {
    await ensureContentScript();
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) return '';

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelection' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting selection:', chrome.runtime.lastError.message);
          resolve('');
        } else {
          resolve(response?.text || '');
        }
      });
    });
  } catch (error) {
    console.error('Error in getSelectedText:', error);
    return '';
  }
}

// Process user message with AI
async function processUserMessage(message) {
  conversationHistory.push({ role: 'user', content: message });
  
  // Check if this is a web search query
  const isSearchQuery = detectSearchQuery(message);
  
  if (isSearchQuery) {
    chrome.storage.local.get('settings', async (result) => {
      const autoSearch = result.settings?.autoSearch !== false;
      
      if (autoSearch) {
        await performWebSearch(message);
      }
    });
    return 'Searching and fetching information...';
  }
  
  // Get page content if not already loaded
  if (!currentPageContent) {
    await loadPageContent();
  }
  
  // Build context
  const context = buildContext(message);
  let response = '';
  
  if (currentPageContent) {
    const { title, mainContent, headings } = currentPageContent;
    
    if (context === 'summarize') {
      response = `Based on "${title}", here's a summary:\n\n`;
      if (headings.length > 0) {
        response += `The page covers: ${headings.slice(0, 3).map(h => h.text).join(', ')}\n\n`;
      }
      response += `${mainContent.slice(0, 200)}...\n\nWould you like me to elaborate on any specific section?`;
    } else if (context === 'explain') {
      response = `I'll help explain this content from "${title}".\n\n`;
      response += `This page discusses: ${mainContent.slice(0, 150)}...\n\n`;
      response += `What specific part would you like me to explain in more detail?`;
    } else {
      response = `Regarding "${title}":\n\n`;
      response += `${mainContent.slice(0, 250)}...\n\n`;
      response += `Is there a specific aspect you'd like to know more about?`;
    }
  } else {
    response = `I understand you're asking: "${message}"\n\n`;
    response += `I'd love to help! Click "Analyze Page" to analyze the current page content, or ask me to search for information.`;
  }
  
  conversationHistory.push({ role: 'assistant', content: response });
  speakText(response);
  return response;
}

// Detect if message is a search query
function detectSearchQuery(message) {
  const lowerMessage = message.toLowerCase();
  
  // Direct search keywords - HIGH PRIORITY
  const directSearchKeywords = [
    'search for', 'find', 'look up', 'google', 'search',
    'open', 'go to', 'show me', 'take me to'
  ];
  
  if (directSearchKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }
  
  // Content type queries - MEDIUM PRIORITY
  const contentKeywords = [
    'cricket', 'match', 'ipl', 'score',
    'news', 'latest', 'today', 'current',
    'weather', 'temperature', 'forecast',
    'stock', 'price', 'share',
    'video', 'youtube', 'watch',
    'ai', 'artificial intelligence', 'technology', 'tech'
  ];
  
  if (contentKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }
  
  // Question queries - LOW PRIORITY
  const questionKeywords = [
    'what is', 'who is', 'when is', 'where is', 'how to',
    'why is', 'which is', 'tell me about', 'explain'
  ];
  
  if (questionKeywords.some(keyword => lowerMessage.includes(keyword))) {
    // Only treat as search if it's asking about something external
    // Not about current page
    if (!lowerMessage.includes('this page') && 
        !lowerMessage.includes('this article') &&
        !lowerMessage.includes('here') &&
        !lowerMessage.includes('above')) {
      return true;
    }
  }
  
  // If message is longer than 3 words and doesn't seem like a page analysis request
  const words = message.trim().split(/\s+/);
  if (words.length >= 3) {
    const pageAnalysisKeywords = ['analyze', 'summarize', 'summary', 'explain this'];
    const isPageAnalysis = pageAnalysisKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (!isPageAnalysis) {
      // Likely a search query
      return true;
    }
  }
  
  return false;
}

// Perform web search by opening relevant website
async function performWebSearch(query) {
  try {
    const searchQuery = query
      .replace(/search for|find|look up|google|search/gi, '')
      .trim();
    
    addMessage(`🎤 Voice Command Received: "${searchQuery}"`, 'user');
    addMessage(`🔍 Searching and opening relevant website...`, 'bot');
    speakText('Opening the website for you');
    
    // Send to background script to open website and get info
    chrome.runtime.sendMessage({
      action: 'performWebSearch',
      query: searchQuery
    }, (response) => {
      if (response && response.success) {
        displayWebsiteInfo(response, searchQuery);
      } else {
        const errorMsg = 'Sorry, I encountered an error while opening the website. Please try again or check your internet connection.';
        addMessage(errorMsg, 'bot');
        speakText(errorMsg);
      }
    });
    
  } catch (error) {
    console.error('Search error:', error);
    const errorMsg = 'Sorry, I encountered an error performing the search.';
    addMessage(errorMsg, 'bot');
    speakText(errorMsg);
  }
}

// Display information about the opened website
function displayWebsiteInfo(info, query) {
  let response = `✅ **Website Opened Successfully!**\n\n`;
  
  response += `🌐 **Website:** ${info.domain}\n`;
  response += `📄 **Page Title:** ${info.title}\n`;
  response += `🔗 **URL:** ${info.url}\n`;
  response += `📋 **Website Type:** ${info.websiteType}\n\n`;
  
  response += `**What is this website?**\n`;
  response += `${getWebsiteDescription(info.websiteType, info.domain)}\n\n`;
  
  if (info.content) {
    response += `**Current Page Content:**\n`;
    response += `${info.snippet}\n\n`;
    
    response += `**Detailed Summary:**\n`;
    response += `${info.content.slice(0, 400)}...\n\n`;
  }
  
  response += `🎤 **Voice Commands You Can Try:**\n`;
  response += `• "Summarize this page"\n`;
  response += `• "Explain the main points"\n`;
  response += `• "Analyze this content"\n`;
  response += `• "What are the key findings"\n\n`;
  
  response += `💡 **Or you can:**\n`;
  response += `• Browse the website yourself\n`;
  response += `• Click "Analyze Page" button\n`;
  response += `• Ask me any questions\n`;
  response += `• Select text and ask me about it`;
  
  addMessage(response, 'bot');
  
  // Speak a concise summary
  const speechText = `I opened ${info.domain}, which is ${info.websiteType.toLowerCase()}. ${info.snippet ? info.snippet.slice(0, 150) : 'The website has loaded successfully.'}`;
  speakText(speechText);
}

// Get description of website type
function getWebsiteDescription(websiteType, domain) {
  const descriptions = {
    'Cricket Sports Website': `${domain} is a dedicated cricket sports website that provides live scores, match updates, player statistics, and cricket news from around the world.`,
    'Sports News Website': `${domain} is a sports news platform covering various sports including cricket, football, basketball, and more with live scores and analysis.`,
    'Technology News Website': `${domain} is a technology news website that covers the latest in tech, startups, gadgets, AI, and digital innovation.`,
    'Online Encyclopedia': `${domain} is an online encyclopedia with crowd-sourced content covering millions of topics in multiple languages.`,
    'News Media Website': `${domain} is a news media organization providing breaking news, analysis, and journalism from around the world.`,
    'Weather Information Website': `${domain} provides weather forecasts, current conditions, and meteorological information for locations worldwide.`,
    'Video Streaming Platform': `${domain} is a video streaming platform where users can watch, upload, and share videos on various topics.`,
    'Code Repository Platform': `${domain} is a platform for version control and collaboration, hosting millions of code repositories.`,
    'Developer Q&A Forum': `${domain} is a question and answer community for programmers and developers.`,
    'Government Website': `${domain} is an official government website providing public information and services.`,
    'Educational Institution Website': `${domain} is an educational institution's website with information about courses, research, and academics.`,
    'E-commerce Shopping Website': `${domain} is an online shopping platform where you can buy various products.`,
    'Blog Website': `${domain} is a blog website with articles, posts, and content on various topics.`,
    'General Website': `${domain} is a website that may contain various types of content and information.`
  };
  
  return descriptions[websiteType] || descriptions['General Website'];
}

// Build context from message
function buildContext(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('summarize') || lower.includes('summary')) return 'summarize';
  if (lower.includes('explain') || lower.includes('what is') || lower.includes('what does')) return 'explain';
  if (lower.includes('simplify') || lower.includes('simple') || lower.includes('eli5')) return 'simplify';
  
  return 'default';
}

// Analyze page content
function analyzePageContent() {
  if (!currentPageContent) {
    return 'Unable to load page content. Please try again.';
  }
  
  const { title, headings, readingTime, mainContent, url } = currentPageContent;
  
  let analysis = `📄 **Page Analysis**\n\n`;
  analysis += `**Title:** ${title}\n\n`;
  analysis += `**URL:** ${url.length > 50 ? url.slice(0, 50) + '...' : url}\n\n`;
  analysis += `**Reading Time:** ${readingTime} minute${readingTime !== 1 ? 's' : ''}\n\n`;
  analysis += `**Structure:** This page has ${headings.length} main sections.\n\n`;
  
  if (headings.length > 0) {
    analysis += `**Main Topics:**\n`;
    headings.slice(0, 5).forEach(h => {
      analysis += `• ${h.text}\n`;
    });
    analysis += '\n';
  }
  
  const wordCount = mainContent.split(/\s+/).length;
  analysis += `**Content:** Approximately ${wordCount} words of content.\n\n`;
  analysis += `Feel free to ask me questions about this page!`;
  
  return analysis;
}

// Summarize content
async function summarizeContent() {
  if (!currentPageContent) {
    return 'Unable to load page content. Please try again.';
  }
  
  const { title, mainContent, headings } = currentPageContent;
  
  let summary = `📝 **Summary of "${title}"**\n\n`;
  
  if (headings.length > 0) {
    summary += 'This page covers the following topics:\n\n';
    headings.slice(0, 5).forEach((h, i) => {
      summary += `${i + 1}. ${h.text}\n`;
    });
    summary += '\n';
  }
  
  summary += `**Overview:** ${mainContent.slice(0, 300)}...`;
  summary += `\n\nWould you like me to explain any specific section in more detail?`;
  
  return summary;
}

// Explain selected text
async function explainText(text) {
  return `I can help explain this text:\n\n"${text.slice(0, 150)}${text.length > 150 ? '...' : ''}"\n\nThis appears to be discussing ${currentPageContent ? 'content from the page about ' + currentPageContent.title : 'specific content'}. What would you like to know about it?`;
}

// Add message to chat
function addMessage(content, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  contentDiv.innerHTML = formatMessage(content);
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format message with basic markdown
function formatMessage(text) {
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/\n/g, '<br>');
  text = text.replace(/^• (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  return text;
}

// Settings management
function loadSettings() {
  chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || {
      theme: 'light',
      fontSize: 'medium',
      autoAnalyze: false,
      voiceEnabled: true, // Always true by default
      autoSearch: true
    };
    
    // Force voice to be enabled
    settings.voiceEnabled = true;
    
    setTheme(settings.theme);
    setFontSize(settings.fontSize);
    
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('fontSizeSelect').value = settings.fontSize;
    document.getElementById('autoAnalyze').checked = settings.autoAnalyze;
    document.getElementById('voiceEnabled').checked = true; // Always checked
    document.getElementById('voiceEnabled').disabled = false; // User can still toggle if needed
    document.getElementById('autoSearch').checked = settings.autoSearch !== false;
  });
}

function saveSettings(updates) {
  chrome.storage.local.get('settings', (result) => {
    const settings = { ...result.settings, ...updates };
    chrome.storage.local.set({ settings });
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  saveSettings({ theme });
}

function setFontSize(size) {
  document.body.className = document.body.className.replace(/font-\w+/g, '');
  document.body.classList.add(`font-${size}`);
  saveSettings({ fontSize: size });
}

console.log('Semantic Web Assistant side panel loaded');