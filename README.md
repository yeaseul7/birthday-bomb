# Birthday Bomb

생일빵 콘셉트의 인터랙티브 웹앱입니다.  
사진을 터치해 타격 횟수를 올리고, 똥/케이크 특수 버튼으로 전용 애니메이션과 반응 컷을 보여줍니다.

## 주요 기능

- 사진 탭/클릭 타격 + 누적 횟수 저장
- 실시간 랭킹(모바일은 접기/펼치기 지원)
- 특수 공격:
  - `pow.png` 투척 → `14.png` 반응 컷
  - `cake.png` 투척 → `13.png` 반응 컷
- 전역 특수 카운터:
  - 보석이가 똥 맞은 횟수(`powCount`)
  - 보석이가 케이크 맞은 횟수(`cakeCount`)
- 매크로 의심 입력 감지 시 패널티 및 declaration 로그 기록

## 기술 스택

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Firebase Firestore

## 로컬 실행

```bash
npm install
npm run dev
```

- 개발 서버: `http://localhost:417`

## 스크립트

```bash
npm run dev       # 개발 서버 (turbopack, 417 포트)
npm run dev:clean # .next 삭제 후 개발 서버
npm run lint      # ESLint
npm run build     # 프로덕션 빌드
npm run start     # 프로덕션 서버 (417 포트)
```

## 환경 변수

Firebase 웹 SDK 설정이 필요합니다. `.env.local`에 아래 키를 설정하세요.

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## Firestore 구조

- `jew/main/user/{userDocId}`
  - 유저 이름, 개인 타격 누적
- `jew/main/special/totals`
  - `powCount`, `cakeCount` 전역 특수 카운트
- `jew/main/declaration/{autoId}`
  - 매크로 감지 로그(`hitCount`, `userDocId`, `createdAt`)
- `jew/main/letter/{letterId}`
  - 편지 데이터

## Firestore Rules 배포

`firestore.rules`를 수정했다면 아래를 실행해 반영하세요.

```bash
firebase deploy --only firestore:rules
```

## 프로젝트 구조 (요약)

```text
app/
  components/
    PunchArena.tsx
    HitCountLeaderboard.tsx
    PlayerNameForm.tsx
    LetterMessageFab.tsx
lib/
  firebase.ts
  jewUserFirestore.ts
  jewSpecialCounters.ts
  jewDeclarationFirestore.ts
  jewReactions.ts
firestore.rules
```
