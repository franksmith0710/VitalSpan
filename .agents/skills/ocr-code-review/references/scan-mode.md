# Scan Mode

`scan` 用 Git 文件清单建立全仓 Primary Target Manifest，再应用 OCR provider 目录、用户规则、扩展名和默认路径过滤。每个幸存文件是独立任务。

一个调度波次中出现 50 个路径不代表把 50 个文件正文塞进同一模型上下文。宿主可以并行、串行或超过 50 并行；语义不变：一个 Primary Target 一个 reviewer context，相关文件按需读取。

初始化：

```text
ocr_review.py init --repo <repo> --mode scan
```

先用 Stack Card 路由相关维度，再调度全部任务。普通文件一次上下文完成；大文件按符号/范围覆盖。全仓 clean 必须满足 Manifest 全完成、所有 Candidate 已消解、verifier 已终态、Finding 新鲜且没有实质性 Blind Spot。

扫描发现跨文件问题时，为它选择最适合承载修复的 Primary Target；不能把仅作为 Context Evidence 的历史问题借题报告。

