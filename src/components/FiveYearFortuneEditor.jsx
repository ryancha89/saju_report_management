import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import './FiveYearFortuneEditor.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// 60갑자 배열
const GANJI_60 = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
];

// 운세 레벨 옵션
const FORTUNE_LEVELS = [
  { value: 'very_good', label: '매우좋음', color: '#22c55e' },
  { value: 'good', label: '좋음', color: '#84cc16' },
  { value: 'normal', label: '보통', color: '#eab308' },
  { value: 'caution', label: '주의필요', color: '#f97316' },
  { value: 'difficult', label: '어려움', color: '#ef4444' },
];

// 연도 인덱스를 한글 라벨로 변환
const getYearLabel = (index) => {
  const labels = ['올해', '내년', '2년 후', '3년 후', '4년 후'];
  return labels[index] || `${index}년 후`;
};

// 연도로 간지 계산
const getYearGanji = (year) => {
  const baseYear = 1984;
  const index = ((year - baseYear) % 60 + 60) % 60;
  return GANJI_60[index];
};

// 위치명 한글 변환
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
    // 객체 키 형식 (year_luck_sky_outcome 등)도 처리
    'year_luck_sky_outcome': '세운 천간',
    'year_luck_decade_luck_sky_outcome': '대운 천간',
    'year_luck_year_sky_outcome': '년간',
    'year_luck_month_sky_outcome': '월간',
    'year_luck_time_sky_outcome': '시간',
    'year_luck_earth_outcome': '세운 지지',
    'year_luck_decade_luck_earth_outcome': '대운 지지',
    'year_luck_year_earth_outcome': '년지',
    'year_luck_month_earth_outcome': '월지',
    'year_luck_day_earth_outcome': '일지',
    'year_luck_time_earth_outcome': '시지',
  };
  return positionMap[position] || position;
};

// 안전하게 positions 배열/객체를 문자열로 변환
const safeRenderPositions = (positions) => {
  if (!positions) return '';

  // 배열인 경우 (예: ['year_luck_sky', 'decade_luck_sky'])
  if (Array.isArray(positions)) {
    return positions.map(p => translatePosition(String(p))).join(', ');
  }

  // 객체인 경우 (예: {year_luck_sky_outcome: true, ...})
  if (typeof positions === 'object') {
    const trueKeys = Object.entries(positions)
      .filter(([_, value]) => value === true || value === '성' || value === '成')
      .map(([key]) => translatePosition(key));
    return trueKeys.length > 0 ? trueKeys.join(', ') : '';
  }

  // 문자열인 경우
  if (typeof positions === 'string') {
    return translatePosition(positions);
  }

  return '';
};

// 안전하게 result를 문자열로 변환
const safeRenderResult = (result) => {
  if (!result) return '';

  // 문자열인 경우
  if (typeof result === 'string') {
    return result;
  }

  // 객체인 경우 - '성' 또는 '패' 값을 가진 키가 있는지 확인
  if (typeof result === 'object') {
    const values = Object.values(result);
    const hasSuccess = values.some(v => v === '성' || v === '成' || v === true);
    const hasFail = values.some(v => v === '패' || v === '敗' || v === false);

    if (hasSuccess && hasFail) return '성중유패';
    if (hasSuccess) return '성';
    if (hasFail) return '패';
    return '';
  }

  return String(result);
};

// 안전하게 reason을 문자열로 변환
const safeRenderReason = (reason) => {
  if (!reason) return '';

  // 문자열인 경우
  if (typeof reason === 'string') {
    return reason;
  }

  // 객체인 경우 - JSON 문자열로 변환하거나 첫 번째 값 반환
  if (typeof reason === 'object') {
    const values = Object.values(reason).filter(v => v && typeof v === 'string');
    return values.length > 0 ? values.join(', ') : '';
  }

  return String(reason);
};

// 일반적인 안전한 문자열 변환 (relations 등에 사용)
const safeString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    // 배열인 경우 join
    if (Array.isArray(value)) {
      return value.map(v => safeString(v)).join(', ');
    }
    // 객체인 경우 값들 추출
    const values = Object.values(value).filter(v => v && typeof v === 'string');
    return values.length > 0 ? values.join(', ') : '';
  }
  return String(value);
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

// 단일 연도 5년운세 컴포넌트
function YearFiveYearFortuneEditor({
  yearData,
  yearIndex,
  onUpdate,
  onRegenerate,
  isRegenerating,
  userName
}) {
  const [isExpanded, setIsExpanded] = useState(yearIndex === 0);
  const [localEdit, setLocalEdit] = useState(yearData.manager_edit || {
    fortune_level: 'normal',
    reason: '',
    advice: '',
    memo: ''
  });

  useEffect(() => {
    setLocalEdit(yearData.manager_edit || {
      fortune_level: 'normal',
      reason: '',
      advice: '',
      memo: ''
    });
  }, [yearData]);

  const handleLocalChange = (field, value) => {
    const newEdit = { ...localEdit, [field]: value };
    setLocalEdit(newEdit);
    onUpdate(yearData.year, newEdit);
  };

  const getLevelColor = (level) => {
    const found = FORTUNE_LEVELS.find(l => l.value === level);
    return found ? found.color : '#eab308';
  };

  const getResultClass = (result) => {
    if (!result) return '';
    const resultStr = typeof result === 'string' ? result : String(result);
    if (resultStr === '성' || resultStr === '成') return 'result-success';
    if (resultStr === '패' || resultStr === '敗') return 'result-fail';
    if (resultStr.includes('성중유패')) return 'result-mixed-fail';
    if (resultStr.includes('패중유성')) return 'result-mixed-success';
    return '';
  };

  const getRelationClass = (type) => {
    if (type === '육합' || type === '반합' || type === '삼합') return 'relation-good';
    if (type === '충') return 'relation-bad';
    if (type === '형') return 'relation-warning';
    if (type === '파' || type === '해') return 'relation-caution';
    return '';
  };

  // 십성 표시
  const renderSipsung = (data) => {
    // 단일 sipsung 필드가 있는 경우 (재물운 로직)
    if (data?.sipsung) {
      return data.sipsung;
    }
    // sipsung_flow가 있는 경우
    if (data?.sipsung_flow) {
      return data.sipsung_flow;
    }
    // 기존 sipsung1/2/3 형식
    const parts = [];
    if (data?.sipsung1) parts.push(data.sipsung1);
    if (data?.sipsung2) parts.push(data.sipsung2);
    if (data?.sipsung3) parts.push(data.sipsung3);
    return parts.length > 0 ? parts.join(' → ') : '-';
  };

  return (
    <div className="year-five-year-editor">
      <div
        className="year-five-year-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="year-five-year-title">
          <span className="year-index-label">{getYearLabel(yearIndex)}</span>
          <span className="year-label">{yearData.year}년</span>
          <span className="ganji-label">({yearData.ganji})</span>
          <span
            className="fortune-level-badge five-year-badge"
            style={{ backgroundColor: getLevelColor(localEdit.fortune_level) }}
          >
            <TrendingUp size={12} /> {FORTUNE_LEVELS.find(l => l.value === localEdit.fortune_level)?.label || '보통'}
          </span>
        </div>
        <div className="year-five-year-toggle">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="year-five-year-body">
          {/* 대운 정보 */}
          {yearData.decade && (
            <div className="five-year-decade-info">
              <div className="decade-row">
                <span className="decade-badge">대운</span>
                <span className="decade-ganji-value">{yearData.decade.ganji}</span>
                <span className="decade-age-range">({yearData.decade.start_age}~{yearData.decade.end_age}세)</span>
                {yearData.age_at_year && <span className="current-age">{yearData.age_at_year}세</span>}
              </div>
            </div>
          )}

          {/* 4가지 분석 */}
          <div className="five-year-analysis-section">
            {/* 1. 격국 성패 분석 (천간/지지) */}
            <div className="five-year-analysis-box gyeokguk-box">
              <div className="analysis-header">
                <span className="analysis-type">【1. 격국 성패】</span>
                <span className="analysis-label">천간/지지 성패 분석</span>
              </div>
              <div className="analysis-content">
                {/* 천간 성패 */}
                {yearData.sky_outcome ? (
                  <div className="outcome-group">
                    <div className="outcome-title">▸ 천간 ({yearData.ganji?.charAt(0)})</div>
                    <div className="outcome-item">
                      <div className="analysis-row">
                        <span className="row-label">십성:</span>
                        <span className="row-value">{renderSipsung(yearData.sky_outcome)}</span>
                      </div>
                      <div className="analysis-row">
                        <span className="row-label">코드:</span>
                        <span className="row-value code-value">{yearData.sky_outcome.code || '(없음)'}</span>
                        {safeRenderResult(yearData.sky_outcome.result) && (
                          <span className={`result-badge ${getResultClass(yearData.sky_outcome.result)}`}>
                            {safeRenderResult(yearData.sky_outcome.result)}
                          </span>
                        )}
                      </div>
                      {safeRenderPositions(yearData.sky_outcome.positions) && (
                        <div className="analysis-row">
                          <span className="row-label">위치:</span>
                          <span className="row-value">
                            {safeRenderPositions(yearData.sky_outcome.positions)}
                          </span>
                        </div>
                      )}
                      {safeRenderReason(yearData.sky_outcome.reason) && (
                        <div className="analysis-reason">{safeRenderReason(yearData.sky_outcome.reason)}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="outcome-group">
                    <div className="outcome-title">▸ 천간 ({yearData.ganji?.charAt(0)})</div>
                    <div className="analysis-empty">천간 성패 분석 결과 없음</div>
                  </div>
                )}

                {/* 지지 성패 */}
                {yearData.earth_outcome ? (
                  <div className="outcome-group">
                    <div className="outcome-title">▸ 지지 ({yearData.ganji?.charAt(1)})</div>
                    <div className="outcome-item">
                      <div className="analysis-row">
                        <span className="row-label">십성:</span>
                        <span className="row-value">{renderSipsung(yearData.earth_outcome)}</span>
                      </div>
                      <div className="analysis-row">
                        <span className="row-label">코드:</span>
                        <span className="row-value code-value">{yearData.earth_outcome.code || '(없음)'}</span>
                        {safeRenderResult(yearData.earth_outcome.result) && (
                          <span className={`result-badge ${getResultClass(yearData.earth_outcome.result)}`}>
                            {safeRenderResult(yearData.earth_outcome.result)}
                          </span>
                        )}
                      </div>
                      {safeRenderPositions(yearData.earth_outcome.positions) && (
                        <div className="analysis-row">
                          <span className="row-label">위치:</span>
                          <span className="row-value">
                            {safeRenderPositions(yearData.earth_outcome.positions)}
                          </span>
                        </div>
                      )}
                      {safeRenderReason(yearData.earth_outcome.reason) && (
                        <div className="analysis-reason">{safeRenderReason(yearData.earth_outcome.reason)}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="outcome-group">
                    <div className="outcome-title">▸ 지지 ({yearData.ganji?.charAt(1)})</div>
                    <div className="analysis-empty">지지 성패 분석 결과 없음</div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. 억부 분석 */}
            <div className="five-year-analysis-box ukbu-box">
              <div className="analysis-header">
                <span className="analysis-type">【2. 억부(抑扶)】</span>
                <span className="analysis-label">일간 강약 분석</span>
              </div>
              <div className="analysis-content">
                <div className="strength-info">
                  <div className="strength-row">
                    <span className="strength-label">강약:</span>
                    <span className="strength-level">{yearData.strength?.level || '-'}</span>
                    <span className="strength-score">(점수: {yearData.strength?.score ?? '-'})</span>
                  </div>
                  {yearData.strength?.description && (
                    <div className="analysis-reason">{yearData.strength.description}</div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. 조후 분석 */}
            <div className="five-year-analysis-box johu-box">
              <div className="analysis-header">
                <span className="analysis-type">【3. 조후(調候)】</span>
                <span className="analysis-label">온도/습도 분석</span>
              </div>
              <div className="analysis-content">
                <div className="johu-grid">
                  <div className="johu-item temperature">
                    <span className="johu-label">온도:</span>
                    <span className="johu-value">
                      {yearData.year_temperature?.temp ?? '-'}도
                      <span className="johu-level">({yearData.year_temperature?.level || '-'})</span>
                    </span>
                  </div>
                  <div className="johu-item humidity">
                    <span className="johu-label">습도:</span>
                    <span className="johu-value">
                      {yearData.year_humid?.humid ?? '-'}%
                      <span className="johu-level">({yearData.year_humid?.level || '-'})</span>
                    </span>
                  </div>
                </div>
                {(yearData.year_temperature?.description || yearData.year_humid?.description) && (
                  <div className="analysis-reason">
                    {yearData.year_temperature?.description || yearData.year_humid?.description}
                  </div>
                )}
              </div>
            </div>

            {/* 4. 합형충파해 분석 */}
            <div className="five-year-analysis-box relations-box">
              <div className="analysis-header">
                <span className="analysis-type">【4. 합형충파해】</span>
                <span className="analysis-label">지지 관계 분석</span>
              </div>
              <div className="analysis-content">
                {yearData.relations?.length > 0 ? (
                  <div className="relations-list">
                    {yearData.relations.map((rel, idx) => (
                      <div key={idx} className={`relation-item ${getRelationClass(safeString(rel.type))}`}>
                        <span className="relation-type">{safeString(rel.type)}</span>
                        <span className="relation-chars">{safeString(rel.chars)}</span>
                        <span className="relation-desc">{safeString(rel.description)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analysis-empty">해당 연도에 특별한 합형충파해 없음</div>
                )}
              </div>
            </div>
          </div>

          {/* 매니저 수정 영역 */}
          <div className="manager-edit-section five-year-edit">
            <div className="edit-section-title">【매니저 수정】</div>

            <div className="edit-category five-year-category">
              <div className="edit-row">
                <label className="edit-label">운세 판정:</label>
                <select
                  className="fortune-level-select five-year-select"
                  value={localEdit.fortune_level || 'normal'}
                  onChange={(e) => handleLocalChange('fortune_level', e.target.value)}
                >
                  {FORTUNE_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="edit-row">
                <label className="edit-label">판정 이유:</label>
                <input
                  type="text"
                  className="edit-input"
                  placeholder="예: 격국 성패로 좋은 해, 억부 균형 등"
                  value={localEdit.reason || ''}
                  onChange={(e) => handleLocalChange('reason', e.target.value)}
                />
              </div>
              <div className="edit-row">
                <label className="edit-label">종합 조언:</label>
                <input
                  type="text"
                  className="edit-input"
                  placeholder="예: 상반기 적극적 활동 권장"
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
                <span className="section-loading-text">{yearData.year}년 운세를 생성하고 있습니다...</span>
              </div>
            </div>
          ) : yearData.generated_content ? (
            <div className="generated-content-section five-year-content">
              <div className="content-title">생성된 운세</div>
              <div
                className="generated-content"
                dangerouslySetInnerHTML={{ __html: yearData.generated_content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') }}
              />
            </div>
          ) : (
            <div className="generated-content-section" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
              <div className="content-title" style={{ color: '#166534' }}>운세 미생성</div>
              <div className="section-loading-text" style={{ color: '#166534', textAlign: 'center', padding: '10px' }}>
                '이 연도만 재생성' 버튼을 눌러주세요.
              </div>
            </div>
          )}

          {/* 재생성 버튼 */}
          <div className="year-five-year-actions">
            <button
              className="btn-regenerate-year five-year-btn"
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

// 세션 캐시 키 생성
const getCacheKey = (orderId) => `five_year_fortune_${orderId}`;

// 메인 5년운세 편집 컴포넌트
const FiveYearFortuneEditor = forwardRef(function FiveYearFortuneEditor({
  orderId,
  validationResult,
  initialData,
  onChange
}, ref) {
  const currentYear = new Date().getFullYear();

  // 세션 스토리지에서 캐시된 데이터 로드
  const getCachedData = () => {
    try {
      const cached = sessionStorage.getItem(getCacheKey(orderId));
      if (cached) {
        const parsed = JSON.parse(cached);
        // 5분 이내의 캐시만 사용
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load cached data:', e);
    }
    return null;
  };

  const cachedData = getCachedData();

  const [fiveYearData, setFiveYearData] = useState(cachedData?.fiveYearData || []);
  const [baseAnalysis, setBaseAnalysis] = useState(cachedData?.baseAnalysis || null);
  const [loading, setLoading] = useState(false);
  const [regeneratingYear, setRegeneratingYear] = useState(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const dataLoaded = useRef(cachedData !== null);

  const userName = validationResult?.order_info?.name || '고객';

  // 캐시에 데이터 저장
  const saveToCache = (yearData, analysis) => {
    try {
      sessionStorage.setItem(getCacheKey(orderId), JSON.stringify({
        fiveYearData: yearData,
        baseAnalysis: analysis,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to save cache:', e);
    }
  };

  useImperativeHandle(ref, () => ({
    regenerateAll: handleRegenerateAll,
    isRegenerating: () => regeneratingAll
  }));

  // 데이터 로드 - 이미 데이터가 있거나 initialData가 있으면 스킵
  useEffect(() => {
    // 이미 데이터가 있으면 로드 건너뛰기
    if (fiveYearData.length > 0) {
      dataLoaded.current = true;
      return;
    }

    if (orderId && validationResult && !dataLoaded.current) {
      // initialData가 있으면 API 호출 건너뛰기
      if (initialData && initialData.length > 0) {
        setFiveYearData(initialData);
        dataLoaded.current = true;
        return;
      }
      loadFiveYearData();
      dataLoaded.current = true;
    }
  }, [orderId, validationResult, initialData]);

  // 초기 데이터 변경 시 업데이트 (부모에서 전달된 경우)
  useEffect(() => {
    if (initialData && initialData.length > 0 && fiveYearData.length === 0 && !loading) {
      setFiveYearData(initialData);
      dataLoaded.current = true;
    }
  }, [initialData]);

  const loadFiveYearData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/five_year_fortune_data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '5년운세 데이터 로드에 실패했습니다.');
      }

      setBaseAnalysis(data.data.base_analysis);

      const savedData = data.data.saved_data;
      const savedYears = savedData?.yearlyFiveYearFortunes || [];

      const yearsData = data.data.years.map(yearInfo => {
        const savedYearData = savedYears.find(sy => sy.year === yearInfo.year);

        return {
          year: yearInfo.year,
          ganji: yearInfo.ganji,
          age_at_year: yearInfo.age_at_year,
          decade: yearInfo.decade,
          sky_outcome: yearInfo.sky_outcome,
          earth_outcome: yearInfo.earth_outcome,
          strength: data.data.base_analysis?.strength || yearInfo.strength,
          year_temperature: yearInfo.year_temperature,
          year_humid: yearInfo.year_humid,
          relations: yearInfo.relations || [],
          manager_edit: savedYearData?.manager_edit || {
            fortune_level: calculateDefaultLevel(yearInfo),
            reason: '',
            advice: '',
            memo: ''
          },
          generated_content: savedYearData?.generated_content || ''
        };
      });

      setFiveYearData(yearsData);

      // 캐시에 저장
      saveToCache(yearsData, data.data.base_analysis);

      if (onChange && yearsData.length > 0) {
        onChange({
          baseAnalysis: data.data.base_analysis,
          yearlyFiveYearFortunes: yearsData
        });
      }
    } catch (err) {
      console.error('Load five year fortune data error:', err);
      // API가 없는 경우 기본 데이터 생성
      generateDefaultData();
    } finally {
      setLoading(false);
    }
  };

  // API가 없는 경우 기본 데이터 생성
  const generateDefaultData = () => {
    if (!validationResult) return;

    const birthYear = validationResult.order_info?.birth_year;
    const decadeArray = validationResult.decade_luck?.decade_array || [];
    const startAge = validationResult.decade_luck?.start_age || 1;

    const yearsData = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear + i;
      const ganji = getYearGanji(year);
      const age = birthYear ? year - birthYear + 1 : null;
      const decade = age ? findDecadeForAge(decadeArray, startAge, age) : null;

      yearsData.push({
        year,
        ganji,
        age_at_year: age,
        decade,
        sky_outcome: null,
        earth_outcome: null,
        strength: validationResult.type_analysis?.strength || null,
        year_temperature: null,
        year_humid: null,
        relations: [],
        manager_edit: {
          fortune_level: 'normal',
          reason: '',
          advice: '',
          memo: ''
        },
        generated_content: ''
      });
    }

    setFiveYearData(yearsData);
  };

  // 기본 운세 레벨 계산
  const calculateDefaultLevel = (yearInfo) => {
    const skyResult = yearInfo.sky_outcome?.result;
    const earthResult = yearInfo.earth_outcome?.result;

    const hasSuccess = (skyResult === '성' || skyResult === '成' || earthResult === '성' || earthResult === '成');
    const hasFail = (skyResult === '패' || skyResult === '敗' || earthResult === '패' || earthResult === '敗');

    if (hasSuccess && !hasFail) return 'good';
    if (hasFail && !hasSuccess) return 'difficult';
    if (hasSuccess && hasFail) return 'caution';

    const relations = yearInfo.relations || [];
    const hasGoodRelation = relations.some(r => r.type === '육합' || r.type === '삼합');
    const hasBadRelation = relations.some(r => r.type === '충' || r.type === '형');

    if (hasGoodRelation && !hasBadRelation) return 'good';
    if (hasBadRelation && !hasGoodRelation) return 'caution';

    return 'normal';
  };

  // 연도별 수정 업데이트
  const handleYearUpdate = (year, editData) => {
    setFiveYearData(prev => {
      const updated = prev.map(item =>
        item.year === year
          ? { ...item, manager_edit: editData }
          : item
      );
      // 캐시 업데이트 (debounce 효과를 위해 약간 지연)
      setTimeout(() => saveToCache(updated, baseAnalysis), 100);
      return updated;
    });
  };

  // 개별 연도 재생성
  const handleRegenerateYear = async (year) => {
    setRegeneratingYear(year);
    try {
      const yearData = fiveYearData.find(d => d.year === year);
      const managerInput = yearData?.manager_edit || {};

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_five_year_fortune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          year,
          manager_input: managerInput
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '재생성에 실패했습니다.');
      }

      const updatedData = fiveYearData.map(item =>
        item.year === year
          ? {
              ...item,
              generated_content: data.generated_content,
              sky_outcome: data.sky_outcome || item.sky_outcome,
              earth_outcome: data.earth_outcome || item.earth_outcome,
              relations: data.relations || item.relations
            }
          : item
      );
      setFiveYearData(updatedData);
      saveToCache(updatedData, baseAnalysis);
      notifyParent(updatedData);

      await saveFiveYearData(updatedData);
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
    try {
      let updatedData = [...fiveYearData];

      for (const yearData of fiveYearData) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_five_year_fortune`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Saju-Authorization': `Bearer-${API_TOKEN}`
            },
            body: JSON.stringify({
              year: yearData.year,
              manager_input: yearData.manager_edit || {}
            })
          });

          const data = await response.json();
          if (response.ok) {
            updatedData = updatedData.map(item =>
              item.year === yearData.year
                ? {
                    ...item,
                    generated_content: data.generated_content,
                    sky_outcome: data.sky_outcome || item.sky_outcome,
                    earth_outcome: data.earth_outcome || item.earth_outcome,
                    relations: data.relations || item.relations
                  }
                : item
            );
          }
        } catch (err) {
          console.error(`Year ${yearData.year} generation failed:`, err);
        }
      }

      setFiveYearData(updatedData);
      saveToCache(updatedData, baseAnalysis);
      notifyParent(updatedData);
      await saveFiveYearData(updatedData);
    } catch (err) {
      console.error('Regenerate all error:', err);
    } finally {
      setRegeneratingAll(false);
    }
  };

  // 부모 컴포넌트에 알림
  const notifyParent = (data) => {
    if (onChange) {
      onChange({
        baseAnalysis,
        yearlyFiveYearFortunes: data
      });
    }
  };

  // 데이터 저장
  const saveFiveYearData = async (data) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_five_year_fortune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          yearlyFiveYearFortunes: data
        })
      });
    } catch (err) {
      console.error('Save five year fortune error:', err);
    }
  };

  if (loading) {
    return (
      <div className="five-year-fortune-editor loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>5년 운세 데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="five-year-fortune-editor">
      <div className="five-year-fortune-header-section">
        <h3 className="section-title">
          <TrendingUp size={20} />
          향후 5년간의 운세 흐름
        </h3>
        <p className="section-description">
          격국 성패, 억부, 조후, 합형충파해를 종합 분석하여 각 연도별 운세 흐름을 안내합니다.
        </p>
        <button
          className="btn btn-regenerate-all"
          onClick={handleRegenerateAll}
          disabled={regeneratingAll}
        >
          {regeneratingAll ? (
            <>
              <RefreshCw size={16} className="spinning" />
              전체 생성 중...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              전체 운세 생성
            </>
          )}
        </button>
      </div>

      <div className="five-year-fortune-list">
        {fiveYearData.map((yearData, index) => (
          <YearFiveYearFortuneEditor
            key={yearData.year}
            yearData={yearData}
            yearIndex={index}
            onUpdate={handleYearUpdate}
            onRegenerate={handleRegenerateYear}
            isRegenerating={regeneratingYear === yearData.year}
            userName={userName}
          />
        ))}
      </div>
    </div>
  );
});

export default FiveYearFortuneEditor;
