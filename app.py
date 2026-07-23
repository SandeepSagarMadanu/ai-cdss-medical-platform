import sys
import os

# Add the project root to the python path to resolve modules correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn
    # Redirect execution to our production app structure
    print("Redirecting execution to Enterprise CDSS Backend App...")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
