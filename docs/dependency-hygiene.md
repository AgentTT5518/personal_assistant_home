# Dependency Hygiene

## Rule: If you use it, you declare it

Never rely on transitive dependencies for type packages. If your code uses a global namespace or type from an `@types/*` package, that package must be **explicitly listed** in your `devDependencies` and (when applicable) in your `tsconfig.json` `types` array.

## Why this matters

### The problem

A common failure mode in TypeScript projects:

1. Package `A` depends on `@types/foo` internally
2. Your code uses the `foo` global namespace directly (without importing `A`)
3. TypeScript resolves `@types/foo` through `A`'s dependency chain — your code compiles
4. A co-developer, CI runner, or different package manager **doesn't resolve it the same way**
5. Build fails with `Cannot find namespace 'foo'`

This is a "works on my machine" bug caused by **implicit type resolution**.

### Real-world example

```
package.json
  └─ @vis.gl/react-google-maps (dependency)
       └─ @types/google.maps (its transitive dependency)
```

`StreetViewModal.tsx` uses `google.maps.StreetViewService` directly without importing from `@vis.gl/react-google-maps`. TypeScript finds the `google` namespace through the transitive dependency chain. When a co-developer with a separate repo (different lockfile, different package manager) runs the same code, the build fails:

```
Cannot find namespace 'google'.
Cannot find name 'google'.
```

## How type resolution works in TypeScript

### The `types` field in `tsconfig.json`

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

When `types` is specified, **only** the listed packages from `@types/*` are auto-included as globals. All other `@types/*` packages in `node_modules` are **excluded** from auto-inclusion — even if they're installed.

If `types` is omitted entirely, TypeScript auto-includes **all** `@types/*` packages it finds. This is why some projects "just work" without declaring types — but it's fragile and non-deterministic.

### How transitive types sneak in

Even with a restrictive `types` array, TypeScript can still pull in global types through **module resolution**. When it compiles a file that imports from package `A`, it follows `A`'s `.d.ts` files, which may contain:

```ts
/// <reference types="google.maps" />
```

This side-loads the `google` namespace into the compilation. Whether this happens depends on:
- Which files TypeScript compiles first
- Whether any file in the compilation imports from the package
- How the package manager hoists dependencies

This is inherently fragile and environment-dependent.

### Package manager differences

| Package Manager | Hoisting Behavior | Risk |
|----------------|-------------------|------|
| **npm / yarn** | Flat `node_modules` — transitive `@types/*` hoisted to top level. May be auto-included or explicitly blocked by `types` field | Medium |
| **pnpm** | Strict symlink isolation — transitive `@types/*` buried in `.pnpm/` store. Only accessible through the parent package's resolution chain | High |

## The fix

### 1. Declare type packages explicitly

If your code uses `google.maps`, `node`, `jest`, or any other global namespace:

```bash
[pm] add -D @types/google.maps   # or @types/node, @types/jest, etc.
```

### 2. Add to tsconfig `types` array

```json
{
  "compilerOptions": {
    "types": ["vite/client", "google.maps"]
  }
}
```

### 3. Enforce lockfile parity in CI

```yaml
# .github/workflows/ci.yml
- run: pnpm install --frozen-lockfile   # or npm ci
```

This ensures CI uses the exact same dependency tree as local development. If someone adds a dependency without updating the lockfile, CI fails immediately.

## Checklist

When adding code that uses global type namespaces, verify:

- [ ] The `@types/*` package is in `devDependencies` (not just transitively available)
- [ ] The type name is in `tsconfig.json`'s `types` array (if `types` is specified)
- [ ] The lockfile is committed and CI uses `--frozen-lockfile` / `npm ci`
- [ ] The same `pnpm build` / `npm run build` passes in a clean environment (no cached `node_modules`)

## Common global type packages

| Namespace | Package | Typical source |
|-----------|---------|---------------|
| `google.maps` | `@types/google.maps` | Google Maps JS API |
| `NodeJS` | `@types/node` | Node.js runtime |
| `jest` / `describe` | `@types/jest` | Jest test runner |
| `cypress` | `@types/cypress` | Cypress E2E |
| `gtag` | `@types/gtag.js` | Google Analytics |
