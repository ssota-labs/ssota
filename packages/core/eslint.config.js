import baseConfig from "@ssota/config/eslint/base.js";
import { coreIsolation } from "@ssota/config/eslint/boundaries.js";

// coreIsolation은 base의 no-restricted-imports를 core 전용(더 엄격한) 설정으로 교체한다 [ARCH-01]
export default [...baseConfig, ...coreIsolation];
