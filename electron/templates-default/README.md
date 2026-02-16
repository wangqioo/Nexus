# 内置模板（新规则：模板即唯一真相）

本目录为 Nexus 内置的 4 套模板（mcu / software / ai / remote），与 MiniCPM-o 的 `nexus-templates` 同构。

- **用途**：首次运行时种子到 `~/.nexus/templates/`；当用户未修改过该 ref 时，也用于回退读取。
- **规则**：每套一个 JSON 文件，必须包含 `templates`、`settings`、**knowledgeCategories**（笔记标签与 .nexus 子目录对应）。
- **扩展**：新增/修改笔记标签只改对应 ref 的 `templates.json`；新增项目类型在 main 里改 `PROJECT_TYPE_DEFS`，若用新 ref 则在此增加新目录并放一份 `templates.json`。

与仓库 [nexus-templates](https://github.com/.../nexus-templates) 保持同一格式即可互相同步。
