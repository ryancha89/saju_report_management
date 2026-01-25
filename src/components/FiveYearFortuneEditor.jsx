import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Sparkles, TrendingUp, Edit3, Save, Wand2, CheckCircle, X, Loader } from 'lucide-react';
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

// 개별 성패 판정 (천간/지지 각각) - 대운흐름과 동일
const getSingleRating = (result, score, degree) => {
  // 0. Degree가 있으면 최우선
  if (degree) {
    const deg = degree.toLowerCase();
    if (deg === 'excellent' || deg === '대길') return { class: 'excellent', text: '◎ 대길', icon: '◎' };
    if (deg === 'good' || deg === '길') return { class: 'good', text: '○ 길', icon: '○' };
    if (deg === 'neutral' || deg === '보통') return { class: 'neutral', text: '△ 보통', icon: '△' };
    if (deg === 'caution' || deg === '주의') return { class: 'caution', text: '▽ 주의', icon: '▽' };
    if (deg === 'difficult' || deg === '흉') return { class: 'bad', text: '✕ 흉', icon: '✕' };
  }

  // 1. result 문자열로 판정
  if (result && typeof result === 'string') {
    if (result === '成' || result === '성') return { class: 'good', text: '○ 길', icon: '○' };
    if (result.includes('敗中有成') || result.includes('패중유성')) return { class: 'good', text: '○ 길', icon: '○' };
    if (result === '敗' || result === '패') return { class: 'bad', text: '✕ 흉', icon: '✕' };
    if (result.includes('成中有敗') || result.includes('성중유패')) return { class: 'bad', text: '✕ 흉', icon: '✕' };
    if (result.includes('成敗共存') || result.includes('성패공존')) return { class: 'neutral', text: '△ 보통', icon: '△' };
  }

  // 2. score로 판정 (결과 없을 때)
  if (typeof score === 'number') {
    if (score >= 70) return { class: 'good', text: '○ 길', icon: '○' };
    if (score >= 40) return { class: 'neutral', text: '△ 보통', icon: '△' };
    return { class: 'bad', text: '✕ 흉', icon: '✕' };
  }

  return { class: 'neutral', text: '― 미정', icon: '―' };
};

// 종합 운세 판정
const getOverallRating = (yearData) => {
  // sky_result 또는 sky_outcome.result 형식 모두 지원
  const skyResult = yearData.sky_result || yearData.sky_outcome?.result;
  const skyScore = yearData.sky_score || yearData.sky_outcome?.score;
  const earthResult = yearData.earth_result || yearData.earth_outcome?.result;
  const earthScore = yearData.earth_score || yearData.earth_outcome?.score;

  const skyRating = getSingleRating(skyResult, skyScore);
  const earthRating = getSingleRating(earthResult, earthScore);

  // 둘 다 길이면 대길
  if (skyRating.class === 'good' && earthRating.class === 'good') return 'excellent';
  // 하나라도 길이고 나머지가 보통이면 길
  if ((skyRating.class === 'good' || earthRating.class === 'good') &&
      (skyRating.class !== 'bad' && earthRating.class !== 'bad')) return 'good';
  // 둘 다 흉이면 흉
  if (skyRating.class === 'bad' && earthRating.class === 'bad') return 'difficult';
  // 하나라도 흉이면 주의
  if (skyRating.class === 'bad' || earthRating.class === 'bad') return 'caution';
  return 'neutral';
};

const getOverallRatingText = (rating) => {
  switch (rating) {
    case 'excellent': return '◎ 대길';
    case 'good': return '○ 길';
    case 'neutral': return '△ 보통';
    case 'caution': return '▽ 주의';
    case 'difficult': return '✕ 흉';
    default: return '― 미정';
  }
};

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

// 해석 영역별 편집 컴포넌트
function AreaInterpretationEditor({
  area,
  areaLabel,
  interpretation,
  defaultText,  // 분석 데이터에서 가져온 기본 텍스트
  onSavePrimary,
  onSaveFinal,
  onAiRewrite,
  onCancel,
  isSaving,
  isAiGenerating
}) {
  // 저장된 해석이 있으면 사용, 없으면 defaultText 사용
  const initialText = interpretation?.primary_interpretation || defaultText || '';
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(interpretation?.primary_interpretation || defaultText || '');
  }, [interpretation, defaultText]);

  return (
    <div className="area-edit-form yearly-interpretation-edit">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`${areaLabel} 해석을 입력하세요...`}
        rows={4}
      />
      <div className="edit-actions">
        <button
          className="btn btn-save-primary"
          onClick={() => onSavePrimary(text)}
          disabled={isSaving || isAiGenerating}
        >
          {isSaving ? <Loader size={12} className="spinning" /> : <Save size={12} />}
          1차해석 저장
        </button>
        <button
          className="btn btn-ai-rewrite"
          onClick={() => onAiRewrite(text)}
          disabled={isSaving || isAiGenerating || !text.trim()}
        >
          {isAiGenerating ? <Loader size={12} className="spinning" /> : <Wand2 size={12} />}
          AI 재작성
        </button>
        <button
          className="btn btn-save-final"
          onClick={() => onSaveFinal(text)}
          disabled={isSaving || isAiGenerating}
        >
          <CheckCircle size={12} />
          최종해석 저장
        </button>
        <button
          className="btn btn-cancel"
          onClick={onCancel}
          disabled={isSaving || isAiGenerating}
        >
          <X size={12} />
          취소
        </button>
      </div>
    </div>
  );
}

// 단일 연도 5년운세 컴포넌트
function YearFiveYearFortuneEditor({
  yearData,
  yearIndex,
  onUpdate,
  onRegenerate,
  isRegenerating,
  userName,
  orderId,
  interpretations,
  onInterpretationChange
}) {
  const [isExpanded, setIsExpanded] = useState(yearIndex === 0);
  const [localEdit, setLocalEdit] = useState(yearData.manager_edit || {
    fortune_level: 'normal',
    reason: '',
    advice: '',
    memo: ''
  });

  // 편집 모드 상태 (영역별)
  const [editingArea, setEditingArea] = useState(null); // 'gyeokguk_sky' | 'gyeokguk_earth' | 'eokbu' | 'johu' | null
  const [savingArea, setSavingArea] = useState(null);
  const [aiGeneratingArea, setAiGeneratingArea] = useState(null);

  useEffect(() => {
    setLocalEdit(yearData.manager_edit || {
      fortune_level: 'normal',
      reason: '',
      advice: '',
      memo: ''
    });
  }, [yearData]);

  // 해석 저장 (1차 해석)
  const handleSavePrimary = async (area, text) => {
    setSavingArea(area);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/update_yearly_interpretation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          year: yearData.year,
          year_index: yearIndex,
          ganji: yearData.ganji,
          analysis_area: area,
          primary_interpretation: text,
          use_ai_for_final: true
        })
      });
      const data = await response.json();
      if (response.ok) {
        onInterpretationChange(yearData.year, area, data.interpretation);
        setEditingArea(null);
      } else {
        alert('저장 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('Save primary interpretation error:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSavingArea(null);
    }
  };

  // 해석 저장 (최종 해석)
  const handleSaveFinal = async (area, text) => {
    setSavingArea(area);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/update_yearly_interpretation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          year: yearData.year,
          year_index: yearIndex,
          ganji: yearData.ganji,
          analysis_area: area,
          final_interpretation: text,
          use_ai_for_final: false
        })
      });
      const data = await response.json();
      if (response.ok) {
        onInterpretationChange(yearData.year, area, data.interpretation);
        setEditingArea(null);
      } else {
        alert('저장 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('Save final interpretation error:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSavingArea(null);
    }
  };

  // AI 재작성
  const handleAiRewrite = async (area, primaryText) => {
    console.log('=== AI 재작성 시작 ===');
    console.log('area:', area);
    console.log('primaryText:', primaryText);
    console.log('orderId:', orderId);
    console.log('yearData:', yearData);

    setAiGeneratingArea(area);
    try {
      // 분석 데이터 컨텍스트 구성
      const analysisContext = {
        sky_outcome: yearData.sky_outcome || {},
        earth_outcome: yearData.earth_outcome || {},
        strength: yearData.strength || {},
        temperature: yearData.temperature || {},
        johu: yearData.johu || {},
        life_areas: yearData.life_areas || {},
        combined_score: yearData.combined_score,
        relations: yearData.relations || []
      };
      console.log('analysisContext:', analysisContext);

      // 먼저 1차 해석 저장
      console.log('1차 해석 저장 API 호출...');
      const firstResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/update_yearly_interpretation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          year: yearData.year,
          year_index: yearIndex,
          ganji: yearData.ganji,
          analysis_area: area,
          primary_interpretation: primaryText,
          use_ai_for_final: true
        })
      });

      if (!firstResponse.ok) {
        const firstData = await firstResponse.json();
        console.error('1차 해석 저장 실패:', firstData);
        throw new Error('1차 해석 저장 실패: ' + (firstData.error || firstResponse.statusText));
      }
      console.log('1차 해석 저장 성공');

      // AI 재작성 요청 (분석 컨텍스트 포함)
      console.log('AI 재작성 API 호출...');
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_yearly_interpretation_ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          year: yearData.year,
          year_index: yearIndex,
          ganji: yearData.ganji,
          analysis_area: area,
          primary_interpretation: primaryText,
          analysis_context: analysisContext
        })
      });
      const data = await response.json();
      console.log('AI 재작성 응답:', data);

      if (response.ok) {
        console.log('AI 재작성 성공, interpretation:', data.interpretation);
        onInterpretationChange(yearData.year, area, data.interpretation);
        setEditingArea(null);
      } else {
        console.error('AI 재작성 실패:', data);
        alert('AI 재작성 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('AI rewrite error:', err);
      alert('AI 재작성 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setAiGeneratingArea(null);
    }
  };

  // 종합 운세 AI 재작성 (4개 영역 해석을 종합하여 격국 중심 재해석)
  const handleAiRewriteOverall = async () => {
    setAiGeneratingArea('overall');
    console.log('=== 종합 운세 AI 생성 시작 ===');

    try {
      // 4개 영역의 기존 해석 수집
      const skyInterp = getEffectiveInterpretation('gyeokguk_sky') || safeRenderReason(yearData.sky_outcome?.reason) || '';
      const earthInterp = getEffectiveInterpretation('gyeokguk_earth') || safeRenderReason(yearData.earth_outcome?.reason) || '';
      const eokbuInterp = getEffectiveInterpretation('eokbu') || strengthData.analysis || strengthData.description || '';
      const johuInterp = getEffectiveInterpretation('johu') || temperatureData.description || '';

      // 종합 프롬프트 텍스트 구성
      const combinedText = `
[${yearData.year}년 ${yearData.ganji} 운세 종합]

【천간 격국 (${yearData.sky_outcome?.result || '분석중'})】
${skyInterp}

【지지 격국 (${yearData.earth_outcome?.result || '분석중'})】
${earthInterp}

【억부 (${strengthData.decade_level || strengthData.level || '분석중'})】
${eokbuInterp}

【조후 (${temperatureData.decade_label || temperatureData.level || '분석중'})】
${johuInterp}

위 4가지 분석을 종합하여, 특히 격국(천간/지지 성패)을 중심으로 ${yearData.year}년 전체 운세를 해석해주세요.
      `.trim();

      const analysisContext = {
        sky_outcome: yearData.sky_outcome || {},
        earth_outcome: yearData.earth_outcome || {},
        strength: yearData.strength || {},
        temperature: yearData.temperature || {},
        johu: yearData.johu || {},
        life_areas: yearData.life_areas || {},
        combined_score: yearData.combined_score,
        relations: yearData.relations || [],
        // 4개 영역 해석 추가
        interpretations: {
          gyeokguk_sky: skyInterp,
          gyeokguk_earth: earthInterp,
          eokbu: eokbuInterp,
          johu: johuInterp
        }
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_yearly_interpretation_ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          year: yearData.year,
          year_index: yearIndex,
          ganji: yearData.ganji,
          analysis_area: 'overall',
          primary_interpretation: combinedText,
          analysis_context: analysisContext,
          is_overall_synthesis: true  // 종합 해석임을 표시
        })
      });

      const data = await response.json();
      console.log('종합 운세 AI 응답:', data);

      if (response.ok) {
        console.log('종합 운세 AI 생성 성공');
        onInterpretationChange(yearData.year, 'overall', data.interpretation);
      } else {
        console.error('종합 운세 AI 생성 실패:', data.error);
        alert('종합 운세 AI 생성 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('종합 운세 AI 생성 오류:', err);
      alert('종합 운세 AI 생성 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setAiGeneratingArea(null);
    }
  };

  // 전체 AI 재작성 (5개 영역 모두)
  const handleAiRewriteAll = async () => {
    const areas = ['gyeokguk_sky', 'gyeokguk_earth', 'eokbu', 'johu', 'overall'];
    const areaLabels = {
      'gyeokguk_sky': '천간 격국',
      'gyeokguk_earth': '지지 격국',
      'eokbu': '억부',
      'johu': '조후',
      'overall': '종합 운세'
    };

    // 각 영역의 기본 텍스트 가져오기
    const getDefaultText = (area) => {
      switch (area) {
        case 'gyeokguk_sky':
          return safeRenderReason(yearData.sky_outcome?.reason) || `${yearData.ganji} 천간 격국 분석`;
        case 'gyeokguk_earth':
          return safeRenderReason(yearData.earth_outcome?.reason) || `${yearData.ganji} 지지 격국 분석`;
        case 'eokbu':
          return strengthData.description || strengthData.analysis || `${yearData.ganji} 억부 분석`;
        case 'johu':
          return temperatureData.description || temperatureData.analysis || `${yearData.ganji} 조후 분석`;
        case 'overall':
          // 종합 운세는 앞의 4개 해석을 종합한 텍스트
          return `${yearData.ganji}년 종합 운세 - 격국, 억부, 조후를 종합하여 분석`;
        default:
          return '';
      }
    };

    setAiGeneratingArea('all');
    console.log('=== 전체 AI 재작성 시작 ===');

    try {
      const analysisContext = {
        sky_outcome: yearData.sky_outcome || {},
        earth_outcome: yearData.earth_outcome || {},
        strength: yearData.strength || {},
        temperature: yearData.temperature || {},
        johu: yearData.johu || {},
        life_areas: yearData.life_areas || {},
        combined_score: yearData.combined_score,
        relations: yearData.relations || []
      };

      for (const area of areas) {
        console.log(`${areaLabels[area]} AI 생성 중...`);
        const primaryText = getDefaultText(area);

        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_yearly_interpretation_ai`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Saju-Authorization': `Bearer-${API_TOKEN}`
            },
            body: JSON.stringify({
              year: yearData.year,
              year_index: yearIndex,
              ganji: yearData.ganji,
              analysis_area: area,
              primary_interpretation: primaryText,
              analysis_context: analysisContext
            })
          });
          const data = await response.json();

          if (response.ok) {
            console.log(`${areaLabels[area]} AI 생성 완료`);
            onInterpretationChange(yearData.year, area, data.interpretation);
          } else {
            console.error(`${areaLabels[area]} AI 생성 실패:`, data.error);
          }
        } catch (err) {
          console.error(`${areaLabels[area]} AI 생성 오류:`, err);
        }
      }

      console.log('=== 전체 AI 재작성 완료 ===');
      alert('5개 영역 AI 재작성이 완료되었습니다.');
    } catch (err) {
      console.error('전체 AI 재작성 오류:', err);
      alert('전체 AI 재작성 중 오류가 발생했습니다.');
    } finally {
      setAiGeneratingArea(null);
    }
  };

  // 해당 연도/영역의 해석 가져오기
  const getInterpretation = (area) => {
    return interpretations?.[yearData.year]?.[area];
  };

  // 효과적인 해석 텍스트 가져오기
  const getEffectiveInterpretation = (area) => {
    const interp = getInterpretation(area);
    console.log(`getEffectiveInterpretation(${area}):`, interp);
    if (!interp) return null;
    // use_ai_for_final이 true이면 final_interpretation을 우선 사용
    const result = interp.final_interpretation || interp.primary_interpretation;
    console.log(`getEffectiveInterpretation result:`, result);
    return result;
  };

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

  // 종합 운세 등급 계산
  const overallRating = getOverallRating(yearData);
  const overallRatingText = getOverallRatingText(overallRating);

  // 억부/조후 데이터 (새 API 형식 또는 기존 형식 모두 지원)
  const strengthData = yearData.strength || {};
  const temperatureData = yearData.temperature || yearData.year_temperature || {};
  const isEspeciallyGood = temperatureData.is_especially_good;

  // 격국 결과 추출 (새 API 형식)
  const skyResult = yearData.sky_result || yearData.sky_outcome?.result;
  const skyScore = yearData.sky_score || yearData.sky_outcome?.score;
  const earthResult = yearData.earth_result || yearData.earth_outcome?.result;
  const earthScore = yearData.earth_score || yearData.earth_outcome?.score;

  return (
    <div className={`year-five-year-editor interpretation-card ${yearIndex === 0 ? 'current' : ''}`}>
      <div
        className="year-five-year-header interpretation-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="year-five-year-title">
          <span className="card-ganji">{yearData.ganji}</span>
          <span className="year-label">{yearData.year}년</span>
          {yearData.age_at_year && <span className="card-age">{yearData.age_at_year}세</span>}
          {yearIndex === 0 && <span className="card-current-badge">올해</span>}
          <span className={`overall-rating-badge rating-${overallRating}`}>
            {overallRatingText}
          </span>
        </div>
        <div className="year-five-year-toggle">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="year-five-year-body interpretation-areas">
          {/* 대운 정보 및 전체 AI 재작성 버튼 */}
          <div className="five-year-top-actions">
            {yearData.decade && (
              <div className="five-year-decade-info">
                <div className="decade-row">
                  <span className="decade-badge">대운</span>
                  <span className="decade-ganji-value">{yearData.decade.ganji}</span>
                  <span className="decade-age-range">({yearData.decade.start_age}~{yearData.decade.end_age}세)</span>
                </div>
              </div>
            )}
            <button
              className="btn btn-ai-rewrite-all"
              onClick={(e) => {
                e.stopPropagation();
                handleAiRewriteAll();
              }}
              disabled={aiGeneratingArea === 'all'}
              title="천간/지지/억부/조후 4개 영역 모두 AI로 재작성"
            >
              {aiGeneratingArea === 'all' ? (
                <>
                  <Loader size={14} className="spinning" />
                  AI 생성 중...
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  전체 AI 재작성
                </>
              )}
            </button>
          </div>

          {/* 격국 - 천간 */}
          <div className="interpretation-area gyeokguk-sky-area">
            <div className="area-header">
              <span className="area-label">
                <span className="block-char">{yearData.ganji?.charAt(0)}</span> 천간 격국
              </span>
              <span className={`single-rating-badge ${getSingleRating(skyResult, skyScore).class}`}>
                {getSingleRating(skyResult, skyScore).text}
              </span>
              {editingArea !== 'gyeokguk_sky' && (
                <div className="area-action-buttons">
                  <button
                    className="btn btn-ai-area"
                    onClick={() => handleAiRewrite('gyeokguk_sky', safeRenderReason(yearData.sky_outcome?.reason) || `${yearData.ganji} 천간 격국 분석`)}
                    disabled={aiGeneratingArea !== null}
                    title="AI로 재작성"
                  >
                    {aiGeneratingArea === 'gyeokguk_sky' ? <Loader size={12} className="spinning" /> : <Wand2 size={12} />}
                  </button>
                  <button
                    className="btn btn-edit-area"
                    onClick={() => setEditingArea('gyeokguk_sky')}
                    title="해석 수정"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="area-content">
              {yearData.sky_outcome ? (
                <>
                  <div className="analysis-detail-row">
                    <span className="detail-label">십성:</span>
                    <span className="detail-value">{renderSipsung(yearData.sky_outcome)}</span>
                    {yearData.sky_outcome.code && (
                      <span className="detail-code">{yearData.sky_outcome.code}</span>
                    )}
                  </div>
                  {safeRenderReason(yearData.sky_outcome.reason) && (
                    <p className="analysis-reason-text">{safeRenderReason(yearData.sky_outcome.reason)}</p>
                  )}
                </>
              ) : (
                <p>천간 성패 분석 결과 없음</p>
              )}
              {/* 저장된 해석 표시 */}
              {getEffectiveInterpretation('gyeokguk_sky') && (
                <div className="saved-interpretation">
                  <p className="interpretation-text">{getEffectiveInterpretation('gyeokguk_sky')}</p>
                </div>
              )}
              {/* 편집 모드 */}
              {editingArea === 'gyeokguk_sky' && (
                <AreaInterpretationEditor
                  area="gyeokguk_sky"
                  areaLabel="천간 격국"
                  interpretation={getInterpretation('gyeokguk_sky')}
                  defaultText={safeRenderReason(yearData.sky_outcome?.reason)}
                  onSavePrimary={(text) => handleSavePrimary('gyeokguk_sky', text)}
                  onSaveFinal={(text) => handleSaveFinal('gyeokguk_sky', text)}
                  onAiRewrite={(text) => handleAiRewrite('gyeokguk_sky', text)}
                  onCancel={() => setEditingArea(null)}
                  isSaving={savingArea === 'gyeokguk_sky'}
                  isAiGenerating={aiGeneratingArea === 'gyeokguk_sky'}
                />
              )}
            </div>
          </div>

          {/* 격국 - 지지 */}
          <div className="interpretation-area gyeokguk-earth-area">
            <div className="area-header">
              <span className="area-label">
                <span className="block-char">{yearData.ganji?.charAt(1)}</span> 지지 격국
              </span>
              <span className={`single-rating-badge ${getSingleRating(earthResult, earthScore).class}`}>
                {getSingleRating(earthResult, earthScore).text}
              </span>
              {editingArea !== 'gyeokguk_earth' && (
                <div className="area-action-buttons">
                  <button
                    className="btn btn-ai-area"
                    onClick={() => handleAiRewrite('gyeokguk_earth', safeRenderReason(yearData.earth_outcome?.reason) || `${yearData.ganji} 지지 격국 분석`)}
                    disabled={aiGeneratingArea !== null}
                    title="AI로 재작성"
                  >
                    {aiGeneratingArea === 'gyeokguk_earth' ? <Loader size={12} className="spinning" /> : <Wand2 size={12} />}
                  </button>
                  <button
                    className="btn btn-edit-area"
                    onClick={() => setEditingArea('gyeokguk_earth')}
                    title="해석 수정"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="area-content">
              {yearData.earth_outcome ? (
                <>
                  <div className="analysis-detail-row">
                    <span className="detail-label">십성:</span>
                    <span className="detail-value">{renderSipsung(yearData.earth_outcome)}</span>
                    {yearData.earth_outcome.code && (
                      <span className="detail-code">{yearData.earth_outcome.code}</span>
                    )}
                  </div>
                  {/* 삼합 정보 */}
                  {yearData.samhap && (
                    <div className="samhap-info">
                      <span className="samhap-badge">{yearData.samhap.type}</span>
                      <span className="samhap-name">{yearData.samhap.name}</span>
                    </div>
                  )}
                  {safeRenderReason(yearData.earth_outcome.reason) && (
                    <p className="analysis-reason-text">{safeRenderReason(yearData.earth_outcome.reason)}</p>
                  )}
                </>
              ) : (
                <p>지지 성패 분석 결과 없음</p>
              )}
              {/* 저장된 해석 표시 */}
              {getEffectiveInterpretation('gyeokguk_earth') && (
                <div className="saved-interpretation">
                  <p className="interpretation-text">{getEffectiveInterpretation('gyeokguk_earth')}</p>
                </div>
              )}
              {/* 편집 모드 */}
              {editingArea === 'gyeokguk_earth' && (
                <AreaInterpretationEditor
                  area="gyeokguk_earth"
                  areaLabel="지지 격국"
                  interpretation={getInterpretation('gyeokguk_earth')}
                  defaultText={safeRenderReason(yearData.earth_outcome?.reason)}
                  onSavePrimary={(text) => handleSavePrimary('gyeokguk_earth', text)}
                  onSaveFinal={(text) => handleSaveFinal('gyeokguk_earth', text)}
                  onAiRewrite={(text) => handleAiRewrite('gyeokguk_earth', text)}
                  onCancel={() => setEditingArea(null)}
                  isSaving={savingArea === 'gyeokguk_earth'}
                  isAiGenerating={aiGeneratingArea === 'gyeokguk_earth'}
                />
              )}
            </div>
          </div>

          {/* 억부 */}
          <div className="interpretation-area eokbu-area">
            <div className="area-header">
              <span className="area-label">억부 (신강/신약)</span>
              {(strengthData.level || strengthData.decade_level) && (
                <span className={`strength-mini-badge ${
                  // 한글 라벨 처리: 중화=balanced, 신강/극신강=strong, 신약/극신약=weak
                  ['중화', 'balanced'].includes(strengthData.level || strengthData.decade_level) ? 'balanced' :
                  (strengthData.level || strengthData.decade_level)?.includes('신강') ||
                  (strengthData.level || strengthData.decade_level)?.includes('strong') ? 'strong' : 'weak'
                }`}>
                  {strengthData.level_name || strengthData.decade_level || strengthData.level}
                </span>
              )}
              {editingArea !== 'eokbu' && (
                <div className="area-action-buttons">
                  <button
                    className="btn btn-ai-area"
                    onClick={() => handleAiRewrite('eokbu', strengthData.description || strengthData.analysis || `${yearData.ganji} 억부 분석`)}
                    disabled={aiGeneratingArea !== null}
                    title="AI로 재작성"
                  >
                    {aiGeneratingArea === 'eokbu' ? <Loader size={12} className="spinning" /> : <Wand2 size={12} />}
                  </button>
                  <button
                    className="btn btn-edit-area"
                    onClick={() => setEditingArea('eokbu')}
                    title="해석 수정"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="area-content">
              {strengthData.base_level && strengthData.decade_level && (
                <div className="strength-flow">
                  <span className="base-value">{strengthData.base_level}</span>
                  <span className="flow-arrow">→</span>
                  <span className="decade-value">{strengthData.decade_level}</span>
                  {strengthData.trend && (
                    <span className={`trend-badge ${strengthData.trend}`}>
                      {strengthData.trend === 'improving' ? '(중화 방향 개선)' :
                       strengthData.trend === 'worsening' ? '(중화에서 멀어짐)' : '(유지)'}
                    </span>
                  )}
                </div>
              )}
              {(strengthData.description || strengthData.analysis) && (
                <p>{strengthData.description || strengthData.analysis}</p>
              )}
              {!strengthData.level && !strengthData.decade_level && !strengthData.description && !strengthData.analysis && (
                <p>억부 분석 결과 없음</p>
              )}
              {/* 저장된 해석 표시 */}
              {getEffectiveInterpretation('eokbu') && (
                <div className="saved-interpretation">
                  <p className="interpretation-text">{getEffectiveInterpretation('eokbu')}</p>
                </div>
              )}
              {/* 편집 모드 */}
              {editingArea === 'eokbu' && (
                <AreaInterpretationEditor
                  area="eokbu"
                  areaLabel="억부"
                  interpretation={getInterpretation('eokbu')}
                  defaultText={strengthData.analysis || strengthData.description || ''}
                  onSavePrimary={(text) => handleSavePrimary('eokbu', text)}
                  onSaveFinal={(text) => handleSaveFinal('eokbu', text)}
                  onAiRewrite={(text) => handleAiRewrite('eokbu', text)}
                  onCancel={() => setEditingArea(null)}
                  isSaving={savingArea === 'eokbu'}
                  isAiGenerating={aiGeneratingArea === 'eokbu'}
                />
              )}
            </div>
          </div>

          {/* 조후 */}
          <div className={`interpretation-area johu-area ${isEspeciallyGood ? 'especially-good' : ''}`}>
            <div className="area-header">
              <span className="area-label">조후 (기후/온도)</span>
              {(temperatureData.level || temperatureData.decade_label || temperatureData.decade_level) && (
                <span className={`temp-mini-badge ${
                  // 한글 라벨 처리: 적당함=optimal, 더움/매우더움=hot, 추움/매우추움=cold
                  ['moderate', 'optimal', '적당함', '적당', '온화'].includes(temperatureData.decade_level || temperatureData.level || temperatureData.decade_label) ? 'optimal' :
                  (temperatureData.decade_level || temperatureData.level || temperatureData.decade_label)?.includes('hot') ||
                  (temperatureData.decade_level || temperatureData.level || temperatureData.decade_label)?.includes('더') ? 'hot' : 'cold'
                }`}>
                  {temperatureData.level_name || temperatureData.decade_label || temperatureData.level}
                  {(temperatureData.temp !== undefined || temperatureData.decade_actual_temp !== undefined) &&
                    ` (${temperatureData.temp ?? temperatureData.decade_actual_temp}°C)`}
                </span>
              )}
              {isEspeciallyGood && <span className="especially-good-badge">⭐ 특히 좋음</span>}
              {editingArea !== 'johu' && (
                <div className="area-action-buttons">
                  <button
                    className="btn btn-ai-area"
                    onClick={() => handleAiRewrite('johu', temperatureData.description || temperatureData.analysis || `${yearData.ganji} 조후 분석`)}
                    disabled={aiGeneratingArea !== null}
                    title="AI로 재작성"
                  >
                    {aiGeneratingArea === 'johu' ? <Loader size={12} className="spinning" /> : <Wand2 size={12} />}
                  </button>
                  <button
                    className="btn btn-edit-area"
                    onClick={() => setEditingArea('johu')}
                    title="해석 수정"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="area-content">
              {isEspeciallyGood && temperatureData.especially_good_reason && (
                <p className="especially-good-reason">⭐ {temperatureData.especially_good_reason}</p>
              )}
              {temperatureData.base_label && temperatureData.decade_label && (
                <div className="temperature-flow">
                  <span className="base-value">{temperatureData.base_label}</span>
                  <span className="flow-arrow">→</span>
                  <span className="decade-value">{temperatureData.decade_label}</span>
                  {temperatureData.trend && (
                    <span className={`trend-badge ${temperatureData.trend}`}>
                      {temperatureData.trend === 'improving' ? '(적당해짐)' :
                       temperatureData.trend === 'worsening' ? '(극단화)' : '(유지)'}
                    </span>
                  )}
                </div>
              )}
              {temperatureData.description && (
                <p>{temperatureData.description}</p>
              )}
              {!temperatureData.level && !temperatureData.decade_label && !temperatureData.decade_level && !temperatureData.description && (
                <p>조후 분석 결과 없음</p>
              )}
              {/* 저장된 해석 표시 */}
              {getEffectiveInterpretation('johu') && (
                <div className="saved-interpretation">
                  <p className="interpretation-text">{getEffectiveInterpretation('johu')}</p>
                </div>
              )}
              {/* 편집 모드 */}
              {editingArea === 'johu' && (
                <AreaInterpretationEditor
                  area="johu"
                  areaLabel="조후"
                  interpretation={getInterpretation('johu')}
                  defaultText={temperatureData.description || ''}
                  onSavePrimary={(text) => handleSavePrimary('johu', text)}
                  onSaveFinal={(text) => handleSaveFinal('johu', text)}
                  onAiRewrite={(text) => handleAiRewrite('johu', text)}
                  onCancel={() => setEditingArea(null)}
                  isSaving={savingArea === 'johu'}
                  isAiGenerating={aiGeneratingArea === 'johu'}
                />
              )}
            </div>
          </div>

          {/* 종합 운세 */}
          <div className="interpretation-area overall-area">
            <div className="area-header">
              <span className="area-label">📊 {yearData.year}년 종합 운세</span>
              <span className={`overall-rating-badge ${getOverallRating(yearData)}`}>
                {getOverallRatingText(getOverallRating(yearData))}
              </span>
              {editingArea !== 'overall' && (
                <div className="area-action-buttons">
                  <button
                    className="btn btn-ai-area"
                    onClick={() => handleAiRewriteOverall()}
                    disabled={aiGeneratingArea !== null}
                    title="격국 중심 종합 AI 해석 생성"
                  >
                    {aiGeneratingArea === 'overall' ? <Loader size={12} className="spinning" /> : <Wand2 size={12} />}
                  </button>
                  <button
                    className="btn btn-edit-area"
                    onClick={() => setEditingArea('overall')}
                    title="해석 수정"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="area-content overall-content">
              <p className="overall-summary">
                천간 {getSingleRating(skyResult, skyScore).text} /
                지지 {getSingleRating(earthResult, earthScore).text} /
                억부 {strengthData.decade_level || strengthData.level || '분석중'} /
                조후 {temperatureData.decade_label || temperatureData.level || '분석중'}
              </p>
              {/* 저장된 종합 해석 표시 */}
              {getEffectiveInterpretation('overall') ? (
                <div className="saved-interpretation overall-interpretation">
                  <p className="interpretation-text">{getEffectiveInterpretation('overall')}</p>
                </div>
              ) : (
                <div className="no-interpretation-message">
                  <p>종합 운세 해석이 없습니다. AI 버튼을 클릭하여 격국 중심 종합 해석을 생성하세요.</p>
                </div>
              )}
              {/* 편집 모드 */}
              {editingArea === 'overall' && (
                <AreaInterpretationEditor
                  area="overall"
                  areaLabel="종합 운세"
                  interpretation={getInterpretation('overall')}
                  defaultText={yearData.generated_content || ''}
                  onSavePrimary={(text) => handleSavePrimary('overall', text)}
                  onSaveFinal={(text) => handleSaveFinal('overall', text)}
                  onAiRewrite={(text) => handleAiRewriteOverall()}
                  onCancel={() => setEditingArea(null)}
                  isSaving={savingArea === 'overall'}
                  isAiGenerating={aiGeneratingArea === 'overall'}
                />
              )}
            </div>
          </div>

          {/* 영역별 점수 (life_areas) */}
          {yearData.life_areas && Object.keys(yearData.life_areas).length > 0 && (
            <div className="life-areas-summary">
              {yearData.life_areas.relationship !== undefined && (
                <div className="life-area-item"><strong>❤️ 관계운:</strong> {yearData.life_areas.relationship}점</div>
              )}
              {yearData.life_areas.health !== undefined && (
                <div className="life-area-item"><strong>🏥 건강운:</strong> {yearData.life_areas.health}점</div>
              )}
              {yearData.life_areas.happiness !== undefined && (
                <div className="life-area-item"><strong>😊 행복지수:</strong> {yearData.life_areas.happiness}점</div>
              )}
              {yearData.combined_score !== undefined && (
                <div className="life-area-item combined-score"><strong>📊 종합점수:</strong> {yearData.combined_score}점</div>
              )}
            </div>
          )}

          {/* 합형충파해 분석 */}
          {yearData.relations?.length > 0 && (
            <div className="interpretation-area relations-area">
              <div className="area-header">
                <span className="area-label">합형충파해</span>
              </div>
              <div className="area-content">
                <div className="relations-list">
                  {yearData.relations.map((rel, idx) => (
                    <div key={idx} className={`relation-item ${getRelationClass(safeString(rel.type))}`}>
                      <span className="relation-type">{safeString(rel.type)}</span>
                      <span className="relation-chars">{safeString(rel.chars)}</span>
                      <span className="relation-desc">{safeString(rel.description)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
              {yearData.content_sections && yearData.content_sections.sky ? (
                <div className="structured-content">
                  {yearData.content_sections.sky && (
                    <div className="content-block">
                      <div className="content-block-title">🏢 사회운/활동운</div>
                      <div className="content-block-text">{yearData.content_sections.sky}</div>
                    </div>
                  )}
                  {yearData.content_sections.earth && (
                    <div className="content-block">
                      <div className="content-block-title">💰 재물운/현실운</div>
                      <div className="content-block-text">{yearData.content_sections.earth}</div>
                    </div>
                  )}
                  {yearData.content_sections.johu && (
                    <div className="content-block">
                      <div className="content-block-title">💪 건강운/컨디션</div>
                      <div className="content-block-text">{yearData.content_sections.johu}</div>
                    </div>
                  )}
                  {yearData.content_sections.summary && (
                    <div className="content-block">
                      <div className="content-block-title">📌 종합 조언</div>
                      <div className="content-block-text">{yearData.content_sections.summary}</div>
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
  const [regeneratingProgress, setRegeneratingProgress] = useState({ progress: 0, message: '' });
  const [yearlyInterpretations, setYearlyInterpretations] = useState({}); // 연도별 해석 { 2025: { gyeokguk_sky: {...}, ... }, ... }
  const dataLoaded = useRef(cachedData !== null);

  const userName = validationResult?.order_info?.name || '고객';

  // 연도별 해석 로드
  const loadYearlyInterpretations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/yearly_interpretations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });
      const data = await response.json();
      if (response.ok && data.interpretations) {
        setYearlyInterpretations(data.interpretations);
      }
    } catch (err) {
      console.error('Load yearly interpretations error:', err);
    }
  };

  // 해석 변경 핸들러
  const handleInterpretationChange = (year, area, interpretation) => {
    console.log('=== handleInterpretationChange 호출 ===');
    console.log('year:', year, 'area:', area);
    console.log('interpretation:', interpretation);
    setYearlyInterpretations(prev => {
      const newState = {
        ...prev,
        [year]: {
          ...prev[year],
          [area]: interpretation
        }
      };
      console.log('새로운 yearlyInterpretations 상태:', newState);
      return newState;
    });
  };

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
    // 이미 데이터가 있으면 fortune_level만 재계산하고 로드 건너뛰기
    if (fiveYearData.length > 0) {
      dataLoaded.current = true;
      // fortune_level 재계산 (캐시 데이터일 수 있으므로)
      const recalculatedData = fiveYearData.map(yearInfo => {
        const newLevel = calculateDefaultLevel(yearInfo);
        if (yearInfo.manager_edit?.fortune_level !== newLevel) {
          return {
            ...yearInfo,
            manager_edit: {
              ...yearInfo.manager_edit,
              fortune_level: newLevel
            }
          };
        }
        return yearInfo;
      });
      // 변경된 경우에만 업데이트
      if (recalculatedData.some((item, i) => item !== fiveYearData[i])) {
        setFiveYearData(recalculatedData);
        saveToCache(recalculatedData, baseAnalysis);
      }
      // 해석 데이터는 항상 로드
      if (orderId) {
        loadYearlyInterpretations();
      }
      return;
    }

    if (orderId && validationResult && !dataLoaded.current) {
      // initialData가 배열이고 데이터가 있으면 사용
      if (Array.isArray(initialData) && initialData.length > 0) {
        setFiveYearData(initialData);
        dataLoaded.current = true;
        loadYearlyInterpretations();
        return;
      }
      // 항상 API에서 최신 데이터 로드
      loadFiveYearData();
      loadYearlyInterpretations();
      dataLoaded.current = true;
    }
  }, [orderId, validationResult, initialData]);

  // 초기 데이터 변경 시 업데이트 (부모에서 전달된 경우)
  useEffect(() => {
    if (Array.isArray(initialData) && initialData.length > 0 && fiveYearData.length === 0 && !loading) {
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

        // fortune_level은 항상 새로 계산 (API 응답 기준)
        const calculatedLevel = calculateDefaultLevel(yearInfo);
        const existingEdit = savedYearData?.manager_edit || {};

        return {
          year: yearInfo.year,
          ganji: yearInfo.ganji,
          age_at_year: yearInfo.age_at_year,
          decade: yearInfo.decade,
          sky_outcome: yearInfo.sky_outcome,
          earth_outcome: yearInfo.earth_outcome,
          // 연도별 억부/조후 분석 데이터 (analysis/description 필드 포함)
          strength: yearInfo.strength,
          temperature: yearInfo.temperature,
          johu: yearInfo.johu,
          life_areas: yearInfo.life_areas,
          combined_score: yearInfo.combined_score,
          // 기존 조후 데이터 (호환성)
          year_temperature: yearInfo.year_temperature,
          year_humid: yearInfo.year_humid,
          relations: yearInfo.relations || [],
          manager_edit: {
            fortune_level: calculatedLevel,  // 항상 새로 계산
            reason: existingEdit.reason || '',
            advice: existingEdit.advice || '',
            memo: existingEdit.memo || ''
          },
          generated_content: savedYearData?.generated_content || ''
        };
      });

      setFiveYearData(yearsData);

      // 캐시에 저장
      saveToCache(yearsData, data.data.base_analysis);

      if (onChange && yearsData.length > 0) {
        // 각 연도의 generated_content를 합쳐서 content 생성
        const combinedContent = yearsData
          .filter(year => year.generated_content)
          .map(year => {
            const levelLabel = FORTUNE_LEVELS.find(l => l.value === year.manager_edit?.fortune_level)?.label || '보통';
            return `【${year.year}년 (${year.ganji}) - ${levelLabel}】\n${year.generated_content}`;
          })
          .join('\n\n');

        onChange({
          baseAnalysis: data.data.base_analysis,
          yearlyFiveYearFortunes: yearsData,
          content: combinedContent || null
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
        strength: null,
        temperature: null,
        johu: null,
        life_areas: null,
        combined_score: null,
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

    // 성중유패, 패중유성 등 혼합 결과도 체크
    const isPureSuccess = (result) => result === '성' || result === '成';
    const isPureFail = (result) => result === '패' || result === '敗';
    const isMixedBad = (result) => result === '성중유패' || result === '成中有敗';
    const isMixedGood = (result) => result === '패중유성' || result === '敗中有成';

    // 천간/지지 각각의 상태 확인
    const skyGood = isPureSuccess(skyResult) || isMixedGood(skyResult);
    const skyBad = isPureFail(skyResult) || isMixedBad(skyResult);
    const earthGood = isPureSuccess(earthResult) || isMixedGood(earthResult);
    const earthBad = isPureFail(earthResult) || isMixedBad(earthResult);

    // 둘 다 순수 성공이면 좋음
    if (isPureSuccess(skyResult) && isPureSuccess(earthResult)) return 'good';
    // 둘 다 순수 실패이면 어려움
    if (isPureFail(skyResult) && isPureFail(earthResult)) return 'difficult';
    // 하나라도 나쁜 결과(패 또는 성중유패)가 있으면 보통 또는 주의
    if (skyBad || earthBad) {
      // 하나가 좋고 하나가 나쁘면 보통
      if ((skyGood && earthBad) || (skyBad && earthGood)) return 'normal';
      return 'caution';
    }
    // 하나만 성공이고 다른 하나는 없으면 보통
    if ((skyGood && !earthResult) || (!skyResult && earthGood)) return 'normal';
    // 둘 다 좋으면 좋음
    if (skyGood && earthGood) return 'good';

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

  // 개별 연도 재생성 (5년운세 + 재물운 + 직업운 + 연애운)
  const handleRegenerateYear = async (year) => {
    setRegeneratingYear(year);
    try {
      const yearData = fiveYearData.find(d => d.year === year);
      const managerInput = yearData?.manager_edit || {};

      // 1. 5년운세 기본 생성
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

      // 2. 재물운 생성
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_fortune_year`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({ year, manager_input: {} })
        });
      } catch (e) {
        console.warn(`재물운 생성 실패 (${year}):`, e);
      }

      // 3. 직업운 생성
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_career_year`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({ year, manager_input: {} })
        });
      } catch (e) {
        console.warn(`직업운 생성 실패 (${year}):`, e);
      }

      // 4. 연애운 생성
      try {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_love_fortune`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({ year, manager_input: {} })
        });
      } catch (e) {
        console.warn(`연애운 생성 실패 (${year}):`, e);
      }

      // 5. 5개 영역 AI 해석 재생성 (gyeokguk_sky, gyeokguk_earth, eokbu, johu, overall)
      const areas = ['gyeokguk_sky', 'gyeokguk_earth', 'eokbu', 'johu', 'overall'];
      const yearIndex = fiveYearData.findIndex(d => d.year === year);
      const analysisContext = {
        sky_outcome: data.sky_outcome || yearData?.sky_outcome || {},
        earth_outcome: data.earth_outcome || yearData?.earth_outcome || {},
        strength: data.strength || yearData?.strength || {},
        temperature: data.temperature || yearData?.temperature || {},
        johu: data.johu || yearData?.johu || {},
        life_areas: data.life_areas || yearData?.life_areas || {},
        combined_score: data.combined_score || yearData?.combined_score,
        relations: data.relations || yearData?.relations || []
      };

      for (const area of areas) {
        try {
          let primaryText = '';
          switch (area) {
            case 'gyeokguk_sky':
              primaryText = analysisContext.sky_outcome?.reason || `${yearData?.ganji || data.ganji} 천간 격국 분석`;
              break;
            case 'gyeokguk_earth':
              primaryText = analysisContext.earth_outcome?.reason || `${yearData?.ganji || data.ganji} 지지 격국 분석`;
              break;
            case 'eokbu':
              primaryText = analysisContext.strength?.analysis || analysisContext.strength?.description || `${yearData?.ganji || data.ganji} 억부 분석`;
              break;
            case 'johu':
              primaryText = analysisContext.temperature?.description || analysisContext.temperature?.analysis || `${yearData?.ganji || data.ganji} 조후 분석`;
              break;
          }

          const aiResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_yearly_interpretation_ai`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Saju-Authorization': `Bearer-${API_TOKEN}`
            },
            body: JSON.stringify({
              year,
              year_index: yearIndex,
              ganji: yearData?.ganji || data.ganji,
              analysis_area: area,
              primary_interpretation: primaryText,
              analysis_context: analysisContext
            })
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            handleInterpretationChange(year, area, aiData.interpretation);
            console.log(`${area} AI 해석 생성 완료`);
          }
        } catch (e) {
          console.warn(`${area} AI 해석 생성 실패 (${year}):`, e);
        }
      }

      const updatedData = fiveYearData.map(item => {
        if (item.year === year) {
          const newSkyOutcome = data.sky_outcome || item.sky_outcome;
          const newEarthOutcome = data.earth_outcome || item.earth_outcome;
          const newRelations = data.relations || item.relations;
          // fortune_level 재계산
          const newLevel = calculateDefaultLevel({
            sky_outcome: newSkyOutcome,
            earth_outcome: newEarthOutcome,
            relations: newRelations
          });
          return {
            ...item,
            generated_content: data.generated_content,
            content_sections: data.content_sections || null,
            sky_outcome: newSkyOutcome,
            earth_outcome: newEarthOutcome,
            relations: newRelations,
            // 억부/조후 분석 데이터 업데이트 (API에서 반환된 경우)
            strength: data.strength || item.strength,
            temperature: data.temperature || item.temperature,
            johu: data.johu || item.johu,
            life_areas: data.life_areas || item.life_areas,
            combined_score: data.combined_score || item.combined_score,
            manager_edit: {
              ...item.manager_edit,
              fortune_level: newLevel
            }
          };
        }
        return item;
      });
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

  // 비동기 Job 폴링 헬퍼 함수
  const pollJobStatus = async (jobId, maxPollingTime = 600000) => {
    const pollingInterval = 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollingTime) {
      await new Promise(resolve => setTimeout(resolve, pollingInterval));

      const statusResponse = await fetch(
        `${API_BASE_URL}/api/v1/admin/orders/${orderId}/job_status/${jobId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          }
        }
      );

      const statusData = await statusResponse.json();
      console.log(`[FiveYearFortuneEditor] Job ${jobId} 상태:`, statusData.status, statusData.progress);

      // 진행 상태 업데이트
      if (statusData.progress !== undefined || statusData.message) {
        setRegeneratingProgress({
          progress: statusData.progress || 0,
          message: statusData.message || '처리 중...'
        });
      }

      if (statusData.status === 'completed') {
        return { success: true, result: statusData.result };
      }

      if (statusData.status === 'failed') {
        return { success: false, error: statusData.error || '생성에 실패했습니다.' };
      }
    }

    return { success: false, error: '작업 시간이 초과되었습니다.' };
  };

  // 비동기 Job 시작 헬퍼 함수
  const startAsyncJob = async (chapterType, options = {}) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/generate_async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Saju-Authorization': `Bearer-${API_TOKEN}`
      },
      body: JSON.stringify({ chapter_type: chapterType, options })
    });

    if (!response.ok) {
      throw new Error('비동기 작업 시작에 실패했습니다.');
    }

    const data = await response.json();
    return data.job_id;
  };

  // 5년 운세 전체 재생성 - 순차 호출 방식 (5년 운세만 생성, 재물운/직업운/연애운/코칭은 별도)
  const handleRegenerateAll = async () => {
    setRegeneratingAll(true);
    setRegeneratingProgress({ progress: 0, message: '5년 운세 생성 시작...' });
    try {
      let updatedData = [...fiveYearData];
      const totalYears = fiveYearData.length;

      // 5년 운세 생성 - 순차 호출 방식
      for (let i = 0; i < totalYears; i++) {
        const yearData = fiveYearData[i];
        const year = yearData.year;
        const managerInput = yearData?.manager_edit || {};

        const progress = Math.round(((i) / totalYears) * 90);
        setRegeneratingProgress({
          progress,
          message: `${year}년 운세 생성 중... (${i + 1}/${totalYears})`
        });

        try {
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
          if (response.ok && (data.five_year_fortune || data.generated_content)) {
            const fortune = data.five_year_fortune || data;
            updatedData = updatedData.map(item =>
              item.year === year
                ? {
                    ...item,
                    generated_content: fortune.content || fortune.generated_content || item.generated_content,
                    content_sections: fortune.content_sections || data.content_sections || null,
                    sky_type: fortune.sky_type || item.sky_type,
                    earth_type: fortune.earth_type || item.earth_type,
                    sky_outcome: data.sky_outcome || fortune.sky_outcome || item.sky_outcome,
                    earth_outcome: data.earth_outcome || fortune.earth_outcome || item.earth_outcome,
                    strength: data.strength || item.strength,
                    temperature: data.temperature || item.temperature,
                    johu: data.johu || item.johu,
                    life_areas: data.life_areas || item.life_areas,
                    combined_score: data.combined_score || item.combined_score
                  }
                : item
            );
            setFiveYearData(updatedData);
            console.log(`${year}년 운세 생성 완료`);
          } else {
            console.warn(`${year}년 운세 생성 실패:`, data.error);
          }
        } catch (yearErr) {
          console.error(`${year}년 운세 생성 오류:`, yearErr);
        }
      }

      setRegeneratingProgress({ progress: 95, message: '저장 중...' });

      saveToCache(updatedData, baseAnalysis);
      notifyParent(updatedData);
      await saveFiveYearData(updatedData);

      setRegeneratingProgress({ progress: 100, message: '완료!' });
    } catch (err) {
      console.error('Regenerate all error:', err);
    } finally {
      setRegeneratingAll(false);
      setRegeneratingProgress({ progress: 0, message: '' });
    }
  };

  // 부모 컴포넌트에 알림
  const notifyParent = (data) => {
    if (onChange) {
      // 각 연도의 generated_content를 합쳐서 content 생성
      const combinedContent = data
        .filter(year => year.generated_content)
        .map(year => {
          const levelLabel = FORTUNE_LEVELS.find(l => l.value === year.manager_edit?.fortune_level)?.label || '보통';
          return `【${year.year}년 (${year.ganji}) - ${levelLabel}】\n${year.generated_content}`;
        })
        .join('\n\n');

      onChange({
        baseAnalysis,
        yearlyFiveYearFortunes: data,
        content: combinedContent || null
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

  // 로딩 중에도 기본 UI는 보여주되, 데이터가 없으면 생성 버튼만 표시
  // (불필요한 로딩 메시지 제거)

  return (
    <div className="five-year-fortune-editor">
      {/* 전체 생성 중 오버레이 */}
      {regeneratingAll && (
        <div className="regenerating-overlay">
          <div className="regenerating-content">
            <RefreshCw size={32} className="spinning" />
            <span>5년간의 운세를 생성하고 있습니다...</span>
            {regeneratingProgress.message && (
              <p className="regenerating-progress">{regeneratingProgress.message}</p>
            )}
            {regeneratingProgress.progress > 0 && (
              <div className="loading-progress" style={{ marginTop: '16px', width: '280px' }}>
                <div style={{
                  background: '#e5e7eb',
                  borderRadius: '6px',
                  height: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#3b82f6',
                    height: '100%',
                    width: `${regeneratingProgress.progress}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                  {regeneratingProgress.progress}%
                </div>
              </div>
            )}
            <p className="regenerating-note" style={{ marginTop: '12px' }}>연도별로 생성 중입니다. 잠시만 기다려주세요.</p>
          </div>
        </div>
      )}

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
        {fiveYearData.length === 0 && !loading ? (
          <div className="no-data-message">
            <p>5년 운세 데이터가 없습니다. "전체 운세 생성" 버튼을 클릭하여 생성하세요.</p>
          </div>
        ) : fiveYearData.length === 0 && loading ? (
          <div className="no-data-message">
            <p>데이터를 불러오는 중입니다...</p>
          </div>
        ) : (
          fiveYearData.map((yearData, index) => (
            <YearFiveYearFortuneEditor
              key={yearData.year}
              yearData={yearData}
              yearIndex={index}
              onUpdate={handleYearUpdate}
              onRegenerate={handleRegenerateYear}
              isRegenerating={regeneratingYear === yearData.year}
              userName={userName}
              orderId={orderId}
              interpretations={yearlyInterpretations}
              onInterpretationChange={handleInterpretationChange}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default FiveYearFortuneEditor;
