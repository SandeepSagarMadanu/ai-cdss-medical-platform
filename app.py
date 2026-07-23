import sys
import os
import gradio as gr

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app.main import app as fastapi_app

# Create Gradio UI Blocks
with gr.Blocks(title="AI CDSS Clinical API Portal") as demo:
    gr.Markdown("# 🏥 AI Clinical Decision Support System (CDSS) API Server")
    gr.Markdown("FastAPI Backend Server is **Active and Healthy**.")
    gr.Markdown("Interactive Swagger API Docs: [/docs](/docs)")

# Mount Gradio under /gradio subpath so FastAPI retains primary root routes & /docs
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
