# Digital Workshop 2

## Description 파일 자동 업데이트

`asset` 폴더 내의 각 에피소드 폴더에 있는 `description.txt` 파일을 읽어서 HTML을 자동으로 생성합니다.

## 사용 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. HTML 생성

description 파일을 읽어서 HTML을 생성합니다:

```bash
npm run generate
```

### 3. 파일 변경 감지 (자동 업데이트)

description.txt 파일이 변경되면 자동으로 HTML을 업데이트합니다:

```bash
npm run watch
```

## Description 파일 형식

각 에피소드 폴더의 `description.txt` 파일은 다음 형식을 따릅니다:

```
제목: 에피소드 제목
설명: 에피소드 설명 (140자 초과 시 Read more 버튼 표시)
디자이너: 디자이너 이름 (선택사항)
링크: YouTube 또는 외부 링크 (선택사항)
```

## 이미지 및 영상

- `thumbnail.jpg` 파일이 있으면 썸네일 이미지를 표시합니다.
- 썸네일이 없고 `링크`에 YouTube URL이 있으면 영상 embed를 표시합니다.
- 둘 다 없으면 기본 플레이스홀더 이미지를 표시합니다.

