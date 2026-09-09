// 전역 상태 변수
let currentDate = new Date();
let events = JSON.parse(localStorage.getItem('assessments')) || [];

// DOM 요소
const calendarTitle = document.getElementById('calendarTitle');
const calendarDays = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const addEventForm = document.getElementById('addEventForm');
const eventDateInput = document.getElementById('eventDate');
const eventTitleInput = document.getElementById('eventTitle');
const eventList = document.getElementById('eventList');
const imageInput = document.getElementById('imageInput');
const scanBtn = document.getElementById('scanBtn');
const statusMessage = document.getElementById('statusMessage');

// 초기화 실행
document.addEventListener('DOMContentLoaded', () => {
  renderCalendar();
  renderEventList();
  requestNotificationPermission();
  checkTodayEvents();
});

// 달력 렌더링
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  calendarTitle.textContent = `${year}년 ${month + 1}월`;
  calendarDays.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // 이전 달 빈 칸
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('day-cell', 'empty');
    calendarDays.appendChild(emptyCell);
  }

  // 현재 달 날짜
  const today = new Date();
  for (let day = 1; day <= lastDate; day++) {
    const dayCell = document.createElement('div');
    dayCell.classList.add('day-cell');

    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;

    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    ) {
      dayCell.classList.add('today');
    }

    const dayNumber = document.createElement('span');
    dayNumber.classList.add('day-number');
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);

    // 해당 날짜의 수행평가 표시
    const dayEvents = events.filter(e => e.date === dateString);
    dayEvents.forEach(evt => {
      const tag = document.createElement('div');
      tag.classList.add('event-tag');
      tag.textContent = evt.title;
      dayCell.appendChild(tag);
    });

    calendarDays.appendChild(dayCell);
  }
}

// 월 이동 이벤트
prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// 수동 이벤트 추가
addEventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const date = eventDateInput.value;
  const title = eventTitleInput.value.trim();

  if (date && title) {
    addEvent(date, title);
    eventTitleInput.value = '';
  }
});

function addEvent(date, title) {
  events.push({ id: Date.now(), date, title });
  saveAndRender();
}

function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem('assessments', JSON.stringify(events));
  renderCalendar();
  renderEventList();
}

// 이벤트 목록 렌더링
function renderEventList() {
  eventList.innerHTML = '';
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  events.forEach(evt => {
    const li = document.createElement('li');
    li.classList.add('event-item');
    li.innerHTML = `
      <div>
        <span class="event-item-date">${evt.date}</span>
        <span>${evt.title}</span>
      </div>
      <button class="delete-btn" onclick="deleteEvent(${evt.id})">삭제</button>
    `;
    eventList.appendChild(li);
  });
}

// OCR 이미지 분석 기능
scanBtn.addEventListener('click', async () => {
  const file = imageInput.files[0];
  if (!file) {
    alert('사진 파일을 선택해 주세요.');
    return;
  }

  statusMessage.textContent = '사진을 분석하는 중입니다... 잠시만 기다려주세요.';

  try {
    const worker = await Tesseract.createWorker('kor+eng');
    const ret = await worker.recognize(file);
    await worker.terminate();

    statusMessage.textContent = '분석 완료! 일정을 달력에 등록합니다.';
    parseTextAndAddEvents(ret.data.text);
  } catch (error) {
    console.error(error);
    statusMessage.textContent = '사진 인식 중 오류가 발생했습니다.';
  }
});

// 추출된 텍스트에서 날짜 및 수행평가 제목 정규식 분석
function parseTextAndAddEvents(text) {
  const currentYear = currentDate.getFullYear();
  const lines = text.split('\n');
  let addedCount = 0;

  // 패턴 예시: "5월 12일 국어" 또는 "2026-05-12 수학" 또는 "5/12 영어"
  const datePattern1 = /(\d{1,2})월\s*(\d{1,2})일\s*(.+)/;
  const datePattern2 = /(\d{4})[-.](\d{1,2})[-.](\d{1,2})\s*(.+)/;

  lines.forEach(line => {
    let match = line.match(datePattern1);
    if (match) {
      const month = String(match[1]).padStart(2, '0');
      const day = String(match[2]).padStart(2, '0');
      const title = match[3].trim();
      if (title) {
        addEvent(`${currentYear}-${month}-${day}`, title);
        addedCount++;
      }
    } else {
      match = line.match(datePattern2);
      if (match) {
        const year = match[1];
        const month = String(match[2]).padStart(2, '0');
        const day = String(match[3]).padStart(2, '0');
        const title = match[4].trim();
        if (title) {
          addEvent(`${year}-${month}-${day}`, title);
          addedCount++;
        }
      }
    }
  });

  if (addedCount > 0) {
    alert(`${addedCount}개의 수행평가 일정을 추출하여 등록했습니다.`);
  } else {
    alert('날짜와 내용을 명확히 인식하지 못했습니다. 수동으로 등록해 주세요.');
  }
}

// 웹 알림 권한 요청
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

// 오늘 자 수행평가 알림 체크
function checkTodayEvents() {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);

  if (todayEvents.length > 0) {
    const titles = todayEvents.map(e => e.title).join(', ');
    
    // 브라우저 알림 발송
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('오늘의 수행평가 알림!', {
        body: `오늘 예정된 수행평가: ${titles}`,
      });
    }

    // 인앱 알림창
    setTimeout(() => {
      alert(`[오늘의 수행평가 알림]\n오늘 예정된 수행평가가 있습니다: ${titles}`);
    }, 500);
  }
}