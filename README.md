# marky

A TypeScript CLI and library package.

## Setup

Use Node 20 or newer.

```bash
npm install
npm test
npm run build
```

## CLI

```bash
npm run dev -- greet World
```

After publishing or linking the package:

```bash
marky greet World
```

## Library

```ts
import { createGreeting } from "marky";

console.log(createGreeting("World"));
```
