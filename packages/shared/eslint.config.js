import { config } from "@stagesync/eslint-config/base";
import { sharedAcl } from "@stagesync/eslint-config/acl";

/** @type {import("eslint").Linter.Config} */
export default [...config, ...sharedAcl];
