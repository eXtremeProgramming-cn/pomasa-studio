# TODO

* ~~新建MAS界面：各输入字段体验优化~~ （done：必填星标、报告结构宽框、质量等级档简介、其他模式全目录多选弹窗、数据来源与报告形式同行）
* 通用 md 导出：
  - DOCX 已实现（docx 库，CJK 正常，查看器内"导出 DOCX"）
  - PDF 暂移除（0.2.2）：pdfmake（0.2.x/0.3.x 在本环境均挂起）、pdfkit、jsPDF+autotable 三种纯 JS 引擎试过，排版与表格仍不达标；md 本身即交付物。待更优方案再启用（方向：桌面端 Chromium 打印或成熟的 HTML→PDF 引擎）
