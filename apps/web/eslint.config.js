import { config } from "@stagesync/eslint-config/react-internal";
import { webAcl } from "@stagesync/eslint-config/acl";

/** @type {import("eslint").Linter.Config} */
export default [
  { ignores: ["coverage/**", "dist/**"] },
  ...config,
  ...webAcl,
];
