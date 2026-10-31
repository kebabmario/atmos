```markdown
<div align="center">

# Atmos

*A minimal weather application.*

[![CI Status](https://github.com/kebabmario/atmos/actions/workflows/ci.yml/badge.svg)](https://github.com/kebabmario/atmos/actions)
[![Next.js](https://img.shields.io/badge/Next.js-14%2B-black?style=flat&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4%2B-38BDF8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0%2B-F69220?style=flat&logo=pnpm)](https://pnpm.io/)

[Live Demo](https://useatmos.me) · [Report Bug](https://github.com/kebabmario/atmos/issues/new?template=bug_report.md) · [Request Feature](https://github.com/kebabmario/atmos/issues/new?template=feature_request.md)

</div>

---

## Overview

Atmos is a simple and minimal weather webapp built by @kebabmario. Built on modern React patterns and powered by open-source meteorological APIs, it delivers hyper-local weather tracking with minimal client-side overhead.

---

## Key Features

- **Real-Time Data Integration**: Meteorological data provided by the Open-Meteo API.
- **Interactive Location Search**: Asynchronous city lookup featuring fuzzy matching and key-driven autocomplete.
- **Detailed Forecasting**: Hourly weather breakdowns with continuous temperature curves and interactive 3-day detail views.

---

## Tech Stack & Tooling

| Category | Technology |
| :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Data Source** | [Open-Meteo API](https://open-meteo.com/) |
| **Package Manager** | [pnpm](https://pnpm.io/) |
| **Quality Control** | ESLint, Prettier, Husky, Lint-Staged, Commitlint, GitHub Actions |

---

## Getting Started

### Prerequisites

Node.js 20+ and `pnpm` are required for local execution:

```bash
npm install -g pnpm

```

### Installation

1. Clone the repository:
```bash
git clone [https://github.com/kebabmario/atmos.git](https://github.com/kebabmario/atmos.git)
cd atmos

```


2. Install dependencies:
```bash
pnpm install

```


3. Run the development server:
```bash
pnpm dev

```


4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development & Automation

```bash
# Execute TypeScript compilation checks without emitting files
pnpm exec tsc --noEmit

# Run code linting via ESLint
pnpm lint

# Format codebase according to project rules
pnpm exec prettier --write .

# Verify production build compilation
pnpm build

```

---

## License

Distributed under the MIT License. See `LICENSE` for details.