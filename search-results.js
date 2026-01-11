// Search results page script

// Get query from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const query = urlParams.get('q') || 'search';

// Display query
document.getElementById('queryText').textContent = `"${query}"`;

// Current tab
let currentTab = 'summary';

// Switch between tabs
function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`${tab}Tab`).classList.add('active');
}

// Initialize and fetch results
async function initialize() {
  try {
    await fetchSearchResults(query);
  } catch (error) {
    showError('Failed to fetch search results. Please try again.');
  }
}

// Fetch search results using Google Custom Search API (mock implementation)
async function fetchSearchResults(query) {
  try {
    // Mock search results - Replace with actual API
    // You can use Google Custom Search API, Bing API, or web scraping
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    
    const mockResults = generateMockResults(query);
    
    displayResults(mockResults);
    
  } catch (error) {
    console.error('Search error:', error);
    showError('Failed to fetch results');
  }
}

// Generate mock search results based on query
function generateMockResults(query) {
  const lowerQuery = query.toLowerCase();
  
  // Cricket-related results
  if (lowerQuery.includes('cricket') || lowerQuery.includes('match') || lowerQuery.includes('ipl')) {
    return {
      summary: `India cricket match information: Based on the latest updates, India is scheduled to play today. The match features strong performances from both teams with India looking to maintain their winning streak. Check live scores and updates from official cricket boards.`,
      results: [
        {
          title: 'India vs Australia Live Score - Cricket Match Today',
          url: 'https://www.espncricinfo.com/live-cricket-score',
          snippet: 'Get live cricket scores, updates, and match highlights. India is currently playing against Australia in the latest international cricket match. Follow ball-by-ball commentary and detailed statistics.',
          content: 'India won the toss and elected to bat first. The opening partnership looked solid with Rohit Sharma and Shubman Gill providing a steady start. The team reached 150 runs in 30 overs with 3 wickets down. Key players Virat Kohli and KL Rahul are currently at the crease building a crucial partnership.'
        },
        {
          title: 'Today\'s Cricket Match Result - India Cricket Schedule',
          url: 'https://www.cricbuzz.com/cricket-match/today',
          snippet: 'Complete cricket match schedule, results, and live updates. India cricket team latest scores, upcoming fixtures, and match analysis with expert commentary.',
          content: 'India secured a comprehensive victory in the recent match. The bowling attack was exceptional with Mohammed Siraj taking 4 wickets. The chase was comfortable with the middle order showing great composure. Man of the match was awarded to Virat Kohli for his brilliant century.'
        },
        {
          title: 'IPL 2024 Live Scores and Updates',
          url: 'https://www.iplt20.com/matches/results',
          snippet: 'Indian Premier League live scores, points table, and match schedules. Follow your favorite IPL teams with real-time updates and highlights.',
          content: 'Mumbai Indians are currently leading the points table with 8 wins from 10 matches. Chennai Super Kings and Rajasthan Royals are closely following. The playoff race is heating up with several teams fighting for the top 4 positions.'
        }
      ]
    };
  }
  
  // Technology/AI news
  if (lowerQuery.includes('ai') || lowerQuery.includes('technology') || lowerQuery.includes('tech')) {
    return {
      summary: `Latest technology and AI developments: Artificial intelligence continues to advance rapidly with new breakthroughs in machine learning, natural language processing, and computer vision. Major tech companies are investing heavily in AI research and applications.`,
      results: [
        {
          title: 'Latest AI Developments - TechCrunch',
          url: 'https://techcrunch.com/ai-news',
          snippet: 'Breaking news in artificial intelligence, machine learning, and tech innovation. Comprehensive coverage of AI startups, research, and industry trends.',
          content: 'OpenAI announced new features for ChatGPT including improved reasoning capabilities and multimodal understanding. Google DeepMind published research on more efficient neural network architectures. Microsoft is integrating AI across its product suite.'
        },
        {
          title: 'AI News Today - The Verge',
          url: 'https://www.theverge.com/ai-artificial-intelligence',
          snippet: 'Latest artificial intelligence news, reviews, and analysis. Coverage of AI ethics, policy, and technological breakthroughs.',
          content: 'New regulations for AI development are being proposed in multiple countries. The focus is on ensuring safe and ethical AI deployment while fostering innovation. Industry leaders are calling for balanced approaches to AI governance.'
        }
      ]
    };
  }
  
  // Weather queries
  if (lowerQuery.includes('weather')) {
    const city = extractCity(lowerQuery) || 'your location';
    return {
      summary: `Weather information for ${city}: Current conditions, forecast, and detailed meteorological data. Check temperature, humidity, wind speed, and precipitation chances.`,
      results: [
        {
          title: `Weather in ${city} - AccuWeather`,
          url: 'https://www.accuweather.com',
          snippet: `Current weather conditions and forecast for ${city}. Hourly and daily weather updates with radar maps and severe weather alerts.`,
          content: `Today's weather: Partly cloudy with temperatures ranging from 22°C to 30°C. Humidity at 65%. Light winds from the northeast. No rain expected. UV index moderate. Tomorrow: Similar conditions with slight temperature increase.`
        }
      ]
    };
  }
  
  // Default general results
  return {
    summary: `Search results for "${query}": Found relevant information from multiple authoritative sources. Browse through the results below for detailed information and visit the websites for complete content.`,
    results: [
      {
        title: `Complete Guide to ${query}`,
        url: `https://www.example.com/${query.replace(/\s+/g, '-')}`,
        snippet: `Comprehensive information about ${query}. Detailed explanations, examples, and expert insights to help you understand the topic better.`,
        content: `This comprehensive guide covers all aspects of ${query}. We explore the fundamentals, advanced concepts, practical applications, and future trends. Whether you're a beginner or expert, you'll find valuable insights here.`
      },
      {
        title: `${query} - Latest Updates and News`,
        url: `https://www.news.com/${query.replace(/\s+/g, '-')}`,
        snippet: `Stay updated with the latest news and developments about ${query}. Real-time updates, expert analysis, and in-depth coverage.`,
        content: `Recent developments in ${query} have shown significant progress. Experts predict continued growth and innovation in this field. Key stakeholders are investing resources to advance understanding and applications.`
      },
      {
        title: `Understanding ${query} - Expert Analysis`,
        url: `https://www.research.com/${query.replace(/\s+/g, '-')}`,
        snippet: `Expert analysis and research findings about ${query}. Scientific studies, data analysis, and peer-reviewed insights.`,
        content: `Research indicates that ${query} plays a crucial role in various applications. Studies show positive outcomes and continued relevance. Researchers are exploring new methodologies and approaches to enhance effectiveness.`
      }
    ]
  };
}

// Extract city name from query
function extractCity(query) {
  const cities = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad'];
  for (const city of cities) {
    if (query.toLowerCase().includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }
  return null;
}

// Display search results
function displayResults(data) {
  // Hide loading
  document.getElementById('loadingSection').style.display = 'none';
  
  // Show results container
  document.getElementById('resultsContainer').classList.add('show');
  
  // Display summary
  document.getElementById('summaryText').textContent = data.summary;
  
  // Display search results
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '';
  
  data.results.forEach((result, index) => {
    const resultCard = createResultCard(result, index);
    resultsContainer.appendChild(resultCard);
  });
  
  // Display full content
  const contentContainer = document.getElementById('fullContent');
  contentContainer.innerHTML = '';
  
  data.results.forEach((result, index) => {
    const contentCard = createFullContentCard(result, index);
    contentContainer.appendChild(contentCard);
  });
}

// Create result card
function createResultCard(result, index) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.onclick = () => window.open(result.url, '_blank');
  
  card.innerHTML = `
    <a href="${result.url}" class="result-title" target="_blank" onclick="event.stopPropagation()">
      ${result.title}
    </a>
    <div class="result-url">${result.url}</div>
    <div class="result-snippet">${result.snippet}</div>
    <button class="view-full-btn" onclick="event.stopPropagation(); showContent(${index})">
      View Full Content
    </button>
    <div class="content-preview" id="preview-${index}">
      <h3>Content Preview</h3>
      <p>${result.content}</p>
    </div>
  `;
  
  return card;
}

// Create full content card
function createFullContentCard(result, index) {
  const card = document.createElement('div');
  card.className = 'result-card';
  
  card.innerHTML = `
    <a href="${result.url}" class="result-title" target="_blank">
      ${result.title}
    </a>
    <div class="result-url">${result.url}</div>
    <div class="content-preview show">
      <h3>Full Content</h3>
      <p>${result.content}</p>
      <p><strong>Note:</strong> This is a preview. Visit the website for complete and most up-to-date information.</p>
    </div>
  `;
  
  return card;
}

// Show content preview
function showContent(index) {
  const preview = document.getElementById(`preview-${index}`);
  preview.classList.toggle('show');
}

// Show error message
function showError(message) {
  document.getElementById('loadingSection').style.display = 'none';
  document.getElementById('resultsContainer').style.display = 'none';
  document.getElementById('errorSection').style.display = 'block';
  document.getElementById('errorText').textContent = message;
}

// Initialize on load
window.addEventListener('load', initialize);