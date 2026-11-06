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


## 회원가입·로그인·비밀번호 재설정

- 이름(예: 홍길동), 이메일, 비밀번호(8~128자), 비밀번호 확인으로 가입한 후 로그인 화면으로 이동합니다. 로그인은 이름과 비밀번호를 사용하고 이메일은 비밀번호 찾기에 사용합니다. 이름은 중복할 수 없으며 앞뒤 공백, 유니코드 표기와 영문 대소문자를 정규화해 비교합니다. 이름·이메일의 중복 검사는 저장소에서 원자적으로 수행합니다.
- 로그인 후 프로필이 없으면 닉네임(2~20자), 성별, 나이(1~120세)를 입력합니다. 로그인하지 않으면 여행 페이지 대신 로그인 화면으로 이동합니다. 로그인은 이름과 비밀번호를 사용하고 이메일은 비밀번호 찾기에 사용합니다. 이름은 중복할 수 없으며 앞뒤 공백, 유니코드 표기와 영문 대소문자를 정규화해 비교합니다. 이름·이메일의 중복 검사는 저장소에서 원자적으로 수행합니다.
- 비밀번호는 salt + scrypt 해시로만 저장합니다. 세션은 무작위 토큰의 해시를 저장하고 브라우저에는 HttpOnly / SameSite=Lax 쿠키를 발급합니다. Vercel에서는 Secure를 적용합니다. 세션은 7일입니다.
- 로컬 단일 서버는 Git에서 제외한 .data/auth.json에 계정을 보관합니다. Vercel은 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN이 없으면 계정 기능을 중단합니다. 기존 사이트 계정은 이 저장소에 없으므로 자동 이전되지 않습니다. 이전 인증 저장소 연동/데이터 이전은 별도 필요합니다.
- 비밀번호 재설정에는 RESEND_API_KEY, 인증된 발신 주소 AUTH_FROM_EMAIL, 사이트의 HTTPS 주소 AUTH_PUBLIC_URL이 필요합니다. 예: AUTH_PUBLIC_URL=https://trip-mate-kappa-seven.vercel.app. Vercel 서버 환경변수에만 등록하세요.
- 이메일은 Resend API로 전송합니다. 재설정 토큰은 해시로 저장되고 30분 후 만료되며 한 번만 사용 가능합니다. 링크의 토큰은 URL fragment로 전달하고 재설정 페이지에서 즉시 주소창에서 지웁니다. 변경 시 기존 세션을 모두 무효화합니다.
- 로그인과 가입 요청, 비밀번호 재설정에 서버 호출 제한을 적용합니다. 재설정 요청 응답은 등록 여부를 직접 밝히지 않습니다. 이메일 소유 확인을 통한 신규 가입 인증은 아직 제공하지 않습니다.
- 로컬 파일 저장은 단일 프로세스 개발용이며 여러 프로세스/공개 배포에는 사용하지 마세요. 계정 데이터를 public 폴더에 넣지 마세요.

이름 로그인 변경 전에 생성한 계정은 이름 인덱스를 추가해야 합니다. 기존 인증 저장소가 연결되지 않은 상태이므로 이번 변경으로 이전 사이트 계정이 자동 복구되지는 않습니다.
