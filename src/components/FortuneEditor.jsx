import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import './FortuneEditor.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// 위치-역할 맵핑
const POSITION_ROLE_MAP = {
  // 천간
  year_sky: ['조상', '국가'],
  month_sky: ['사회', '부모'],
  time_sky: ['자식', '부하', '동료'],
  // 지지
  year_earth: ['조상'],
  month_earth: ['동료', '친구', '사회사람들', '부모'],
  day_earth: ['배우자'],
  time_earth: ['자식', '부하'],
  // 운
  decade_luck_sky: ['대운 천간'],
  decade_luck_earth: ['대운 지지'],
  year_luck_sky: ['세운 천간'],
  year_luck_earth: ['세운 지지'],
};

// 운세 레벨 옵션
const FORTUNE_LEVELS = [
  { value: 'very_good', label: '매우좋음', color: '#22c55e' },
  { value: 'good', label: '좋음', color: '#84cc16' },
  { value: 'normal', label: '보통', color: '#eab308' },
  { value: 'caution', label: '주의필요', color: '#f97316' },
  { value: 'difficult', label: '어려움', color: '#ef4444' },
];

// 60갑자 배열
const GANJI_60 = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
];

// 연도로 간지 계산
const getYearGanji = (year) => {
  const baseYear = 1984; // 甲子년
  const index = ((year - baseYear) % 60 + 60) % 60;
  return GANJI_60[index];
};

// 위치명을 한글로 변환
const translatePosition = (position) => {
  const positionMap = {
    'year_luck_sky': '세운 천간',
    'decade_luck_sky': '대운 천간',
    'year_sky': '년간',
    'month_sky': '월간',
    'time_sky': '시간',
    'year_earth': '년지',
    'month_earth': '월지',
    'day_earth': '일지',
    'year_luck_earth': '세운 지지',
    'decade_luck_earth': '대운 지지',
    'time_earth': '시지',
    'type': '격국',
  };
  return positionMap[position] || position;
};

// 역할 조합 문자열
const getRolesFromPositions = (positions) => {
  if (!positions || !Array.isArray(positions)) return [];
  const roles = new Set();
  positions.forEach(pos => {
    const posRoles = POSITION_ROLE_MAP[pos];
    if (posRoles) {
      posRoles.forEach(role => roles.add(role));
    }
  });
  return Array.from(roles);
};

// 천간/지지 배열
const SKY_CHARS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTH_CHARS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 십성 계산 (일간 기준)
const getTenprop = (daySky, targetSky) => {
  const TENPROP_MAP = {
    '甲': { '甲': '비견', '乙': '겁재', '丙': '식신', '丁': '상관', '戊': '편재', '己': '정재', '庚': '편관', '辛': '정관', '壬': '편인', '癸': '정인' },
    '乙': { '乙': '비견', '甲': '겁재', '丁': '식신', '丙': '상관', '己': '편재', '戊': '정재', '辛': '편관', '庚': '정관', '癸': '편인', '壬': '정인' },
    '丙': { '丙': '비견', '丁': '겁재', '戊': '식신', '己': '상관', '庚': '편재', '辛': '정재', '壬': '편관', '癸': '정관', '甲': '편인', '乙': '정인' },
    '丁': { '丁': '비견', '丙': '겁재', '己': '식신', '戊': '상관', '辛': '편재', '庚': '정재', '癸': '편관', '壬': '정관', '乙': '편인', '甲': '정인' },
    '戊': { '戊': '비견', '己': '겁재', '庚': '식신', '辛': '상관', '壬': '편재', '癸': '정재', '甲': '편관', '乙': '정관', '丙': '편인', '丁': '정인' },
    '己': { '己': '비견', '戊': '겁재', '辛': '식신', '庚': '상관', '癸': '편재', '壬': '정재', '乙': '편관', '甲': '정관', '丁': '편인', '丙': '정인' },
    '庚': { '庚': '비견', '辛': '겁재', '壬': '식신', '癸': '상관', '甲': '편재', '乙': '정재', '丙': '편관', '丁': '정관', '戊': '편인', '己': '정인' },
    '辛': { '辛': '비견', '庚': '겁재', '癸': '식신', '壬': '상관', '乙': '편재', '甲': '정재', '丁': '편관', '丙': '정관', '己': '편인', '戊': '정인' },
    '壬': { '壬': '비견', '癸': '겁재', '甲': '식신', '乙': '상관', '丙': '편재', '丁': '정재', '戊': '편관', '己': '정관', '庚': '편인', '辛': '정인' },
    '癸': { '癸': '비견', '壬': '겁재', '乙': '식신', '甲': '상관', '丁': '편재', '丙': '정재', '己': '편관', '戊': '정관', '辛': '편인', '庚': '정인' },
  };
  return TENPROP_MAP[daySky]?.[targetSky] || '';
};

// 십이운성 계산 (일간 기준으로 지지의 운성)
const getTwelveStar = (daySky, targetEarth) => {
  const TWELVE_STAR_MAP = {
    '甲': { '亥': '장생', '子': '목욕', '丑': '관대', '寅': '건록', '卯': '제왕', '辰': '쇠', '巳': '병', '午': '사', '未': '묘', '申': '절', '酉': '태', '戌': '양' },
    '乙': { '午': '장생', '巳': '목욕', '辰': '관대', '卯': '건록', '寅': '제왕', '丑': '쇠', '子': '병', '亥': '사', '戌': '묘', '酉': '절', '申': '태', '未': '양' },
    '丙': { '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠', '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양' },
    '丁': { '酉': '장생', '申': '목욕', '未': '관대', '午': '건록', '巳': '제왕', '辰': '쇠', '卯': '병', '寅': '사', '丑': '묘', '子': '절', '亥': '태', '戌': '양' },
    '戊': { '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠', '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양' },
    '己': { '酉': '장생', '申': '목욕', '未': '관대', '午': '건록', '巳': '제왕', '辰': '쇠', '卯': '병', '寅': '사', '丑': '묘', '子': '절', '亥': '태', '戌': '양' },
    '庚': { '巳': '장생', '午': '목욕', '未': '관대', '申': '건록', '酉': '제왕', '戌': '쇠', '亥': '병', '子': '사', '丑': '묘', '寅': '절', '卯': '태', '辰': '양' },
    '辛': { '子': '장생', '亥': '목욕', '戌': '관대', '酉': '건록', '申': '제왕', '未': '쇠', '午': '병', '巳': '사', '辰': '묘', '卯': '절', '寅': '태', '丑': '양' },
    '壬': { '申': '장생', '酉': '목욕', '戌': '관대', '亥': '건록', '子': '제왕', '丑': '쇠', '寅': '병', '卯': '사', '辰': '묘', '巳': '절', '午': '태', '未': '양' },
    '癸': { '卯': '장생', '寅': '목욕', '丑': '관대', '子': '건록', '亥': '제왕', '戌': '쇠', '酉': '병', '申': '사', '未': '묘', '午': '절', '巳': '태', '辰': '양' },
  };
  return TWELVE_STAR_MAP[daySky]?.[targetEarth] || '';
};

// 지지의 본기(지장간) - 지지 십성 계산용
const getEarthMainStem = (earth) => {
  const EARTH_MAIN_STEM = {
    '子': '癸', '丑': '己', '寅': '甲', '卯': '乙',
    '辰': '戊', '巳': '丙', '午': '丁', '未': '己',
    '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
  };
  return EARTH_MAIN_STEM[earth] || '';
};

// 지지 십성 계산 (지장간 본기 기준)
const getEarthTenprop = (daySky, targetEarth) => {
  const mainStem = getEarthMainStem(targetEarth);
  return getTenprop(daySky, mainStem);
};

// 십이신살 계산 (년지 기준으로 해당 지지의 신살)
const getTwelveGod = (yearEarth, targetEarth) => {
  const TWELVE_GOD_MAP = {
    '子': { '子': '태극귀인', '丑': '천을귀인', '寅': '천덕귀인', '卯': '월덕귀인', '辰': '화개', '巳': '역마', '午': '도화', '未': '문창', '申': '학당', '酉': '재성', '戌': '천라', '亥': '지망' },
    '丑': { '子': '태극귀인', '丑': '지망', '寅': '천을귀인', '卯': '천덕귀인', '辰': '월덕귀인', '巳': '화개', '午': '역마', '未': '도화', '申': '문창', '酉': '학당', '戌': '재성', '亥': '천라' },
    '寅': { '子': '문창', '丑': '학당', '寅': '재성', '卯': '천라', '辰': '지망', '巳': '태극귀인', '午': '천을귀인', '未': '천덕귀인', '申': '월덕귀인', '酉': '화개', '戌': '역마', '亥': '도화' },
    '卯': { '子': '역마', '丑': '도화', '寅': '문창', '卯': '학당', '辰': '재성', '巳': '천라', '午': '지망', '未': '태극귀인', '申': '천을귀인', '酉': '천덕귀인', '戌': '월덕귀인', '亥': '화개' },
    '辰': { '子': '역마', '丑': '도화', '寅': '문창', '卯': '학당', '辰': '재성', '巳': '천라', '午': '지망', '未': '태극귀인', '申': '천을귀인', '酉': '천덕귀인', '戌': '월덕귀인', '亥': '화개' },
    '巳': { '子': '재성', '丑': '천라', '寅': '지망', '卯': '태극귀인', '辰': '천을귀인', '巳': '천덕귀인', '午': '월덕귀인', '未': '화개', '申': '역마', '酉': '도화', '戌': '문창', '亥': '학당' },
    '午': { '子': '월덕귀인', '丑': '화개', '寅': '역마', '卯': '도화', '辰': '문창', '巳': '학당', '午': '재성', '未': '천라', '申': '지망', '酉': '태극귀인', '戌': '천을귀인', '亥': '천덕귀인' },
    '未': { '子': '월덕귀인', '丑': '화개', '寅': '역마', '卯': '도화', '辰': '문창', '巳': '학당', '午': '재성', '未': '천라', '申': '지망', '酉': '태극귀인', '戌': '천을귀인', '亥': '천덕귀인' },
    '申': { '子': '학당', '丑': '재성', '寅': '천라', '卯': '지망', '辰': '태극귀인', '巳': '천을귀인', '午': '천덕귀인', '未': '월덕귀인', '申': '화개', '酉': '역마', '戌': '도화', '亥': '문창' },
    '酉': { '子': '화개', '丑': '역마', '寅': '도화', '卯': '문창', '辰': '학당', '巳': '재성', '午': '천라', '未': '지망', '申': '태극귀인', '酉': '천을귀인', '戌': '천덕귀인', '亥': '월덕귀인' },
    '戌': { '子': '화개', '丑': '역마', '寅': '도화', '卯': '문창', '辰': '학당', '巳': '재성', '午': '천라', '未': '지망', '申': '태극귀인', '酉': '천을귀인', '戌': '천덕귀인', '亥': '월덕귀인' },
    '亥': { '子': '천덕귀인', '丑': '월덕귀인', '寅': '화개', '卯': '역마', '辰': '도화', '巳': '문창', '午': '학당', '未': '재성', '申': '천라', '酉': '지망', '戌': '태극귀인', '亥': '천을귀인' },
  };
  return TWELVE_GOD_MAP[yearEarth]?.[targetEarth] || '';
};

// 연도 인덱스를 한글 라벨로 변환
const getYearLabel = (index) => {
  const labels = ['올해', '내년', '2년 후', '3년 후', '4년 후'];
  return labels[index] || `${index}년 후`;
};

// 나이에 해당하는 대운 찾기 (decade_array 구조 사용) - 컴포넌트 외부로 이동
const findDecadeForAge = (decadeArray, startAge, age) => {
  if (!decadeArray || decadeArray.length === 0) return null;

  // 대운 시작 나이 조정 (1살부터 시작하는 경우 0으로)
  const adjustedStartAge = Math.max(startAge - 1, 0);

  // 해당 나이가 몇 번째 대운인지 계산
  const decadeIndex = Math.floor((age - adjustedStartAge) / 10);

  // 유효한 인덱스인지 확인
  if (decadeIndex < 0 || decadeIndex >= decadeArray.length) return null;

  const ganji = decadeArray[decadeIndex];
  if (!ganji) return null;

  const decadeStartAge = adjustedStartAge + (decadeIndex * 10);
  return {
    index: decadeIndex,
    ganji: ganji,
    sky: ganji.charAt(0),
    earth: ganji.charAt(1),
    start_age: decadeStartAge,
    end_age: decadeStartAge + 9
  };
};

// 섹션 라벨 매핑
const SECTION_LABELS = {
  sky: { label: '천간운', icon: '☰', description: '정신적 영역, 계획/아이디어' },
  earth: { label: '지지운', icon: '☷', description: '현실적 영역, 실질적 재물' },
  johu: { label: '조후운', icon: '🌡', description: '기후 균형, 건강/컨디션' },
  summary: { label: '종합 재물운', icon: '💰', description: '전체 재물운 요약' }
};

// 단일 연도 재물운 편집 컴포넌트
function YearFortuneEditor({
  yearData,
  yearIndex,
  onUpdate,
  onRegenerate,
  isRegenerating,
  gyeokguk,
  daySky,
  yearEarth,
  userName,
  onSectionUpdate
}) {
  // 해당 연도의 십성, 십이운성, 십이신살 계산
  const yearSky = yearData.sky?.char || yearData.ganji?.charAt(0);
  const yearEarthChar = yearData.earth?.char || yearData.ganji?.charAt(1);

  const skyTenprop = getTenprop(daySky, yearSky);  // 천간 십성
  const earthTenprop = getEarthTenprop(daySky, yearEarthChar);  // 지지 십성 (본기 기준)
  const twelveStar = getTwelveStar(daySky, yearEarthChar);
  const twelveGod = getTwelveGod(yearEarth, yearEarthChar);

  // 해당 연도의 대운 정보 계산 (yearData.decade 사용)
  const yearDecade = yearData.decade;
  const decadeGanji = yearDecade?.ganji || '';
  const decadeSky = decadeGanji.charAt(0);
  const decadeEarthChar = decadeGanji.charAt(1);
  const decadeSkyTenprop = getTenprop(daySky, decadeSky);  // 대운 천간 십성
  const decadeEarthTenprop = getEarthTenprop(daySky, decadeEarthChar);  // 대운 지지 십성
  const decadeTwelveStar = getTwelveStar(daySky, decadeEarthChar);  // 대운 십이운성
  const decadeTwelveGod = getTwelveGod(yearEarth, decadeEarthChar);  // 대운 십이신살
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingSections, setEditingSections] = useState({});  // 섹션별 편집 모드
  const [sectionEdits, setSectionEdits] = useState({
    sky: yearData.content_sections?.sky || '',
    earth: yearData.content_sections?.earth || '',
    johu: yearData.content_sections?.johu || '',
    summary: yearData.content_sections?.summary || ''
  });
  const [localEdit, setLocalEdit] = useState(yearData.manager_edit || {
    sky: {
      fortune_level: 'normal',
      reason: '',
    },
    earth: {
      fortune_level: 'normal',
      reason: '',
    },
    advice: '',
    memo: ''
  });

  useEffect(() => {
    setLocalEdit(yearData.manager_edit || {
      sky: {
        fortune_level: 'normal',
        reason: '',
      },
      earth: {
        fortune_level: 'normal',
        reason: '',
      },
      advice: '',
      memo: ''
    });
    // 섹션 콘텐츠 동기화
    if (yearData.content_sections) {
      setSectionEdits({
        sky: yearData.content_sections.sky || '',
        earth: yearData.content_sections.earth || '',
        johu: yearData.content_sections.johu || '',
        summary: yearData.content_sections.summary || ''
      });
    }
  }, [yearData]);

  const handleLocalChange = (field, value, category = null) => {
    let newEdit;
    if (category) {
      // sky 또는 earth 카테고리 내 필드 수정
      newEdit = {
        ...localEdit,
        [category]: {
          ...localEdit[category],
          [field]: value
        }
      };
    } else {
      // 공통 필드 수정
      newEdit = { ...localEdit, [field]: value };
    }
    setLocalEdit(newEdit);
    onUpdate(yearData.year, newEdit);
  };

  // 섹션 편집 토글
  const toggleSectionEdit = (sectionKey) => {
    setEditingSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // 섹션 내용 변경
  const handleSectionChange = (sectionKey, value) => {
    setSectionEdits(prev => ({
      ...prev,
      [sectionKey]: value
    }));
  };

  // 섹션 저장
  const handleSectionSave = (sectionKey) => {
    if (onSectionUpdate) {
      onSectionUpdate(yearData.year, sectionKey, sectionEdits[sectionKey]);
    }
    setEditingSections(prev => ({
      ...prev,
      [sectionKey]: false
    }));
  };

  // 섹션 편집 취소
  const handleSectionCancel = (sectionKey) => {
    setSectionEdits(prev => ({
      ...prev,
      [sectionKey]: yearData.content_sections?.[sectionKey] || ''
    }));
    setEditingSections(prev => ({
      ...prev,
      [sectionKey]: false
    }));
  };

  const getResultClass = (result) => {
    if (result === '성') return 'result-success';
    if (result === '패') return 'result-fail';
    if (result === '성중유패') return 'result-mixed-fail';
    if (result === '패중유성') return 'result-mixed-success';
    return '';
  };

  const getLevelColor = (level) => {
    const found = FORTUNE_LEVELS.find(l => l.value === level);
    return found ? found.color : '#eab308';
  };

  // 십성 화살표 표시
  const renderSipsung = (data) => {
    const parts = [];
    if (data.sipsung1) parts.push(data.sipsung1);
    if (data.sipsung2) parts.push(data.sipsung2);
    if (data.sipsung3) parts.push(data.sipsung3);
    return parts.length > 0 ? parts.join(' → ') : '(분석 데이터 없음)';
  };

  // 데이터가 비어있는지 확인
  const hasAnalysisData = (analysisData) => {
    return analysisData && (
      analysisData.code ||
      analysisData.result ||
      analysisData.sipsung1 ||
      (analysisData.positions && analysisData.positions.length > 0)
    );
  };

  return (
    <div className="year-fortune-editor">
      <div
        className="year-fortune-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="year-fortune-title">
          <span className="year-index-label">{getYearLabel(yearIndex)}</span>
          <span className="year-label">{yearData.year}년</span>
          <span className="ganji-label">({yearData.ganji})</span>
          <span
            className="fortune-level-badge sky-badge"
            style={{ backgroundColor: getLevelColor(localEdit.sky?.fortune_level) }}
          >
            天 {FORTUNE_LEVELS.find(l => l.value === localEdit.sky?.fortune_level)?.label || '보통'}
          </span>
          <span
            className="fortune-level-badge earth-badge"
            style={{ backgroundColor: getLevelColor(localEdit.earth?.fortune_level) }}
          >
            地 {FORTUNE_LEVELS.find(l => l.value === localEdit.earth?.fortune_level)?.label || '보통'}
          </span>
        </div>
        <div className="year-fortune-toggle">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="year-fortune-body">
          {/* 대운 + 세운 정보 */}
          <div className="luck-info-container">
            {/* 대운 정보 */}
            {decadeGanji && (
              <div className="decade-info-row">
                <div className="luck-header decade-header">
                  <span className="luck-type-badge decade-badge">대운</span>
                  <span className="luck-ganji">{decadeGanji}</span>
                  <span className="luck-period">({yearDecade?.start_age}~{yearDecade?.end_age}세)</span>
                  {yearData.ageAtYear && <span className="current-age-tag">{yearData.ageAtYear}세</span>}
                </div>
                <div className="luck-details">
                  <span className="luck-item">
                    <span className="luck-label">천간:</span>
                    <span className="luck-value sky">{decadeSky} {decadeSkyTenprop || '-'}</span>
                  </span>
                  <span className="luck-item">
                    <span className="luck-label">지지:</span>
                    <span className="luck-value earth">{decadeEarthChar} {decadeEarthTenprop || '-'}</span>
                  </span>
                  <span className="luck-item">
                    <span className="luck-label">십이운성:</span>
                    <span className="luck-value star">{decadeTwelveStar || '-'}</span>
                  </span>
                  <span className="luck-item">
                    <span className="luck-label">십이신살:</span>
                    <span className="luck-value god">{decadeTwelveGod || '-'}</span>
                  </span>
                </div>
              </div>
            )}

            {/* 세운 정보 */}
            <div className="year-info-row">
              <div className="luck-header year-header">
                <span className="luck-type-badge year-badge">세운</span>
                <span className="luck-ganji">{yearData.ganji}</span>
              </div>
              <div className="luck-details">
                <span className="luck-item">
                  <span className="luck-label">천간:</span>
                  <span className="luck-value sky">{yearSky} {skyTenprop || '-'}</span>
                </span>
                <span className="luck-item">
                  <span className="luck-label">지지:</span>
                  <span className="luck-value earth">{yearEarthChar} {earthTenprop || '-'}</span>
                </span>
                <span className="luck-item">
                  <span className="luck-label">십이운성:</span>
                  <span className="luck-value star">{twelveStar || '-'}</span>
                </span>
                <span className="luck-item">
                  <span className="luck-label">십이신살:</span>
                  <span className="luck-value god">{twelveGod || '-'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 격국 성패 분석 */}
          <div className="fortune-analysis-section">
            {/* 천간 분석 */}
            {yearData.sky && (
              <div className="fortune-analysis-box sky-box">
                <div className="analysis-header">
                  <span className="analysis-type">【천간 {yearData.sky.char}】</span>
                  <span className="analysis-gyeokguk">{gyeokguk || yearData.sky.gyeokguk}</span>
                </div>
                <div className="analysis-content">
                  <div className="analysis-row">
                    <span className="row-label">십성:</span>
                    <span className="row-value sipsung-flow">{renderSipsung(yearData.sky)}</span>
                  </div>
                  <div className="analysis-row">
                    <span className="row-label">코드:</span>
                    <span className="row-value code-value">{yearData.sky.code || '(없음)'}</span>
                    {yearData.sky.result && (
                      <span className={`result-badge ${getResultClass(yearData.sky.result)}`}>
                        {yearData.sky.result}
                      </span>
                    )}
                  </div>
                  {yearData.sky.positions && yearData.sky.positions.length > 0 && (
                    <div className="analysis-row">
                      <span className="row-label">위치:</span>
                      <span className="row-value">
                        {yearData.sky.positions.map(p => translatePosition(p)).join(', ')}
                      </span>
                      <span className="row-roles">
                        → 역할: {getRolesFromPositions(yearData.sky.positions).join(', ') || '(해당없음)'}
                      </span>
                    </div>
                  )}
                  {yearData.sky.reason && (
                    <div className="analysis-reason">
                      {yearData.sky.reason}
                    </div>
                  )}
                  {!hasAnalysisData(yearData.sky) && (
                    <div className="analysis-empty">
                      해당 연도에 천간 성패 분석 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 지지 분석 */}
            {yearData.earth && (
              <div className="fortune-analysis-box earth-box">
                <div className="analysis-header">
                  <span className="analysis-type">【지지 {yearData.earth.char}】</span>
                  <span className="analysis-gyeokguk">{gyeokguk || yearData.earth.gyeokguk}</span>
                </div>
                <div className="analysis-content">
                  <div className="analysis-row">
                    <span className="row-label">십성:</span>
                    <span className="row-value sipsung-flow">{renderSipsung(yearData.earth)}</span>
                  </div>
                  <div className="analysis-row">
                    <span className="row-label">코드:</span>
                    <span className="row-value code-value">{yearData.earth.code || '(없음)'}</span>
                    {yearData.earth.result && (
                      <span className={`result-badge ${getResultClass(yearData.earth.result)}`}>
                        {yearData.earth.result}
                      </span>
                    )}
                  </div>
                  {yearData.earth.positions && yearData.earth.positions.length > 0 && (
                    <div className="analysis-row">
                      <span className="row-label">위치:</span>
                      <span className="row-value">
                        {yearData.earth.positions.map(p => translatePosition(p)).join(', ')}
                      </span>
                      <span className="row-roles">
                        → 역할: {getRolesFromPositions(yearData.earth.positions).join(', ') || '(해당없음)'}
                      </span>
                    </div>
                  )}
                  {yearData.earth.reason && (
                    <div className="analysis-reason">
                      {yearData.earth.reason}
                    </div>
                  )}
                  {!hasAnalysisData(yearData.earth) && (
                    <div className="analysis-empty">
                      해당 연도에 지지 성패 분석 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 조후 분석 (기후 균형) */}
            {yearData.johu_analysis && (
              <div className="fortune-analysis-box johu-box">
                <div className="analysis-header johu-header">
                  <span className="analysis-type">【조후(調候) 분석】</span>
                  <span className="analysis-label">기후 균형 · 온도 분석</span>
                </div>
                <div className="analysis-content">
                  {/* 원국 기후 */}
                  {yearData.johu_analysis.chart_climate && (
                    <div className="analysis-row">
                      <span className="row-label">원국 기후:</span>
                      <span className="row-value johu-climate">
                        {yearData.johu_analysis.chart_climate.label || '알 수 없음'}
                        {yearData.johu_analysis.chart_climate.need && (
                          <span className="johu-need"> ({yearData.johu_analysis.chart_climate.need})</span>
                        )}
                      </span>
                    </div>
                  )}
                  {/* 원국 온도 */}
                  {yearData.johu_analysis.base_temperature && (
                    <div className="analysis-row">
                      <span className="row-label">원국 온도:</span>
                      <span className={`row-value johu-temp johu-temp-${yearData.johu_analysis.base_temperature.level || 'moderate'}`}>
                        {yearData.johu_analysis.base_temperature.label || '보통'}
                        <span className="johu-score"> ({yearData.johu_analysis.base_temperature.score || 50}점)</span>
                      </span>
                    </div>
                  )}
                  {/* 세운 온도 */}
                  {yearData.johu_analysis.year_temperature && (
                    <div className="analysis-row">
                      <span className="row-label">{yearData.year}년 온도:</span>
                      <span className={`row-value johu-temp johu-temp-${yearData.johu_analysis.year_temperature.level || 'moderate'}`}>
                        {yearData.johu_analysis.year_temperature.label || '보통'}
                        <span className="johu-score"> ({yearData.johu_analysis.year_temperature.score || 50}점)</span>
                        {yearData.johu_analysis.year_temperature.trend && (
                          <span className={`johu-trend johu-trend-${yearData.johu_analysis.year_temperature.trend}`}>
                            {yearData.johu_analysis.year_temperature.trend === 'improving' ? ' ↑개선' :
                             yearData.johu_analysis.year_temperature.trend === 'worsening' ? ' ↓악화' : ' →유지'}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {/* 조후용신 */}
                  {yearData.johu_analysis.johu_yongshin && (
                    <div className="analysis-row">
                      <span className="row-label">조후용신:</span>
                      <span className="row-value johu-yongshin">{yearData.johu_analysis.johu_yongshin}</span>
                    </div>
                  )}
                  {/* 조후용신 충족 여부 */}
                  {yearData.johu_analysis.johu_met_in_year && (
                    <div className="analysis-row">
                      <span className="row-label">용신 충족:</span>
                      <span className={`row-value johu-met ${yearData.johu_analysis.johu_met_in_year.main_met ? 'met-yes' : yearData.johu_analysis.johu_met_in_year.sub_met ? 'met-partial' : 'met-no'}`}>
                        {yearData.johu_analysis.johu_met_in_year.main_met ? '✓ 조후용신 충족 (매우 좋음)' :
                         yearData.johu_analysis.johu_met_in_year.sub_met ? '○ 보조용신 충족 (좋음)' :
                         '✗ 미충족'}
                      </span>
                    </div>
                  )}
                  {yearData.johu_analysis.johu_met_in_year?.description && (
                    <div className="analysis-reason johu-description">
                      {yearData.johu_analysis.johu_met_in_year.description}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 매니저 수정 영역 */}
          <div className="manager-edit-section">
            <div className="edit-section-title">【매니저 수정】</div>

            {/* 천간운 (정신적 영역) */}
            <div className="edit-category sky-category">
              <div className="edit-category-title">
                <span className="category-icon">天</span>
                천간운 (정신적 영역)
              </div>
              <div className="edit-row">
                <label className="edit-label">운세 판정:</label>
                <select
                  className="fortune-level-select"
                  value={localEdit.sky?.fortune_level || 'normal'}
                  onChange={(e) => handleLocalChange('fortune_level', e.target.value, 'sky')}
                >
                  {FORTUNE_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="edit-row">
                <label className="edit-label">이유 (AI 참고):</label>
                <input
                  type="text"
                  className="edit-input"
                  placeholder="예: 정신적 안정, 학업/연구 성과 기대"
                  value={localEdit.sky?.reason || ''}
                  onChange={(e) => handleLocalChange('reason', e.target.value, 'sky')}
                />
              </div>
            </div>

            {/* 지지운 (현실적 영역) */}
            <div className="edit-category earth-category">
              <div className="edit-category-title">
                <span className="category-icon">地</span>
                지지운 (현실적 영역)
              </div>
              <div className="edit-row">
                <label className="edit-label">운세 판정:</label>
                <select
                  className="fortune-level-select"
                  value={localEdit.earth?.fortune_level || 'normal'}
                  onChange={(e) => handleLocalChange('fortune_level', e.target.value, 'earth')}
                >
                  {FORTUNE_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="edit-row">
                <label className="edit-label">이유 (AI 참고):</label>
                <input
                  type="text"
                  className="edit-input"
                  placeholder="예: 재물 증가, 실질적 수입 개선"
                  value={localEdit.earth?.reason || ''}
                  onChange={(e) => handleLocalChange('reason', e.target.value, 'earth')}
                />
              </div>
            </div>

            {/* 공통 조언/메모 */}
            <div className="edit-category common-category">
              <div className="edit-row">
                <label className="edit-label">종합 조언:</label>
                <input
                  type="text"
                  className="edit-input"
                  placeholder="예: 정신적 성장과 현실적 성과의 균형 필요"
                  value={localEdit.advice || ''}
                  onChange={(e) => handleLocalChange('advice', e.target.value)}
                />
              </div>
              <div className="edit-row">
                <label className="edit-label">기타 메모:</label>
                <input
                  type="text"
                  className="edit-input"
                  placeholder="추가 참고사항"
                  value={localEdit.memo || ''}
                  onChange={(e) => handleLocalChange('memo', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 생성된 콘텐츠 - 단락별 표시 */}
          {isRegenerating ? (
            <div className="generated-content-section" style={{ background: '#f0fdf4' }}>
              <div className="section-loading">
                <div className="loading-spinner-small"></div>
                <span className="section-loading-text">{yearData.year}년 재물운을 생성하고 있습니다...</span>
              </div>
            </div>
          ) : yearData.content_sections && (yearData.content_sections.sky || yearData.content_sections.earth || yearData.content_sections.johu || yearData.content_sections.summary) ? (
            <div className="generated-content-section sectioned">
              <div className="content-title">생성된 재물운</div>

              {/* 섹션별 콘텐츠 */}
              {['sky', 'earth', 'johu', 'summary'].map(sectionKey => {
                const section = SECTION_LABELS[sectionKey];
                const content = sectionEdits[sectionKey] || yearData.content_sections?.[sectionKey] || '';
                if (!content && !editingSections[sectionKey]) return null;

                return (
                  <div key={sectionKey} className={`content-section section-${sectionKey}`}>
                    <div className="section-header">
                      <span className="section-icon">{section.icon}</span>
                      <span className="section-label">{section.label}</span>
                      <span className="section-desc">({section.description})</span>
                      <button
                        className={`btn-section-edit ${editingSections[sectionKey] ? 'editing' : ''}`}
                        onClick={() => toggleSectionEdit(sectionKey)}
                      >
                        {editingSections[sectionKey] ? '취소' : '수정'}
                      </button>
                    </div>

                    {editingSections[sectionKey] ? (
                      <div className="section-edit-area">
                        <textarea
                          className="section-textarea"
                          value={sectionEdits[sectionKey]}
                          onChange={(e) => handleSectionChange(sectionKey, e.target.value)}
                          rows={6}
                          placeholder={`${section.label} 내용을 입력하세요...`}
                        />
                        <div className="section-edit-actions">
                          <button
                            className="btn-section-cancel"
                            onClick={() => handleSectionCancel(sectionKey)}
                          >
                            취소
                          </button>
                          <button
                            className="btn-section-save"
                            onClick={() => handleSectionSave(sectionKey)}
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="section-content">
                        {content || <span className="empty-content">내용 없음</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : yearData.generated_content ? (
            // generated_content가 객체인 경우 (새 형식)
            typeof yearData.generated_content === 'object' ? (
              <div className="generated-content-section sectioned">
                <div className="content-title">생성된 재물운</div>
                {['sky', 'earth', 'johu', 'summary'].map(sectionKey => {
                  const section = SECTION_LABELS[sectionKey];
                  const content = yearData.generated_content?.[sectionKey] || '';
                  if (!content) return null;
                  return (
                    <div key={sectionKey} className={`content-section section-${sectionKey}`}>
                      <div className="section-header">
                        <span className="section-icon">{section.icon}</span>
                        <span className="section-label">{section.label}</span>
                        <span className="section-desc">({section.description})</span>
                      </div>
                      <div className="section-content">{content}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // 기존 단일 콘텐츠 형식 (레거시 지원)
              <div className="generated-content-section">
                <div className="content-title">생성된 재물운</div>
                <div
                  className="generated-content"
                  dangerouslySetInnerHTML={{ __html: yearData.generated_content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') }}
                />
              </div>
            )
          ) : (
            <div className="generated-content-section" style={{ background: '#fef3c7', borderColor: '#fcd34d' }}>
              <div className="content-title" style={{ color: '#92400e' }}>재물운 미생성</div>
              <div className="section-loading-text" style={{ color: '#92400e', textAlign: 'center', padding: '10px' }}>
                '이 연도만 재생성' 또는 '전체 재생성' 버튼을 눌러주세요.
              </div>
            </div>
          )}

          {/* 재생성 버튼 */}
          <div className="year-fortune-actions">
            <button
              className={`btn-regenerate-year ${isRegenerating ? 'loading' : ''}`}
              onClick={() => onRegenerate(yearData.year)}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>이 연도만 재생성</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 메인 재물운 편집 컴포넌트
const FortuneEditor = forwardRef(function FortuneEditor({
  orderId,
  validationResult,
  initialData,
  initialBaseFortune,
  onChange
}, ref) {
  const currentYear = new Date().getFullYear();
  const [fortuneData, setFortuneData] = useState([]);
  const [baseFortune, setBaseFortune] = useState(initialBaseFortune || {
    intro: '',  // 기본 재물운 설명
    generated_intro: ''  // AI 생성된 기본 설명
  });
  const [loading, setLoading] = useState(false);
  const [regeneratingYear, setRegeneratingYear] = useState(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regeneratingAllProgress, setRegeneratingAllProgress] = useState(null); // { progress: 0-100, message: '' }
  const [regeneratingIntro, setRegeneratingIntro] = useState(false);
  const [gyeokguk, setGyeokguk] = useState('');
  const [currentDecade, setCurrentDecade] = useState(null);
  const [allDecadeLucks, setAllDecadeLucks] = useState([]);  // 모든 대운 정보
  const autoGenerateAttempted = useRef(false);  // 자동 생성 시도 여부 추적
  const userName = validationResult?.order_info?.name || '고객';

  // 일간, 년지 추출 (십성/십이운성/십이신살 계산용)
  const zodiacDay = validationResult?.saju_data?.zodiac_day || '';
  const zodiacYear = validationResult?.saju_data?.zodiac_year || '';
  const daySky = zodiacDay.charAt(0);  // 일간
  const yearEarth = zodiacYear.charAt(1);  // 년지

  // 부모 컴포넌트에서 호출 가능한 메서드 노출
  useImperativeHandle(ref, () => ({
    regenerateAll: handleRegenerateAll,
    isRegenerating: () => regeneratingAll
  }));

  // 5년치 재물운 데이터 초기화
  useEffect(() => {
    if (validationResult) {
      initializeFortuneData();
    }
  }, [validationResult]);

  // 초기 데이터가 있으면 로드 (저장된 데이터가 있으면 초기화 데이터보다 우선) - decade 정보 추가
  useEffect(() => {
    // initialData에 실제 content가 있는 항목이 있는지 확인
    const hasContent = initialData && initialData.length > 0 &&
      initialData.some(item => item.content || item.generated_content);

    console.log('[FortuneEditor] initialData check:', {
      initialData,
      hasContent,
      fortuneDataLength: fortuneData.length
    });

    if (hasContent && validationResult) {
      const { decade_luck, current_decade, type_analysis } = validationResult;
      const decadeArray = decade_luck?.decade_array || [];
      const decadeStartAge = decade_luck?.start_age || 1;

      const skyType = type_analysis?.sky_result?.status?.type || '';
      const earthType = type_analysis?.earth_result?.status?.type || '';

      // 출생년도 계산
      const birthDateStr = validationResult?.order_info?.birth_date || '';
      const birthYearMatch = birthDateStr.match(/(\d+)년/);
      const birthYear = birthYearMatch ? parseInt(birthYearMatch[1]) :
                        validationResult?.order_info?.birth_year ||
                        validationResult?.saju_data?.birth_year ||
                        new Date().getFullYear() - (current_decade?.start_age || 30);

      // 각 연도에 decade 정보 추가
      const dataWithDecade = initialData.map(item => {
        const ageAtYear = item.year - birthYear + 1;
        let decadeForYear = findDecadeForAge(decadeArray, decadeStartAge, ageAtYear);

        // decade_array가 없으면 current_decade를 fallback으로 사용
        if (!decadeForYear && current_decade) {
          decadeForYear = {
            ganji: current_decade.ganji,
            sky: current_decade.ganji?.charAt(0),
            earth: current_decade.ganji?.charAt(1),
            start_age: current_decade.start_age,
            end_age: current_decade.end_age
          };
        }

        // 간지 계산
        const ganji = item.ganji || getYearGanji(item.year);
        const sky = ganji.charAt(0);
        const earth = ganji.charAt(1);

        // validationResult에서 세운 성패 분석 추출
        const yearLuckResult = extractYearLuckResult(item.year, sky, earth, type_analysis, decadeForYear);

        // 저장된 데이터에 sky/earth 분석 결과가 없으면 validationResult에서 가져옴
        const skyData = item.sky?.result ? item.sky : {
          type: '천간',
          gyeokguk: skyType,
          char: sky,
          ...yearLuckResult.sky
        };

        const earthData = item.earth?.result ? item.earth : {
          type: '지지',
          gyeokguk: earthType,
          char: earth,
          ...yearLuckResult.earth
        };

        const dayEarthData = item.day_earth?.result ? item.day_earth : {
          type: '일지관계',
          label: '일지와의 관계',
          char: earth,
          ...yearLuckResult.day_earth
        };

        // manager_edit이 없으면 격국 성패 결과로 계산
        const calcLevel = (result) => {
          if (result === '성' || result === '패중유성') return 'good';
          if (result === '패' || result === '성중유패') return 'difficult';
          return 'normal';
        };

        const calculatedManagerEdit = item.manager_edit || {
          sky: {
            fortune_level: calcLevel(skyData.result),
            reason: ''
          },
          earth: {
            fortune_level: calcLevel(earthData.result),
            reason: ''
          },
          advice: '',
          memo: ''
        };

        console.log(`[FortuneEditor] Year ${item.year}:`, {
          manager_edit: calculatedManagerEdit,
          sky_result: skyData.result,
          earth_result: earthData.result,
          calculated_sky_level: calcLevel(skyData.result),
          calculated_earth_level: calcLevel(earthData.result)
        });

        return {
          ...item,
          ganji,
          sky: skyData,
          earth: earthData,
          day_earth: dayEarthData,
          // content 또는 generated_content 필드 모두 지원
          generated_content: item.generated_content || item.content || '',
          manager_edit: calculatedManagerEdit,
          decade: item.decade || decadeForYear,
          ageAtYear: item.ageAtYear || ageAtYear
        };
      });
      console.log('[FortuneEditor] Loading saved data:', dataWithDecade);
      setFortuneData(dataWithDecade);
    }
  }, [initialData, validationResult]);

  // 초기 baseFortune 데이터가 있으면 로드 (현재 데이터가 비어있을 때만)
  useEffect(() => {
    if (initialBaseFortune && initialBaseFortune.generated_intro && !baseFortune.generated_intro) {
      setBaseFortune(initialBaseFortune);
    }
  }, [initialBaseFortune]);

  const initializeFortuneData = () => {
    const { type_analysis, current_decade, decade_luck } = validationResult;

    // 격국 정보 추출
    const skyType = type_analysis?.sky_result?.status?.type || '';
    const earthType = type_analysis?.earth_result?.status?.type || '';
    setGyeokguk(skyType || earthType);

    // 현재 대운 저장
    setCurrentDecade(current_decade);

    // 대운 배열 정보 저장
    const decadeArray = decade_luck?.decade_array || [];
    const decadeStartAge = decade_luck?.start_age || 1;
    setAllDecadeLucks({ array: decadeArray, startAge: decadeStartAge });

    // 출생년도 계산 (나이 계산용)
    const birthDateStr = validationResult?.order_info?.birth_date || '';
    const birthYearMatch = birthDateStr.match(/(\d+)년/);
    const birthYear = birthYearMatch ? parseInt(birthYearMatch[1]) :
                      validationResult?.order_info?.birth_year ||
                      validationResult?.saju_data?.birth_year ||
                      new Date().getFullYear() - (current_decade?.start_age || 30);

    // 5년치 데이터 생성
    const years = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear + i;
      const ganji = getYearGanji(year);
      const sky = ganji.charAt(0);
      const earth = ganji.charAt(1);

      // 해당 연도의 나이 계산 (한국 나이)
      const ageAtYear = year - birthYear + 1;

      // 해당 연도에 맞는 대운 찾기
      let decadeForYear = findDecadeForAge(decadeArray, decadeStartAge, ageAtYear);

      // decade_array가 없으면 current_decade를 fallback으로 사용
      if (!decadeForYear && current_decade) {
        decadeForYear = {
          ganji: current_decade.ganji,
          sky: current_decade.ganji?.charAt(0),
          earth: current_decade.ganji?.charAt(1),
          start_age: current_decade.start_age,
          end_age: current_decade.end_age
        };
      }

      // 세운 성패 추출 (해당 연도의 대운 기준)
      const yearLuckResult = extractYearLuckResult(year, sky, earth, type_analysis, decadeForYear);

      years.push({
        year,
        ganji,
        sky: {
          type: '천간',
          gyeokguk: skyType,
          char: sky,
          ...yearLuckResult.sky
        },
        earth: {
          type: '지지',
          gyeokguk: earthType,
          char: earth,
          ...yearLuckResult.earth
        },
        day_earth: {
          type: '일지관계',
          label: '일지와의 관계',
          char: earth,
          ...yearLuckResult.day_earth
        },
        manager_edit: {
          sky: {
            fortune_level: calculateDefaultLevel(yearLuckResult).sky,
            reason: '',
          },
          earth: {
            fortune_level: calculateDefaultLevel(yearLuckResult).earth,
            reason: '',
          },
          advice: '',
          memo: ''
        },
        generated_content: '',
        decade: decadeForYear,  // 해당 연도의 대운 정보 저장
        ageAtYear: ageAtYear    // 해당 연도의 나이
      });
    }
    setFortuneData(years);
  };

  // 세운 성패 추출
  const extractYearLuckResult = (year, sky, earth, type_analysis, current_decade) => {
    if (!type_analysis || !current_decade) {
      console.log('[FortuneEditor] Missing type_analysis or current_decade');
      return { sky: {}, earth: {} };
    }

    const decadeSky = current_decade.ganji?.charAt(0);
    const decadeEarth = current_decade.ganji?.charAt(1);

    // 디버깅용 로그
    console.log(`[FortuneEditor] Year: ${year}, Sky: ${sky}, Earth: ${earth}`);
    console.log(`[FortuneEditor] Decade: ${current_decade.ganji}, DecadeSky: ${decadeSky}, DecadeEarth: ${decadeEarth}`);

    const skyDecadeLucks = type_analysis.sky_result?.lucks?.decade_lucks;
    const earthDecadeLucks = type_analysis.earth_result?.lucks?.decade_lucks;

    console.log('[FortuneEditor] skyDecadeLucks keys:', skyDecadeLucks ? Object.keys(skyDecadeLucks) : 'null');

    const skyYearLucks = skyDecadeLucks?.[decadeSky]?.year_lucks;
    const earthYearLucks = earthDecadeLucks?.[decadeEarth]?.year_lucks;

    console.log('[FortuneEditor] skyYearLucks keys:', skyYearLucks ? Object.keys(skyYearLucks) : 'null');

    const skyResult = skyYearLucks?.[sky];
    const earthResult = earthYearLucks?.[earth];

    console.log('[FortuneEditor] skyResult:', skyResult);
    console.log('[FortuneEditor] earthResult:', earthResult);

    // 십성 정보 추출 - codes 배열 또는 outcome에서 추출
    const extractSipsung = (result, outcomes) => {
      // 먼저 codes 배열에서 시도
      let code = result?.codes?.[0] || '';

      // codes가 없으면 outcomes에서 code 추출 시도
      if (!code && outcomes && Array.isArray(outcomes)) {
        const flatOutcomes = outcomes.flat().filter(Boolean);
        for (const o of flatOutcomes) {
          if (o?.code) {
            code = o.code;
            break;
          }
        }
      }

      if (!code) return { code: '', sipsung1: '', sipsung2: '', sipsung3: '' };

      // 코드에서 십성 추출 (예: "식신정인합" -> 식신, 정인, 합)
      const sipsungPattern = /(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)/g;
      const matches = code.match(sipsungPattern) || [];

      // 관계 부분 추출 (합, 충 등)
      const relationPattern = /(합|충|형|파|해|원진)/g;
      const relationMatches = code.match(relationPattern) || [];

      return {
        code,
        sipsung1: matches[0] || '',
        sipsung2: matches[1] || '',
        sipsung3: relationMatches[0] || matches[2] || ''
      };
    };

    // 성패 결과에서 positions 추출 - positions 또는 position 모두 처리
    const extractPositions = (outcomes) => {
      if (!outcomes || !Array.isArray(outcomes)) return [];
      const positions = new Set();
      outcomes.flat().forEach(o => {
        // positions (복수) 또는 position (단수) 모두 처리
        const posArray = o?.positions || (o?.position ? [o.position] : []);
        if (Array.isArray(posArray)) {
          posArray.forEach(p => positions.add(p));
        } else if (typeof posArray === 'string') {
          positions.add(posArray);
        }
      });
      return Array.from(positions);
    };

    // 결과 판정 - result 필드에서 성/패 판단
    const determineResult = (outcomes) => {
      if (!outcomes || !Array.isArray(outcomes)) return '';
      const flat = outcomes.flat().filter(Boolean);

      // deep_level이 가장 높은 outcome의 결과를 우선 사용
      const sortedByDeepLevel = [...flat].sort((a, b) => (b?.deep_level || 0) - (a?.deep_level || 0));

      // 먼저 outcome에 이미 복합 결과가 있는지 확인 (deep_level 높은 순)
      for (const o of sortedByDeepLevel) {
        const r = o?.result;
        if (r === '패중유성' || r?.includes?.('패중유성')) return '패중유성';
        if (r === '성중유패' || r?.includes?.('성중유패')) return '성중유패';
      }

      // 단순 성/패 결과 확인 (복합 결과 문자열은 제외)
      const simpleResults = flat.filter(o => {
        const r = o?.result;
        return r === '성' || r === '成' || r === '패' || r === '敗';
      });

      const successCount = simpleResults.filter(o => o?.result === '성' || o?.result === '成').length;
      const failCount = simpleResults.filter(o => o?.result === '패' || o?.result === '敗').length;

      if (successCount > 0 && failCount > 0) {
        // 실패가 더 많거나 같으면 패중유성, 성공이 더 많으면 성중유패
        return failCount >= successCount ? '패중유성' : '성중유패';
      }
      if (successCount > 0) return '성';
      if (failCount > 0) return '패';
      return '';
    };

    // 이유 추출
    const extractReason = (outcomes) => {
      if (!outcomes || !Array.isArray(outcomes)) return '';
      const flat = outcomes.flat().filter(Boolean);
      const reasons = flat.map(o => o?.reason).filter(Boolean);
      return reasons.join(', ');
    };

    const skyOutcomes = skyResult?.result?.year_luck_sky_outcome || [];
    const earthOutcomes = earthResult?.result?.year_luck_earth_outcome || [];
    // 일지와의 관계 (연애운용)
    const dayEarthOutcomes = earthResult?.result?.year_luck_day_earth_outcome || [];

    console.log('[FortuneEditor] skyOutcomes:', skyOutcomes);
    console.log('[FortuneEditor] earthOutcomes:', earthOutcomes);
    console.log('[FortuneEditor] dayEarthOutcomes:', dayEarthOutcomes);

    const skySipsung = extractSipsung(skyResult, skyOutcomes);
    const earthSipsung = extractSipsung(earthResult, earthOutcomes);
    const dayEarthSipsung = extractSipsung(earthResult, dayEarthOutcomes);

    return {
      sky: {
        code: skySipsung.code,
        result: determineResult(skyOutcomes),
        reason: extractReason(skyOutcomes) || skyResult?.result?.reason || '',
        positions: extractPositions(skyOutcomes),
        sipsung1: skySipsung.sipsung1,
        sipsung2: skySipsung.sipsung2,
        sipsung3: skySipsung.sipsung3
      },
      earth: {
        code: earthSipsung.code,
        result: determineResult(earthOutcomes),
        reason: extractReason(earthOutcomes) || earthResult?.result?.reason || '',
        positions: extractPositions(earthOutcomes),
        sipsung1: earthSipsung.sipsung1,
        sipsung2: earthSipsung.sipsung2,
        sipsung3: earthSipsung.sipsung3
      },
      day_earth: {
        code: dayEarthSipsung.code,
        result: determineResult(dayEarthOutcomes),
        reason: extractReason(dayEarthOutcomes) || '',
        positions: extractPositions(dayEarthOutcomes),
        sipsung1: dayEarthSipsung.sipsung1,
        sipsung2: dayEarthSipsung.sipsung2,
        sipsung3: dayEarthSipsung.sipsung3
      }
    };
  };

  // 기본 운세 레벨 계산 (천간/지지 개별)
  const calculateDefaultLevel = (result) => {
    const calcLevel = (r) => {
      if (r === '성' || r === '패중유성') return 'good';
      if (r === '패' || r === '성중유패') return 'difficult';
      return 'normal';
    };

    return {
      sky: calcLevel(result.sky?.result || ''),
      earth: calcLevel(result.earth?.result || '')
    };
  };

  // 연도별 수정 업데이트
  const handleYearUpdate = (year, editData) => {
    setFortuneData(prev => prev.map(item =>
      item.year === year
        ? { ...item, manager_edit: editData }
        : item
    ));
  };

  // 섹션별 콘텐츠 업데이트
  const handleSectionUpdate = async (year, sectionKey, content) => {
    // 로컬 상태 업데이트
    const updatedData = fortuneData.map(item => {
      if (item.year === year) {
        const updatedSections = {
          ...(item.content_sections || {}),
          [sectionKey]: content
        };
        // combined 재생성
        const combined = ['sky', 'earth', 'johu', 'summary']
          .map(key => updatedSections[key])
          .filter(Boolean)
          .join('\n\n');
        return {
          ...item,
          content_sections: updatedSections,
          generated_content: combined
        };
      }
      return item;
    });
    setFortuneData(updatedData);
    notifyParent(updatedData, null);

    // 서버에 자동 저장
    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_fortune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          fortune_data: {
            baseFortune: baseFortune,
            yearlyFortunes: updatedData
          }
        })
      });
      console.log(`[FortuneEditor] Section ${sectionKey} for year ${year} auto-saved`);
    } catch (saveErr) {
      console.error('Section auto-save error:', saveErr);
    }
  };

  // 개별 연도 재생성
  const handleRegenerateYear = async (year) => {
    setRegeneratingYear(year);
    try {
      const yearData = fortuneData.find(d => d.year === year);
      const managerInput = yearData?.manager_edit || {};

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_fortune_year`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          year,
          manager_input: {
            sky: {
              fortune_level: managerInput.sky?.fortune_level || 'normal',
              reason: managerInput.sky?.reason || ''
            },
            earth: {
              fortune_level: managerInput.earth?.fortune_level || 'normal',
              reason: managerInput.earth?.reason || ''
            },
            advice: managerInput.advice || '',
            memo: managerInput.memo || ''
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '재생성에 실패했습니다.');
      }

      // 생성된 데이터로 업데이트
      const updatedData = fortuneData.map(item =>
        item.year === year
          ? {
              ...item,
              generated_content: data.fortune?.generated_content,
              content_sections: data.fortune?.content_sections || null,
              sky_analysis: data.fortune?.sky_analysis || item.sky_analysis,
              earth_analysis: data.fortune?.earth_analysis || item.earth_analysis,
              johu_analysis: data.fortune?.johu_analysis || item.johu_analysis
            }
          : item
      );
      setFortuneData(updatedData);
      notifyParent(updatedData, null);

      // 서버에 자동 저장
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_fortune`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            fortune_data: {
              baseFortune: baseFortune,
              yearlyFortunes: updatedData
            }
          })
        });
        console.log('[FortuneEditor] Year auto-saved');
      } catch (saveErr) {
        console.error('Year auto-save error:', saveErr);
      }
    } catch (err) {
      console.error('Regenerate year error:', err);
      alert(`재생성 실패: ${err.message}`);
    } finally {
      setRegeneratingYear(null);
    }
  };

  // 전체 재생성 (기본 설명 + 연도별 재물운) - 순차 호출 방식
  const handleRegenerateAll = async () => {
    setRegeneratingAll(true);
    setRegeneratingIntro(true);
    setRegeneratingAllProgress({ progress: 0, message: '재물운 생성 시작...' });

    let updatedBaseFortune = baseFortune;
    let updatedFortuneData = [...fortuneData];

    try {
      // 1. 먼저 기본 재물운 설명 생성
      try {
        const introResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_fortune_intro`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            manager_intro: baseFortune.intro,
            gyeokguk: gyeokguk,
            day_sky: daySky,
            year_earth: yearEarth
          })
        });

        const introData = await introResponse.json();
        if (introResponse.ok && introData.generated_intro) {
          updatedBaseFortune = {
            ...baseFortune,
            generated_intro: introData.generated_intro
          };
          setBaseFortune(updatedBaseFortune);
        }
      } catch (introErr) {
        console.error('Regenerate intro error:', introErr);
      } finally {
        setRegeneratingIntro(false);
      }

      // 2. 연도별 재물운 생성 - 순차 호출 방식
      const totalYears = fortuneData.length;

      for (let i = 0; i < totalYears; i++) {
        const yearData = fortuneData[i];
        const year = yearData.year;
        const managerInput = yearData?.manager_edit || {};

        const progress = Math.round(10 + ((i) / totalYears) * 80);
        setRegeneratingAllProgress({
          progress,
          message: `${year}년 재물운 생성 중... (${i + 1}/${totalYears})`
        });

        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_fortune_year`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Saju-Authorization': `Bearer-${API_TOKEN}`
            },
            body: JSON.stringify({
              year,
              manager_input: {
                sky: {
                  fortune_level: managerInput.sky?.fortune_level || 'normal',
                  reason: managerInput.sky?.reason || ''
                },
                earth: {
                  fortune_level: managerInput.earth?.fortune_level || 'normal',
                  reason: managerInput.earth?.reason || ''
                },
                advice: managerInput.advice || '',
                memo: managerInput.memo || ''
              }
            })
          });

          const data = await response.json();
          if (response.ok && data.fortune) {
            updatedFortuneData = updatedFortuneData.map(item =>
              item.year === year
                ? {
                    ...item,
                    generated_content: data.fortune?.generated_content,
                    content_sections: data.fortune?.content_sections || null,
                    sky_analysis: data.fortune?.sky_analysis || item.sky_analysis,
                    earth_analysis: data.fortune?.earth_analysis || item.earth_analysis,
                    johu_analysis: data.fortune?.johu_analysis || item.johu_analysis
                  }
                : item
            );
            setFortuneData(updatedFortuneData);
          } else {
            console.error(`${year}년 재물운 생성 실패:`, data.error);
          }
        } catch (yearErr) {
          console.error(`${year}년 재물운 생성 오류:`, yearErr);
        }
      }

      setRegeneratingAllProgress({ progress: 95, message: '저장 중...' });

      // 부모에게 전체 데이터 알림
      notifyParent(updatedFortuneData, updatedBaseFortune);

      // 3. 서버에 자동 저장
      try {
        const saveResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_fortune`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            fortune_data: {
              baseFortune: updatedBaseFortune,
              yearlyFortunes: updatedFortuneData
            }
          })
        });

        const saveData = await saveResponse.json();
        if (!saveResponse.ok) {
          console.error('Auto-save failed:', saveData.error);
        } else {
          console.log('[FortuneEditor] Auto-saved successfully');
        }
      } catch (saveErr) {
        console.error('Auto-save error:', saveErr);
      }

      setRegeneratingAllProgress({ progress: 100, message: '완료!' });
    } catch (err) {
      console.error('Regenerate all error:', err);
      alert(`전체 재생성 실패: ${err.message}`);
    } finally {
      setRegeneratingAll(false);
      setRegeneratingAllProgress(null);
    }
  };

  // 기본 재물운 설명 생성
  const handleRegenerateIntro = async () => {
    setRegeneratingIntro(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_fortune_intro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          manager_intro: baseFortune.intro,
          gyeokguk: gyeokguk,
          day_sky: daySky,
          year_earth: yearEarth
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '기본 재물운 생성에 실패했습니다.');
      }

      const updatedBaseFortune = {
        ...baseFortune,
        generated_intro: data.generated_intro || ''
      };
      setBaseFortune(updatedBaseFortune);
      notifyParent(null, updatedBaseFortune);

      // 서버에 자동 저장
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_fortune`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            fortune_data: {
              baseFortune: updatedBaseFortune,
              yearlyFortunes: fortuneData
            }
          })
        });
        console.log('[FortuneEditor] Intro auto-saved');
      } catch (saveErr) {
        console.error('Intro auto-save error:', saveErr);
      }
    } catch (err) {
      console.error('Regenerate intro error:', err);
      alert(`기본 재물운 생성 실패: ${err.message}`);
    } finally {
      setRegeneratingIntro(false);
    }
  };

  // 데이터 변경 시 부모 컴포넌트에 알림하는 함수
  const notifyParent = (newFortuneData, newBaseFortune) => {
    if (onChange) {
      onChange({
        baseFortune: newBaseFortune || baseFortune,
        yearlyFortunes: newFortuneData || fortuneData
      });
    }
  };


  if (!validationResult) {
    return (
      <div className="fortune-editor-empty">
        <p>사주 검증을 먼저 실행해주세요.</p>
      </div>
    );
  }

  const isGenerating = regeneratingAll || regeneratingIntro || regeneratingYear;

  // 로딩 메시지 결정
  const getLoadingMessage = () => {
    if (regeneratingYear) {
      return {
        title: `${regeneratingYear}년 재물운 생성 중...`,
        subtitle: 'AI가 해당 연도의 재물운을 분석하고 있습니다.'
      };
    }
    if (regeneratingAll) {
      return {
        title: '재물운 생성 중...',
        subtitle: 'AI가 5년치 재물운을 분석하고 있습니다. 잠시만 기다려주세요.'
      };
    }
    return {
      title: '기본 설명 생성 중...',
      subtitle: 'AI가 기본 재물운 특성을 분석하고 있습니다.'
    };
  };

  const loadingMessage = getLoadingMessage();

  return (
    <div className="fortune-editor" style={{ position: 'relative' }}>
      {/* 전체 생성 중 오버레이 */}
      {isGenerating && (
        <div className="fortune-editor-loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">{loadingMessage.title}</div>
            <div className="loading-subtext">{loadingMessage.subtitle}</div>
            {regeneratingAll && regeneratingAllProgress?.progress > 0 && (
              <div className="loading-progress" style={{ marginTop: '16px', width: '280px' }}>
                <div style={{
                  background: '#fef3c7',
                  borderRadius: '6px',
                  height: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#f59e0b',
                    height: '100%',
                    width: `${regeneratingAllProgress.progress}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '14px', color: '#92400e', fontWeight: '500' }}>
                  {regeneratingAllProgress.progress}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fortune-editor-header">
        <h3 className="fortune-editor-title">
          💰 재물운 ({currentYear}~{currentYear + 4}년)
        </h3>
        <div className="fortune-editor-actions">
          <button
            className="btn-regenerate-all"
            onClick={handleRegenerateAll}
            disabled={regeneratingAll}
          >
            {regeneratingAll ? (
              <>
                <RefreshCw size={14} className="spinning" />
                <span>전체 생성 중...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>전체 재생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="fortune-editor-body">
        {/* 기본 재물운 설명 섹션 */}
        <div className="base-fortune-section">
          <div className="base-fortune-header">
            <h4 className="base-fortune-title">
              📖 {userName}님의 재물운 기본 설명
            </h4>
            <button
              className="btn-regenerate-intro"
              onClick={handleRegenerateIntro}
              disabled={regeneratingIntro}
            >
              {regeneratingIntro ? (
                <>
                  <RefreshCw size={14} className="spinning" />
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>기본 설명 생성</span>
                </>
              )}
            </button>
          </div>

          <div className="base-fortune-content">
            <div className="manager-intro-section">
              <label className="intro-label">매니저 입력 (AI 참고용):</label>
              <textarea
                className="intro-textarea"
                placeholder="이 사람의 재물운 특성을 입력하세요. 예: 관계와 네트워크를 통해 재물을 얻는 유형, 안정적인 수입보다 변동성 있는 수익 구조가 적합..."
                value={baseFortune.intro}
                onChange={(e) => setBaseFortune(prev => ({ ...prev, intro: e.target.value }))}
                rows={4}
              />
            </div>

            {regeneratingIntro ? (
              <div className="section-loading">
                <div className="loading-spinner-small"></div>
                <span className="section-loading-text">기본 재물운 설명을 생성하고 있습니다...</span>
              </div>
            ) : baseFortune.generated_intro ? (
              <div className="generated-intro-section">
                <label className="intro-label">생성된 기본 재물운:</label>
                <div
                  className="generated-intro-content"
                  dangerouslySetInnerHTML={{ __html: baseFortune.generated_intro }}
                />
              </div>
            ) : (
              <div className="section-loading" style={{ background: '#fef3c7' }}>
                <span className="section-loading-text" style={{ color: '#92400e' }}>
                  '기본 설명 생성' 버튼을 눌러 AI 재물운 분석을 생성하세요.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 연도별 재물운 */}
        <div className="yearly-fortune-section">
          <h4 className="yearly-fortune-title">📅 연도별 재물운 ({currentYear}~{currentYear + 4}년)</h4>
          {fortuneData.map((yearData, index) => (
            <YearFortuneEditor
              key={yearData.year}
              yearData={yearData}
              yearIndex={index}
              gyeokguk={gyeokguk}
              onUpdate={handleYearUpdate}
              onRegenerate={handleRegenerateYear}
              onSectionUpdate={handleSectionUpdate}
              isRegenerating={regeneratingYear === yearData.year}
              daySky={daySky}
              yearEarth={yearEarth}
              userName={userName}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default FortuneEditor;
