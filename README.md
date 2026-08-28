# pomasa-studio

POMASA 的 DSH 插件，远期包成"研究工作台"。管理 `~/.pomasa` 下所有 POMASA MAS：列表、新建（user_input 到生成器）、运行状态、阶段产物展示。

## 状态

设计阶段。数据流设计见 [DESIGN.md](./DESIGN.md)，按"界面行为到数据接口到元数据规定到模式"的链条推导。

## 与前身的关系

`01.tools/POMASA_Observatory`（npm 名 dsh-pomasa）是概念验证实验，废弃，不作为参考。本仓库为正式版。

## 技术概要

- DSH 插件：`conversation.view` 槽位加 tab；host 半读 `~/.pomasa`，用 DSH 智能运行时会话执行生成与运行，不写编排胶水代码。
- 数据契约（全部为普通文件，运行时无关）：
  - `pomasa.json`：MAS 静态描述符（stages 与产物契约）
  - `workspace/<run-id>/run.json`：运行状态机
  - `workspace/<run-id>/NN.<stage>/index.json`：阶段产物实例枚举
- OBV 模式（可观测性）将进入 `01.tools/pomasa` 目录，本仓库作为其第一个消费者。