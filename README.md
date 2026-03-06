# Luna Dial (루나 다이얼)

**스트리머들의 방송 일정 및 각종 컨텐츠 스케줄을 한눈에 확인하고 편하게 관리할 수 있는 사용자(팬) 친화적 웹 캘린더 서비스입니다.**

## 🛠 기술 스택
- **프론트엔드**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **컴포넌트 및 UI**: [shadcn/ui](https://ui.shadcn.com/), Radix UI, Lucide React
- **캘린더 및 날짜 처리**: date-fns
- **백엔드/인증/DB**: Supabase (PostgreSQL, Auth, RLS Policies)
- **빌드 및 호스팅**: Vercel 연동 혹은 Node.js(Docker) 기반 운영 가능

---

## 🚀 로컬 실행 방법

1. **저장소 클론 및 폴더 이동**
   ```bash
   git clone <repository-url>
   cd lunadial
   ```

2. **패키지 의존성 설치**
   ```bash
   npm install
   # 혹은 yarn, pnpm 사용 시:
   # yarn install
   # pnpm install
   ```

3. **환경변수 파일 생성**
   - 최상위 디렉토리에 `.env.local` 파일을 생성한 뒤, [환경변수 설정](#환경변수-설정) 챕터의 양식을 채워 넣습니다.
   
4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

5. **접속**
   - 브라우저를 열고 `http://localhost:3000` 주소로 접속합니다.

---

## 🔑 환경변수 설정

루트 디렉토리의 `.env.local` 템플릿입니다. 자신의 설정(Supabase 대시보드 참고 등)에 맞게 입력해 주세요.

```env
# 기본 애플리케이션 주소 (배포 시 운영될 도메인)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (클라이언트 & 서버 공용 참조)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# (선택 사항) 알림/결제 등 확장 플러그인 연동 정보
# NEXT_PUBLIC_PORTONE_STORE_ID=
# NEXT_PUBLIC_PORTONE_CHANNEL_KEY=
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=
```

> **주의**: `NEXT_PUBLIC_` 접두사가 포함된 키는 성능과 보안상 **클라이언트(브라우저) 환경**에서도 접근 가능하므로, 민감한 관리자 전용 비밀키 등에 절대 달지 않도록 주의해야 합니다.

---

## 📂 주요 폴더 구조

이 프로젝트는 기능과 역할에 따라 다음과 같은 구조를 권장 사항으로 채택하여 분리되어 있습니다.

```text
src/
├── app/             # Next.js App Router 계층 (페이지/라우트 라우터 및 API, 서버 액션)
│   ├── (auth)/      # 로그인, 뷰어 기반 인증 플로우
│   ├── calendar/    # 메인 캘린더 및 필터링 뷰 화면
│   └── actions/     # 서버 사이드 폼 검증, 비즈니스 로직, 데이터 변경 (DB)
├── components/      # 도메인/재사용 분리 모델에 의한 컴포넌트 모음
│   ├── dashboard/   # 메인 대시보드/위젯 전용 리스트 컴포넌트
│   ├── layout/      # 글로벌 레이아웃 (헤더 쉘, 푸터, 네비게이션 트리거 등)
│   └── ui/          # 디자인 시스템 중심의 shadcn-ui 공통 핵심 프리미티브
├── config/          # 상수 데이터 및 환경별 설정 (카테고리 색상 템플릿, Placeholder 등)
├── lib/             # 유틸리티 성격의 공통 헬퍼 (Supabase 클라이언트 생성, 시간 포맷팅 변환 등)
└── types/           # 컴포넌트 간 데이터를 안전하게 중계하는 공통 TypeScript 인터페이스
```

---

## 🛡 운영/배포 시 주의사항

1. **보안/접근 제어 (RLS 및 인증)**:
   - Supabase 스튜디오 (데이터베이스) 내에서 스케줄 테이블(`schedules` 등)에 대한 ** Row Level Security(RLS)** 정책이 필수적으로 동작해야 합니다. (기본 설정은 누구나 Read 가능, 인증된 경우에만 Insert/Update/Delete 개방)
   - 클라이언트 측의 접근 가로채기(Interceptor UI 표출)는 사용자 경험 향상을 위한 것으로, 최종 데이터 조작은 서버 측 `actions` 검증과 DB 단위를 모두 거쳐 이중 검증해야 합니다.

2. **환경 변수/시크릿 키 관리**:
   - `NEXT_PUBLIC` 은 공개되는 값이므로 절대로 프라이빗 키(Private Key)를 삽입해서는 안 됩니다. 서버에서만 사용할 시크릿 토큰과 완전히 분리하십시오. 배포 플랫폼(Vercel 등) 적용 시에도 이중 점검해 주세요.

3. **React 하이드레이션 (Hydration) 충돌**:
   - 뷰어(클라이언트) 단에서 번역기, 패스워드 매니저와 같은 3rd-party 웹 확장프로그램이 DOM 트리를 랜덤으로 조작하면, 서버와 클라이언트의 `id` 또는 구조 매칭이 깨지는 요인이 될 수 있습니다.
   - 컴포넌트 내부(아이콘이나 텍스트 내부)에 임의의 동적인 렌더 처리가 될 법한 구역에는 HTML 정적 `id`를 수동으로 넣거나 클라이언트 전용 조건식(`"use client"` 내부 렌더링 지연)을 주의 깊게 사용해야 합니다.

4. **네트워크 호출 및 화면 동기화 (레이트리밋/캐시)**:
   - CUD(생성, 수정, 삭제) 이후 바로 화면을 동기화하기 위해 커스텀 이벤트 버스(`window.dispatchEvent`)를 던져 다시 상태를 갱신하게 구현되었습니다.
   - 단기적인 운영 상에는 문제없으나, 초당 엄청난 트래픽이 일어난다면 SWR/React-Query와 같은 캐싱 레이어 최적화 및 Rate-Limit 규칙(`src/config`)을 고민해야 합니다.
