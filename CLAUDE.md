# CLAUDE.md

## Communication
- 永远使用简体中文进行思考和对话

## Documentation
- 编写 .md 文档时，也要用中文
- 正式文档写到项目的 docs/ 目录下
- 测试文档、模块文档、代码文档放在docs/下的对应文件夹
- 用于讨论和评审的计划、方案等文档，写到项目的 discuss/ 目录下

## Code Architecture
- 编写代码的硬性指标：
  （1）Python/JS/TS：每个文件 ≤ 300 行
  （2）Java/Go/Rust：每个文件 ≤ 400 行
  （3）每层文件夹中文件 ≤ 8 个，超出需做分层
- 时刻关注架构优雅，避免以下「坏味道」：
  1）僵化  2）冗余  3）循环依赖  4）脆弱性
  5）晦涩性 6）数据泥团 7）不必要的复杂性
- 【非常重要！！】无论编写/审核，严格遵守硬性指标与架构原则
- 【非常重要！！】一旦识别出坏味道，立即询问是否优化并给出方案
- 采用声明式开发，面向对象开发，模块化编程，写好封装的模块的接口和注释



## Python
- 尽可能全强类型；若需动态 dict，先征求同意
- 虚拟环境目录名永远使用 .venv
- 依赖/构建/调试全部使用 uv（而非 pip/poetry/conda/python）
- 根目录与 http://main.py 保持简洁

## React / Next.js / TypeScript / JavaScript
- Next.js 默认最新版本
- React 默认最新版本
- Tailwind CSS 默认最新版本
- 禁用 CommonJS
- 倾向 TypeScript；确实不支持再用 JS
- 数据结构尽量强类型；如 any/非结构化 json，先征求同意+