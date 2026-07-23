FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy entire backend project structure
COPY backend/ ./backend/
COPY app.py .

# Create uploads folder for scans
RUN mkdir -p /workspace/uploads && chmod 777 /workspace/uploads

# Hugging Face Spaces default port is 7860
EXPOSE 7860

ENV PYTHONPATH=/workspace

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]
