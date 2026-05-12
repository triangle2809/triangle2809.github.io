// 1. 데이터 준비 (단어와 빈도수)
const words = [
    ['JavaScript', 90],
    ['Python', 85],
    ['React', 80],
    ['Node.js', 75],
    ['CSS', 70],
    ['HTML', 70],
    ['MongoDB', 65],
    ['Express', 60],
    ['Vue.js', 55],
    ['Angular', 50],
    ['TypeScript', 65],
    ['GraphQL', 45],
    ['Docker', 55],
    ['Git', 70],
    ['API', 60],
];

// 2. 캔버스 선택
const canvas = document.getElementById('wordcloud');

// 3. WordCloud 옵션 설정
const options = {
    list: words,                           // 단어 리스트
    gridSize: 8,                           // 셀 크기 (작을수록 촘촘)
    weightFactor: 3,                       // 단어 크기 배율
    fontFamily: 'Arial, sans-serif',       // 폰트
    color: function() {
        // 랜덤 색상
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
        return colors[Math.floor(Math.random() * colors.length)];
    },
    backgroundColor: '#ffffff',            // 배경색
    rotateRatio: 0.5,                      // 회전 비율 (0~1)
    click: function(item) {
        // 단어 클릭 이벤트
        console.log('클릭한 단어:', item[0], '빈도:', item[1]);
    }
};

// 4. WordCloud 생성
WordCloud(canvas, options);
