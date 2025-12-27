// 앱 상태 관리
const AppState = {
    attendees: [],
    states: {}, // 각 참석자의 상태를 저장 (0, 1, 2, 3, 'x')
    maxCells: 30,
    
    init() {
        this.loadFromStorage();
        this.renderGrid();
        this.setupEventListeners();
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
    
    // 그리드 렌더링
    renderGrid() {
        const grid = document.getElementById('attendeesGrid');
        grid.innerHTML = '';
        
        for (let i = 0; i < this.maxCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'attendee-cell';
            cell.dataset.index = i;
            
            const name = this.attendees[i] || '';
            const state = this.states[i] || 0;
            
            if (!name) {
                cell.classList.add('empty');
                cell.textContent = '';
            } else {
                cell.textContent = name;
                cell.classList.add(`state-${state}`);
            }
            
            // 빈 셀도 클릭 가능하게 하되, 상태 변경은 안 됨
            cell.addEventListener('click', () => this.handleCellClick(i));
            
            grid.appendChild(cell);
        }
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




