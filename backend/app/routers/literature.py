from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Dict, Any, Optional
from backend.app.core.security import get_current_user_id
from backend.app.services.rag import rag_engine

router = APIRouter(prefix="/literature", tags=["Medical Literature"])

@router.get("/search")
def search_literature(
    query: str = Query(..., description="The query to search in medical guidelines"),
    limit: int = Query(3, description="Maximum number of search results to return"),
    tag: Optional[str] = Query(None, description="Optional tag filter (e.g. tuberculosis, mri)"),
    current_user_id: int = Depends(get_current_user_id)
) -> List[Dict[str, Any]]:
    """Runs a semantic retrieval query against WHO, NIH, and PubMed guidance databases."""
    tags_list = [tag] if tag else None
    results = rag_engine.search(query=query, limit=limit, tags=tags_list)
    return results
