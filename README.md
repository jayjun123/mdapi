# Breadboard AI Builder

브레드보드 스타일의 모듈형 AI 빌더 프로젝트입니다. 사용자는 **칩(노드)** 을 캔버스에 배치하고, **포트** 를 연결해 AI/자동화 워크플로우를 구성할 수 있습니다.

이 프로젝트는 다음 레이어로 구성됩니다.
- **UI**: React Flow 기반 캔버스(보드) + 우측 칩 보관함 + 하단 인스펙터 + 상단 툴바
- **Core**: 보드 데이터 모델 / 연결 규칙 검증 / 실행 엔진(mock) / 직렬화/복원
- **Offline App**: Capacitor로 `out/` 정적 번들을 앱에 내장(오프라인 필수)

---

## 빠른 시작(웹)

```bash
cd "d:\모듈러P\breadboard-ai-builder"
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

---

## Windows 데스크톱 (.exe, Electron)

정적 `out/`을 내장한 Electron 앱으로 패키징합니다.

```bash
npm run electron:pack
```

- **포터블 실행 파일**: `dist-electron/BreadboardAIBuilder 0.1.0.exe` (설치 없이 실행)
- **설치형**: `dist-electron/BreadboardAIBuilder Setup 0.1.0.exe`
- **압축 해제만**: `dist-electron/win-unpacked/BreadboardAIBuilder.exe`

로컬에서 창만 띄워 보려면: `npm run electron:dev`

> 코드 서명이 없는 환경에서는 `CSC_IDENTITY_AUTO_DISCOVERY=false`로 서명 단계를 건너뜁니다(`electron:pack`에 이미 포함).

### UI는 어디까지 들어가나요?

- **앱 안 화면**(캔버스·패널·모달 등): 전부 **웹 UI(React)** 그대로 exe에 포함됩니다. 브라우저에서 보던 것과 동일한 레이아웃·스타일입니다.
- **창·작업 표시줄**: `electron/main.cjs`에서 다크 배경색, 메뉴바 자동 숨김, 시스템 다크 테마 선호 등을 적용해 두었습니다.
- **아이콘·설치 마법사 이미지**: `build/icon.ico`(또는 `icon.png`)와 NSIS 옵션으로 넣을 수 있습니다. 안내는 `build/README.txt` 참고.
- **브라우저 탭 파비콘**: Next에서 `src/app/icon.png` 등을 추가하면 웹·정적 호스트에서 탭 아이콘이 바뀝니다.

---

## 사용 방법(기본 흐름)

### 1) 칩 추가
- 우측 **칩 보관함**에서 칩 카드를 **드래그**해서 중앙 캔버스에 **드롭**합니다.

### 2) 포트 연결
- **OUTPUT → INPUT**만 연결할 수 있습니다.
- 연결 중/연결 시 즉시 규칙 검사가 적용되며 색으로 피드백됩니다.
  - **allow**: 가능(초록)
  - **warn**: 경고와 함께 가능(노랑) — 예: ANY 포함
  - **adapter**: 변환칩 필요(주황) — MVP 정책상 직접 연결은 불가, 어댑터 타입 제안
  - **deny**: 불가(빨강)

### 3) 하단 인스펙터 확인
- **설정**: 칩 config 수정
- **포트**: 포트 목록/required/multi 확인
- **연결 규칙**: 마지막 검증 결과/어댑터 제안 확인
- **로그**: 실행/검증 로그 확인

### 4) 실행
- 상단 **실행** 버튼을 누르면 보드 전체 검증 후 mock 실행을 수행합니다.

---

## MVP 정책(엄격)

- **데이터 루프 금지**
- **이벤트 루프 금지**
- **시작칩 없음 = error(실행 불가)**
- **EVT는 EVT끼리만 연결 가능**

---

## 오프라인 앱(Capacitor)

이 프로젝트는 오프라인 필수 요구사항을 위해 Next.js를 **정적 export**로 고정했습니다.

### 오프라인 번들 갱신(가장 중요)

```bash
npm run cap:sync
```

이 스크립트는:
- `next build`로 `out/` 생성
- `cap sync`로 `out/`을 `android/`, `ios/` 네이티브 프로젝트로 복사

### Android 열기

```bash
npm run cap:open:android
```

### iOS 열기

```bash
npm run cap:open:ios
```

주의: **iPA 생성/서명은 Mac + Xcode 환경이 필요**합니다(Windows에서는 iOS ipa 빌드 불가).

---

## 주요 폴더(현재 프로젝트 기준)

```txt
src/
  app/                Next.js App Router 엔트리
  components/         UI(보드/사이드바/인스펙터/툴바)
  lib/                도메인 로직(칩 레지스트리/규칙/검증/실행 등)
  store/              Zustand 보드 상태
```

---

## 다음 TODO(추천)
- 저장/불러오기(export/import) UI 연결
- 어댑터 제안 UX(클릭으로 변환칩 추가/자동 삽입)
- 데모 보드 프리셋(검색 보강, 분류 후 라우팅) 추가
