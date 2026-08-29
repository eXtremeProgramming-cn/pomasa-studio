#!/usr/bin/env python

import asyncio
import logging
from src.search import SearchManager

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_search_manager():
    logger.info("Testing SearchManager...")
    search_manager = SearchManager()
    
    # 测试DuckDuckGo搜索
    logger.info("Testing DuckDuckGo search with SearchManager...")
    try:
        results = await search_manager.search("Python programming", 5, "duckduckgo")
        logger.info(f"Got {len(results)} results from SearchManager")
        for result in results:
            logger.info(f"Title: {result.get('title')}")
            logger.info(f"Link: {result.get('link')}")
            logger.info(f"Snippet: {result.get('snippet')}")
            logger.info("---")
    except Exception as e:
        logger.error(f"SearchManager search failed: {str(e)}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(test_search_manager())