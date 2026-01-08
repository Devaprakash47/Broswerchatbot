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
      // Forward request to content script
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
      return true; // Keep channel open for async response
    }
    
    if (request.action === 'analyzeText') {
      // Forward to AI processing
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
  } catch (error) {
    console.error('Error in message handler:', error);
    sendResponse(null);
  }
  
  return true;
});

// AI processing function (mock implementation - replace with actual API)
async function handleAIRequest(text, context, pageContent) {
  try {
    // This is a mock implementation
    // Replace with actual API calls to Claude, OpenAI, or your chosen AI service
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate contextual response based on page content
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
      // Fallback responses when no page content available
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
    // Set default settings on first install
    chrome.storage.local.set({
      settings: {
        theme: 'light',
        fontSize: 'medium',
        autoAnalyze: false
      }
    });
    
    // Open welcome page or show notification
    console.log('Extension installed successfully!');
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Semantic Web Assistant started');
});

// Error handling for uncaught errors
self.addEventListener('error', (event) => {
  console.error('Uncaught error in service worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in service worker:', event.reason);
});

console.log('Semantic Web Assistant background script loaded');