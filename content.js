// Content script for extracting and analyzing webpage content

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Always respond to prevent "Receiving end does not exist" errors
  
  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
    return true;
  }
  
  if (request.action === 'extractContent') {
    try {
      const content = extractPageContent();
      sendResponse(content);
    } catch (error) {
      console.error('Error extracting content:', error);
      sendResponse(null);
    }
    return true;
  }
  
  if (request.action === 'getSelection') {
    try {
      const selection = window.getSelection().toString();
      sendResponse({ text: selection });
    } catch (error) {
      console.error('Error getting selection:', error);
      sendResponse({ text: '' });
    }
    return true;
  }
  
  if (request.action === 'highlightText') {
    try {
      highlightTextOnPage(request.text);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error highlighting text:', error);
      sendResponse({ success: false });
    }
    return true;
  }
  
  // Return true to indicate async response
  return true;
});

// Extract semantic content from the page
function extractPageContent() {
  const content = {
    title: document.title || 'Untitled Page',
    url: window.location.href,
    mainContent: '',
    headings: [],
    links: [],
    images: [],
    metadata: {},
    readingTime: 0
  };
  
  try {
    // Extract main content
    const mainElements = document.querySelectorAll('article, main, [role="main"], .content, #content, .post-content, .article-content');
    if (mainElements.length > 0) {
      content.mainContent = Array.from(mainElements)
        .map(el => el.innerText)
        .filter(text => text && text.trim().length > 0)
        .join('\n\n');
    }
    
    // Fallback to body text if no main content found
    if (!content.mainContent || content.mainContent.length < 100) {
      const bodyText = document.body.innerText;
      content.mainContent = bodyText;
    }
    
    // Limit content length
    content.mainContent = content.mainContent.slice(0, 5000);
    
    // Extract headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    content.headings = Array.from(headings)
      .map(h => ({
        level: h.tagName,
        text: h.innerText.trim()
      }))
      .filter(h => h.text.length > 0)
      .slice(0, 20);
    
    // Extract links
    const links = document.querySelectorAll('a[href]');
    content.links = Array.from(links)
      .map(a => ({
        text: a.innerText.trim(),
        href: a.href
      }))
      .filter(link => link.text.length > 0)
      .slice(0, 10);
    
    // Extract images with alt text
    const images = document.querySelectorAll('img[alt]');
    content.images = Array.from(images)
      .map(img => ({
        alt: img.alt,
        src: img.src
      }))
      .filter(img => img.alt.length > 0)
      .slice(0, 5);
    
    // Extract metadata
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const metaContent = meta.getAttribute('content');
      if (name && metaContent) {
        content.metadata[name] = metaContent;
      }
    });
    
    // Calculate reading time (average 200 words per minute)
    const wordCount = content.mainContent.split(/\s+/).filter(w => w.length > 0).length;
    content.readingTime = Math.max(1, Math.ceil(wordCount / 200));
    
    return content;
  } catch (error) {
    console.error('Error in extractPageContent:', error);
    return content; // Return partial content even if there's an error
  }
}

// Highlight text on the page
function highlightTextOnPage(text) {
  if (!text || text.length === 0) return;
  
  try {
    // Remove previous highlights
    document.querySelectorAll('.semantic-highlight').forEach(el => {
      el.classList.remove('semantic-highlight');
    });
    
    // Simple text highlighting
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(text)) {
        const parent = node.parentElement;
        if (parent && !parent.closest('script, style, noscript')) {
          parent.classList.add('semantic-highlight');
        }
      }
    }
  } catch (error) {
    console.error('Error highlighting text:', error);
  }
}

// Inject highlight styles only once
if (!document.getElementById('semantic-highlight-styles')) {
  const style = document.createElement('style');
  style.id = 'semantic-highlight-styles';
  style.textContent = `
    .semantic-highlight {
      background-color: rgba(255, 255, 0, 0.3) !important;
      transition: background-color 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

// Signal that content script is ready
console.log('Semantic Web Assistant content script loaded and ready');