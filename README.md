# Trip Mate

파란색 테마의 여행 안내 사이트. 이동 방법, 호텔 추천, 주변 맛집 추천의 3개 페이지를 제공합니다.

## 실행

Node.js 20 이상에서 별도 의존성 설치 없이 실행합니다.

```sh
cd /workspace/rlarndnjs
node server.js
```

기본 포트는 3001입니다. PORT 환경변수로 변경할 수 있습니다. Google API 키나 결제 등록은 필요하지 않습니다.

## 무료 장소 검색

`GET /api/recommendations?destination=부산역&category=hotel`

- category: hotel, resort, guesthouse, restaurant, cafe, snack (간편식/패스트푸드).
- Nominatim으로 명시적으로 제출한 도착지를 좌표로 바꾸고, Overpass로 반경 5km의 OSM 장소를 검색합니다.
- 이름이 있는 장소를 직선거리순 최대 12개 표시합니다. 주소가 없는 장소는 등록된 주소 없음으로 표시합니다.
- 넓은 도시명을 입력하면 검색된 대표 좌표 주변을 조회하므로 역명이나 상세 주소를 입력하는 편이 좋습니다. 검색 기준 주소를 화면에 표시합니다.
- 평점, 가격, 예약 가능 여부, 영업 여부는 제공하지 않습니다. OSM의 지역별 데이터 밀도에 따라 결과가 적거나 없을 수 있습니다.
- 지도 링크는 OpenStreetMap으로 연결하며 화면에 © OpenStreetMap contributors / ODbL 출처를 표시합니다.
- 주소와 결과를 프로세스 메모리에 최대 200건, 24시간 캐시합니다. 같은 요청을 병합하고 Nominatim 호출은 프로세스당 1.1초, Overpass는 2초 간격으로 제한합니다. 초과 요청은 429와 Retry-After를 반환합니다. 자동완성이나 자동 재시도는 하지 않습니다.
- 목적지는 외부 지도 서비스에 전달됩니다. 민감한 정보를 입력하지 마세요. 출발지와 도착지는 URL 쿼리와 현재 탭의 sessionStorage에도 유지됩니다.

### 공용 API 정책 및 운영 범위

공용 API는 무료이지만 가용성이 보장되지 않습니다. 현재 구현은 소규모 단일 Node 서버용입니다. 메모리 캐시와 호출 제한은 여러 인스턴스 사이에서 공유되지 않습니다. **여러 서버리스 인스턴스가 실행되는 공개 배포 전에는 공유 캐시·전역 속도 제한 또는 전용 제공자/자체 서버가 필요합니다.** Nominatim의 초당 1회 제한은 앱 전체에서 준수해야 합니다. 서버 식별 User-Agent는 저장소 URL을 사용합니다.

정책: https://operations.osmfoundation.org/policies/nominatim/
Overpass: https://wiki.openstreetmap.org/wiki/Overpass_API
출처/라이선스: https://www.openstreetmap.org/copyright

## 배포

기존 Vercel 사이트와 이 저장소의 연결 및 배포 권한은 확인되지 않았습니다. 서버리스 배포 전 위의 공유 제한을 마련해야 합니다. 이동 방법은 별도 유료 API 호출 없이 Google Maps 길찾기 링크로 연결됩니다.


## Vercel 실행 설정

`vercel.json`에서 정적 출력 경로를 public, 빌드를 npm run build로 지정합니다. api/recommendations.js는 Node.js 함수로 실행되며 최대 실행 시간은 60초로 지정합니다. Node.js 24.x를 사용합니다.

Vercel 공개 추천에는 공유 저장소가 필요합니다. Upstash Redis REST 환경변수 UPSTASH_REDIS_REST_URL과 UPSTASH_REDIS_REST_TOKEN을 서버 환경변수로 설정하세요. 무료 요금제의 현재 한도를 확인하세요. 키를 코드에 넣지 마세요. 공유 저장소가 있으면 24시간 결과 캐시와 원자적 전역 호출 제한을 사용합니다. 공유 저장소가 없거나 장애가 나면 공용 지도 API를 호출하지 않습니다. 추천을 사용할 수 없을 때도 외부 지도 검색 버튼을 제공합니다. 로컬 단일 서버는 기존 메모리 캐시를 사용할 수 있습니다.

배포 검증: /, /hotels.html, /restaurants.html, /assets/app.js가 정상 응답하는지 확인하세요. /api/recommendations?destination=부산역&category=hotel은 저장소가 없으면 안내 JSON(503)을, 설정된 경우 장소 결과 또는 외부 API 오류를 반환합니다.


## 현재 탭 전용 임시 회원가입

- 회원가입 필드는 이름(예: 홍길동), 이메일, 비밀번호(8~128자), 비밀번호 재입력입니다. 가입 후 로그인 화면으로 이동하고 같은 탭에서 이름과 비밀번호로 로그인합니다.
- 로그인 후 닉네임·성별·나이를 입력합니다. 프로필과 로그인 상태도 현재 탭의 sessionStorage에서만 유지됩니다. 로그아웃 후 같은 탭에서는 다시 로그인할 수 있습니다.
- 가입·로그인·프로필 요청은 서버로 보내지 않습니다. 계정 정보는 데이터베이스, 쿠키, localStorage에 기록하지 않습니다. 비밀번호 원문 대신 무작위 salt와 PBKDF2-SHA256(600,000회) 해시를 sessionStorage에 보관합니다. HTTPS 또는 localhost가 필요합니다.
- 새 탭이나 다른 기기에서는 같은 계정을 사용할 수 없습니다. 브라우저 탭 복제/복원 기능은 sessionStorage를 복원하거나 복사할 수 있습니다. 확실히 지우려면 화면의 임시 정보 삭제 버튼을 사용하세요. 외부 링크에는 noopener를 적용합니다.
- 탭을 닫으면 일반적으로 임시 정보가 사라집니다. 영구 계정이나 서버 측 인증이 아니므로 민감한 데이터의 접근 통제로 사용하면 안 됩니다.
- 비밀번호를 잊어버렸을 때 이메일 전송/복구는 제공하지 않습니다. 비밀번호 찾기에서 확인 후 임시 가입 정보와 프로필을 지우고 다시 가입할 수 있습니다. 초기화는 비밀번호 확인을 우회해 기존 프로필에 로그인하는 기능이 아닙니다.
- 이전 서버 인증 API는 410을 반환하며 계정을 저장하지 않습니다. 회원 기능에는 Upstash/Resend/API 키가 필요하지 않습니다. 주변 장소 API는 앞서 설명한 공유 저장소 요구사항이 별도로 적용됩니다.
- 기존 서버나 브라우저의 이전 계정 데이터는 자동 이전/삭제하지 않습니다. 이 구현 이전의 영구 계정과는 별개입니다.

## Vercel 실행 설정

`vercel.json`에서 정적 출력 경로 public, 빌드 npm run build를 지정합니다. Node.js 24.x를 사용합니다. `/api/recommendations`는 최대 60초 함수입니다.

공개 추천을 위해 Upstash Redis REST 환경변수 UPSTASH_REDIS_REST_URL과 UPSTASH_REDIS_REST_TOKEN을 서버 환경변수로 설정하세요. 공유 저장소가 없으면 추천 API 대신 지도 검색을 제공합니다. 임시 회원가입·로그인에는 이 설정이 필요하지 않습니다.
