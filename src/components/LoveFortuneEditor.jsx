import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Sparkles, Heart } from 'lucide-react';
import './LoveFortuneEditor.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// 연애운 레벨 옵션
const LOVE_FORTUNE_LEVELS = [
  { value: 'very_good', label: '매우좋음', color: '#ec4899' },
  { value: 'good', label: '좋음', color: '#f472b6' },
  { value: 'normal', label: '보통', color: '#a855f7' },
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

// 연도 인덱스를 한글 라벨로 변환
const getYearLabel = (index) => {
  const labels = ['올해', '내년', '2년 후', '3년 후', '4년 후'];
  return labels[index] || `${index}년 후`;
};

// 단일 연도 연애운 편집 컴포넌트
function YearLoveFortuneEditor({
  yearData,
  yearIndex,
  onUpdate,
  onRegenerate,
  isRegenerating,
  dayEarth,
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
    const found = LOVE_FORTUNE_LEVELS.find(l => l.value === level);
    return found ? found.color : '#a855f7';
  };

  const getResultClass = (result) => {
    if (result === '성' || result === '成') return 'result-success';
    if (result === '패' || result === '敗') return 'result-fail';
    if (result?.includes('성중유패')) return 'result-mixed-fail';
    if (result?.includes('패중유성')) return 'result-mixed-success';
    return '';
  };

  const getRelationClass = (type) => {
    if (type === '육합' || type === '반합') return 'relation-good';
    if (type === '충') return 'relation-bad';
    if (type === '형') return 'relation-warning';
    if (type === '파' || type === '해') return 'relation-caution';
    return '';
  };

  const yearEarth = yearData.ganji?.charAt(1);

  return (
    <div className="year-love-fortune-editor">
      <div
        className="year-love-fortune-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="year-love-fortune-title">
          <span className="year-index-label">{getYearLabel(yearIndex)}</span>
          <span className="year-label">{yearData.year}년</span>
          <span className="ganji-label">({yearData.ganji})</span>
          <span
            className="fortune-level-badge love-badge"
            style={{ backgroundColor: getLevelColor(localEdit.fortune_level) }}
          >
            <Heart size={12} /> {LOVE_FORTUNE_LEVELS.find(l => l.value === localEdit.fortune_level)?.label || '보통'}
          </span>
        </div>
        <div className="year-love-fortune-toggle">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="year-love-fortune-body">
          {/* 대운 정보 */}
          {yearData.decade && (
            <div className="love-decade-info">
              <div className="decade-row">
                <span className="decade-badge">대운</span>
                <span className="decade-ganji-value">{yearData.decade.ganji}</span>
                <span className="decade-age-range">({yearData.decade.start_age}~{yearData.decade.end_age}세)</span>
                {yearData.age_at_year && <span className="current-age">{yearData.age_at_year}세</span>}
              </div>
            </div>
          )}

          {/* 일지-세운 관계 정보 */}
          <div className="love-info-container">
            <div className="love-info-row">
              <div className="love-header">
                <span className="love-type-badge">배우자궁</span>
                <span className="love-chars">일지 {dayEarth} ↔ 세운 {yearEarth}</span>
              </div>
            </div>
          </div>

          {/* 4가지 명리학적 근거 분석 */}
          <div className="love-analysis-section">
            {/* 1. 일지 성패 분석 */}
            <div className="love-analysis-box day-earth-box">
              <div className="analysis-header">
                <span className="analysis-type">【1. 일지 성패】</span>
                <span className="analysis-label">격국의 성패 (일지 기준)</span>
              </div>
              <div className="analysis-content">
                {yearData.day_earth_outcome && yearData.day_earth_outcome.length > 0 ? (
                  yearData.day_earth_outcome.map((outcome, idx) => (
                    <div key={idx} className="outcome-item">
                      <div className="analysis-row">
                        <span className="row-label">코드:</span>
                        <span className="row-value code-value">{outcome.code || '(없음)'}</span>
                        {outcome.result && (
                          <span className={`result-badge ${getResultClass(outcome.result)}`}>
                            {outcome.result}
                          </span>
                        )}
                      </div>
                      {outcome.reason && (
                        <div className="analysis-reason">{outcome.reason}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="analysis-empty">일지 성패 분석 결과 없음</div>
                )}
              </div>
            </div>

            {/* 2. 조후 분석 */}
            <div className="love-analysis-box johu-box">
              <div className="analysis-header">
                <span className="analysis-type">【2. 조후(調候)】</span>
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
              </div>
            </div>

            {/* 3. 강약 분석 */}
            <div className="love-analysis-box strength-box">
              <div className="analysis-header">
                <span className="analysis-type">【3. 강약(强弱)】</span>
                <span className="analysis-label">억부 분석</span>
              </div>
              <div className="analysis-content">
                <div className="strength-info">
                  <span className="strength-level">{yearData.strength?.level || '-'}</span>
                  <span className="strength-score">(점수: {yearData.strength?.score ?? '-'})</span>
                </div>
              </div>
            </div>

            {/* 4. 합형충파해 분석 */}
            <div className="love-analysis-box relations-box">
              <div className="analysis-header">
                <span className="analysis-type">【4. 합형충파해】</span>
                <span className="analysis-label">일지-세운 관계</span>
              </div>
              <div className="analysis-content">
                {yearData.day_earth_relations?.relations?.length > 0 ? (
                  <div className="relations-list">
                    {yearData.day_earth_relations.relations.map((rel, idx) => (
                      <div key={idx} className={`relation-item ${getRelationClass(rel.type)}`}>
                        <span className="relation-type">{rel.type}</span>
                        <span className="relation-desc">{rel.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analysis-empty">일지({dayEarth})와 세운({yearEarth}) 간 특별한 관계 없음</div>
                )}
              </div>
            </div>
          </div>

          {/* 매니저 수정 영역 */}
          <div className="manager-edit-section love-edit">
            <div className="edit-section-title">【매니저 수정】</div>

            <div className="edit-category love-category">
              <div className="edit-row">
                <label className="edit-label">연애운 판정:</label>
                <select
                  className="fortune-level-select love-select"
                  value={localEdit.fortune_level || 'normal'}
                  onChange={(e) => handleLocalChange('fortune_level', e.target.value)}
                >
                  {LOVE_FORTUNE_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="edit-row">
                <label className="edit-label">판정 이유 (AI 참고):</label>
                <input
                  type="text"
                  className="edit-input"
                  placeholder="예: 육합으로 새로운 인연 기대, 충으로 관계 변동 주의 등"
                  value={localEdit.reason || ''}
                  onChange={(e) => handleLocalChange('reason', e.target.value)}
                />
              </div>
              <div className="edit-row">
                <label className="edit-label">종합 조언:</label>
                <input
                  type="text"
                  className="edit-input"
                  placeholder="예: 상반기에 새로운 만남 기대, 기존 관계 점검 필요"
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
            <div className="generated-content-section" style={{ background: '#fdf2f8' }}>
              <div className="section-loading">
                <div className="loading-spinner-small"></div>
                <span className="section-loading-text">{yearData.year}년 연애운을 생성하고 있습니다...</span>
              </div>
            </div>
          ) : yearData.generated_content ? (
            <div className="generated-content-section love-content">
              <div className="content-title">생성된 연애운</div>
              <div
                className="generated-content"
                dangerouslySetInnerHTML={{ __html: yearData.generated_content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') }}
              />
            </div>
          ) : (
            <div className="generated-content-section" style={{ background: '#fdf2f8', borderColor: '#f9a8d4' }}>
              <div className="content-title" style={{ color: '#be185d' }}>연애운 미생성</div>
              <div className="section-loading-text" style={{ color: '#be185d', textAlign: 'center', padding: '10px' }}>
                '이 연도만 재생성' 버튼을 눌러주세요.
              </div>
            </div>
          )}

          {/* 재생성 버튼 */}
          <div className="year-love-fortune-actions">
            <button
              className="btn-regenerate-year love-btn"
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

// 메인 연애운 편집 컴포넌트
const LoveFortuneEditor = forwardRef(function LoveFortuneEditor({
  orderId,
  validationResult,
  initialData,
  onChange
}, ref) {
  const currentYear = new Date().getFullYear();
  const [loveFortuneData, setLoveFortuneData] = useState([]);
  const [baseAnalysis, setBaseAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regeneratingYear, setRegeneratingYear] = useState(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const dataLoaded = useRef(false);

  const userName = validationResult?.order_info?.name || '고객';
  const zodiacDay = validationResult?.saju_data?.zodiac_day || '';
  const dayEarth = zodiacDay.charAt(1);

  // 부모 컴포넌트에서 호출 가능한 메서드 노출
  useImperativeHandle(ref, () => ({
    regenerateAll: handleRegenerateAll,
    isRegenerating: () => regeneratingAll
  }));

  // 연애운 데이터 로드
  useEffect(() => {
    if (orderId && validationResult && !dataLoaded.current) {
      loadLoveFortuneData();
      dataLoaded.current = true;
    }
  }, [orderId, validationResult]);

  // 초기 데이터 로드
  useEffect(() => {
    if (initialData && initialData.length > 0 && loveFortuneData.length === 0) {
      setLoveFortuneData(initialData);
    }
  }, [initialData]);

  const loadLoveFortuneData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/love_fortune_data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '연애운 데이터 로드에 실패했습니다.');
      }

      setBaseAnalysis(data.data.base_analysis);

      // 저장된 데이터 확인
      const savedData = data.data.saved_data;
      const savedYears = savedData?.yearlyLoveFortunes || [];

      // 연도별 데이터 구성 (저장된 데이터와 병합)
      const yearsData = data.data.years.map(yearInfo => {
        // 해당 연도의 저장된 데이터 찾기
        const savedYearData = savedYears.find(sy => sy.year === yearInfo.year);

        return {
          year: yearInfo.year,
          ganji: yearInfo.ganji,
          age_at_year: yearInfo.age_at_year,
          decade: yearInfo.decade,
          day_earth_outcome: yearInfo.day_earth_outcome || [],
          day_earth_relations: yearInfo.day_earth_relations || {},
          year_temperature: yearInfo.year_temperature,
          year_humid: yearInfo.year_humid,
          strength: data.data.base_analysis.strength,
          manager_edit: savedYearData?.manager_edit || {
            fortune_level: calculateDefaultLevel(yearInfo),
            reason: '',
            advice: '',
            memo: ''
          },
          generated_content: savedYearData?.generated_content || ''
        };
      });

      setLoveFortuneData(yearsData);

      // 부모 컴포넌트에 알림
      if (onChange && yearsData.length > 0) {
        onChange({
          baseAnalysis: data.data.base_analysis,
          yearlyLoveFortunes: yearsData
        });
      }
    } catch (err) {
      console.error('Load love fortune data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 기본 운세 레벨 계산
  const calculateDefaultLevel = (yearInfo) => {
    const relations = yearInfo.day_earth_relations?.relations || [];
    const hasGoodRelation = relations.some(r => r.type === '육합');
    const hasBadRelation = relations.some(r => r.type === '충' || r.type === '형');

    if (hasGoodRelation && !hasBadRelation) return 'good';
    if (hasBadRelation && !hasGoodRelation) return 'difficult';
    if (hasGoodRelation && hasBadRelation) return 'caution';

    const outcomes = yearInfo.day_earth_outcome || [];
    const hasSuccess = outcomes.some(o => o.result === '성' || o.result === '成');
    const hasFail = outcomes.some(o => o.result === '패' || o.result === '敗');

    if (hasSuccess && !hasFail) return 'good';
    if (hasFail && !hasSuccess) return 'difficult';

    return 'normal';
  };

  // 연도별 수정 업데이트
  const handleYearUpdate = (year, editData) => {
    setLoveFortuneData(prev => prev.map(item =>
      item.year === year
        ? { ...item, manager_edit: editData }
        : item
    ));
  };

  // 개별 연도 재생성
  const handleRegenerateYear = async (year) => {
    setRegeneratingYear(year);
    try {
      const yearData = loveFortuneData.find(d => d.year === year);
      const managerInput = yearData?.manager_edit || {};

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_love_fortune`, {
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

      // 생성된 데이터로 업데이트
      const updatedData = loveFortuneData.map(item =>
        item.year === year
          ? {
              ...item,
              generated_content: data.generated_content,
              day_earth_outcome: data.day_earth_outcome || item.day_earth_outcome,
              day_earth_relations: data.day_earth_relations || item.day_earth_relations
            }
          : item
      );
      setLoveFortuneData(updatedData);
      notifyParent(updatedData);

      // 자동 저장
      await saveLoveFortuneData(updatedData);
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
      let updatedData = [...loveFortuneData];

      for (const yearData of loveFortuneData) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_love_fortune`, {
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
                    day_earth_outcome: data.day_earth_outcome || item.day_earth_outcome,
                    day_earth_relations: data.day_earth_relations || item.day_earth_relations
                  }
                : item
            );
          }
        } catch (err) {
          console.error(`Year ${yearData.year} generation failed:`, err);
        }
      }

      setLoveFortuneData(updatedData);
      notifyParent(updatedData);

      // 자동 저장
      await saveLoveFortuneData(updatedData);
    } catch (err) {
      console.error('Regenerate all error:', err);
      alert(`전체 재생성 실패: ${err.message}`);
    } finally {
      setRegeneratingAll(false);
    }
  };

  // 데이터 저장
  const saveLoveFortuneData = async (data) => {
    try {
      // 캐시할 분석 데이터 구성 (다음 로드시 빠르게 반환하기 위해)
      const cachedAnalysis = {
        saju: {
          zodiac_day: zodiacDay,
          day_earth: dayEarth,
          ilgan: zodiacDay.charAt(0)
        },
        base_analysis: baseAnalysis,
        current_decade: data[0]?.decade || null,
        years: data.map(item => ({
          year: item.year,
          ganji: item.ganji,
          age_at_year: item.age_at_year,
          decade: item.decade,
          day_earth_outcome: item.day_earth_outcome,
          day_earth_relations: item.day_earth_relations,
          year_temperature: item.year_temperature,
          year_humid: item.year_humid
        }))
      };

      await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_love_fortune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          love_fortune_data: {
            baseAnalysis: baseAnalysis,
            yearlyLoveFortunes: data,
            cached_analysis: cachedAnalysis
          }
        })
      });
      console.log('[LoveFortuneEditor] Auto-saved with cache');
    } catch (err) {
      console.error('Auto-save error:', err);
    }
  };

  // 부모 컴포넌트에 알림
  const notifyParent = (newData) => {
    if (onChange) {
      onChange({
        baseAnalysis: baseAnalysis,
        yearlyLoveFortunes: newData
      });
    }
  };

  if (!validationResult) {
    return (
      <div className="love-fortune-editor-empty">
        <p>사주 검증을 먼저 실행해주세요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="love-fortune-editor-loading">
        <div className="loading-spinner"></div>
        <span>연애운 데이터를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="love-fortune-editor" style={{ position: 'relative' }}>
      {/* 전체 생성 중 오버레이 */}
      {regeneratingAll && (
        <div className="love-fortune-editor-loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">연애운 생성 중...</div>
            <div className="loading-subtext">
              AI가 5년치 연애운을 분석하고 있습니다. 잠시만 기다려주세요.
            </div>
          </div>
        </div>
      )}

      <div className="love-fortune-editor-header">
        <h3 className="love-fortune-editor-title">
          <Heart size={20} /> 연애운/배우자운 ({currentYear}~{currentYear + 4}년)
        </h3>
        <div className="love-fortune-editor-actions">
          <button
            className="btn-regenerate-all love-btn"
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

      {/* 기본 분석 정보 */}
      {baseAnalysis && (
        <div className="base-love-analysis-section">
          <div className="base-love-header">
            <h4 className="base-love-title">
              {userName}님의 연애운 기본 분석
            </h4>
          </div>
          <div className="base-love-content">
            <div className="base-info-grid">
              <div className="base-info-item">
                <span className="info-label">일지(배우자궁):</span>
                <span className="info-value">{dayEarth}</span>
              </div>
              <div className="base-info-item">
                <span className="info-label">기본 온도:</span>
                <span className="info-value">
                  {baseAnalysis.temperature?.temp ?? '-'}도 ({baseAnalysis.temperature?.level || '-'})
                </span>
              </div>
              <div className="base-info-item">
                <span className="info-label">기본 습도:</span>
                <span className="info-value">
                  {baseAnalysis.humid?.humid ?? '-'}% ({baseAnalysis.humid?.level || '-'})
                </span>
              </div>
              <div className="base-info-item">
                <span className="info-label">강약:</span>
                <span className="info-value">
                  {baseAnalysis.strength?.level || '-'} (점수: {baseAnalysis.strength?.score ?? '-'})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="love-fortune-editor-body">
        {/* 연도별 연애운 */}
        <div className="yearly-love-fortune-section">
          <h4 className="yearly-love-fortune-title">연도별 연애운 ({currentYear}~{currentYear + 4}년)</h4>
          {loveFortuneData.map((yearData, index) => (
            <YearLoveFortuneEditor
              key={yearData.year}
              yearData={yearData}
              yearIndex={index}
              dayEarth={dayEarth}
              onUpdate={handleYearUpdate}
              onRegenerate={handleRegenerateYear}
              isRegenerating={regeneratingYear === yearData.year}
              userName={userName}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default LoveFortuneEditor;
