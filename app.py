import sys
import os
import gradio as gr

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ZeroGPU compatibility handler for Hugging Face ZeroGPU Spaces
try:
    import spaces
    @spaces.GPU
    def zero_gpu_keepalive():
        return "ZeroGPU Active"
except Exception:
    pass

from backend.app.main import app as fastapi_app

# Create Gradio UI Blocks
with gr.Blocks(title="AI CDSS Clinical API Portal") as demo:
    gr.Markdown("# 🏥 AI Clinical Decision Support System (CDSS) API Server")
    gr.Markdown("FastAPI Backend Server is **Active and Healthy**.")
    gr.Markdown("Interactive Swagger API Docs: [/docs](/docs)")

# Mount Gradio under /gradio subpath so FastAPI retains primary root routes & /docs
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")

# Launch server at top-level to keep the process running permanently on Hugging Face
demo.launch(server_name="0.0.0.0", server_port=7860)
