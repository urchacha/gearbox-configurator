# 감속기 선정 앱 (Gearbox Configuration)

모터와 감속기를 단계별로 선택하고 최적 사양을 산출하는 웹 애플리케이션입니다.

## 주요 기능

- **5단계 선택 마법사**: 모터 선택 → 사양 확인 → 운전 조건 입력 → 감속기 선택 → 최종 결과
- **자동 계산**: 출력 RPM, 출력 토크, 서비스 팩터 실시간 산출
- **적합성 판정**: SF ≥ 1.2 (적합) / 1.0 ≤ SF < 1.2 (주의) / SF < 1.0 (부적합)
- **부싱 지원**: 모터 축경 < 감속기 홀경일 때 부싱 자동 매칭
- **도면 다운로드**: 2D PDF / 3D STEP / IGS 링크 제공
- **결과 공유**: URL 복사, 이메일 전송, PDF 인쇄

---

## 실행 방법

### 요구사항

- Node.js 18 이상
- npm 9 이상

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
# → http://localhost:5173

# 프로덕션 빌드
npm run build

# 빌드 결과물 미리보기
npm run preview
```

---

## 폴더 구조

```
gearbox-configuration/
├── public/
│   ├── photo/              # 감속기 시리즈 이미지 (PNG)
│   └── drawings/
│       ├── pdf/            # 2D 도면 PDF 파일
│       └── cad/            # 3D CAD 파일 (STEP, IGS)
│
├── scripts/
│   ├── convert_gearbox.cjs # 감속기 CSV → JSON 변환 스크립트
│   └── convert_bushing.cjs # 부싱 CSV → JSON 변환 스크립트
│
├── src/
│   ├── data/
│   │   ├── motors.json     # 모터 DB (3,021개)
│   │   ├── reducers.json   # 감속기 DB (108개 모델)
│   │   ├── bushings.json   # 부싱 DB (24개)
│   │   └── seriesPhotos.ts # 시리즈 → 이미지 파일명 매핑
│   │
│   ├── pages/
│   │   ├── MotorSelectPage.tsx      # Step 1: 모터 선택
│   │   ├── MotorSpecPage.tsx        # Step 2: 모터 사양 확인
│   │   ├── ReducerConditionPage.tsx # Step 3: 운전 조건 / 감속기 조건 설정
│   │   ├── ReducerSelectPage.tsx    # Step 4: 감속기 목록 / 선택
│   │   └── ResultPage.tsx           # Step 5: 최종 결과
│   │
│   ├── store/
│   │   └── selectionStore.ts  # Zustand 전역 상태
│   │
│   ├── types/
│   │   └── index.ts           # TypeScript 타입 정의
│   │
│   ├── utils/
│   │   └── calculations.ts    # 계산 유틸 (토크, RPM, SF, 부싱)
│   │
│   └── components/
│       ├── Layout.tsx
│       └── StepIndicator.tsx
│
└── package.json
```

---

## 데이터 교체 방법

### 1. 모터 데이터 교체 (`src/data/motors.json`)

각 모터 객체의 필드:

```json
{
  "brand": "LS일렉트릭",
  "modelName": "APM-SB04AK",
  "shaftDiameter": 14,
  "ratedPower": 0.4,
  "ratedTorque": 2.7,
  "peakTorque": 8.1,
  "ratedRPM": 1415,
  "maxRPM": 3000,
  "inertia": 0.00025
}
```

| 필드 | 단위 | 설명 |
|------|------|------|
| `shaftDiameter` | mm | 출력 축경 |
| `ratedPower` | kW | 정격 출력 |
| `ratedTorque` | N·m | 정격 토크 |
| `peakTorque` | N·m | 순시 최대 토크 |
| `ratedRPM` | rpm | 정격 회전수 |
| `maxRPM` | rpm | 최대 회전수 |
| `inertia` | kg·m² | 로터 관성 모멘트 |

### 2. 감속기 데이터 교체 (`src/data/reducers.json`)

CSV 파일이 있는 경우 변환 스크립트를 사용합니다:

```bash
# CSV 경로를 스크립트 내 csvPath 변수에 설정 후 실행
node scripts/convert_gearbox.cjs
```

JSON 직접 편집 시 각 모델 필드:

```json
{
  "modelName": "GPB042-3",
  "series": "GPB",
  "size": "042",
  "type": "헬리컬",
  "shaftHoleDiameter": 14,
  "supportedRatios": [3, 5, 10, 15, 20, 25, 30],
  "efficiency": 0.97,
  "maxOutputTorque": 34,
  "maxInputRPM": 3000,
  "weight": 2.1,
  "ratioData": {
    "3":  { "torque": 34, "efficiency": 0.97, "stage": "L1" },
    "5":  { "torque": 34, "efficiency": 0.97, "stage": "L1" },
    "10": { "torque": 34, "efficiency": 0.94, "stage": "L2" }
  },
  "drawings": {
    "pdf":      "GPB042_2D.pdf",
    "cad_step": "GPB042_3D.step",
    "cad_igs":  "GPB042_3D.igs"
  }
}
```

| 필드 | 설명 |
|------|------|
| `shaftHoleDiameter` | 입력축 홀 내경 (mm) — 모터 축경 매칭 기준 |
| `ratioData` | 감속비별 토크(N·m), 효율(0~1), 단수(L1/L2/L3) |
| `drawings` | 도면 파일명 (파일은 `public/drawings/` 하위에 배치) |

### 3. 부싱 데이터 교체 (`src/data/bushings.json`)

CSV가 있는 경우:

```bash
node scripts/convert_bushing.cjs
```

수동 편집 형식:

```json
[
  { "id": "B1", "code": "BU-14-19", "shaftMm": 14, "holeMm": 19, "lenMm": 35 }
]
```

`shaftMm` = 모터 축경, `holeMm` = 감속기 홀경, `lenMm` = 부싱 길이

### 4. 시리즈 이미지 교체

1. PNG 파일을 `public/photo/` 폴더에 추가
2. `src/data/seriesPhotos.ts` 에서 시리즈명 → 파일명 배열 매핑 수정:

```ts
export const seriesPhotos: Record<string, string[]> = {
  GPB: ['GPB.png'],
  GSN: ['GSN.png', 'GSN_alt.png'],  // 여러 이미지 지원
  // ...
};
```

### 5. 도면 파일 추가

- PDF 2D 도면: `public/drawings/pdf/{파일명}.pdf`
- 3D STEP 파일: `public/drawings/cad/{파일명}.step`
- 3D IGS 파일:  `public/drawings/cad/{파일명}.igs`

파일명은 `reducers.json`의 `drawings` 필드에 입력한 이름과 일치해야 합니다.

---

## 계산 공식

| 항목 | 공식 |
|------|------|
| 출력 RPM | 모터 RPM ÷ 감속비 |
| 출력 토크 | 모터 토크 × 감속비 × 효율 |
| 서비스 팩터 | 감속기 정격 토크 ÷ 출력 토크 |
| 적합 판정 | SF ≥ 1.2 적합 / 1.0 ≤ SF < 1.2 주의 / SF < 1.0 부적합 |

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| React | 18 |
| TypeScript | 5 |
| Vite | 6 |
| Tailwind CSS | v4 (`@tailwindcss/vite`) |
| Zustand | 5 |
