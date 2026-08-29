# Crawl4AI MCP Server

这是一个基于MCP (Model Context Protocol)的智能信息获取服务器,为AI助手系统提供强大的搜索能力和面向LLM优化的网页内容理解功能。通过多引擎搜索和智能内容提取,帮助AI系统高效获取和理解互联网信息。

## 文件结构

- `src/index.py`: MCP服务器主实现,使用FastMCP提供网页爬取功能
- `pyproject.toml`: 项目配置和依赖管理
- `requirements.txt`: 环境依赖列表,基于实际测试的版本

## 功能说明

服务器提供以下核心工具:

1. `search`: 强大的网络搜索功能
   - 支持多个搜索引擎:
     * DuckDuckGo: 无需API密钥,全面处理AbstractText、Results和RelatedTopics
     * Google: 需要配置API密钥和CSE ID,提供精准搜索结果
   - 参数说明:
     * query: 搜索查询字符串
     * num_results: 返回结果数量(默认10)
     * engine: 搜索引擎选择(duckduckgo/google)
   - 特点:
     * 支持选择特定搜索引擎
     * 智能结果整合和排序

2. `read_url`: 面向LLM优化的网页内容理解工具
   - 输出格式:
     * markdown_with_citations: 包含内联引用的Markdown,保持信息溯源
     * fit_markdown: 经过LLM优化的精简内容,去除冗余信息
     * raw_markdown: 基础HTML→Markdown转换
     * references_markdown: 单独的引用/参考文献部分
     * fit_html: 生成fit_markdown的过滤后HTML
     * markdown: 默认Markdown格式
   - 特点:
     * 智能内容识别和提取
     * 自动过滤非核心内容
     * 保持引用完整性

## 环境要求

- Python >= 3.9
- 依赖包版本:
  - Crawl4AI==0.4.248
  - playwright==1.50.0
  - beautifulsoup4==4.13.3
  - 其他依赖见requirements.txt

## 注意事项

1. 服务器使用专门的Python环境(crawl4ai_env)
2. 首次使用需要安装playwright浏览器:
   ```bash
   playwright install
   ```
3. 服务器使用异步操作,确保资源正确清理
4. LLM内容优化策略:
   - 智能内容识别: 自动识别并保留文章主体、关键信息段落
   - 噪音过滤: 自动过滤导航栏、广告、页脚等对理解无帮助的内容
   - 信息完整性: 保留URL引用,支持信息溯源
   - 长度优化: 使用最小词数阈值(10)过滤无效片段
   - 格式优化: 默认输出markdown_with_citations格式,便于LLM理解和引用

## 更新历史

- 2025.03.20: 修复Windows系统上的字符编码问题,确保read_url和search方法在不同操作系统上正常工作
- 2025.02.10: 集成duckduckgo_search库,优化DuckDuckGo搜索实现,支持更多搜索特性
- 2025.02.08: 优化DuckDuckGo搜索实现,增强结果收集能力
- 2025.02.07: 重构项目结构,使用FastMCP实现,优化依赖管理
- 2025.02.07: 优化内容过滤配置,提高token效率并保持URL完整性

## 跨平台兼容性

为确保在不同操作系统上的兼容性,特别是Windows系统,本项目采取了以下措施:

1. **编码处理**: 所有文本输出使用UTF-8编码,并使用`errors='replace'`参数处理无法编码的字符
2. **错误处理**: 增强了异常捕获和处理机制,提供更详细的错误信息
3. **JSON序列化**: 使用`ensure_ascii=False`确保非ASCII字符正确处理,避免Windows默认编码(通常是cp1252)的限制