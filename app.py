import sys
import os
import gradio as gr

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app.main import app as fastapi_app

# Create Gradio interface for Hugging Face Spaces
with gr.Blocks(title="AI CDSS Clinical API Portal") as demo:
    gr.Markdown("# 🏥 AI Clinical Decision Support System (CDSS) API Server")
    gr.Markdown("FastAPI Backend Server is **Active and Healthy**.")
    gr.Markdown("Swagger API Documentation: [/docs](/docs)")

# Attach FastAPI routes directly into Gradio's built-in FastAPI application
demo.app.include_router(fastapi_app.router)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
