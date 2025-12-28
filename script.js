// 앱 상태 관리
const AppState = {
    attendees: [],
    states: {}, // 각 참석자의 상태를 저장 (0, 1, 2, 3, 'x')
    maxCells: 30,
    audioContext: null,
    
    init() {
        this.loadFromStorage();
        this.initAudio();
        this.renderGrid();
        this.setupEventListeners();
    },
    
    // 오디오 초기화 및 즉시 활성화
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // 오디오 컨텍스트를 즉시 활성화하여 지연 방지
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            // 사용자 인터랙션으로 활성화
            document.addEventListener('click', () => {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
        } catch (e) {
            console.log('Web Audio API를 지원하지 않는 브라우저입니다.');
        }
    },
    
    // 캔 음료수 따는 소리 재생
    playBarkSound() {
        // 강아지 아이콘 애니메이션
        const dogIcon = document.getElementById('dogIcon');
        const barkText = document.getElementById('barkText');
        
        if (dogIcon) {
            dogIcon.classList.add('bark-animation');
            setTimeout(() => {
                dogIcon.classList.remove('bark-animation');
            }, 400);
        }
        
        // 멍멍 텍스트 표시
        if (barkText) {
            barkText.classList.add('show');
            setTimeout(() => {
                barkText.classList.remove('show');
            }, 800);
        }
        
        // 오디오 컨텍스트 활성화 (지연 방지)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // 오디오 파일이 있으면 재생, 없으면 웹 오디오 API로 캔 따는 소리 생성
        const audioFile = new Audio();
        audioFile.src = 'can-open.mp3';
        audioFile.volume = 0.6;
        audioFile.preload = 'auto';
        
        // 즉시 재생 시도
        const playPromise = audioFile.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // 파일이 없거나 재생 실패 시 웹 오디오 API로 캔 따는 소리 생성
                this.generateCanOpenSound();
            });
        } else {
            this.generateCanOpenSound();
        }
    },
    
    // 웹 오디오 API로 캔 음료수 따는 소리 생성
    generateCanOpenSound() {
        if (!this.audioContext) {
            this.initAudio();
        }
        
        if (!this.audioContext) return;
        
        // 오디오 컨텍스트 활성화
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const currentTime = this.audioContext.currentTime;
        
        // 1. "딸각" 소리 (금속 충돌)
        this.playClickSound(currentTime, 2000, 0.02);
        
        // 2. "쉬익" 소리 (가스 방출)
        this.playHissSound(currentTime + 0.01, 0.15);
        
        // 3. "팝" 소리 (압력 해제)
        this.playPopSound(currentTime + 0.12, 0.08);
    },
    
    // 딸각 소리 (클릭 소리)
    playClickSound(startTime, frequency, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.3, startTime + duration);
        
        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    },
    
    // 쉬익 소리 (가스 방출)
    playHissSound(startTime, duration) {
        const noiseBuffer = this.createWhiteNoiseBuffer(0.1);
        const noiseSource = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        
        noiseSource.buffer = noiseBuffer;
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 5;
        
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        noiseSource.start(startTime);
        noiseSource.stop(startTime + duration);
    },
    
    // 팝 소리 (압력 해제)
    playPopSound(startTime, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, startTime + duration);
        
        gainNode.gain.setValueAtTime(0.4, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    },
    
    // 화이트 노이즈 버퍼 생성 (쉬익 소리용)
    createWhiteNoiseBuffer(duration) {
        const sampleRate = this.audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < frameCount; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    },
    
    // 로컬 스토리지에서 데이터 로드
    loadFromStorage() {
        const savedAttendees = localStorage.getItem('busAttendees');
        const savedStates = localStorage.getItem('busAttendeeStates');
        
        if (savedAttendees) {
            this.attendees = JSON.parse(savedAttendees);
        } else {
            // 기본값: 빈 배열로 시작
            this.attendees = Array(this.maxCells).fill('');
        }
        
        if (savedStates) {
            this.states = JSON.parse(savedStates);
        } else {
            // 기본 상태: 모든 셀을 0으로 초기화
            this.states = {};
            for (let i = 0; i < this.maxCells; i++) {
                this.states[i] = 0;
            }
        }
    },
    
    // 로컬 스토리지에 데이터 저장
    saveToStorage() {
        localStorage.setItem('busAttendees', JSON.stringify(this.attendees));
        localStorage.setItem('busAttendeeStates', JSON.stringify(this.states));
    },
    
    // 통계 업데이트
    updateDashboard() {
        let totalCount = 0; // 전체 인원 (이름이 입력된 사람)
        let attendanceCount = 0; // 참석 인원 (상태 1 - 빨강)
        
        for (let i = 0; i < this.maxCells; i++) {
            if (this.attendees[i]) {
                totalCount++;
                const state = this.states[i] || 0;
                if (state === 1) {
                    attendanceCount++;
                }
            }
        }
        
        document.getElementById('totalCount').textContent = totalCount;
        document.getElementById('attendanceCount').textContent = attendanceCount;
    },
    
    // 그리드 렌더링
    renderGrid() {
        const grid = document.getElementById('attendeesGrid');
        grid.innerHTML = '';
        
        // 세로 순서로 채우기: 3열 10행 그리드에서 세로 방향으로
        // 첫 번째 열: 0, 10, 20, ..., 27
        // 두 번째 열: 1, 11, 21, ..., 28
        // 세 번째 열: 2, 12, 22, ..., 29
        const cols = 3;
        const rows = 10;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // 세로 순서로 데이터 인덱스 계산: col * rows + row
                const dataIndex = col * rows + row;
                
                const cell = document.createElement('div');
                cell.className = 'attendee-cell';
                cell.dataset.index = dataIndex;
                
                const name = this.attendees[dataIndex] || '';
                const state = this.states[dataIndex] || 0;
                
                if (!name) {
                    cell.classList.add('empty');
                    cell.textContent = '';
                } else {
                    cell.textContent = name;
                    cell.classList.add(`state-${state}`);
                }
                
                // 빈 셀도 클릭 가능하게 하되, 상태 변경은 안 됨
                cell.addEventListener('click', () => this.handleCellClick(dataIndex));
                
                grid.appendChild(cell);
            }
        }
        
        // 대시보드 업데이트
        this.updateDashboard();
    },
    
    // 셀 클릭 핸들러
    handleCellClick(index) {
        // 빈 셀은 클릭해도 반응 없음
        if (!this.attendees[index]) {
            return;
        }
        
        const currentState = this.states[index] || 0;
        
        // 상태 순환: 0 -> 1 -> 2 -> 3 -> 'x' -> 0
        let nextState;
        if (currentState === 0) {
            nextState = 1;
        } else if (currentState === 1) {
            nextState = 2;
        } else if (currentState === 2) {
            nextState = 3;
        } else if (currentState === 3) {
            nextState = 'x';
        } else if (currentState === 'x') {
            nextState = 0;
        }
        
        this.states[index] = nextState;
        this.saveToStorage();
        this.updateDashboard();
        this.playBarkSound();
        this.renderGrid();
    },
    
    // 참석자 입력
    setAttendees(names) {
        // 입력받은 이름들을 배열로 변환
        const nameArray = names
            .split(',')
            .map(name => name.trim())
            .filter(name => name.length > 0 && name.length <= 4); // 4글자 제한
        
        // 30개 셀에 맞춰 배열 초기화
        this.attendees = Array(this.maxCells).fill('');
        
        // 이름들을 채워넣기
        for (let i = 0; i < Math.min(nameArray.length, this.maxCells); i++) {
            this.attendees[i] = nameArray[i];
            // 새로운 참석자의 상태를 0으로 초기화
            if (!(i in this.states)) {
                this.states[i] = 0;
            }
        }
        
        this.saveToStorage();
        this.renderGrid();
    },
    
    // 초기화: 모든 상태를 0으로 리셋
    resetStates() {
        for (let i = 0; i < this.maxCells; i++) {
            if (this.attendees[i]) {
                this.states[i] = 0;
            }
        }
        this.saveToStorage();
        this.updateDashboard();
        this.renderGrid();
    },
    
    // 가나다 순 정렬
    sortByName() {
        // 이름과 인덱스를 함께 저장
        const nameWithIndex = this.attendees
            .map((name, index) => ({
                name: name,
                index: index,
                state: this.states[index] || 0
            }))
            .filter(item => item.name); // 빈 항목 제외
        
        // 이름으로 정렬 (가나다 순)
        nameWithIndex.sort((a, b) => {
            return a.name.localeCompare(b.name, 'ko');
        });
        
        // 정렬된 순서로 배열 재구성
        const newAttendees = Array(this.maxCells).fill('');
        const newStates = {};
        
        for (let i = 0; i < this.maxCells; i++) {
            if (i < nameWithIndex.length) {
                newAttendees[i] = nameWithIndex[i].name;
                newStates[i] = nameWithIndex[i].state;
            } else {
                newAttendees[i] = '';
                newStates[i] = 0;
            }
        }
        
        this.attendees = newAttendees;
        this.states = newStates;
        this.saveToStorage();
        this.renderGrid();
    },
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // 참석자 입력 버튼
        document.getElementById('editAttendeesBtn').addEventListener('click', () => {
            this.openEditModal();
        });
        
        // 가나다 순 정렬 버튼
        document.getElementById('sortBtn').addEventListener('click', () => {
            this.sortByName();
        });
        
        // 초기화 버튼
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetStates();
        });
        
        // 모달 관련
        const modal = document.getElementById('editModal');
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const saveBtn = document.getElementById('saveAttendeesBtn');
        
        closeBtn.addEventListener('click', () => this.closeEditModal());
        cancelBtn.addEventListener('click', () => this.closeEditModal());
        saveBtn.addEventListener('click', () => this.saveAttendees());
        
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEditModal();
            }
        });
        
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                this.closeEditModal();
            }
        });
    },
    
    // 편집 모달 열기
    openEditModal() {
        const modal = document.getElementById('editModal');
        const input = document.getElementById('attendeesInput');
        
        // 현재 참석자 목록을 텍스트로 변환
        const currentNames = this.attendees
            .filter(name => name)
            .join(', ');
        
        input.value = currentNames;
        modal.classList.add('show');
        
        // 포커스 설정
        setTimeout(() => {
            input.focus();
        }, 100);
    },
    
    // 편집 모달 닫기
    closeEditModal() {
        const modal = document.getElementById('editModal');
        modal.classList.remove('show');
    },
    
    // 참석자 저장
    saveAttendees() {
        const input = document.getElementById('attendeesInput');
        const names = input.value.trim();
        
        if (names) {
            this.setAttendees(names);
        } else {
            // 빈 값이면 모든 참석자 제거
            this.attendees = Array(this.maxCells).fill('');
            this.states = {};
            for (let i = 0; i < this.maxCells; i++) {
                this.states[i] = 0;
            }
            this.saveToStorage();
            this.renderGrid();
        }
        
        this.closeEditModal();
    }
};

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    
    // 첫 사용자 인터랙션에서 오디오 컨텍스트 활성화 (지연 방지)
    const enableAudio = () => {
        if (AppState.audioContext && AppState.audioContext.state === 'suspended') {
            AppState.audioContext.resume();
        }
    };
    
    // 다양한 사용자 인터랙션에서 오디오 활성화
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
});

// 터치 이벤트 최적화 (모바일)
let touchStartTime = 0;
document.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
}, { passive: true });

// 스크롤 방지 (모바일에서 스크롤이 의도치 않게 발생하는 것 방지)
let lastTouchY = 0;
document.addEventListener('touchmove', (e) => {
    const touchY = e.touches[0].clientY;
    const touchTarget = e.target;
    
    // 모달 내부의 textarea는 스크롤 허용
    if (touchTarget.tagName === 'TEXTAREA') {
        return;
    }
    
    // 세로 스크롤 제한
    if (Math.abs(touchY - lastTouchY) > 10) {
        e.preventDefault();
    }
    lastTouchY = touchY;
}, { passive: false });




