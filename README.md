# Luna Dial (루나 다이얼)

**스트리머들의 방송 및 컨텐츠 일정을 한눈에 확인하고 편하게 관리할 수 있는 팬 친화적 웹 캘린더 서비스입니다.**

---

## 🚀 1. 프로젝트 개요

### ✨ 핵심 기능 (현재 제공 중)
* **일반 사용자 기능**: 
  - 다양한 뷰(대시보드, 캘린더)를 통한 일정 조회
  - 개별 스트리머 즐겨찾기 (관심 채널 모아보기)
  - 자신이 생성한 일정의 추가 / 수정 / 삭제
* **관리자 기능**:
  - 공지사항 및 시스템 로그 관리

### ⌨️ 기술 스택
* **Front-end**: Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
* **Back-end & DB**: Supabase (PostgreSQL, Auth, RLS Policies)
* **CI / 자동화**: GitHub Actions (Lint, Typecheck, Build 사전 검증)
* **State & Data**: React Hooks, Server Actions
* **Utility**: date-fns (시간 처리)

---

## 💻 2. 로컬 실행 방법

저장소를 클론한 이후 아래 방법을 통해 로컬 개발 환경을 세팅할 수 있습니다.

```bash
# 1. 의존성 설치
npm install

# 2. 필수 환경변수 설정 (아래 3. 환경변수 설정 참조)
# 최상위 경로에 .env.local 생성 후 값 입력

# 3. 브라우저에서 사용할 개발 서버 실행
npm run dev

# 4. 배포/커밋 전 안정성 점검 (선택)
npm run lint
npx tsc --noEmit
```

### 📍 로컬에서 확인 가능한 주요 라우트
- **`http://localhost:3000/`** : 사용자 메인 페이지 (대시보드 / Today)
- **`/calendar`** : 달력 형태의 전체 뷰
- **`/settings/account`** : 계정 관리 및 삭제
- **`/admin/logs`** : (관리자 한정) 시스템 로그 및 액션 히스토리

---

## 🔐 3. 환경변수 설정 (`.env.local`)

이 프로젝트는 Supabase 및 여러 연동 키를 필요로 합니다. 
최상위에 `.env.local` 파일을 생성하여 아래 항목들을 채워넣어야 정상 동작합니다.

### 핵심 환견변수 설명
1. **`NEXT_PUBLIC_APP_URL`**: 
   - OAuth 리다이렉트나 내부 공유 링크를 만들 때 기준이 되는 앱 호스트 주소입니다. 로컬에서는 `http://localhost:3000`을 씁니다.
2. **Supabase (클라이언트/서버 공용)**
   - `NEXT_PUBLIC_SUPABASE_URL`: 프로젝트 주소
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (또는 `ANON_KEY`): 브라우저 및 일반 서버 통신용 공개 키
3. **Supabase 관리자 (서버 전용, 절대 노출 금지)**
   - `SUPABASE_SECRET_KEY` (또는 `SERVICE_ROLE_KEY`): RLS를 우회할 수 있는 최고 권한 키 (`supabase/admin.ts`에서 시스템/백필 처리용으로만 사용)
4. **`ADMIN_OPS_TOKEN`**:
   - `api/admin/system/*` 하위의 내부 백엔드 스크립트를 클라이언트 브라우저가 함부로 찌르지 못하게 차단(Authorization Header)하는 내부 암호 토큰입니다.

---

## 📂 4. 주요 폴더 구조

프로젝트는 유지보수를 위해 역할에 따라 다음과 같이 폴더가 격리되어 있습니다.

```text
src/
├── app/                  # Next.js UI 레이어 (경로 및 페이지)
│   ├── api/              # 외부 접근 가능한 공용 API
│   │   └── admin/system/ # [격리된 폴더] 시스템 관리자용 내부 API (일반 호출 금지)
│   ├── actions/          # [핵심] 일반 사용자 대상 Server Actions (DB 접근)
│   └── (routes)/         # 메인, /calendar, /admin 등의 페이지 진입점
│
├── components/           # UI 컴포넌트
│   ├── ui/               # 기본 디자인 시스템 컴포넌트(shadcn)
│   └── admin/system/     # [격리된 컴포넌트] 관리자 기능 전용 UI (일반 UI와 격리)
│
├── lib/                  # 공통 유틸 및 핵심 설정
│   └── supabase/         # [주의] client.ts / server.ts / admin.ts 클라이언트 분리 명시
│
├── services/             # API 통신 또는 복잡한 서드파티 컨트롤 로직
│   └── admin/            # 시스템 관리 목적의 서비스
└── hooks/                # 클라이언트 사이드 공통 로직 (예: use-history-dialog 등)
```

---

## 👤 5. 인증 및 권한 구조

1. **일반 사용자 로그인 흐름**: Supabase Auth (주로 Google OAuth)를 사용하여 로그인하며 세션 쿠키가 발급됩니다.
2. **관리자(Admin) 권한 판단**: 로그인된 계정의 프로필이나 DB 속성(role)을 확인하여 일반 사용자, Pro, 관리자 등급을 나눕니다. UI 사이드메뉴 표시와 Server Action 허용 여부에 이 권한이 연동됩니다. (권한은 서버에서 최종 검증)
3. **서버-서버, 스크립트 관리자 인증 (`ADMIN_OPS_TOKEN`)**: `src/app/api/admin/system/*` 라우트는 사용자의 브라우저 세션과 별개로 서버 운영 스크립트에서 직접 맞찌를 때 사용됩니다. 이곳은 `x-admin-token` 헤더와 환경변수 일치 여부를 대조해 강하게 방어(`admin-auth.ts`)합니다.

---

## 🏛 6. 데이터 아키텍처 및 통신 흐름

이 프로젝트의 비즈니스 처리는 **UI ➡️ Server Action ➡️ Supabase(DB)** 흐름을 지향합니다.

* **UI (클라이언트)**: 페이지는 UI 렌더링과 모달 호출 상태만 관장합니다. 변경 요청이 생기면 순수 Fetch를 매번 쓰는 대신 Next.js의 Server Action(`actions/`)을 호출합니다. (일부 연동 기능만 `services/`를 거침)
* **Server Action (`actions/schedules.ts`)**: 클라이언트의 조작 위조를 막기 위해 세션 검증, 권한 검증, 입력 데이터 정규화 처리를 수행한 후 Supabase Server Client를 통해 DB에 쿼리합니다.
* **Supabase 분리 규칙**:
  - 클라이언트 로직: `lib/supabase/client.ts`
  - 서버 액션, API: `lib/supabase/server.ts` (현재 요청한 유저 쿠키의 RLS에 따름)