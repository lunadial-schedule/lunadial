import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // [점진적 리팩터링 정책] - existing legacy 코드를 한 번에 부수지 않고,
      // "앞으로 새 코드 짤 때 주의하도록 명시적인 경고(warn)"를 띄운다.

      // 1. any 사용: 완전히 막으면(legacy 수정) 개발이 마비되므로 우선 경고로 통제 유도
      "@typescript-eslint/no-explicit-any": "warn",

      // 2. 미사용 변수: 쓰레기 코드 적재를 막되, 언더바(_)로 시작하면 예외 허용
      "no-unused-vars": "off", // 기본 JS 규칙 끄기 (TS 규칙과 충돌 방지)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ],

      // 3. console.log 전역 오염 방지: 에러/경고성 로그만 허용하고 나머지는 경고
      "no-console": ["warn", { "allow": ["warn", "error"] }],

      // 4. @ts-ignore 등의 편법 방어: 완전히 막진 않고 우선 경고
      "@typescript-eslint/ban-ts-comment": "warn",

      // 5. 타입 임포트 엄격화 (유지보수 향상)
      "@typescript-eslint/consistent-type-imports": "warn",

      // 6. 강한 동치(===, !==) 사용 권장
      "eqeqeq": "warn",

      // 기타 사소한 개발 중 문법 에러를 warn 으로 다운그레이드
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn"
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 임시 테스트 코드/폴더 무시
    "tmp/**",
    "*.js"
  ]),
]);

export default eslintConfig;
