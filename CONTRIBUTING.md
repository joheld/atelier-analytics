# Contributing to Atelier Analytics

Thank you for your interest in contributing to **Atelier Analytics**! We are building a high-performance, private, and open-source visual analytics platform.

---

## 🧭 Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat everyone with respect and empathy.

---

## 🛠️ Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/atelier-analytics.git
   cd atelier-analytics
   ```

2. **Install dependencies:**
   We recommend [Bun](https://bun.sh) for fastest installs, but `npm` works as well:
   ```bash
   bun install
   # or
   npm install
   ```

3. **Start local development server:**
   ```bash
   bun dev
   # or
   npm run dev
   ```
   Navigate to `http://localhost:5173`.

---

## 🎯 Architecture Guidelines & "Zero AI Slop" Standard

Atelier follows strict architectural and visual principles:

1. **Zero AI Slop Standard**:
   - No generic purple/indigo templates, decorative `blur-3xl` orbs, or gratuitous pulsing animations.
   - All visual elements must adhere to the **Technical Precision / Swiss Editorial** archetype: rigid 4/8px grid, sub-pixel `.rim-light` borders, tactile button feedback (`.btn-tactile`), and tabular numerals (`font-mono tabular-nums`).
   - All color palettes are specified in perceptual **OKLCH** color space ([`src/utils/oklchColors.ts`](src/utils/oklchColors.ts)).

2. **Tableau Declarative Model**:
   - Maintain strict separation between discrete dimensions (blue pills, `GROUP BY`) and continuous measures (green pills, `AGG(...)`).
   - Formulas must support standard Tableau syntax: brackets `[FieldName]`, `IF..THEN`, `ZN`, `IIF`, LODs (`{FIXED}`), and Table Calculations (`RUNNING_SUM`, `RANK`, etc.).

3. **Client-Side Privacy Guarantee**:
   - Never introduce dependencies that make external network calls or upload user datasets to remote cloud services. All computation must remain local in DuckDB-WASM or client memory.

---

## 🧪 Zero-Defect Verification Battery

Before opening a pull request, your code **must pass** the 3-tier validation battery with **zero errors and zero warnings**:

```bash
npm run verify
```

This script verifies:
1. **Strict Type Checking**: `tsc --noEmit` (0 errors tolerance).
2. **Automated Unit Tests**: `vitest run` (100% passing).
3. **Clean Production Build**: `vite build` (no missing vendor chunks or unoptimized assets).

If you add new analytical features, formula transpilers, or ingestion engines, you **must write corresponding unit tests** in `src/core/compiler/` or `src/core/engine/`.

---

## 📬 Pull Request Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit your changes with conventional atomic messages:
   ```bash
   git commit -m "feat(compiler): add support for WINDOW_STDEV table calculation"
   ```
3. Run `npm run verify` to confirm all tests and types pass.
4. Push to your fork and submit a Pull Request describing your changes, with screenshots or GIF demonstrations where applicable.

---

## ⚖️ License

By contributing to Atelier Analytics, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
