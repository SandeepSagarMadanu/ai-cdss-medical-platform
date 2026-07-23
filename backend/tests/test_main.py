import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.explainability import explainability_service
from backend.app.services.rag import rag_engine

client = TestClient(app)

def test_health_check():
    """Verify that the health check endpoint responds correctly."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_explainability_service_fallback():
    """Verify that explainability service generates correct data models and fallbacks cleanly."""
    # Create a small dummy image for testing
    import numpy as np
    import cv2
    
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    dummy_path = "dummy_scan.jpg"
    dummy_out = "dummy_gradcam.jpg"
    
    cv2.imwrite(dummy_path, dummy_img)
    
    try:
        # Run XAI mapping
        res = explainability_service.generate_gradcam(dummy_path, dummy_out)
        
        assert "confidence" in res
        assert "probabilities" in res
        assert "feature_importance" in res
        assert res["confidence"] >= 0.50
        
        # Verify output file generated
        assert os.path.exists(dummy_out)
    finally:
        # Clean up files
        if os.path.exists(dummy_path):
            os.remove(dummy_path)
        if os.path.exists(dummy_out):
            os.remove(dummy_out)

def test_rag_engine_search():
    """Verify that semantic search indexing matches terms and sorts by similarity correctly."""
    # Query about brain scan / edema
    results = rag_engine.search("brain edema", limit=2)
    assert len(results) > 0
    # The first document should contain references to MRI / Gliomas / Brain tumors
    assert "NIH Clinical Guidelines for Classification and Treatment of Gliomas" in results[0]["source_title"]
    assert results[0]["similarity_score"] > 0
