import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // eslint-plugin-react-hooks v7 (pulled in by eslint-config-next 16)
    // bundles the former eslint-plugin-react-compiler rules into its
    // "recommended" preset. They flag patterns that only matter once the
    // React Compiler is actually enabled (it isn't — no `reactCompiler` in
    // next.config.ts) — e.g. the ordinary "fetch on mount" `useEffect(() =>
    // { load() }, [])` pattern used throughout this codebase trips
    // set-state-in-effect. Revisit if/when this app adopts the compiler.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
