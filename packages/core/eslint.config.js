import baseConfig from "@loopos/config/eslint/base.js";

export default [...(Array.isArray(baseConfig) ? baseConfig : [baseConfig])];
