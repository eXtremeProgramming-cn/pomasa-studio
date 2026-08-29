#!/usr/bin/env python

import asyncio
import logging
from src.search import DuckDuckGoSearch, GoogleSearch

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_duckduckgo():
    logger.info("Testing DuckDuckGo search...")
    search = DuckDuckGoSearch()
    try:
        results = await search.search("Python programming", 5)
        logger.info(f"Got {len(results)} results from DuckDuckGo")
        for result in results:
            logger.info(f"Title: {result.title}")
            logger.info(f"Link: {result.link}")
            logger.info(f"Snippet: {result.snippet}")
            logger.info("---")
    except Exception as e:
        logger.error(f"DuckDuckGo search failed: {str(e)}", exc_info=True)

async def test_google():
    logger.info("Testing Google search...")
    import json
    import os
    
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    if not os.path.exists(config_path):
        logger.error("config.json not found")
        return
        
    with open(config_path) as f:
        config = json.load(f)
        
    if 'google' not in config:
        logger.error("Google configuration not found in config.json")
        return
        
    search = GoogleSearch(
        api_key=config['google']['api_key'],
        cse_id=config['google']['cse_id']
    )
    
    try:
        results = await search.search("Python programming", 5)
        logger.info(f"Got {len(results)} results from Google")
        for result in results:
            logger.info(f"Title: {result.title}")
            logger.info(f"Link: {result.link}")
            logger.info(f"Snippet: {result.snippet}")
            logger.info("---")
    except Exception as e:
        logger.error(f"Google search failed: {str(e)}", exc_info=True)

async def main():
    await test_duckduckgo()
    logger.info("\n")
    await test_google()

if __name__ == "__main__":
    asyncio.run(main())