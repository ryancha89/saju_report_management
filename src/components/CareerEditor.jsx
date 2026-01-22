import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Sparkles, Briefcase } from 'lucide-react';
import './CareerEditor.css';

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

// 지지의 본기(지장간)
const getEarthMainStem = (earth) => {
  const EARTH_MAIN_STEM = {
    '子': '癸', '丑': '己', '寅': '甲', '卯': '乙',
    '辰': '戊', '巳': '丙', '午': '丁', '未': '己',
    '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
  };
  return EARTH_MAIN_STEM[earth] || '';
};

// 지지 십성 계산
const getEarthTenprop = (daySky, targetEarth) => {
  const mainStem = getEarthMainStem(targetEarth);
  return getTenprop(daySky, mainStem);
};

// 십이운성 계산
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

// 십이신살 계산
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

// 나이에 해당하는 대운 찾기
const findDecadeForAge = (decadeArray, startAge, age) => {
  if (!decadeArray || decadeArray.length === 0) return null;
  const adjustedStartAge = Math.max(startAge - 1, 0);
  const decadeIndex = Math.floor((age - adjustedStartAge) / 10);
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

// 연도 인덱스를 한글 라벨로 변환
const getYearLabel = (index) => {
  const labels = ['올해', '내년', '2년 후', '3년 후', '4년 후'];
  return labels[index] || `${index}년 후`;
};

// 직업운 레벨 옵션
const CAREER_LEVELS = [
  { value: 'very_good', label: '매우좋음', color: '#22c55e' },
  { value: 'good', label: '좋음', color: '#84cc16' },
  { value: 'normal', label: '보통', color: '#eab308' },
  { value: 'caution', label: '주의필요', color: '#f97316' },
  { value: 'difficult', label: '어려움', color: '#ef4444' },
];

// 단일 연도 직업운 편집 컴포넌트
function YearCareerEditor({
  yearData,
  yearIndex,
  onUpdate,
  onRegenerate,
  isRegenerating,
  gyeokguk,
  daySky,
  yearEarth,
  userName
}) {
  const yearSky = yearData.sky?.char || yearData.ganji?.charAt(0);
  const yearEarthChar = yearData.earth?.char || yearData.ganji?.charAt(1);

  const skyTenprop = getTenprop(daySky, yearSky);
  const earthTenprop = getEarthTenprop(daySky, yearEarthChar);
  const twelveStar = getTwelveStar(daySky, yearEarthChar);
  const twelveGod = getTwelveGod(yearEarth, yearEarthChar);

  // 대운 정보
  const yearDecade = yearData.decade;
  const decadeGanji = yearDecade?.ganji || '';
  const decadeSky = decadeGanji.charAt(0);
  const decadeEarthChar = decadeGanji.charAt(1);
  const decadeSkyTenprop = getTenprop(daySky, decadeSky);
  const decadeEarthTenprop = getEarthTenprop(daySky, decadeEarthChar);
  const decadeTwelveStar = getTwelveStar(daySky, decadeEarthChar);
  const decadeTwelveGod = getTwelveGod(yearEarth, decadeEarthChar);

  const [isExpanded, setIsExpanded] = useState(true);
  const [localEdit, setLocalEdit] = useState(yearData.manager_edit || {
    sky: {
      career_level: 'normal',
      reason: '',
    },
    earth: {
      career_level: 'normal',
      reason: '',
    },
    advice: '',
    memo: ''
  });

  useEffect(() => {
    setLocalEdit(yearData.manager_edit || {
      sky: {
        career_level: 'normal',
        reason: '',
      },
      earth: {
        career_level: 'normal',
        reason: '',
      },
      advice: '',
      memo: ''
    });
  }, [yearData]);

  const handleLocalChange = (field, value, category = null) => {
    let newEdit;
    if (category) {
      newEdit = {
        ...localEdit,
        [category]: {
          ...localEdit[category],
          [field]: value
        }
      };
    } else {
      newEdit = { ...localEdit, [field]: value };
    }
    setLocalEdit(newEdit);
    onUpdate(yearData.year, newEdit);
  };

  const getResultClass = (result) => {
    if (result === '성') return 'result-success';
    if (result === '패') return 'result-fail';
    if (result === '성중유패') return 'result-mixed-fail';
    if (result === '패중유성') return 'result-mixed-success';
    return '';
  };

  const getLevelColor = (level) => {
    const found = CAREER_LEVELS.find(l => l.value === level);
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
    <div className="year-career-editor">
      <div
        className="year-career-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="year-career-title">
          <span className="year-index-label">{getYearLabel(yearIndex)}</span>
          <span className="year-label">{yearData.year}년</span>
          <span className="ganji-label">({yearData.ganji})</span>
          <span
            className="career-level-badge sky-badge"
            style={{ backgroundColor: getLevelColor(localEdit.sky?.career_level) }}
          >
            天 {CAREER_LEVELS.find(l => l.value === localEdit.sky?.career_level)?.label || '보통'}
          </span>
          <span
            className="career-level-badge earth-badge"
            style={{ backgroundColor: getLevelColor(localEdit.earth?.career_level) }}
          >
            地 {CAREER_LEVELS.find(l => l.value === localEdit.earth?.career_level)?.label || '보통'}
          </span>
        </div>
        <div className="year-career-toggle">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="year-career-body">
          {/* 대운 + 세운 정보 */}
          <div className="luck-info-container">
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
          <div className="career-analysis-section">
            {/* 천간 분석 */}
            {yearData.sky && (
              <div className="career-analysis-box sky-box">
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
              <div className="career-analysis-box earth-box">
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
          </div>

          {/* 매니저 수정 영역 */}
          <div className="manager-edit-section">
            <div className="edit-section-title">【매니저 수정】</div>

            {/* 천간운 (정신적 영역) */}
            <div className="edit-category sky-category">
              <div className="edit-category-title">
                <span className="category-icon">天</span>
                천간운 (정신적 영역 - 리더십, 인정, 명예)
              </div>
              <div className="edit-row">
                <label className="edit-label">직업운 판정:</label>
                <select
                  className="career-level-select"
                  value={localEdit.sky?.career_level || 'normal'}
                  onChange={(e) => handleLocalChange('career_level', e.target.value, 'sky')}
                >
                  {CAREER_LEVELS.map(level => (
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
                  placeholder="예: 리더십 발휘 기회, 승진/인정 가능성"
                  value={localEdit.sky?.reason || ''}
                  onChange={(e) => handleLocalChange('reason', e.target.value, 'sky')}
                />
              </div>
            </div>

            {/* 지지운 (현실적 영역) */}
            <div className="edit-category earth-category">
              <div className="edit-category-title">
                <span className="category-icon">地</span>
                지지운 (현실적 영역 - 실무, 성과, 환경)
              </div>
              <div className="edit-row">
                <label className="edit-label">직업운 판정:</label>
                <select
                  className="career-level-select"
                  value={localEdit.earth?.career_level || 'normal'}
                  onChange={(e) => handleLocalChange('career_level', e.target.value, 'earth')}
                >
                  {CAREER_LEVELS.map(level => (
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
                  placeholder="예: 업무 효율 증가, 팀워크 개선, 실적 향상"
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
                  placeholder="예: 이직 고려 시기, 사업 확장 적기"
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

          {/* 생성된 콘텐츠 */}
          {isRegenerating ? (
            <div className="generated-content-section" style={{ background: '#f0fdf4' }}>
              <div className="section-loading">
                <div className="loading-spinner-small"></div>
                <span className="section-loading-text">{yearData.year}년 직업운을 생성하고 있습니다...</span>
              </div>
            </div>
          ) : yearData.generated_content ? (
            <div className="generated-content-section">
              <div className="content-title">생성된 직업운</div>
              {/* 객체인 경우 섹션별로 표시, 문자열인 경우 그대로 표시 */}
              {typeof yearData.generated_content === 'object' ? (
                <div className="generated-content sectioned">
                  {yearData.generated_content.sky && (
                    <div className="content-section">
                      <div className="section-label">천간운 (외부 기회)</div>
                      <p>{yearData.generated_content.sky}</p>
                    </div>
                  )}
                  {yearData.generated_content.earth && (
                    <div className="content-section">
                      <div className="section-label">지지운 (내면 역량)</div>
                      <p>{yearData.generated_content.earth}</p>
                    </div>
                  )}
                  {yearData.generated_content.month && (
                    <div className="content-section">
                      <div className="section-label">월지운 (직장 환경)</div>
                      <p>{yearData.generated_content.month}</p>
                    </div>
                  )}
                  {yearData.generated_content.summary && (
                    <div className="content-section">
                      <div className="section-label">종합 조언</div>
                      <p>{yearData.generated_content.summary}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="generated-content"
                  dangerouslySetInnerHTML={{ __html: yearData.generated_content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') }}
                />
              )}
            </div>
          ) : (
            <div className="generated-content-section" style={{ background: '#fef3c7', borderColor: '#fcd34d' }}>
              <div className="content-title" style={{ color: '#92400e' }}>직업운 미생성</div>
              <div className="section-loading-text" style={{ color: '#92400e', textAlign: 'center', padding: '10px' }}>
                '이 연도만 재생성' 또는 '전체 재생성' 버튼을 눌러주세요.
              </div>
            </div>
          )}

          {/* 재생성 버튼 */}
          <div className="year-career-actions">
            <button
              className="btn-regenerate-year"
              onClick={() => onRegenerate(yearData.year)}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <RefreshCw size={14} className="spinning" />
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

// 메인 직업운 편집 컴포넌트
const CareerEditor = forwardRef(function CareerEditor({
  orderId,
  validationResult,
  initialData,
  initialBaseCareer,
  onChange
}, ref) {
  const currentYear = new Date().getFullYear();
  const [careerData, setCareerData] = useState([]);
  const [baseCareer, setBaseCareer] = useState(initialBaseCareer || {
    intro: '',
    generated_intro: ''
  });
  const [loading, setLoading] = useState(false);
  const [regeneratingYear, setRegeneratingYear] = useState(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regeneratingIntro, setRegeneratingIntro] = useState(false);
  const [gyeokguk, setGyeokguk] = useState('');
  const [currentDecade, setCurrentDecade] = useState(null);
  const userName = validationResult?.order_info?.name || '고객';

  // 일간, 년지 추출
  const zodiacDay = validationResult?.saju_data?.zodiac_day || '';
  const zodiacYear = validationResult?.saju_data?.zodiac_year || '';
  const daySky = zodiacDay.charAt(0);
  const yearEarth = zodiacYear.charAt(1);

  // 부모 컴포넌트에서 호출 가능한 메서드 노출
  useImperativeHandle(ref, () => ({
    regenerateAll: handleRegenerateAll,
    isRegenerating: () => regeneratingAll
  }));

  // 5년치 직업운 데이터 초기화
  useEffect(() => {
    if (validationResult) {
      initializeCareerData();
    }
  }, [validationResult]);

  // 초기 데이터가 있으면 로드 (저장된 데이터가 있으면 초기화 데이터보다 우선)
  useEffect(() => {
    // initialData에 실제 content가 있는 항목이 있는지 확인
    const hasContent = initialData && initialData.length > 0 &&
      initialData.some(item => item.content || item.generated_content);

    console.log('[CareerEditor] initialData check:', {
      initialData,
      hasContent,
      careerDataLength: careerData.length
    });

    if (hasContent && validationResult) {
      console.log('[CareerEditor] initialData raw:', JSON.stringify(initialData[0], null, 2));
      const { decade_luck, current_decade, type_analysis } = validationResult;
      const decadeArray = decade_luck?.decade_array || [];
      const decadeStartAge = decade_luck?.start_age || 1;

      const skyType = type_analysis?.sky_result?.status?.type || '';
      const earthType = type_analysis?.earth_result?.status?.type || '';

      const birthDateStr = validationResult?.order_info?.birth_date || '';
      const birthYearMatch = birthDateStr.match(/(\d+)년/);
      const birthYear = birthYearMatch ? parseInt(birthYearMatch[1]) :
                        validationResult?.order_info?.birth_year ||
                        validationResult?.saju_data?.birth_year ||
                        new Date().getFullYear() - (current_decade?.start_age || 30);

      const dataWithDecade = initialData.map(item => {
        const ageAtYear = item.year - birthYear + 1;
        let decadeForYear = findDecadeForAge(decadeArray, decadeStartAge, ageAtYear);

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

        // manager_edit이 없으면 격국 성패 결과로 계산
        const calcLevel = (result) => {
          if (result === '성' || result === '패중유성') return 'good';
          if (result === '패' || result === '성중유패') return 'difficult';
          return 'normal';
        };

        const calculatedManagerEdit = item.manager_edit || {
          sky: {
            career_level: calcLevel(skyData.result),
            reason: ''
          },
          earth: {
            career_level: calcLevel(earthData.result),
            reason: ''
          },
          advice: '',
          memo: ''
        };

        console.log(`[CareerEditor] Year ${item.year}:`, {
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
          // content 또는 generated_content 필드 모두 지원
          generated_content: item.generated_content || item.content || '',
          manager_edit: calculatedManagerEdit,
          decade: item.decade || decadeForYear,
          ageAtYear: item.ageAtYear || ageAtYear
        };
      });
      console.log('[CareerEditor] Loading saved data:', dataWithDecade);
      setCareerData(dataWithDecade);
    }
  }, [initialData, validationResult]);

  // 초기 baseCareer 데이터가 있으면 로드
  useEffect(() => {
    if (initialBaseCareer && initialBaseCareer.generated_intro && !baseCareer.generated_intro) {
      setBaseCareer(initialBaseCareer);
    }
  }, [initialBaseCareer]);

  const initializeCareerData = () => {
    const { type_analysis, current_decade, decade_luck } = validationResult;

    const skyType = type_analysis?.sky_result?.status?.type || '';
    const earthType = type_analysis?.earth_result?.status?.type || '';
    setGyeokguk(skyType || earthType);
    setCurrentDecade(current_decade);

    const decadeArray = decade_luck?.decade_array || [];
    const decadeStartAge = decade_luck?.start_age || 1;

    const birthDateStr = validationResult?.order_info?.birth_date || '';
    const birthYearMatch = birthDateStr.match(/(\d+)년/);
    const birthYear = birthYearMatch ? parseInt(birthYearMatch[1]) :
                      validationResult?.order_info?.birth_year ||
                      validationResult?.saju_data?.birth_year ||
                      new Date().getFullYear() - (current_decade?.start_age || 30);

    const years = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear + i;
      const ganji = getYearGanji(year);
      const sky = ganji.charAt(0);
      const earth = ganji.charAt(1);
      const ageAtYear = year - birthYear + 1;

      let decadeForYear = findDecadeForAge(decadeArray, decadeStartAge, ageAtYear);
      if (!decadeForYear && current_decade) {
        decadeForYear = {
          ganji: current_decade.ganji,
          sky: current_decade.ganji?.charAt(0),
          earth: current_decade.ganji?.charAt(1),
          start_age: current_decade.start_age,
          end_age: current_decade.end_age
        };
      }

      // 세운 성패 추출
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
        manager_edit: {
          sky: {
            career_level: calculateDefaultLevel(yearLuckResult).sky,
            reason: '',
          },
          earth: {
            career_level: calculateDefaultLevel(yearLuckResult).earth,
            reason: '',
          },
          advice: '',
          memo: ''
        },
        generated_content: '',
        decade: decadeForYear,
        ageAtYear: ageAtYear
      });
    }
    setCareerData(years);
  };

  // 세운 성패 추출
  const extractYearLuckResult = (year, sky, earth, type_analysis, current_decade) => {
    if (!type_analysis || !current_decade) {
      return { sky: {}, earth: {} };
    }

    const decadeSky = current_decade.ganji?.charAt(0);
    const decadeEarth = current_decade.ganji?.charAt(1);

    const skyDecadeLucks = type_analysis.sky_result?.lucks?.decade_lucks;
    const earthDecadeLucks = type_analysis.earth_result?.lucks?.decade_lucks;

    const skyYearLucks = skyDecadeLucks?.[decadeSky]?.year_lucks;
    const earthYearLucks = earthDecadeLucks?.[decadeEarth]?.year_lucks;

    const skyResult = skyYearLucks?.[sky];
    const earthResult = earthYearLucks?.[earth];

    const extractSipsung = (result, outcomes) => {
      let code = result?.codes?.[0] || '';
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

      const sipsungPattern = /(비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)/g;
      const matches = code.match(sipsungPattern) || [];
      const relationPattern = /(합|충|형|파|해|원진)/g;
      const relationMatches = code.match(relationPattern) || [];

      return {
        code,
        sipsung1: matches[0] || '',
        sipsung2: matches[1] || '',
        sipsung3: relationMatches[0] || matches[2] || ''
      };
    };

    const extractPositions = (outcomes) => {
      if (!outcomes || !Array.isArray(outcomes)) return [];
      const positions = new Set();
      outcomes.flat().forEach(o => {
        const posArray = o?.positions || (o?.position ? [o.position] : []);
        if (Array.isArray(posArray)) {
          posArray.forEach(p => positions.add(p));
        } else if (typeof posArray === 'string') {
          positions.add(posArray);
        }
      });
      return Array.from(positions);
    };

    const determineResult = (outcomes) => {
      if (!outcomes || !Array.isArray(outcomes)) return '';
      const flat = outcomes.flat().filter(Boolean);

      const sortedByDeepLevel = [...flat].sort((a, b) => (b?.deep_level || 0) - (a?.deep_level || 0));

      for (const o of sortedByDeepLevel) {
        const r = o?.result;
        if (r === '패중유성' || r?.includes?.('패중유성')) return '패중유성';
        if (r === '성중유패' || r?.includes?.('성중유패')) return '성중유패';
      }

      const simpleResults = flat.filter(o => {
        const r = o?.result;
        return r === '성' || r === '成' || r === '패' || r === '敗';
      });

      const successCount = simpleResults.filter(o => o?.result === '성' || o?.result === '成').length;
      const failCount = simpleResults.filter(o => o?.result === '패' || o?.result === '敗').length;

      if (successCount > 0 && failCount > 0) {
        return failCount >= successCount ? '패중유성' : '성중유패';
      }
      if (successCount > 0) return '성';
      if (failCount > 0) return '패';
      return '';
    };

    const extractReason = (outcomes) => {
      if (!outcomes || !Array.isArray(outcomes)) return '';
      const flat = outcomes.flat().filter(Boolean);
      const reasons = flat.map(o => o?.reason).filter(Boolean);
      return reasons.join(', ');
    };

    const skyOutcomes = skyResult?.result?.year_luck_sky_outcome || [];
    const earthOutcomes = earthResult?.result?.year_luck_earth_outcome || [];

    const skySipsung = extractSipsung(skyResult, skyOutcomes);
    const earthSipsung = extractSipsung(earthResult, earthOutcomes);

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
      }
    };
  };

  // 기본 직업운 레벨 계산
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
    setCareerData(prev => prev.map(item =>
      item.year === year
        ? { ...item, manager_edit: editData }
        : item
    ));
  };

  // 개별 연도 재생성
  const handleRegenerateYear = async (year) => {
    setRegeneratingYear(year);
    try {
      const yearData = careerData.find(d => d.year === year);
      const managerInput = yearData?.manager_edit || {};

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_career_year`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          year,
          manager_input: {
            sky: {
              career_level: managerInput.sky?.career_level || 'normal',
              reason: managerInput.sky?.reason || ''
            },
            earth: {
              career_level: managerInput.earth?.career_level || 'normal',
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

      const updatedData = careerData.map(item =>
        item.year === year
          ? {
              ...item,
              generated_content: data.career?.generated_content,
              sky_analysis: data.career?.sky_analysis || item.sky_analysis,
              earth_analysis: data.career?.earth_analysis || item.earth_analysis
            }
          : item
      );
      setCareerData(updatedData);
      notifyParent(updatedData, null);

      // 서버에 자동 저장
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_career`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            career_data: {
              baseCareer: baseCareer,
              yearlyCareers: updatedData
            }
          })
        });
        console.log('[CareerEditor] Year auto-saved');
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

  // 전체 재생성
  const handleRegenerateAll = async () => {
    setRegeneratingAll(true);
    setRegeneratingIntro(true);

    let updatedBaseCareer = baseCareer;
    let updatedCareerData = careerData;

    try {
      // 1. 기본 직업운 설명 생성
      try {
        const introResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_career_intro`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            manager_intro: baseCareer.intro,
            gyeokguk: gyeokguk,
            day_sky: daySky,
            year_earth: yearEarth
          })
        });

        const introData = await introResponse.json();
        if (introResponse.ok && introData.generated_intro) {
          updatedBaseCareer = {
            ...baseCareer,
            generated_intro: introData.generated_intro
          };
          setBaseCareer(updatedBaseCareer);
        }
      } catch (introErr) {
        console.error('Regenerate career intro error:', introErr);
      } finally {
        setRegeneratingIntro(false);
      }

      // 2. 연도별 직업운 생성
      const managerInputs = {};
      careerData.forEach(item => {
        if (item.manager_edit) {
          managerInputs[item.year] = {
            sky: {
              career_level: item.manager_edit.sky?.career_level || 'normal',
              reason: item.manager_edit.sky?.reason || ''
            },
            earth: {
              career_level: item.manager_edit.earth?.career_level || 'normal',
              reason: item.manager_edit.earth?.reason || ''
            },
            advice: item.manager_edit.advice || '',
            memo: item.manager_edit.memo || ''
          };
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_career_all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          manager_inputs: managerInputs
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '전체 재생성에 실패했습니다.');
      }

      updatedCareerData = careerData.map(item => {
        const newCareer = data.careers?.[item.year];
        if (newCareer) {
          return {
            ...item,
            generated_content: newCareer.generated_content,
            sky_analysis: newCareer.sky_analysis || item.sky_analysis,
            earth_analysis: newCareer.earth_analysis || item.earth_analysis
          };
        }
        return item;
      });
      setCareerData(updatedCareerData);

      notifyParent(updatedCareerData, updatedBaseCareer);

      // 3. 서버에 자동 저장
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_career`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            career_data: {
              baseCareer: updatedBaseCareer,
              yearlyCareers: updatedCareerData
            }
          })
        });
        console.log('[CareerEditor] Auto-saved successfully');
      } catch (saveErr) {
        console.error('Auto-save error:', saveErr);
      }
    } catch (err) {
      console.error('Regenerate all error:', err);
      alert(`전체 재생성 실패: ${err.message}`);
    } finally {
      setRegeneratingAll(false);
    }
  };

  // 기본 직업운 설명 생성
  const handleRegenerateIntro = async () => {
    setRegeneratingIntro(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_career_intro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          manager_intro: baseCareer.intro,
          gyeokguk: gyeokguk,
          day_sky: daySky,
          year_earth: yearEarth
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '기본 직업운 생성에 실패했습니다.');
      }

      const updatedBaseCareer = {
        ...baseCareer,
        generated_intro: data.generated_intro || ''
      };
      setBaseCareer(updatedBaseCareer);
      notifyParent(null, updatedBaseCareer);

      // 서버에 자동 저장
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_career`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            career_data: {
              baseCareer: updatedBaseCareer,
              yearlyCareers: careerData
            }
          })
        });
        console.log('[CareerEditor] Intro auto-saved');
      } catch (saveErr) {
        console.error('Intro auto-save error:', saveErr);
      }
    } catch (err) {
      console.error('Regenerate intro error:', err);
      alert(`기본 직업운 생성 실패: ${err.message}`);
    } finally {
      setRegeneratingIntro(false);
    }
  };

  const notifyParent = (newCareerData, newBaseCareer) => {
    if (onChange) {
      onChange({
        baseCareer: newBaseCareer || baseCareer,
        yearlyCareers: newCareerData || careerData
      });
    }
  };

  if (!validationResult) {
    return (
      <div className="career-editor-empty">
        <p>사주 검증을 먼저 실행해주세요.</p>
      </div>
    );
  }

  const isGenerating = regeneratingAll || regeneratingIntro;

  return (
    <div className="career-editor" style={{ position: 'relative' }}>
      {/* 전체 생성 중 오버레이 */}
      {isGenerating && (
        <div className="career-editor-loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">
              {regeneratingAll ? '직업운 생성 중...' : '기본 설명 생성 중...'}
            </div>
            <div className="loading-subtext">
              {regeneratingAll
                ? 'AI가 5년치 직업운/사회운을 분석하고 있습니다. 잠시만 기다려주세요.'
                : 'AI가 핵심 사회적 역할과 커리어 방향을 분석하고 있습니다.'}
            </div>
          </div>
        </div>
      )}

      <div className="career-editor-header">
        <h3 className="career-editor-title">
          <Briefcase size={20} />
          직업운/사회운 ({currentYear}~{currentYear + 4}년)
        </h3>
        <div className="career-editor-actions">
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

      <div className="career-editor-body">
        {/* 기본 직업운 설명 섹션 */}
        <div className="base-career-section">
          <div className="base-career-header">
            <h4 className="base-career-title">
              I. {userName}님의 핵심 사회적 역할 (Archetype)
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

          <div className="base-career-content">
            <div className="manager-intro-section">
              <label className="intro-label">매니저 입력 (AI 참고용):</label>
              <textarea
                className="intro-textarea"
                placeholder="이 사람의 직업적 특성, 사회적 역할, 적합한 산업/분야 등을 입력하세요. 예: 대인관계 매력적, 변화에 빠른 적응력, 네트워킹 능력 탁월..."
                value={baseCareer.intro}
                onChange={(e) => setBaseCareer(prev => ({ ...prev, intro: e.target.value }))}
                rows={4}
              />
            </div>

            {regeneratingIntro ? (
              <div className="section-loading">
                <div className="loading-spinner-small"></div>
                <span className="section-loading-text">핵심 사회적 역할을 분석하고 있습니다...</span>
              </div>
            ) : baseCareer.generated_intro ? (
              <div className="generated-intro-section">
                <label className="intro-label">생성된 직업운 분석:</label>
                <div
                  className="generated-intro-content"
                  dangerouslySetInnerHTML={{ __html: baseCareer.generated_intro.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') }}
                />
              </div>
            ) : (
              <div className="section-loading" style={{ background: '#fef3c7' }}>
                <span className="section-loading-text" style={{ color: '#92400e' }}>
                  '기본 설명 생성' 버튼을 눌러 AI 직업운 분석을 생성하세요.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 연도별 직업운 */}
        <div className="yearly-career-section">
          <h4 className="yearly-career-title">
            II. 향후 5년의 커리어 전환점과 행동 전략 ({currentYear}~{currentYear + 4}년)
          </h4>
          {careerData.map((yearData, index) => (
            <YearCareerEditor
              key={yearData.year}
              yearData={yearData}
              yearIndex={index}
              gyeokguk={gyeokguk}
              onUpdate={handleYearUpdate}
              onRegenerate={handleRegenerateYear}
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

export default CareerEditor;
