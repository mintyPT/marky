---
title: Safety and Reproducibility Demo
rawHtml: sanitize
network: block
---

# Safety and Reproducibility Demo

Raw HTML is sanitized unless trusted rendering is explicitly enabled.

<section><strong>This safe HTML remains.</strong><script>alert("removed")</script></section>

Local assets still render when network access is blocked:

![Safety badge](./assets/safety-badge.svg)

Remote HTTP/HTTPS assets are blocked in this example for deterministic builds.

Single-file rendering refuses to overwrite an existing PDF unless `--force` is passed. Project
builds overwrite generated outputs by default.
