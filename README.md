# Multi-Agent Research System using LangChain

A sophisticated AI-powered research platform that leverages multiple specialized agents to conduct comprehensive research, analyze content, and generate detailed reports. Built with **LangChain**, **Groq LLM**, and **Tavily Search API**.

## 🎯 Overview

This system implements an intelligent research pipeline where multiple AI agents collaborate to gather, analyze, and synthesize information on any given topic. Each agent has specialized capabilities and works together in a coordinated workflow to produce high-quality research reports.

### **Research Pipeline**

```
User Input (Topic)
    ↓
🔍 Search Agent → Gathers web sources
    ↓
📖 Reader Agent → Extracts and scrapes content
    ↓
✍️ Writer Agent → Generates detailed report
    ↓
🧐 Critic Agent → Reviews and evaluates quality
    ↓
Final Report with Feedback
```

## ✨ Features

- **Multi-Agent Architecture**: Specialized agents for searching, reading, writing, and critiquing
- **Real-time Web Search**: Integrates with Tavily API for accurate, recent information
- **Smart Content Extraction**: Multiple scraping strategies for robust content extraction from any URL
- **LLM-Powered Analysis**: Uses Groq's Llama 3.1 for fast, intelligent processing
- **Web Interface**: Beautiful Streamlit dashboard for easy interaction
- **REST API Backend**: FastAPI server for programmatic access
- **Structured Output**: Reports with introduction, key findings, conclusions, and sources
- **Quality Feedback**: Automated critic review system for report quality assessment

## 🛠️ Tech Stack

- **LLM Framework**: LangChain, LangChain-Core, LangChain-Community
- **Language Model**: Groq API (Llama 3.1 8B Instant)
- **Web Search**: Tavily API
- **Frontend**: Streamlit, HTML/CSS/JS
- **Backend**: FastAPI, Uvicorn
- **Web Scraping**: BeautifulSoup4, Trafilatura, Readability-lxml
- **Utilities**: Python-dotenv, Requests, Rich

## 📋 Prerequisites

- Python 3.8+
- Groq API Key ([Get one free](https://console.groq.com))
- Tavily API Key ([Get one free](https://tavily.com))

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/Multi-Agent-Research-System-using-Langchain.git
cd Multi-Agent-Research-System-using-Langchain
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the project root:
```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

## 💻 Usage

### Option 1: Streamlit Dashboard (Recommended)
```bash
streamlit run app.py
```
Open your browser to `http://localhost:8501` and enter a research topic.

### Option 2: FastAPI Backend with REST API
```bash
python -m uvicorn backend:app --reload
```
Access the API at `http://localhost:8000`

**Example API Request:**
```bash
curl -X POST "http://localhost:8000/api/research" \
  -H "Content-Type: application/json" \
  -d '{"topic": "The impact of AI on the job market in 2026"}'
```

### Option 3: CLI Pipeline
```bash
python main.py
```
Edit `main.py` to specify your research topic:
```python
from src.pipelines.pipeline import run_research_pipeline

topic = "Your research topic here"
run_research_pipeline(topic)
```

## 📁 Project Structure

```
├── app.py                          # Streamlit frontend application
├── backend.py                      # FastAPI backend server
├── main.py                         # CLI entry point
├── requirements.txt                # Python dependencies
├── src/
│   ├── agents/
│   │   └── agents.py              # Search, Reader, Writer, Critic agents
│   ├── pipelines/
│   │   └── pipeline.py            # Research pipeline orchestration
│   └── tools/
│       └── tools.py               # Web search & URL scraping tools
└── static/
    ├── index.html                 # Web UI HTML
    ├── css/
    │   └── style.css              # Styling
    └── js/
        └── app.js                 # Frontend logic
```

## 🤖 Agent Details

### Search Agent
- **Role**: Discovers relevant sources and information
- **Tools**: Tavily web search
- **Output**: URLs, titles, and content snippets from web sources

### Reader Agent
- **Role**: Extracts detailed content from web pages
- **Tools**: `scrape_url()` with multiple extraction strategies
- **Output**: Clean, readable text from target URLs

### Writer Agent
- **Role**: Synthesizes gathered information into structured reports
- **Output**: Professional research reports with:
  - Introduction
  - Key Findings (minimum 3 points)
  - Conclusion
  - Source citations

### Critic Agent
- **Role**: Evaluates report quality and provides constructive feedback
- **Output**: Detailed review with:
  - Quality score (0-10)
  - Strengths
  - Areas for improvement
  - Verdict

## 📊 Research Pipeline Workflow

1. **Input**: User provides a research topic
2. **Search Phase**: Search agent queries the web using Tavily API
3. **Extraction Phase**: Reader agent scrapes and extracts content from top results
4. **Writing Phase**: Writer agent creates a comprehensive report
5. **Review Phase**: Critic agent evaluates the report quality
6. **Output**: Formatted report with feedback

## 🔧 Configuration

### LLM Settings (in `src/agents/agents.py`)
```python
llm = ChatGroq(
    model="llama-3.1-8b-instant",  # Change model here
    temperature=0,                  # Adjust creativity (0-1)
    groq_api_key=groq_api_key,
    max_retries=3
)
```

### Search Results
- Adjustable number of search results (default: 5)
- Modify in `src/tools/tools.py`

## 🐛 Troubleshooting

### "Invalid API Key" Error
- Verify your GROQ_API_KEY and TAVILY_API_KEY in `.env`
- Ensure you're using active API keys from both services

### Slow Response Times
- Increase timeout values in the pipeline
- Use a faster Groq model if available
- Check internet connection for web search

### Scraping Failures
- Some websites may have anti-scraping measures
- The system uses multiple extraction strategies as fallback
- Add custom User-Agent headers if needed

## 📈 Performance Tips

- **Caching**: Implement LangChain caching for repeated topics
- **Parallel Processing**: Modify pipeline to run agents concurrently
- **Rate Limiting**: Set appropriate delays between API calls
- **Content Length**: Configure max tokens for large documents

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) - AI framework
- [Groq](https://groq.com/) - Fast LLM API
- [Tavily](https://tavily.com/) - Web search API
- [Streamlit](https://streamlit.io/) - Web app framework
- [FastAPI](https://fastapi.tiangolo.com/) - API framework

## 📧 Contact & Support

For questions or support, please open an issue on the GitHub repository.

---

**Built with ❤️ using LangChain and AI agents**