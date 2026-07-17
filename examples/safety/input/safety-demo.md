---
title: Safety and Reproducibility Demo
rawHtml: sanitize
network: block
---

# Safety and Reproducibility Demo

Raw HTML is sanitized unless trusted rendering is explicitly enabled.

<section><strong>This safe HTML remains.</strong><script>alert("removed")</script></section>

Remote assets can be blocked for deterministic builds:

![Remote placeholder](https://example.com/remote-image.png)

Single-file rendering refuses to overwrite an existing PDF unless `--force` is passed. Project
builds overwrite generated outputs by default.
