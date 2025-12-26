const chokidar = require('chokidar');
const { spawn } = require('child_process');

console.log('Description 파일 변경 감지 시작...');
console.log('asset 폴더 내의 description.txt 파일 변경을 감지합니다.\n');

// asset 폴더 내의 모든 description.txt 파일 감시
const watcher = chokidar.watch('asset/**/description.txt', {
    ignored: /(^|[\/\\])\../, // 숨김 파일 무시
    persistent: true
});

let isProcessing = false;

watcher
    .on('add', path => {
        console.log(`파일 추가됨: ${path}`);
        generateHTML();
    })
    .on('change', path => {
        console.log(`파일 변경됨: ${path}`);
        generateHTML();
    })
    .on('unlink', path => {
        console.log(`파일 삭제됨: ${path}`);
        generateHTML();
    })
    .on('error', error => console.error('감시 오류:', error))
    .on('ready', () => {
        console.log('초기 스캔 완료. 파일 변경 감지 중...\n');
        // 초기 생성
        generateHTML();
    });

function generateHTML() {
    if (isProcessing) {
        console.log('이미 처리 중입니다. 건너뜁니다.');
        return;
    }
    
    isProcessing = true;
    console.log('\nHTML 생성 중...\n');
    
    const process = spawn('node', ['generate-html.js'], {
        stdio: 'inherit'
    });
    
    process.on('close', (code) => {
        isProcessing = false;
        if (code === 0) {
            console.log('\n✅ HTML 생성 완료!\n');
        } else {
            console.log(`\n❌ 오류 발생 (코드: ${code})\n`);
        }
    });
}

