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

// Check if content script is ready
async function checkContentScriptReady() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not ready, inject it
          console.log('Content script not ready, will retry on user action');
          isContentScriptReady = false;
        } else {
          isContentScriptReady = true;
          // Load page content if auto-analyze is enabled
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
    
    // Try to ping the content script
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, inject it
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }).then(() => {
            // Wait a bit for script to initialize
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
  
  // Get page content if not already loaded
  if (!currentPageContent) {
    await loadPageContent();
  }
  
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
  
  // Ensure content script is ready
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
        const searchMsg = 'What would you like to search for? For example: "today India cricket match result" or "latest AI news"';
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
    // Ensure content script is ready
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
          
          // Update page info
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
  // Add to conversation history
  conversationHistory.push({ role: 'user', content: message });
  
  // Check if this is a web search query
  const isSearchQuery = detectSearchQuery(message);
  
  if (isSearchQuery) {
    // Check if auto-search is enabled
    chrome.storage.local.get('settings', async (result) => {
      const autoSearch = result.settings?.autoSearch !== false; // default true
      
      if (autoSearch) {
        await performWebSearch(message);
      } else {
        const response = `This looks like a web search query. Would you like me to search for "${message}"? (Enable auto-search in settings to do this automatically)`;
        addMessage(response, 'bot');
        speakText(response);
      }
    });
    return 'Searching the web...';
  }
  
  // Build context
  const context = buildContext(message);
  
  // Create a contextual response based on page content
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
      // General query
      response = `Regarding "${title}":\n\n`;
      response += `${mainContent.slice(0, 250)}...\n\n`;
      response += `Is there a specific aspect you'd like to know more about?`;
    }
  } else {
    response = `I understand you're asking: "${message}"\n\n`;
    response += `I'd love to help! However, I need to analyze the page content first. Click the "Analyze Page" button, and then I'll be able to answer your questions about the content.`;
  }
  
  conversationHistory.push({ role: 'assistant', content: response });
  speakText(response);
  return response;
}

// Detect if message is a search query
function detectSearchQuery(message) {
  const searchKeywords = [
    'search for', 'find', 'look up', 'google', 'search',
    'what is', 'who is', 'when is', 'where is', 'how to',
    'latest', 'today', 'news', 'current', 'result', 'score',
    'weather', 'time', 'price', 'stock'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for search keywords
  const hasSearchKeyword = searchKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Check if asking about something not on current page
  const isExternalQuery = lowerMessage.includes('cricket') || 
                          lowerMessage.includes('match') ||
                          lowerMessage.includes('result') ||
                          lowerMessage.includes('news') ||
                          lowerMessage.includes('weather') ||
                          lowerMessage.includes('today');
  
  return hasSearchKeyword || isExternalQuery;
}

// Perform web search
async function performWebSearch(query) {
  try {
    // Clean the query
    const searchQuery = query
      .replace(/search for|find|look up|google|search/gi, '')
      .trim();
    
    addMessage(`🔍 Searching for: "${searchQuery}"`, 'bot');
    
    // Create search URL (using Google)
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    // Open in new tab
    chrome.tabs.create({ url: searchUrl, active: false }, (tab) => {
      setTimeout(() => {
        const msg = `I've opened a new tab with search results for "${searchQuery}". You can switch to it to view the results.`;
        addMessage(msg, 'bot');
        speakText(`Search results opened in new tab`);
      }, 500);
    });
    
  } catch (error) {
    console.error('Search error:', error);
    addMessage('Sorry, I encountered an error performing the search.', 'bot');
  }
}

// Build context from message
function buildContext(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('summarize') || lower.includes('summary')) return 'summarize';
  if (lower.includes('explain') || lower.includes('what is') || lower.includes('what does')) return 'explain';
  if (lower.includes('simplify') || lower.includes('simple') || lower.includes('eli5')) return 'simplify';
  if (lower.includes('translate')) return 'translate';
  
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
  
  // Format content (simple markdown-like formatting)
  contentDiv.innerHTML = formatMessage(content);
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format message with basic markdown
function formatMessage(text) {
  // Escape HTML
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Convert **bold** to <strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert newlines to <br>
  text = text.replace(/\n/g, '<br>');
  
  // Convert bullet points
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
      voiceEnabled: true,
      autoSearch: true
    };
    
    setTheme(settings.theme);
    setFontSize(settings.fontSize);
    
    document.getElementById('themeSelect').value = settings.theme;
    document.getElementById('fontSizeSelect').value = settings.fontSize;
    document.getElementById('autoAnalyze').checked = settings.autoAnalyze;
    document.getElementById('voiceEnabled').checked = settings.voiceEnabled !== false;
    document.getElementById('autoSearch').checked = settings.autoSearch !== false;
  });
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
      isListening = true;
      voiceBtn.classList.add('listening');
      addMessage('🎤 Listening...', 'bot');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      userInput.value = transcript;
      addMessage(`You said: "${transcript}"`, 'user');
      handleSendMessage();
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isListening = false;
      voiceBtn.classList.remove('listening');
      if (event.error !== 'no-speech') {
        addMessage(`Voice error: ${event.error}. Please try again.`, 'bot');
      }
    };
    
    recognition.onend = () => {
      isListening = false;
      voiceBtn.classList.remove('listening');
    };
  } else {
    console.warn('Speech recognition not supported');
    voiceBtn.style.display = 'none';
  }
}

// Toggle voice input
function toggleVoiceInput() {
  chrome.storage.local.get('settings', (result) => {
    const voiceEnabled = result.settings?.voiceEnabled !== false; // default true
    
    if (!voiceEnabled) {
      addMessage('Voice assistant is disabled. Enable it in settings.', 'bot');
      return;
    }
    
    if (!recognition) {
      addMessage('Voice recognition is not supported in your browser.', 'bot');
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
}

// Text-to-speech for responses
function speakText(text) {
  chrome.storage.local.get('settings', (result) => {
    const voiceEnabled = result.settings?.voiceEnabled !== false;
    
    if (!voiceEnabled || !speechSynthesis) return;
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Clean text for speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\n/g, '. ')
      .replace(/📄|📝|🎤|💡|🔍|✓/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    speechSynthesis.speak(utterance);
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

// Initialize
console.log('Semantic Web Assistant side panel loaded');