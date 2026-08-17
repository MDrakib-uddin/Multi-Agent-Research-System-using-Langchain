import json
import asyncio
import os
import time
import traceback
from dotenv import load_dotenv

# Ensure environment variables are loaded first
load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.agents.agents import build_search_agent, build_reader_agent, writer_chain, critic_chain

app = FastAPI(title="Multi-Agent Research Assistant API")

# Enable CORS for external frontend flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directory exists
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def serve_index():
    """Serve the single page application HTML."""
    return FileResponse("static/index.html")


class ResearchRequest(BaseModel):
    topic: str


@app.post("/api/research")
async def run_research(req: ResearchRequest):
    """Standard REST endpoint that executes the full pipeline and returns complete results."""
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    loop = asyncio.get_event_loop()

    def execute():
        # 1. Search Agent
        search_agent = build_search_agent()
        search_result = search_agent.invoke({
            "messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]
        })
        search_output = search_result['messages'][-1].content

        # 2. Reader Agent
        reader_agent = build_reader_agent()
        reader_result = reader_agent.invoke({
            "messages": [("user",
                f"Extract the most relevant web URL from the search results below and use the scrape_url tool to scrape its deep content.\n\n"
                f"Search Results:\n{search_output[:3000]}"
            )]
        })
        reader_output = reader_result['messages'][-1].content

        # 3. Writer Chain
        research_combined = (
            f"SEARCH RESULTS:\n{search_output}\n\n"
            f"DETAILED SCRAPED CONTENT:\n{reader_output}"
        )
        writer_output = writer_chain.invoke({
            "topic": topic,
            "research": research_combined
        })

        # 4. Critic Chain
        critic_output = critic_chain.invoke({
            "report": writer_output
        })

        return {
            "search": search_output,
            "reader": reader_output,
            "writer": writer_output,
            "critic": critic_output
        }

    try:
        results = await loop.run_in_executor(None, execute)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def run_with_retry(fn, max_attempts=4, delay=10):
    """Executes a function with automatic retry on API rate limit (429) errors."""
    for attempt in range(max_attempts):
        try:
            return fn()
        except Exception as e:
            err_str = str(e).lower()
            if "rate limit" in err_str or "429" in err_str or "rate_limit_exceeded" in err_str:
                if attempt < max_attempts - 1:
                    wait_time = delay
                    import re
                    match = re.search(r"try again in ([\d\.]+)s", err_str)
                    if match:
                        wait_time = float(match.group(1)) + 1.0
                    time.sleep(wait_time)
                    continue
            raise e

@app.get("/api/research/stream")
async def stream_research(topic: str = Query(..., min_length=1)):
    """SSE endpoint streaming live progress of each agent in the pipeline."""
    async def event_generator():
        topic_clean = topic.strip()
        loop = asyncio.get_event_loop()

        try:
            # ── Step 1: Search Agent ──
            yield f"data: {json.dumps({'type': 'step_start', 'step': 'search', 'title': 'Search Agent'})}\n\n"
            
            def run_search():
                agent = build_search_agent()
                res = agent.invoke({
                    "messages": [("user", f"Find recent, reliable and detailed information about: {topic_clean}")]
                })
                return res['messages'][-1].content

            search_out = await loop.run_in_executor(None, lambda: run_with_retry(run_search))
            yield f"data: {json.dumps({'type': 'step_done', 'step': 'search', 'content': search_out})}\n\n"

            # ── Step 2: Reader Agent ──
            yield f"data: {json.dumps({'type': 'step_start', 'step': 'reader', 'title': 'Reader Agent'})}\n\n"

            def run_reader():
                agent = build_reader_agent()
                res = agent.invoke({
                    "messages": [("user",
                        f"Extract the most relevant web URL from the search results below and use the scrape_url tool to scrape its deep content.\n\n"
                        f"Search Results:\n{search_out[:3000]}"
                    )]
                })
                return res['messages'][-1].content

            reader_out = await loop.run_in_executor(None, lambda: run_with_retry(run_reader))
            yield f"data: {json.dumps({'type': 'step_done', 'step': 'reader', 'content': reader_out})}\n\n"

            # ── Step 3: Writer Chain ──
            yield f"data: {json.dumps({'type': 'step_start', 'step': 'writer', 'title': 'Writer Chain'})}\n\n"

            def run_writer():
                research_combined = (
                    f"SEARCH RESULTS:\n{search_out}\n\n"
                    f"DETAILED SCRAPED CONTENT:\n{reader_out}"
                )
                return writer_chain.invoke({
                    "topic": topic_clean,
                    "research": research_combined
                })

            writer_out = await loop.run_in_executor(None, lambda: run_with_retry(run_writer))
            yield f"data: {json.dumps({'type': 'step_done', 'step': 'writer', 'content': writer_out})}\n\n"

            # ── Step 4: Critic Chain ──
            yield f"data: {json.dumps({'type': 'step_start', 'step': 'critic', 'title': 'Critic Chain'})}\n\n"

            def run_critic():
                return critic_chain.invoke({"report": writer_out})

            critic_out = await loop.run_in_executor(None, lambda: run_with_retry(run_critic))
            yield f"data: {json.dumps({'type': 'step_done', 'step': 'critic', 'content': critic_out})}\n\n"

            # ── Complete ──
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
