import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, Loader, User, Phone, Mail, Calendar, Clock, FileText, Search, X, ChevronDown, ChevronRight, Sparkles, AlertCircle, Download, Edit3, MessageCircle, Wand2, Save } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import FortuneEditor from '../components/FortuneEditor';
import CareerEditor from '../components/CareerEditor';
import LoveFortuneEditor from '../components/LoveFortuneEditor';
import FiveYearFortuneEditor from '../components/FiveYearFortuneEditor';
import CoachingEditor from '../components/CoachingEditor';
import GyeokgukSuggestionModal from '../components/GyeokgukSuggestionModal';
import DecadeInterpretationEditor from '../components/DecadeInterpretationEditor';
import './OrderDetail.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';
const REPORT_BASE_URL = import.meta.env.DEV ? 'http://localhost:5173' : 'https://fortunetorch.com';

function JsonViewer({ data, name = 'root', level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  if (data === null) {
    return <span className="json-null">null</span>;
  }

  if (data === undefined) {
    return <span className="json-undefined">undefined</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="json-boolean">{data.toString()}</span>;
  }

  if (typeof data === 'number') {
    return <span className="json-number">{data}</span>;
  }

  if (typeof data === 'string') {
    return <span className="json-string">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="json-bracket">[]</span>;
    }

    return (
      <div className="json-array">
        <span className="json-toggle" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="json-bracket">[</span>
          {!isExpanded && <span className="json-preview">{data.length} items</span>}
        </span>
        {isExpanded && (
          <div className="json-children">
            {data.map((item, index) => (
              <div key={index} className="json-item">
                <span className="json-index">{index}: </span>
                <JsonViewer data={item} name={index.toString()} level={level + 1} />
                {index < data.length - 1 && <span className="json-comma">,</span>}
              </div>
            ))}
          </div>
        )}
        {isExpanded && <span className="json-bracket">]</span>}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="json-bracket">{'{}'}</span>;
    }

    return (
      <div className="json-object">
        <span className="json-toggle" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="json-bracket">{'{'}</span>
          {!isExpanded && <span className="json-preview">{keys.length} keys</span>}
        </span>
        {isExpanded && (
          <div className="json-children">
            {keys.map((key, index) => (
              <div key={key} className="json-item">
                <span className="json-key">"{key}"</span>
                <span className="json-colon">: </span>
                <JsonViewer data={data[key]} name={key} level={level + 1} />
                {index < keys.length - 1 && <span className="json-comma">,</span>}
              </div>
            ))}
          </div>
        )}
        {isExpanded && <span className="json-bracket">{'}'}</span>}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

function SajuValidationDisplay({ data, orderId }) {
  const { order_info, saju_data, current_decade, current_year_luck, type_analysis, decade_luck } = data;

  // 수정 제안 모달 상태
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionData, setSuggestionData] = useState(null);

  // 승인된 수정제안 상태
  const [approvedSuggestions, setApprovedSuggestions] = useState({});

  // 격국명 추출
  const getGyeokgukName = () => {
    return type_analysis?.sky_result?.status?.type || type_analysis?.earth_result?.status?.type || '미상';
  };

  // 패턴 키 생성 헬퍼
  const buildPatternKey = (suggestionType, targetChar, code) => {
    return `${suggestionType}:${getGyeokgukName()}:${targetChar}:${code}`;
  };

  // 승인된 수정제안에서 데이터 가져오기
  const getApprovedSuggestion = (suggestionType, targetChar, code) => {
    const key = buildPatternKey(suggestionType, targetChar, code);
    return approvedSuggestions[key] || null;
  };

  // 수정 제안 모달 열기
  const openSuggestionModal = (suggestionType, targetChar, item) => {
    setSuggestionData({
      suggestionType,
      gyeokgukName: getGyeokgukName(),
      targetChar,
      code: item.code || '',
      originalResult: item.result || '',
      originalReason: item.reason || '',
      // 개별 역할들 전달
      firstRoles: item.first_roles || [],
      secondRoles: item.second_roles || [],
      thirdRoles: item.third_roles || [],
      fourthRoles: item.fourth_roles || [],
    });
    setSuggestionModalOpen(true);
  };

  // 선택된 대운과 세운 상태
  const [selectedDecadeIndex, setSelectedDecadeIndex] = useState(current_decade?.index ?? 0);
  const [selectedYear, setSelectedYear] = useState(current_year_luck?.year || new Date().getFullYear());

  // current_decade가 로드되면 현재 대운으로 선택 업데이트
  useEffect(() => {
    if (current_decade?.index !== undefined) {
      setSelectedDecadeIndex(current_decade.index);
    }
  }, [current_decade?.index]);

  // 승인된 수정제안 조회
  useEffect(() => {
    const fetchApprovedSuggestions = async () => {
      if (!type_analysis) return;

      const gyeokgukName = type_analysis.sky_result?.status?.type || type_analysis.earth_result?.status?.type;
      if (!gyeokgukName || gyeokgukName === '미상') return;

      // 모든 대운/세운의 merged 항목에서 조회할 항목 수집
      const items = [];
      const skyDecadeLucks = type_analysis.sky_result?.lucks?.decade_lucks || {};
      const earthDecadeLucks = type_analysis.earth_result?.lucks?.decade_lucks || {};

      // 대운 천간/지지 merged 수집
      Object.entries(skyDecadeLucks).forEach(([targetChar, luckData]) => {
        (luckData?.merged || []).forEach(item => {
          if (item?.code) {
            items.push({ suggestion_type: 'decade_luck_sky', target_char: targetChar, code: item.code });
          }
        });
        // 세운 천간 merged 수집
        const yearLucks = luckData?.year_lucks || {};
        Object.entries(yearLucks).forEach(([yearChar, yearData]) => {
          (yearData?.merged || []).forEach(item => {
            if (item?.code) {
              items.push({ suggestion_type: 'year_luck_sky', target_char: yearChar, code: item.code });
            }
          });
        });
      });

      Object.entries(earthDecadeLucks).forEach(([targetChar, luckData]) => {
        (luckData?.merged || []).forEach(item => {
          if (item?.code) {
            items.push({ suggestion_type: 'decade_luck_earth', target_char: targetChar, code: item.code });
          }
        });
        // 세운 지지 merged 수집
        const yearLucks = luckData?.year_lucks || {};
        Object.entries(yearLucks).forEach(([yearChar, yearData]) => {
          (yearData?.merged || []).forEach(item => {
            if (item?.code) {
              items.push({ suggestion_type: 'year_luck_earth', target_char: yearChar, code: item.code });
            }
          });
        });
      });

      if (items.length === 0) return;

      try {
        const token = localStorage.getItem('manager_token');
        const response = await fetch(`${API_BASE_URL}/api/v1/manager/gyeokguk_suggestions/approved_batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            gyeokguk_name: gyeokgukName,
            items: items
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setApprovedSuggestions(result.approved || {});
          }
        }
      } catch (err) {
        console.error('승인된 수정제안 조회 실패:', err);
      }
    };

    fetchApprovedSuggestions();
  }, [type_analysis]);

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

  // 선택된 대운 정보
  const getSelectedDecade = () => {
    if (!decade_luck?.decade_array || selectedDecadeIndex < 0) return null;
    const ganji = decade_luck.decade_array[selectedDecadeIndex];
    if (!ganji) return null;
    const startAge = Math.max((decade_luck.start_age || 1) - 1, 0) + (selectedDecadeIndex * 10);
    return {
      index: selectedDecadeIndex,
      ganji: ganji,
      sky: ganji?.charAt(0),
      earth: ganji?.charAt(1),
      start_age: startAge,
      end_age: startAge + 9,
    };
  };

  // 선택된 세운 정보
  const getSelectedYearLuck = () => {
    const ganji = getYearGanji(selectedYear);
    return {
      year: selectedYear,
      ganji: ganji,
      sky: ganji?.charAt(0),
      earth: ganji?.charAt(1),
    };
  };

  const selectedDecade = getSelectedDecade();
  const selectedYearLuck = getSelectedYearLuck();

  // 대운 성패 추출 (선택된 대운 기준)
  const getDecadeLuckResult = () => {
    if (!type_analysis || !selectedDecade?.sky) return null;

    const skyLucks = type_analysis.sky_result?.lucks?.decade_lucks;
    const earthLucks = type_analysis.earth_result?.lucks?.decade_lucks;

    const skyResult = skyLucks?.[selectedDecade.sky];
    const earthResult = earthLucks?.[selectedDecade.earth];

    // merged 배열의 코드들 추출 (중복 필터링용)
    const skyMergedCodes = (skyResult?.merged || []).map(m => m?.code).filter(Boolean);
    const earthMergedCodes = (earthResult?.merged || []).map(m => m?.code).filter(Boolean);

    // outcome에서 merged에 이미 있는 항목 제외
    const filterMergedFromOutcome = (outcome, mergedCodes) => {
      if (!outcome || !Array.isArray(outcome)) return [];
      return outcome.filter(item => !item?.code || !mergedCodes.includes(item.code));
    };

    return {
      sky: skyResult?.result || null,
      earth: earthResult?.result || null,
      sky_codes: skyResult?.codes || [],
      earth_codes: earthResult?.codes || [],
      sky_merged: skyResult?.merged || [],
      earth_merged: earthResult?.merged || [],
      // 천간 성패 결과 (merged에 있는 항목 제외)
      sky_outcome: filterMergedFromOutcome((skyResult?.result?.decade_luck_sky_outcome || []).flat(), skyMergedCodes),
      sky_year_month_outcome: filterMergedFromOutcome((skyResult?.result?.decade_luck_year_month_sky_outcome || []).flat(), skyMergedCodes),
      sky_month_time_outcome: filterMergedFromOutcome((skyResult?.result?.decade_luck_month_time_sky_outcome || []).flat(), skyMergedCodes),
      // 지지 추가 성패 결과 (merged에 있는 항목 제외)
      earth_outcome: filterMergedFromOutcome((earthResult?.result?.decade_luck_earth_outcome || []).flat(), earthMergedCodes),
      earth_year_outcome: filterMergedFromOutcome((earthResult?.result?.decade_luck_year_earth_outcome || []).flat(), earthMergedCodes),
      earth_day_outcome: filterMergedFromOutcome((earthResult?.result?.decade_luck_day_earth_outcome || []).flat(), earthMergedCodes),
      earth_time_outcome: filterMergedFromOutcome((earthResult?.result?.decade_luck_time_earth_outcome || []).flat(), earthMergedCodes),
    };
  };

  // 세운 성패 추출 (선택된 대운 + 세운 기준)
  const getYearLuckResult = () => {
    if (!type_analysis || !selectedDecade?.sky || !selectedYearLuck?.sky) return null;

    const skyDecadeLucks = type_analysis.sky_result?.lucks?.decade_lucks;
    const earthDecadeLucks = type_analysis.earth_result?.lucks?.decade_lucks;

    // 세운은 대운의 year_lucks 안에 있음
    const skyYearLucks = skyDecadeLucks?.[selectedDecade.sky]?.year_lucks;
    const earthYearLucks = earthDecadeLucks?.[selectedDecade.earth]?.year_lucks;

    // 천간: 세운 천간에 대한 결과
    const skyResult = skyYearLucks?.[selectedYearLuck.sky];
    // 지지: 세운 지지에 대한 결과
    const earthResult = earthYearLucks?.[selectedYearLuck.earth];

    // merged 배열의 코드들 추출 (중복 필터링용)
    const skyMergedCodes = (skyResult?.merged || []).map(m => m?.code).filter(Boolean);
    const earthMergedCodes = (earthResult?.merged || []).map(m => m?.code).filter(Boolean);

    // outcome에서 merged에 이미 있는 항목 제외
    const filterMergedFromOutcome = (outcome, mergedCodes) => {
      if (!outcome || !Array.isArray(outcome)) return [];
      return outcome.filter(item => !item?.code || !mergedCodes.includes(item.code));
    };

    return {
      sky: skyResult || null,
      earth: earthResult || null,
      sky_codes: skyResult?.codes || [],
      earth_codes: earthResult?.codes || [],
      sky_merged: skyResult?.merged || [],
      earth_merged: earthResult?.merged || [],
      // 세운 천간 성패 결과 (merged에 있는 항목 제외)
      sky_outcome: filterMergedFromOutcome((skyResult?.result?.year_luck_sky_outcome || []).flat(), skyMergedCodes),
      sky_time_outcome: filterMergedFromOutcome((skyResult?.result?.year_luck_time_sky_outcome || []).flat(), skyMergedCodes),
      sky_month_outcome: filterMergedFromOutcome((skyResult?.result?.year_luck_month_sky_outcome || []).flat(), skyMergedCodes),
      sky_year_outcome: filterMergedFromOutcome((skyResult?.result?.year_luck_year_sky_outcome || []).flat(), skyMergedCodes),
      sky_decade_outcome: filterMergedFromOutcome((skyResult?.result?.year_luck_decade_luck_sky_outcome || []).flat(), skyMergedCodes),
      // 세운 지지 성패 결과 (merged에 있는 항목 제외)
      earth_outcome: filterMergedFromOutcome((earthResult?.result?.year_luck_earth_outcome || []).flat(), earthMergedCodes),
      earth_year_outcome: filterMergedFromOutcome((earthResult?.result?.year_luck_year_earth_outcome || []).flat(), earthMergedCodes),
      earth_month_outcome: filterMergedFromOutcome((earthResult?.result?.year_luck_month_earth_outcome || []).flat(), earthMergedCodes),
      earth_day_outcome: filterMergedFromOutcome((earthResult?.result?.year_luck_day_earth_outcome || []).flat(), earthMergedCodes),
      earth_time_outcome: filterMergedFromOutcome((earthResult?.result?.year_luck_time_earth_outcome || []).flat(), earthMergedCodes),
      earth_decade_outcome: filterMergedFromOutcome((earthResult?.result?.year_luck_decade_earth_outcome || []).flat(), earthMergedCodes),
    };
  };

  const decadeLuckResult = getDecadeLuckResult();
  const yearLuckResult = getYearLuckResult();

  // 객체를 안전하게 문자열로 변환
  const safeString = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      // code, name, role 속성이 있으면 사용
      if (value.code) return safeString(value.code);
      if (value.name) return safeString(value.name);
      if (value.role) return safeString(value.role);
      // roles 배열이 있으면 name들을 추출
      if (Array.isArray(value.roles) && value.roles.length > 0) {
        return value.roles.map(r => r.name || r.role || '').filter(Boolean).join(', ');
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  // 배열을 안전하게 문자열로 변환
  const safeArrayString = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
    return arr.map(item => safeString(item)).join(', ');
  };

  // 위치명을 한글로 변환
  const translatePosition = (position) => {
    const positionMap = {
      'year_luck_sky': '년운 천간',
      'decade_luck_sky': '대운 천간',
      'year_sky': '년간',
      'month_sky': '월간',
      'time_sky': '시간',
      'year_earth': '년지',
      'month_earth': '월지',
      'day_earth': '일지',
      'year_luck_earth': '년운 지지',
      'decade_luck_earth': '대운 지지',
      'time_earth': '시지',
      'type': '격국',
    };
    return positionMap[position] || position;
  };

  // 위치 배열을 한글로 변환하여 문자열로 반환
  const translatePositions = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
    return arr.map(item => translatePosition(safeString(item))).join(', ');
  };

  // Outcome 결과에 따른 스타일 클래스 결정
  const getOutcomeClass = (result) => {
    if (result === '성') return 'success';
    if (result === '패') return 'fail';
    if (result === '성중유패') return 'mixed-fail';
    if (result === '패중유성') return 'mixed-success';
    return '';
  };

  // 역할 렌더링 함수
  const renderRoles = (roles) => {
    if (!roles) return null;

    const renderSingleRole = (role, idx) => {
      if (typeof role === 'string') {
        return <div key={idx} className="role-item"><span className="role-name-tag">{role}</span></div>;
      }
      if (typeof role === 'object' && role !== null) {
        const name = role.name || role.role;
        const reason = role.reason;
        return (
          <div key={idx} className="role-item">
            <span className="role-name-tag">{name || '-'}</span>
            {reason && <span className="role-reason-text">{reason}</span>}
          </div>
        );
      }
      return <div key={idx} className="role-item"><span className="role-name-tag">{String(role)}</span></div>;
    };

    // 배열인 경우
    if (Array.isArray(roles)) {
      if (roles.length === 0) return null;
      return <div className="roles-list">{roles.map((role, idx) => renderSingleRole(role, idx))}</div>;
    }
    // 객체인 경우
    if (typeof roles === 'object' && roles !== null) {
      return <div className="roles-list">{renderSingleRole(roles, 0)}</div>;
    }
    // 문자열인 경우
    return <div className="roles-list"><div className="role-item"><span className="role-name-tag">{String(roles)}</span></div></div>;
  };

  // Outcome 아이템 렌더링 함수
  const renderOutcomeItem = (outcome, idx, suggestionType = null, targetChar = null) => {
    if (!outcome) return null;
    return (
      <div key={idx} className={`outcome-item ${getOutcomeClass(outcome.result)}`}>
        <div className="outcome-main">
          <span className="outcome-result">{safeString(outcome.result)}</span>
          <span className="outcome-code">{safeString(outcome.code)}</span>
          {outcome.deep_level && <span className="outcome-level">Lv.{outcome.deep_level}</span>}
          {outcome.is_sanhe && <span className="outcome-sanhe">삼합</span>}
          {suggestionType && targetChar && (
            <button
              className="suggest-edit-btn"
              onClick={() => openSuggestionModal(suggestionType, targetChar, outcome)}
              title="수정 제안"
            >
              <Edit3 size={12} />
              수정제안
            </button>
          )}
        </div>
        {outcome.reason && <div className="outcome-reason">{safeString(outcome.reason)}</div>}
        <div className="outcome-key-values">
          {outcome.positions?.length > 0 && (
            <div className="kv-row"><span className="kv-key">위치:</span><span className="kv-value">{translatePositions(outcome.positions)}</span></div>
          )}
          {outcome.chars?.length > 0 && (
            <div className="kv-row"><span className="kv-key">글자:</span><span className="kv-value">{safeArrayString(outcome.chars)}</span></div>
          )}
          {outcome.code && (
            <div className="kv-row"><span className="kv-key">코드:</span><span className="kv-value">{safeString(outcome.code)}</span></div>
          )}
        </div>
        {(outcome.first_roles || outcome.second_roles || outcome.third_roles || outcome.fourth_roles) && (
          <div className="outcome-roles-section">
            {outcome.first_roles && (
              <div className="role-row">
                <span className="role-label">1차 역할:</span>
                {renderRoles(outcome.first_roles)}
              </div>
            )}
            {outcome.second_roles && (
              <div className="role-row">
                <span className="role-label">2차 역할:</span>
                {renderRoles(outcome.second_roles)}
              </div>
            )}
            {outcome.third_roles && (
              <div className="role-row">
                <span className="role-label">3차 역할:</span>
                {renderRoles(outcome.third_roles)}
              </div>
            )}
            {outcome.fourth_roles && (
              <div className="role-row">
                <span className="role-label">4차 역할:</span>
                {renderRoles(outcome.fourth_roles)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 합(merged) 결과 렌더링 - roles 포함
  const renderMergedItem = (item, idx, suggestionType = null, targetChar = null) => {
    if (!item) return null;

    // 문자열인 경우 기존 방식으로 표시
    if (typeof item === 'string') {
      return <span key={idx} className="merged-item">{item}</span>;
    }

    // 객체인 경우 상세 정보 표시
    if (typeof item === 'object') {
      // 승인된 수정제안 확인
      const approvedSuggestion = suggestionType && targetChar && item.code
        ? getApprovedSuggestion(suggestionType, targetChar, item.code)
        : null;

      // 수정제안이 있고 원본 데이터와 다른 경우 확인
      const hasModifiedResult = approvedSuggestion && approvedSuggestion.suggested_result !== item.result;
      const hasModifiedReason = approvedSuggestion && approvedSuggestion.suggested_reason && approvedSuggestion.suggested_reason !== item.reason;
      const hasModification = hasModifiedResult || hasModifiedReason;

      // 표시할 성패 및 이유 결정 (수정제안이 있으면 수정된 값 사용)
      const displayResult = hasModifiedResult ? approvedSuggestion.suggested_result : item.result;
      const displayReason = hasModifiedReason ? approvedSuggestion.suggested_reason : item.reason;
      const displayRoles = approvedSuggestion?.suggested_roles?.length > 0 ? approvedSuggestion.suggested_roles : item.roles;

      // 패, 성중유패 → fail (빨간색) / 성, 패중유성 → success (녹색)
      const resultClass = (displayResult === '敗' || displayResult === '成中有敗' || displayResult === '패' || displayResult === '성중유패') ? 'fail' :
                         (displayResult === '成' || displayResult === '敗中有成' || displayResult === '성' || displayResult === '패중유성') ? 'success' : 'neutral';

      return (
        <div key={idx} className={`merged-detail-item ${resultClass} ${hasModification ? 'modified' : ''}`}>
          <div className="merged-main">
            <span className="merged-result">
              {safeString(displayResult)}
              {hasModifiedResult && <span className="modified-badge">수정됨</span>}
            </span>
            <span className="merged-code">{safeString(item.code)}</span>
            {suggestionType && targetChar && (
              <button
                className="suggest-edit-btn"
                onClick={() => openSuggestionModal(suggestionType, targetChar, item)}
                title="수정 제안"
              >
                <Edit3 size={12} />
                수정제안
              </button>
            )}
          </div>
          {displayReason && (
            <div className={`merged-reason ${hasModifiedReason ? 'modified-reason' : ''}`}>
              {safeString(displayReason)}
              {hasModifiedReason && <span className="modified-badge">수정됨</span>}
            </div>
          )}
          {/* 원본 데이터 표시 (수정된 경우에만) */}
          {hasModification && (
            <div className="original-data">
              <span className="original-label">원본:</span>
              {hasModifiedResult && <span className="original-result">{safeString(item.result)}</span>}
              {hasModifiedReason && <span className="original-reason">{safeString(item.reason)}</span>}
            </div>
          )}
          {item.positions?.length > 0 && (
            <div className="merged-positions">
              <span className="positions-label">위치:</span>
              <span className="positions-value">{translatePositions(item.positions)}</span>
            </div>
          )}
          {displayRoles && displayRoles.length > 0 && (
            <div className="merged-roles-section">
              <span className="role-label">역할:</span>
              {renderRoles(displayRoles)}
            </div>
          )}
        </div>
      );
    }

    return <span key={idx} className="merged-item">{safeString(item)}</span>;
  };

  // 세운 연도 범위 생성 (선택된 대운 기간 내의 연도들)
  const getYearRange = () => {
    if (!selectedDecade || !order_info) return [];
    const birthYear = parseInt(order_info.birth_date?.match(/(\d+)년/)?.[1]) || 1990;
    const startYear = birthYear + selectedDecade.start_age;
    const endYear = birthYear + selectedDecade.end_age;
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  };

  const yearRange = getYearRange();

  // 천간으로 십신 계산
  const calculateSipsin = (ilgan, target) => {
    if (!ilgan || !target) return null;
    const sipsinMap = {
      '甲': { '甲': '비견', '乙': '겁재', '丙': '식신', '丁': '상관', '戊': '편재', '己': '정재', '庚': '편관', '辛': '정관', '壬': '편인', '癸': '정인' },
      '乙': { '乙': '비견', '甲': '겁재', '丁': '식신', '丙': '상관', '己': '편재', '戊': '정재', '辛': '편관', '庚': '정관', '癸': '편인', '壬': '정인' },
      '丙': { '丙': '비견', '丁': '겁재', '戊': '식신', '己': '상관', '庚': '편재', '辛': '정재', '壬': '편관', '癸': '정관', '甲': '편인', '乙': '정인' },
      '丁': { '丁': '비견', '丙': '겁재', '己': '식신', '戊': '상관', '辛': '편재', '庚': '정재', '癸': '편관', '壬': '정관', '乙': '편인', '甲': '정인' },
      '戊': { '戊': '비견', '己': '겁재', '庚': '식신', '辛': '상관', '壬': '편재', '癸': '정재', '甲': '편관', '乙': '정관', '丙': '편인', '丁': '정인' },
      '己': { '己': '비견', '戊': '겁재', '辛': '식신', '庚': '상관', '癸': '편재', '壬': '정재', '乙': '편관', '甲': '정관', '丁': '편인', '丙': '정인' },
      '庚': { '庚': '비견', '辛': '겁재', '壬': '식신', '癸': '상관', '甲': '편재', '乙': '정재', '丙': '편관', '丁': '정관', '戊': '편인', '己': '정인' },
      '辛': { '辛': '비견', '庚': '겁재', '癸': '식신', '壬': '상관', '乙': '편재', '甲': '정재', '丁': '편관', '丙': '정관', '己': '편인', '戊': '정인' },
      '壬': { '壬': '비견', '癸': '겁재', '甲': '식신', '乙': '상관', '丙': '편재', '丁': '정재', '戊': '편관', '己': '정관', '庚': '편인', '辛': '정인' },
      '癸': { '癸': '비견', '壬': '겁재', '乙': '식신', '甲': '상관', '丁': '편재', '丙': '정재', '己': '편관', '戊': '정관', '辛': '편인', '庚': '정인' }
    };
    return sipsinMap[ilgan]?.[target] || null;
  };

  // 지지 본기로 십신 계산
  const calculateJijiSipsin = (ilgan, earth) => {
    if (!ilgan || !earth) return null;
    const jijiBongi = {
      '子': '癸', '丑': '己', '寅': '甲', '卯': '乙',
      '辰': '戊', '巳': '丙', '午': '丁', '未': '己',
      '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
    };
    const bongi = jijiBongi[earth];
    return bongi ? calculateSipsin(ilgan, bongi) : null;
  };

  const ilgan = saju_data?.ilgan;

  // 사주 십신 계산
  const getSajuSipsin = () => {
    if (!saju_data || !ilgan) return {};
    return {
      year_sky: calculateSipsin(ilgan, saju_data.cheongan?.year),
      month_sky: calculateSipsin(ilgan, saju_data.cheongan?.month),
      day_sky: '일간',
      time_sky: calculateSipsin(ilgan, saju_data.cheongan?.time),
      year_earth: calculateJijiSipsin(ilgan, saju_data.jiji?.year),
      month_earth: calculateJijiSipsin(ilgan, saju_data.jiji?.month),
      day_earth: calculateJijiSipsin(ilgan, saju_data.jiji?.day),
      time_earth: calculateJijiSipsin(ilgan, saju_data.jiji?.time),
    };
  };

  const sajuSipsin = getSajuSipsin();


  return (
    <div className="saju-display">
      {/* 고객 정보 */}
      <div className="saju-section info-section">
        <div className="section-title">기본 정보</div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">이름</span>
            <span className="info-value">{order_info?.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">생년월일</span>
            <span className="info-value">{order_info?.birth_date}</span>
          </div>
          <div className="info-item">
            <span className="info-label">출생시간</span>
            <span className="info-value">{order_info?.birth_time}</span>
          </div>
          <div className="info-item">
            <span className="info-label">성별</span>
            <span className="info-value">{order_info?.gender}</span>
          </div>
          {current_decade && (
            <div className="info-item">
              <span className="info-label">현재 나이</span>
              <span className="info-value">만 {current_decade.current_age}세</span>
            </div>
          )}
          {type_analysis?.sky_result?.status && (
            <div className="info-item">
              <span className="info-label">천간 격국</span>
              <span className="info-value">{type_analysis.sky_result.status.type || '미상'}</span>
            </div>
          )}
          {type_analysis?.earth_result?.status && (
            <div className="info-item">
              <span className="info-label">지지 격국</span>
              <span className="info-value">{type_analysis.earth_result.status.type || '미상'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 사주 명식 */}
      <div className="saju-section">
        <div className="section-title">사주 명식 (四柱命式)</div>
        <div className="saju-chart">
          <table className="saju-table">
            <thead>
              <tr>
                <th></th>
                <th>시주<br/><small>時柱</small></th>
                <th>일주<br/><small>日柱</small></th>
                <th>월주<br/><small>月柱</small></th>
                <th>연주<br/><small>年柱</small></th>
              </tr>
            </thead>
            <tbody>
              <tr className="sipsin-row">
                <td className="row-label">십신</td>
                <td>{sajuSipsin.time_sky || '-'}</td>
                <td className="ilgan-cell">일간</td>
                <td>{sajuSipsin.month_sky || '-'}</td>
                <td>{sajuSipsin.year_sky || '-'}</td>
              </tr>
              <tr className="cheongan-row">
                <td className="row-label">천간</td>
                <td className="ganji-cell">{saju_data?.cheongan?.time || '?'}</td>
                <td className="ganji-cell ilgan-cell">{saju_data?.cheongan?.day || '?'}</td>
                <td className="ganji-cell">{saju_data?.cheongan?.month || '?'}</td>
                <td className="ganji-cell">{saju_data?.cheongan?.year || '?'}</td>
              </tr>
              <tr className="jiji-row">
                <td className="row-label">지지</td>
                <td className="ganji-cell">{saju_data?.jiji?.time || '?'}</td>
                <td className="ganji-cell">{saju_data?.jiji?.day || '?'}</td>
                <td className="ganji-cell">{saju_data?.jiji?.month || '?'}</td>
                <td className="ganji-cell">{saju_data?.jiji?.year || '?'}</td>
              </tr>
              <tr className="sipsin-row">
                <td className="row-label">지장간</td>
                <td>{sajuSipsin.time_earth || '-'}</td>
                <td>{sajuSipsin.day_earth || '-'}</td>
                <td>{sajuSipsin.month_earth || '-'}</td>
                <td>{sajuSipsin.year_earth || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 대운 선택 */}
      {decade_luck?.decade_array && (
        <div className="saju-section">
          <div className="section-title">대운 선택</div>
          <div className="decade-selector">
            {decade_luck.decade_array.map((ganji, idx) => {
              const startAge = Math.max((decade_luck.start_age || 1) - 1, 0) + (idx * 10);
              const isCurrent = current_decade?.index === idx;
              const isSelected = selectedDecadeIndex === idx;
              return (
                <div
                  key={idx}
                  className={`decade-select-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                  onClick={() => setSelectedDecadeIndex(idx)}
                >
                  <div className="decade-select-age">{startAge}세</div>
                  <div className="decade-select-ganji">{ganji}</div>
                  {isCurrent && <div className="current-badge">현재</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 세운 선택 */}
      {yearRange.length > 0 && (
        <div className="saju-section">
          <div className="section-title">세운 선택 (만 {selectedDecade?.start_age}~{selectedDecade?.end_age}세)</div>
          <div className="year-selector">
            {yearRange.map((year) => {
              const isCurrent = current_year_luck?.year === year;
              const isSelected = selectedYear === year;
              const ganji = getYearGanji(year);
              return (
                <div
                  key={year}
                  className={`year-select-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                  onClick={() => setSelectedYear(year)}
                >
                  <div className="year-select-year">{year}년</div>
                  <div className="year-select-ganji">{ganji}</div>
                  {isCurrent && <div className="current-badge">현재</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 선택된 대운 & 세운 */}
      <div className="luck-section">
        <div className="luck-cards">
          {/* 선택된 대운 */}
          <div className="luck-card decade-card">
            <div className="luck-card-header">
              <span className="luck-title">대운 {selectedDecade?.index === current_decade?.index ? '(현재)' : ''}</span>
              {selectedDecade && (
                <span className="luck-age">만 {selectedDecade.start_age}~{selectedDecade.end_age}세</span>
              )}
            </div>
            {selectedDecade ? (
              <div className="luck-card-body">
                <div className="luck-ganji">{selectedDecade.ganji}</div>
                <div className="luck-details">
                  <div className="luck-row">
                    <span className="luck-char sky">{selectedDecade.sky}</span>
                    <span className="luck-sipsin">{calculateSipsin(ilgan, selectedDecade.sky)}</span>
                  </div>
                  <div className="luck-row">
                    <span className="luck-char earth">{selectedDecade.earth}</span>
                    <span className="luck-sipsin">{calculateJijiSipsin(ilgan, selectedDecade.earth)}</span>
                  </div>
                </div>

                {/* 대운 성패 결과 */}
                {decadeLuckResult && (
                  <div className="luck-result-section">
                    <div className="result-title">성패 분석</div>

                    {/* 천간 성패 */}
                    <div className="result-group sky-group">
                      <div className="result-group-header">
                        <span className="group-label sky">천간 ({selectedDecade.sky})</span>
                      </div>
                      {decadeLuckResult.sky_codes?.length > 0 && (
                        <div className="result-codes">
                          {decadeLuckResult.sky_codes.map((code, idx) => (
                            <span key={idx} className="code-badge">{safeString(code)}</span>
                          ))}
                        </div>
                      )}
                      {decadeLuckResult.sky_merged?.length > 0 && (
                        <div className="result-merged">
                          {decadeLuckResult.sky_merged.map((item, idx) => renderMergedItem(item, idx, 'decade_luck_sky', selectedDecade.sky))}
                        </div>
                      )}
                      {decadeLuckResult.sky_outcome?.filter(Boolean).length > 0 ? (
                        <div className="outcome-list">
                          {decadeLuckResult.sky_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'decade_luck_sky', selectedDecade.sky))}
                        </div>
                      ) : (
                        <div className="no-outcome">성패 없음</div>
                      )}

                      {/* 년월 천간 성패 */}
                      {decadeLuckResult.sky_year_month_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">년월 천간</div>
                          <div className="outcome-list">
                            {decadeLuckResult.sky_year_month_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'decade_luck_sky', selectedDecade.sky))}
                          </div>
                        </div>
                      )}

                      {/* 월시 천간 성패 */}
                      {decadeLuckResult.sky_month_time_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">월시 천간</div>
                          <div className="outcome-list">
                            {decadeLuckResult.sky_month_time_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'decade_luck_sky', selectedDecade.sky))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 지지 성패 */}
                    <div className="result-group earth-group">
                      <div className="result-group-header">
                        <span className="group-label earth">지지 ({selectedDecade.earth})</span>
                      </div>
                      {decadeLuckResult.earth_codes?.length > 0 && (
                        <div className="result-codes">
                          {decadeLuckResult.earth_codes.map((code, idx) => (
                            <span key={idx} className="code-badge">{safeString(code)}</span>
                          ))}
                        </div>
                      )}
                      {decadeLuckResult.earth_merged?.length > 0 && (
                        <div className="result-merged">
                          {decadeLuckResult.earth_merged.map((item, idx) => renderMergedItem(item, idx, 'decade_luck_earth', selectedDecade.earth))}
                        </div>
                      )}
                      {decadeLuckResult.earth_outcome?.filter(Boolean).length > 0 ? (
                        <div className="outcome-list">
                          {decadeLuckResult.earth_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'decade_luck_earth', selectedDecade.earth))}
                        </div>
                      ) : (
                        <div className="no-outcome">성패 없음</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="luck-empty">정보 없음</div>
            )}
          </div>

          {/* 선택된 세운 */}
          <div className="luck-card year-card">
            <div className="luck-card-header">
              <span className="luck-title">세운 {selectedYear === current_year_luck?.year ? '(현재)' : ''}</span>
              {selectedYearLuck && (
                <span className="luck-year">{selectedYearLuck.year}년</span>
              )}
            </div>
            {selectedYearLuck ? (
              <div className="luck-card-body">
                <div className="luck-ganji">{selectedYearLuck.ganji}</div>
                <div className="luck-details">
                  <div className="luck-row">
                    <span className="luck-char sky">{selectedYearLuck.sky}</span>
                    <span className="luck-sipsin">{calculateSipsin(ilgan, selectedYearLuck.sky)}</span>
                  </div>
                  <div className="luck-row">
                    <span className="luck-char earth">{selectedYearLuck.earth}</span>
                    <span className="luck-sipsin">{calculateJijiSipsin(ilgan, selectedYearLuck.earth)}</span>
                  </div>
                </div>

                {/* 세운 성패 결과 */}
                {yearLuckResult && (
                  <div className="luck-result-section">
                    <div className="result-title">성패 분석</div>

                    {/* 천간 성패 */}
                    <div className="result-group sky-group">
                      <div className="result-group-header">
                        <span className="group-label sky">천간 ({selectedYearLuck.sky})</span>
                      </div>
                      {yearLuckResult.sky_codes?.length > 0 && (
                        <div className="result-codes">
                          {yearLuckResult.sky_codes.map((code, idx) => (
                            <span key={idx} className="code-badge">{safeString(code)}</span>
                          ))}
                        </div>
                      )}
                      {yearLuckResult.sky_merged?.length > 0 && (
                        <div className="result-merged">
                          {yearLuckResult.sky_merged.map((item, idx) => renderMergedItem(item, idx, 'year_luck_sky', selectedYearLuck.sky))}
                        </div>
                      )}
                      {yearLuckResult.sky_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-list">
                          {yearLuckResult.sky_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_sky', selectedYearLuck.sky))}
                        </div>
                      )}

                      {/* 대운 천간 성패 */}
                      {yearLuckResult.sky_decade_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">대운 천간</div>
                          <div className="outcome-list">
                            {yearLuckResult.sky_decade_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_sky', selectedYearLuck.sky))}
                          </div>
                        </div>
                      )}

                      {/* 년주 천간 성패 */}
                      {yearLuckResult.sky_year_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">년주 천간</div>
                          <div className="outcome-list">
                            {yearLuckResult.sky_year_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_sky', selectedYearLuck.sky))}
                          </div>
                        </div>
                      )}

                      {/* 월주 천간 성패 */}
                      {yearLuckResult.sky_month_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">월주 천간</div>
                          <div className="outcome-list">
                            {yearLuckResult.sky_month_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_sky', selectedYearLuck.sky))}
                          </div>
                        </div>
                      )}

                      {/* 시주 천간 성패 */}
                      {yearLuckResult.sky_time_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">시주 천간</div>
                          <div className="outcome-list">
                            {yearLuckResult.sky_time_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_sky', selectedYearLuck.sky))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 지지 성패 */}
                    <div className="result-group earth-group">
                      <div className="result-group-header">
                        <span className="group-label earth">지지 ({selectedYearLuck.earth})</span>
                      </div>
                      {yearLuckResult.earth_codes?.length > 0 && (
                        <div className="result-codes">
                          {yearLuckResult.earth_codes.map((code, idx) => (
                            <span key={idx} className="code-badge">{safeString(code)}</span>
                          ))}
                        </div>
                      )}
                      {yearLuckResult.earth_merged?.length > 0 && (
                        <div className="result-merged">
                          {yearLuckResult.earth_merged.map((item, idx) => renderMergedItem(item, idx, 'year_luck_earth', selectedYearLuck.earth))}
                        </div>
                      )}
                      {yearLuckResult.earth_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-list">
                          {yearLuckResult.earth_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_earth', selectedYearLuck.earth))}
                        </div>
                      )}

                      {/* 대운 지지 성패 */}
                      {yearLuckResult.earth_decade_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">대운 지지</div>
                          <div className="outcome-list">
                            {yearLuckResult.earth_decade_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_earth', selectedYearLuck.earth))}
                          </div>
                        </div>
                      )}

                      {/* 년지 성패 */}
                      {yearLuckResult.earth_year_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">년지</div>
                          <div className="outcome-list">
                            {yearLuckResult.earth_year_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_earth', selectedYearLuck.earth))}
                          </div>
                        </div>
                      )}

                      {/* 월지 성패 */}
                      {yearLuckResult.earth_month_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">월지</div>
                          <div className="outcome-list">
                            {yearLuckResult.earth_month_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_earth', selectedYearLuck.earth))}
                          </div>
                        </div>
                      )}

                      {/* 일지 성패 (배우자궁/연애운) */}
                      {yearLuckResult.earth_day_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section day-earth-section">
                          <div className="outcome-sub-title day-earth-title">일지 성패 (배우자궁)</div>
                          <div className="outcome-list">
                            {yearLuckResult.earth_day_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_earth', selectedYearLuck.earth))}
                          </div>
                        </div>
                      )}

                      {/* 시지 성패 */}
                      {yearLuckResult.earth_time_outcome?.filter(Boolean).length > 0 && (
                        <div className="outcome-sub-section">
                          <div className="outcome-sub-title">시지</div>
                          <div className="outcome-list">
                            {yearLuckResult.earth_time_outcome.map((outcome, idx) => renderOutcomeItem(outcome, idx, 'year_luck_earth', selectedYearLuck.earth))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="luck-empty">정보 없음</div>
            )}
          </div>
        </div>
      </div>

      {/* 수정 제안 모달 */}
      {suggestionData && (
        <GyeokgukSuggestionModal
          isOpen={suggestionModalOpen}
          onClose={() => {
            setSuggestionModalOpen(false);
            setSuggestionData(null);
          }}
          suggestionType={suggestionData.suggestionType}
          gyeokgukName={suggestionData.gyeokgukName}
          targetChar={suggestionData.targetChar}
          code={suggestionData.code}
          originalResult={suggestionData.originalResult}
          originalReason={suggestionData.originalReason}
          firstRoles={suggestionData.firstRoles}
          secondRoles={suggestionData.secondRoles}
          thirdRoles={suggestionData.thirdRoles}
          fourthRoles={suggestionData.fourthRoles}
          orderId={orderId}
          onSuccess={() => {
            // 성공 시 필요한 처리 (예: 알림)
          }}
        />
      )}
    </div>
  );
}

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // 사주 검증 상태
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [showValidation, setShowValidation] = useState(false);

  // 전체화면 미리보기 상태
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(0);
  const [reportChapters, setReportChapters] = useState([]);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);


  // 챕터1 상태
  const [chapter1Data, setChapter1Data] = useState(null);
  const [chapter1Loading, setChapter1Loading] = useState(false);
  const [chapter1Error, setChapter1Error] = useState(null);

  // 챕터2 상태
  const [chapter2Data, setChapter2Data] = useState(null);
  const [chapter2Loading, setChapter2Loading] = useState(false);
  const [chapter2Error, setChapter2Error] = useState(null);

  // 챕터3 상태 (대운 흐름 그래프)
  const [chapter3Data, setChapter3Data] = useState(null);
  const [chapter3Loading, setChapter3Loading] = useState(false);
  const [chapter3Error, setChapter3Error] = useState(null);
  const [chapter3Progress, setChapter3Progress] = useState(null); // { progress: 0-100, message: '...' }

  // 대운 해석 편집 상태 (격국/억부/조후)
  const [editingDecadeInterpretation, setEditingDecadeInterpretation] = useState(null); // { decadeIndex, area, ganji }
  const [decadeInterpretationText, setDecadeInterpretationText] = useState('');
  const [decadeInterpretationSaving, setDecadeInterpretationSaving] = useState(false);
  const [decadeAiGenerating, setDecadeAiGenerating] = useState(false);

  // 챕터4 상태 (5년운세 - 격국/억부/조후/합형충파해)
  const [fiveYearFortuneData, setFiveYearFortuneData] = useState(null);

  // 챕터5 상태 (재물운 5년)
  const [chapter4Data, setChapter4Data] = useState(null);
  const [chapter4Loading, setChapter4Loading] = useState(false);
  const [chapter4Error, setChapter4Error] = useState(null);
  const [fortuneEditorData, setFortuneEditorData] = useState([]);  // 재물운 편집 데이터
  const [fortuneBaseFortune, setFortuneBaseFortune] = useState(null);  // 기본 재물운 설명
  const [careerEditorData, setCareerEditorData] = useState([]);  // 직업운 편집 데이터
  const [careerBaseCareer, setCareerBaseCareer] = useState(null);  // 기본 직업운 설명

  // 챕터7 상태 (연애운/배우자운) - LoveFortuneEditor에서 관리
  const [loveFortuneData, setLoveFortuneData] = useState(null);

  // 챕터8 상태 (상담사 코칭) - CoachingEditor에서 관리
  const [coachingData, setCoachingData] = useState(null);

  // 비동기 생성 진행률 상태 (챕터 5, 6, 7, 8)
  const [fortuneProgress, setFortuneProgress] = useState(null); // { progress: 0-100, message: '...' }
  const [careerProgress, setCareerProgress] = useState(null);
  const [loveProgress, setLoveProgress] = useState(null);
  const [coachingProgress, setCoachingProgress] = useState(null);

  // Q&A 상태 (고객 질문 답변)
  const [qaAnswers, setQaAnswers] = useState([]);
  const [qaPolishing, setQaPolishing] = useState({}); // { index: true/false }
  const [savingQa, setSavingQa] = useState(false);

  // Chapter 10 Q&A 상태 (웹 프리뷰에서 받은 질문)
  const [chapter10Question, setChapter10Question] = useState(null); // { question, answer, status }
  const [chapter10Loading, setChapter10Loading] = useState(false);
  const [chapter10Answer, setChapter10Answer] = useState('');
  const [chapter10Submitting, setChapter10Submitting] = useState(false);

  // 챕터4, 5, 6, 7, 8 편집기 refs (전체 생성용)
  const fiveYearFortuneEditorRef = useRef(null);
  const fortuneEditorRef = useRef(null);
  const careerEditorRef = useRef(null);
  const loveFortuneEditorRef = useRef(null);
  const coachingEditorRef = useRef(null);
  const [regeneratingAllChapters, setRegeneratingAllChapters] = useState(false);

  // 명리학적 근거 상태 (각 챕터별)
  const [basis1Data, setBasis1Data] = useState(null);
  const [basis1Loading, setBasis1Loading] = useState(false);
  const [basis1Error, setBasis1Error] = useState(null);

  const [basis2Data, setBasis2Data] = useState(null);
  const [basis2Loading, setBasis2Loading] = useState(false);
  const [basis2Error, setBasis2Error] = useState(null);

  const [basis3Data, setBasis3Data] = useState(null);
  const [basis3Loading, setBasis3Loading] = useState(false);
  const [basis3Error, setBasis3Error] = useState(null);

  const [basis4Data, setBasis4Data] = useState(null);
  const [basis4Loading, setBasis4Loading] = useState(false);
  const [basis4Error, setBasis4Error] = useState(null);

  // PDF 다운로드 로딩 상태
  const [pdfLoading, setPdfLoading] = useState({});

  // 저장된 레포트 상태
  const [savedReport, setSavedReport] = useState(null);
  const [savedReportLoading, setSavedReportLoading] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [generatingChapter, setGeneratingChapter] = useState(null); // 현재 생성 중인 챕터 번호
  const [sendingReport, setSendingReport] = useState(false); // 레포트 발송 중

  // 종합 판정 계산 (Degree 우선, 없으면 result, 그 다음 score로 판단)
  const getOverallRating = (decade) => {
    // 0. Degree 필드가 있으면 최우선으로 사용
    if (decade.degree || decade.Degree) {
      const deg = (decade.degree || decade.Degree).toLowerCase();
      if (deg === 'excellent' || deg === '대길') return 'excellent';
      if (deg === 'good' || deg === '길') return 'good';
      if (deg === 'neutral' || deg === '보통') return 'neutral';
      if (deg === 'caution' || deg === '주의') return 'caution';
      if (deg === 'difficult' || deg === '흉') return 'difficult';
    }

    // 1. result 문자열로 판정
    const isGood = (result) => {
      if (!result || typeof result !== 'string') return false;
      return result === '成' || result === '성' ||
             result.includes('敗中有成') || result.includes('패중유성');
    };
    const isBad = (result) => {
      if (!result || typeof result !== 'string') return false;
      return result === '敗' || result === '패' ||
             result.includes('成中有敗') || result.includes('성중유패');
    };

    const skyGood = isGood(decade.sky_result);
    const skyBad = isBad(decade.sky_result);
    const earthGood = isGood(decade.earth_result);
    const earthBad = isBad(decade.earth_result);

    // 결과가 있으면 결과로 판정
    if (decade.sky_result || decade.earth_result) {
      if (skyGood && earthGood) return 'excellent';
      if (skyGood && !earthBad) return 'good';
      if (earthGood && !skyBad) return 'good';
      if (skyBad && earthBad) return 'difficult';
      if (skyBad || earthBad) return 'caution';
      if (skyGood || earthGood) return 'neutral';
    }

    // 2. score로 판정 (fallback)
    if (typeof decade.sky_score === 'number' && typeof decade.earth_score === 'number') {
      const totalScore = decade.sky_score + decade.earth_score;
      if (totalScore >= 3) return 'excellent';
      if (totalScore >= 1) return 'good';
      if (totalScore >= -1) return 'neutral';
      if (totalScore >= -3) return 'caution';
      return 'difficult';
    }

    return 'neutral';
  };

  const getOverallRatingClass = (decade) => `rating-${getOverallRating(decade)}`;

  const getOverallRatingText = (decade) => {
    const rating = getOverallRating(decade);
    switch (rating) {
      case 'excellent': return '◎ 대길';
      case 'good': return '○ 길';
      case 'neutral': return '△ 보통';
      case 'caution': return '▽ 주의';
      case 'difficult': return '✕ 흉';
      default: return '― 미정';
    }
  };

  // 개별 성패 판정 (천간/지지 각각) - Degree 우선, 없으면 result, 그 다음 score
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
      // 길: 成, 敗中有成 (결국 좋아짐)
      if (result === '成' || result === '성') return { class: 'good', text: '○ 길', icon: '○' };
      if (result.includes('敗中有成') || result.includes('패중유성')) return { class: 'good', text: '○ 길', icon: '○' };
      // 흉: 敗, 成中有敗 (결국 나빠짐)
      if (result === '敗' || result === '패') return { class: 'bad', text: '✕ 흉', icon: '✕' };
      if (result.includes('成中有敗') || result.includes('성중유패')) return { class: 'bad', text: '✕ 흉', icon: '✕' };
      // 보통: 성패공존
      if (result.includes('成敗共存') || result.includes('성패공존')) return { class: 'neutral', text: '△ 보통', icon: '△' };
    }

    // 2. score가 있으면 score로 판정
    if (typeof score === 'number') {
      if (score >= 1) return { class: 'good', text: '○ 길', icon: '○' };
      if (score > 0) return { class: 'neutral', text: '△ 보통', icon: '△' };
      if (score <= -1) return { class: 'bad', text: '✕ 흉', icon: '✕' };
      return { class: 'neutral', text: '△ 보통', icon: '△' };
    }

    return { class: 'neutral', text: '― 미정', icon: '―' };
  };

  // 위치 번역 함수
  const translatePositionForBasis = (position) => {
    const positionMap = {
      'year_luck_sky': '년운 천간',
      'decade_luck_sky': '대운 천간',
      'year_sky': '년간',
      'month_sky': '월간',
      'time_sky': '시간',
      'year_earth': '년지',
      'month_earth': '월지',
      'day_earth': '일지',
      'year_luck_earth': '년운 지지',
      'decade_luck_earth': '대운 지지',
      'time_earth': '시지',
      'type': '격국',
    };
    return positionMap[position] || position;
  };

  // 위치 배열을 한글로 변환
  const translatePositionsForBasis = (arr) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
    return arr.map(item => {
      if (typeof item === 'object' && item.name) return item.name;
      return translatePositionForBasis(String(item));
    }).join(', ');
  };

  // 역할 렌더링 함수
  const renderRolesForBasis = (roles) => {
    if (!roles) return null;

    const renderSingleRole = (role, idx) => {
      if (typeof role === 'string') {
        return <div key={idx} className="role-item"><span className="role-name-tag">{role}</span></div>;
      }
      if (typeof role === 'object' && role !== null) {
        const name = role.name || role.role;
        const reason = role.reason;
        return (
          <div key={idx} className="role-item">
            <span className="role-name-tag">{name || '-'}</span>
            {reason && <span className="role-reason-text">{reason}</span>}
          </div>
        );
      }
      return <div key={idx} className="role-item"><span className="role-name-tag">{String(role)}</span></div>;
    };

    // 배열인 경우
    if (Array.isArray(roles)) {
      if (roles.length === 0) return null;
      return <div className="roles-list">{roles.map((role, idx) => renderSingleRole(role, idx))}</div>;
    }
    // 객체인 경우
    if (typeof roles === 'object' && roles !== null) {
      return <div className="roles-list">{renderSingleRole(roles, 0)}</div>;
    }
    // 문자열인 경우
    return <div className="roles-list"><div className="role-item"><span className="role-name-tag">{String(roles)}</span></div></div>;
  };

  // Outcome 결과에 따른 스타일 클래스 결정
  const getOutcomeClassForBasis = (result) => {
    if (result === '성') return 'success';
    if (result === '패') return 'fail';
    if (result === '성중유패') return 'mixed-fail';
    if (result === '패중유성') return 'mixed-success';
    return '';
  };

  // Outcome 아이템 렌더링 함수 (basis4Data용)
  const renderOutcomeItemForBasis = (outcome, idx) => {
    if (!outcome) return null;
    return (
      <div key={idx} className={`outcome-item ${getOutcomeClassForBasis(outcome.result)}`}>
        <div className="outcome-main">
          <span className="outcome-result">{outcome.result || '-'}</span>
          <span className="outcome-code">{outcome.code || '-'}</span>
          {outcome.deep_level && <span className="outcome-level">Lv.{outcome.deep_level}</span>}
          {outcome.is_sanhe && <span className="outcome-sanhe">삼합</span>}
        </div>
        {outcome.reason && <div className="outcome-reason">{outcome.reason}</div>}
        <div className="outcome-key-values">
          {outcome.positions?.length > 0 && (
            <div className="kv-row"><span className="kv-key">위치:</span><span className="kv-value">{translatePositionsForBasis(outcome.positions)}</span></div>
          )}
          {outcome.chars?.length > 0 && (
            <div className="kv-row"><span className="kv-key">글자:</span><span className="kv-value">{outcome.chars.join(', ')}</span></div>
          )}
          {outcome.code && (
            <div className="kv-row"><span className="kv-key">코드:</span><span className="kv-value">{outcome.code}</span></div>
          )}
          {outcome.type_name && (
            <div className="kv-row"><span className="kv-key">격국 타입:</span><span className="kv-value">{outcome.type_name}</span></div>
          )}
          {outcome.first_roles && (
            <div className="kv-row"><span className="kv-key">1차 역할:</span><span className="kv-value">{renderRolesForBasis(outcome.first_roles)}</span></div>
          )}
          {outcome.second_roles && (
            <div className="kv-row"><span className="kv-key">2차 역할:</span><span className="kv-value">{renderRolesForBasis(outcome.second_roles)}</span></div>
          )}
          {outcome.third_roles && (
            <div className="kv-row"><span className="kv-key">3차 역할:</span><span className="kv-value">{renderRolesForBasis(outcome.third_roles)}</span></div>
          )}
          {outcome.fourth_roles && (
            <div className="kv-row"><span className="kv-key">4차 역할:</span><span className="kv-value">{renderRolesForBasis(outcome.fourth_roles)}</span></div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // 주문 로드 후 저장된 레포트 조회
  useEffect(() => {
    if (order) {
      fetchSavedReport();
      fetchChapter10Question(); // Chapter 10 Q&A 질문 조회
    }
  }, [order?.id]);

  // 주문 로드 후 Q&A 초기화
  useEffect(() => {
    if (order?.questions && Array.isArray(order.questions)) {
      // 빈 문자열이 아닌 실제 질문만 필터링
      const validQuestions = order.questions.filter(q => q && q.trim());
      if (validQuestions.length > 0) {
        // 기존 답변이 있으면 유지, 없으면 빈 문자열로 초기화
        const existingAnswers = order.qa_answers || [];
        const initialAnswers = validQuestions.map((q, idx) => ({
          question: q,
          answer: existingAnswers[idx]?.answer || ''
        }));
        setQaAnswers(initialAnswers);
      } else {
        setQaAnswers([]);
      }
    }
  }, [order?.id, order?.questions]);

  // Q&A 답변 변경 핸들러
  const handleQaAnswerChange = (idx, value) => {
    setQaAnswers(prev => prev.map((qa, i) =>
      i === idx ? { ...qa, answer: value } : qa
    ));
  };

  // Q&A 답변 AI 다듬기
  const polishQaAnswer = async (idx) => {
    const qa = qaAnswers[idx];
    if (!qa || !qa.answer.trim()) return;

    setQaPolishing(prev => ({ ...prev, [idx]: true }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/ai/polish-qa-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          question: qa.question,
          answer: qa.answer,
          order_id: order.id,
          customer_name: order.name
        })
      });

      if (!response.ok) {
        throw new Error('AI 다듬기에 실패했습니다.');
      }

      const data = await response.json();
      if (data.polished_answer) {
        setQaAnswers(prev => prev.map((item, i) =>
          i === idx ? { ...item, answer: data.polished_answer } : item
        ));
      }
    } catch (error) {
      console.error('AI 다듬기 오류:', error);
      alert('AI 다듬기 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setQaPolishing(prev => ({ ...prev, [idx]: false }));
    }
  };

  // Q&A 답변 저장
  const saveQaAnswers = async () => {
    setSavingQa(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${order.id}/qa-answers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          qa_answers: qaAnswers
        })
      });

      if (!response.ok) {
        throw new Error('Q&A 답변 저장에 실패했습니다.');
      }

      alert('Q&A 답변이 저장되었습니다.');
    } catch (error) {
      console.error('Q&A 저장 오류:', error);
      alert('Q&A 저장 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setSavingQa(false);
    }
  };

  // Chapter 10 Q&A: 질문 조회
  const fetchChapter10Question = async () => {
    setChapter10Loading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/question`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.has_question) {
          setChapter10Question({
            question: data.question,
            answer: data.answer,
            status: data.status
          });
          setChapter10Answer(data.answer?.content || '');
        } else {
          setChapter10Question(null);
        }
      }
    } catch (error) {
      console.error('Chapter 10 질문 조회 오류:', error);
    } finally {
      setChapter10Loading(false);
    }
  };

  // Chapter 10 Q&A: 답변 제출
  const submitChapter10Answer = async () => {
    if (!chapter10Answer.trim()) {
      alert('답변을 입력해주세요.');
      return;
    }

    setChapter10Submitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/answer_question`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({ answer: chapter10Answer })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '답변 제출에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        alert('답변이 성공적으로 저장되었습니다. 고객에게 이메일이 발송됩니다.');
        // 상태 업데이트
        setChapter10Question(prev => ({
          ...prev,
          answer: data.answer,
          status: 'answered'
        }));
      }
    } catch (error) {
      console.error('Chapter 10 답변 제출 오류:', error);
      alert('답변 제출 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setChapter10Submitting(false);
    }
  };

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      if (!response.ok) {
        throw new Error('주문 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    // 취소 시 확인
    if (newStatus === 'cancelled') {
      const confirmed = window.confirm('정말 이 주문을 취소하시겠습니까?\n취소된 주문은 레포트 제작이 불가능합니다.');
      if (!confirmed) return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({ order: { status: newStatus } })
      });

      if (!response.ok) {
        throw new Error('상태 업데이트에 실패했습니다.');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const validateSaju = async () => {
    setValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/validate_saju`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '사주 검증에 실패했습니다.');
      }

      setValidationResult(data);
      setShowValidation(true);
    } catch (err) {
      setValidationError(err.message);
      setShowValidation(true);
    } finally {
      setValidating(false);
    }
  };

  // 챕터1 명리학적 근거 조회 API 호출
  const fetchBasis1 = async () => {
    setBasis1Loading(true);
    setBasis1Error(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/basis_chapter1`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '챕터1 근거 조회에 실패했습니다.');
      }

      setBasis1Data(data.basis);
    } catch (err) {
      setBasis1Error(err.message);
    } finally {
      setBasis1Loading(false);
    }
  };

  // 챕터2 명리학적 근거 조회 API 호출
  const fetchBasis2 = async () => {
    setBasis2Loading(true);
    setBasis2Error(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/basis_chapter2`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '챕터2 근거 조회에 실패했습니다.');
      }

      setBasis2Data(data.basis);
    } catch (err) {
      setBasis2Error(err.message);
    } finally {
      setBasis2Loading(false);
    }
  };

  // 챕터3 명리학적 근거 조회 API 호출
  const fetchBasis3 = async () => {
    setBasis3Loading(true);
    setBasis3Error(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/basis_chapter3`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '챕터3 근거 조회에 실패했습니다.');
      }

      setBasis3Data(data.basis);
    } catch (err) {
      setBasis3Error(err.message);
    } finally {
      setBasis3Loading(false);
    }
  };

  // 챕터4 명리학적 근거 조회 API 호출
  const fetchBasis4 = async () => {
    setBasis4Loading(true);
    setBasis4Error(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/basis_chapter4`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '챕터4 근거 조회에 실패했습니다.');
      }

      setBasis4Data(data.basis);
    } catch (err) {
      setBasis4Error(err.message);
    } finally {
      setBasis4Loading(false);
    }
  };

  // 챕터1 생성 API 호출
  const generateChapter1 = async () => {
    setChapter1Loading(true);
    setChapter1Error(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '챕터1 생성에 실패했습니다.');
      }

      setChapter1Data(data.chapter);

      // 생성 후 즉시 DB에 저장 (chapter2 = 아이덴티티)
      if (data.chapter?.content) {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_chapter_to_report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            chapter_number: 2,  // 아이덴티티는 chapter2
            content: data.chapter.content,
            basis: data.chapter.basis || basis1Data
          })
        });
        console.log('[generateChapter1] 챕터2(아이덴티티) DB 저장 완료');
      }
    } catch (err) {
      setChapter1Error(err.message);
    } finally {
      setChapter1Loading(false);
    }
  };

  // 챕터2 생성 API 호출
  const generateChapter2 = async () => {
    setChapter2Loading(true);
    setChapter2Error(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '챕터2 생성에 실패했습니다.');
      }

      setChapter2Data(data.chapter);

      // 생성 후 즉시 DB에 저장 (chapter3 = 잠재력)
      if (data.chapter?.content) {
        await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_chapter_to_report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            chapter_number: 3,  // 잠재력은 chapter3
            content: data.chapter.content,
            basis: data.chapter.basis || basis2Data
          })
        });
        console.log('[generateChapter2] 챕터3(잠재력) DB 저장 완료');
      }
    } catch (err) {
      setChapter2Error(err.message);
    } finally {
      setChapter2Loading(false);
    }
  };

  // 챕터3 생성 API 호출 (대운 흐름 그래프) - 비동기 방식
  const generateChapter3 = async () => {
    setChapter3Loading(true);
    setChapter3Error(null);
    setChapter3Progress({ progress: 0, message: '작업 시작 중...' });

    const asyncApiUrl = `${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter3_async`;
    console.log('[generateChapter3] 비동기 요청 시작:', asyncApiUrl);

    try {
      // 1. 비동기 작업 시작
      const startResponse = await fetch(asyncApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`서버 에러 (${startResponse.status}): ${errorText || '알 수 없는 오류'}`);
      }

      const startData = await startResponse.json();
      if (!startData.success) {
        throw new Error(startData.error || '작업 시작에 실패했습니다.');
      }

      const jobId = startData.job_id;
      console.log('[generateChapter3] Job 시작됨:', jobId);

      // 2. 폴링으로 상태 확인 (최대 10분)
      const maxPollingTime = 600000; // 10분
      const pollingInterval = 2000; // 2초
      const startTime = Date.now();

      while (Date.now() - startTime < maxPollingTime) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));

        const statusResponse = await fetch(
          `${API_BASE_URL}/api/v1/admin/orders/${id}/chapter3_job_status?job_id=${jobId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Saju-Authorization': `Bearer-${API_TOKEN}`
            }
          }
        );

        const statusData = await statusResponse.json();
        console.log('[generateChapter3] 상태 확인:', statusData.status, statusData.progress);

        // 진행률 업데이트
        if (statusData.progress !== undefined) {
          setChapter3Progress({
            progress: statusData.progress,
            message: statusData.message || '처리 중...'
          });
        }

        if (statusData.status === 'completed') {
          console.log('[generateChapter3] 작업 완료');
          setChapter3Data(statusData.chapter);

          // 생성 후 즉시 DB에 저장 (chapter4 = 대운흐름)
          if (statusData.chapter?.content || statusData.chapter?.decade_flow) {
            const basisWithDecadeFlow = {
              ...(statusData.chapter.basis || basis3Data || {}),
              decade_flow: statusData.chapter.decade_flow
            };
            await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_chapter_to_report`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Saju-Authorization': `Bearer-${API_TOKEN}`
              },
              body: JSON.stringify({
                chapter_number: 4,
                content: statusData.chapter.content,
                basis: basisWithDecadeFlow
              })
            });
            console.log('[generateChapter3] 챕터4(대운흐름) DB 저장 완료');
          }

          return statusData.chapter;
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.error || '챕터3 생성에 실패했습니다.');
        }
      }

      throw new Error('작업 시간이 초과되었습니다. 다시 시도해주세요.');
    } catch (err) {
      console.error('[generateChapter3] 에러:', err.message);

      if (err.message === 'Failed to fetch') {
        setChapter3Error(`네트워크 오류: 서버에 연결할 수 없습니다.`);
      } else {
        setChapter3Error(err.message || '알 수 없는 오류가 발생했습니다.');
      }
      throw err;
    } finally {
      setChapter3Loading(false);
      setChapter3Progress(null);
    }
  };

  // 챕터3 생성 및 자동 저장
  const generateChapter3WithAutoSave = async () => {
    try {
      const ch3Data = await generateChapter3();

      // 자동 저장
      if (ch3Data) {
        await saveFullReportWithData(chapter1Data, chapter2Data, ch3Data, fiveYearFortuneData, loveFortuneData);
      }
    } catch (err) {
      console.error('챕터3 생성 및 저장 실패:', err);
    }
  };

  // 대운 해석 편집 시작
  const startEditingDecadeInterpretation = (decadeIndex, area, ganji, currentText) => {
    setEditingDecadeInterpretation({ decadeIndex, area, ganji });
    setDecadeInterpretationText(currentText || '');
  };

  // 대운 해석 편집 취소
  const cancelEditingDecadeInterpretation = () => {
    setEditingDecadeInterpretation(null);
    setDecadeInterpretationText('');
  };

  // 대운 해석 저장
  const saveDecadeInterpretation = async (useFinal = false, text = null) => {
    if (!editingDecadeInterpretation) return;

    const interpretationText = text !== null ? text : decadeInterpretationText;

    setDecadeInterpretationSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/update_decade_interpretation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          decade_index: editingDecadeInterpretation.decadeIndex,
          ganji: editingDecadeInterpretation.ganji,
          analysis_area: editingDecadeInterpretation.area,
          primary_interpretation: useFinal ? undefined : interpretationText,
          final_interpretation: useFinal ? interpretationText : undefined,
          use_ai_for_final: false
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '해석 저장에 실패했습니다.');
      }

      // chapter3Data 업데이트
      if (chapter3Data?.decade_flow) {
        const updatedDecadeFlow = chapter3Data.decade_flow.map((decade, idx) => {
          if (idx === editingDecadeInterpretation.decadeIndex) {
            const area = editingDecadeInterpretation.area;

            // 천간/지지 격국은 sky_analysis/earth_analysis 직접 업데이트
            if (area === 'gyeokguk_sky') {
              return {
                ...decade,
                sky_analysis: data.interpretation.effective_interpretation,
                has_custom_interpretation: true
              };
            } else if (area === 'gyeokguk_earth') {
              return {
                ...decade,
                earth_analysis: data.interpretation.effective_interpretation,
                has_custom_interpretation: true
              };
            }

            // 억부/조후 등은 기존 방식
            return {
              ...decade,
              interpretations: {
                ...decade.interpretations,
                [area]: data.interpretation
              },
              has_custom_interpretation: true
            };
          }
          return decade;
        });
        setChapter3Data({
          ...chapter3Data,
          decade_flow: updatedDecadeFlow
        });
      }

      cancelEditingDecadeInterpretation();
      alert('해석이 저장되었습니다.');
    } catch (err) {
      console.error('해석 저장 실패:', err);
      alert(err.message);
    } finally {
      setDecadeInterpretationSaving(false);
    }
  };

  // AI로 해석 재작성
  const regenerateDecadeInterpretationWithAi = async (text = null) => {
    const interpretationText = text !== null ? text : decadeInterpretationText;

    if (!editingDecadeInterpretation || !interpretationText.trim()) {
      alert('1차 해석을 먼저 입력해주세요.');
      return;
    }

    setDecadeAiGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_decade_interpretation_ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          decade_index: editingDecadeInterpretation.decadeIndex,
          ganji: editingDecadeInterpretation.ganji,
          analysis_area: editingDecadeInterpretation.area,
          primary_interpretation: interpretationText
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI 해석 생성에 실패했습니다.');
      }

      // chapter3Data 업데이트
      if (chapter3Data?.decade_flow) {
        const area = editingDecadeInterpretation.area;
        const updatedDecadeFlow = chapter3Data.decade_flow.map((decade, idx) => {
          if (idx === editingDecadeInterpretation.decadeIndex) {
            // 천간/지지 격국은 sky_analysis/earth_analysis 직접 업데이트
            if (area === 'gyeokguk_sky') {
              return {
                ...decade,
                sky_analysis: data.interpretation.effective_interpretation || data.interpretation.final_interpretation,
                has_custom_interpretation: true
              };
            } else if (area === 'gyeokguk_earth') {
              return {
                ...decade,
                earth_analysis: data.interpretation.effective_interpretation || data.interpretation.final_interpretation,
                has_custom_interpretation: true
              };
            }
            return {
              ...decade,
              interpretations: {
                ...decade.interpretations,
                [area]: data.interpretation
              },
              has_custom_interpretation: true
            };
          }
          return decade;
        });
        setChapter3Data({
          ...chapter3Data,
          decade_flow: updatedDecadeFlow
        });
      }

      // 편집 종료 (새로운 결과 확인을 위해)
      setEditingDecadeInterpretation(null);
      alert('AI가 해석을 재작성했습니다. 수정 버튼을 눌러 결과를 확인하세요.');
    } catch (err) {
      console.error('AI 해석 생성 실패:', err);
      alert(err.message);
    } finally {
      setDecadeAiGenerating(false);
    }
  };

  // 영역 라벨 매핑
  const AREA_LABELS = {
    gyeokguk: '격국',
    eokbu: '억부',
    johu: '조후'
  };

  // 챕터4 생성 API 호출 (현재 대운 운세)
  const generateChapter4 = async () => {
    setChapter4Loading(true);
    setChapter4Error(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter4`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '챕터4 생성에 실패했습니다.');
      }

      setChapter4Data(data.chapter);
    } catch (err) {
      setChapter4Error(err.message);
    } finally {
      setChapter4Loading(false);
    }
  };

  // 비동기 Job 폴링 헬퍼 함수
  const pollJobStatus = async (jobId, setProgress, maxPollingTime = 600000) => {
    const pollingInterval = 2000; // 2초
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollingTime) {
      await new Promise(resolve => setTimeout(resolve, pollingInterval));

      const statusResponse = await fetch(
        `${API_BASE_URL}/api/v1/admin/orders/${id}/job_status/${jobId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          }
        }
      );

      const statusData = await statusResponse.json();
      console.log(`[pollJobStatus] Job ${jobId} 상태:`, statusData.status, statusData.progress);

      // 진행률 업데이트
      if (statusData.progress !== undefined && setProgress) {
        setProgress({
          progress: statusData.progress,
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

  // 비동기 챕터 생성 시작 함수
  const startAsyncJob = async (chapterType, options = {}) => {
    const startResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Saju-Authorization': `Bearer-${API_TOKEN}`
      },
      body: JSON.stringify({ chapter_type: chapterType, options })
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      throw new Error(`서버 에러 (${startResponse.status}): ${errorText || '알 수 없는 오류'}`);
    }

    const startData = await startResponse.json();
    if (!startData.success) {
      throw new Error(startData.error || '작업 시작에 실패했습니다.');
    }

    return startData.job_id;
  };

  // 챕터 4, 5, 6, 7 전체 생성 (재물운, 직업운, 연애운, 코칭) - 비동기 방식
  const handleRegenerateAllChapters = async () => {
    if (!validationResult) {
      alert('먼저 사주 검증을 실행해주세요.');
      return;
    }

    // 연도 수 결정 (blueprint_lite는 3년, 나머지는 5년)
    const yearCount = order?.report_type === 'blueprint_lite' ? 3 : 5;

    setRegeneratingAllChapters(true);
    // 초기 진행률 설정
    setFortuneProgress({ progress: 0, message: '대기 중...' });
    setCareerProgress({ progress: 0, message: '대기 중...' });
    setLoveProgress({ progress: 0, message: '대기 중...' });
    setCoachingProgress({ progress: 0, message: '대기 중...' });

    try {
      const results = [];

      // 재물운 - 동기 생성
      try {
        setFortuneProgress({ progress: 50, message: '재물운 생성 중...' });
        console.log('[handleRegenerateAllChapters] 재물운 동기 생성 시작');

        const fortuneRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_fortune_all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
          body: JSON.stringify({ year_count: yearCount })
        });
        const fortuneData = await fortuneRes.json();

        if (fortuneRes.ok && fortuneData.fortunes) {
          const yearlyFortunes = Object.entries(fortuneData.fortunes).map(([year, fortune]) => ({
            year: parseInt(year),
            ...fortune
          })).sort((a, b) => a.year - b.year);

          setFortuneEditorData(yearlyFortunes);

          // 재물운 저장
          await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_fortune`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({
              fortune_data: {
                baseFortune: {},
                yearlyFortunes: yearlyFortunes
              }
            })
          });
          results.push('재물운 ✓');
        } else {
          results.push(`재물운 ✗ (${fortuneData.error || '생성 실패'})`);
        }
      } catch (err) {
        results.push('재물운 ✗');
        console.error('재물운 생성 실패:', err);
      } finally {
        setFortuneProgress(null);
      }

      // 직업운 - 동기 생성
      try {
        setCareerProgress({ progress: 50, message: '직업운 생성 중...' });
        console.log('[handleRegenerateAllChapters] 직업운 동기 생성 시작');

        const careerRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_career_all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
          body: JSON.stringify({ year_count: yearCount })
        });
        const careerData = await careerRes.json();

        if (careerRes.ok && careerData.careers) {
          const yearlyCareers = Object.entries(careerData.careers).map(([year, career]) => ({
            year: parseInt(year),
            ...career
          })).sort((a, b) => a.year - b.year);

          setCareerEditorData(yearlyCareers);

          // 직업운 저장
          await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_career`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({
              career_data: {
                baseCareer: {},
                yearlyCareers: yearlyCareers
              }
            })
          });
          results.push('직업운 ✓');
        } else {
          results.push(`직업운 ✗ (${careerData.error || '생성 실패'})`);
        }
      } catch (err) {
        results.push('직업운 ✗');
        console.error('직업운 생성 실패:', err);
      } finally {
        setCareerProgress(null);
      }

      // 연애운 - 동기 생성
      try {
        setLoveProgress({ progress: 50, message: '연애운 생성 중...' });
        console.log('[handleRegenerateAllChapters] 연애운 동기 생성 시작');

        const loveRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_love_fortune`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
          body: JSON.stringify({ year_count: yearCount })
        });
        const loveData = await loveRes.json();

        if (loveRes.ok && loveData.success) {
          const loveFortuneResult = {
            baseAnalysis: {},
            yearlyLoveFortunes: loveData.yearly_love_fortunes || [{
              year: new Date().getFullYear(),
              generated_content: loveData.content || ''
            }]
          };
          setLoveFortuneData(loveFortuneResult);

          // 연애운 저장
          await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_love_fortune`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({ love_fortune_data: loveFortuneResult })
          });
          results.push('연애운 ✓');
        } else {
          results.push(`연애운 ✗ (${loveData.error || '생성 실패'})`);
        }
      } catch (err) {
        results.push('연애운 ✗');
        console.error('연애운 생성 실패:', err);
      } finally {
        setLoveProgress(null);
      }

      // 코칭 - 동기 생성
      try {
        setCoachingProgress({ progress: 50, message: '코칭 생성 중...' });
        console.log('[handleRegenerateAllChapters] 코칭 동기 생성 시작');

        const coachingRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_coaching`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
          body: JSON.stringify({})
        });
        const coachingData = await coachingRes.json();

        if (coachingRes.ok && coachingData.success) {
          const coachingItems = coachingData.coaching_items || [];
          setCoachingData(coachingItems);

          // 코칭 저장
          await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_coaching`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({ coaching_items: coachingItems })
          });
          results.push('코칭 ✓');
        } else {
          results.push(`코칭 ✗ (${coachingData.error || '생성 실패'})`);
        }
      } catch (err) {
        results.push('코칭 ✗');
        console.error('코칭 생성 실패:', err);
      } finally {
        setCoachingProgress(null);
      }

      // 생성 완료 후 데이터 새로고침
      await fetchSavedReport();
      alert(`전체 생성 완료!\n${results.join('\n')}`);
    } catch (err) {
      console.error('전체 생성 실패:', err);
      alert(`전체 생성 실패: ${err.message}`);
    } finally {
      setRegeneratingAllChapters(false);
    }
  };

  // 생성안된 챕터만 다시생성
  const handleRegenerateMissingChapters = async () => {
    if (!validationResult) {
      alert('먼저 사주 검증을 실행해주세요.');
      return;
    }

    const yearCount = order?.report_type === 'blueprint_lite' ? 3 : 5;
    const missingChapters = [];

    // 누락된 챕터 확인 (실제 콘텐츠가 있는지 체크)
    if (!chapter1Data?.content) missingChapters.push('chapter1');
    if (!chapter2Data?.content) missingChapters.push('chapter2');
    if (!chapter3Data?.content && !chapter3Data?.decade_flow) missingChapters.push('chapter3');
    if (!fiveYearFortuneData?.content && (!fiveYearFortuneData?.years || fiveYearFortuneData.years.length === 0)) missingChapters.push('chapter4');

    // 재물운 - 실제 generated_content가 있는지 확인
    const hasFortuneContent = fortuneEditorData && fortuneEditorData.length > 0 &&
      fortuneEditorData.some(item => item.generated_content && item.generated_content.trim().length > 0);
    if (!hasFortuneContent) missingChapters.push('fortune');

    // 직업운 - 실제 generated_content가 있는지 확인
    const hasCareerContent = careerEditorData && careerEditorData.length > 0 &&
      careerEditorData.some(item => item.generated_content && item.generated_content.trim().length > 0);
    if (!hasCareerContent) missingChapters.push('career');

    // 연애운 - 실제 generated_content가 있는지 확인
    const hasLoveContent = loveFortuneData?.yearlyLoveFortunes && loveFortuneData.yearlyLoveFortunes.length > 0 &&
      loveFortuneData.yearlyLoveFortunes.some(item => item.generated_content && item.generated_content.trim().length > 0);
    if (!hasLoveContent) missingChapters.push('love');

    // 코칭 - 실제 content가 있는지 확인
    const hasCoachingContent = coachingData && coachingData.length > 0 &&
      coachingData.some(item => item.content && item.content.trim().length > 0);
    if (!hasCoachingContent) missingChapters.push('coaching');

    console.log('[handleRegenerateMissingChapters] 누락 체크:', {
      chapter1: !chapter1Data?.content,
      chapter2: !chapter2Data?.content,
      chapter3: !chapter3Data?.content && !chapter3Data?.decade_flow,
      chapter4: !fiveYearFortuneData?.content && (!fiveYearFortuneData?.years || fiveYearFortuneData.years.length === 0),
      fortune: !hasFortuneContent,
      career: !hasCareerContent,
      love: !hasLoveContent,
      coaching: !hasCoachingContent,
      coachingData: coachingData
    });

    if (missingChapters.length === 0) {
      alert('모든 챕터가 이미 생성되어 있습니다.');
      return;
    }

    if (!confirm(`다음 챕터를 생성합니다:\n${missingChapters.join(', ')}\n\n진행하시겠습니까?`)) {
      return;
    }

    setRegeneratingAllChapters(true);
    const results = [];

    try {
      // 챕터1 (아이덴티티) 생성
      if (missingChapters.includes('chapter1')) {
        setGeneratingChapter(1);
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setChapter1Data(data.chapter);
            results.push('아이덴티티 ✓');
          } else {
            results.push(`아이덴티티 ✗`);
          }
        } catch (err) {
          results.push('아이덴티티 ✗');
          console.error('챕터1 생성 실패:', err);
        }
      }

      // 챕터2 (잠재력) 생성
      if (missingChapters.includes('chapter2')) {
        setGeneratingChapter(2);
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setChapter2Data(data.chapter);
            results.push('잠재력 ✓');
          } else {
            results.push(`잠재력 ✗`);
          }
        } catch (err) {
          results.push('잠재력 ✗');
          console.error('챕터2 생성 실패:', err);
        }
      }

      // 챕터3 (대운흐름) 생성
      if (missingChapters.includes('chapter3')) {
        setGeneratingChapter(3);
        setChapter3Progress({ progress: 50, message: '대운흐름 생성 중...' });
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setChapter3Data(data.chapter);
            results.push('대운흐름 ✓');
          } else {
            results.push(`대운흐름 ✗`);
          }
        } catch (err) {
          results.push('대운흐름 ✗');
          console.error('챕터3 생성 실패:', err);
        } finally {
          setChapter3Progress(null);
        }
      }

      // 챕터4 (5년운세) 생성
      if (missingChapters.includes('chapter4')) {
        setGeneratingChapter(4);
        try {
          const dataRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/five_year_fortune_data?year_count=${yearCount}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
          });
          const baseData = await dataRes.json();
          if (dataRes.ok && baseData.data?.years) {
            setFiveYearFortuneData(baseData.data);
            results.push(`${yearCount}년운세 ✓`);
          } else {
            results.push(`${yearCount}년운세 ✗`);
          }
        } catch (err) {
          results.push(`${yearCount}년운세 ✗`);
          console.error('챕터4 생성 실패:', err);
        }
      }

      // 재물운 생성
      if (missingChapters.includes('fortune')) {
        setGeneratingChapter(5);
        setFortuneProgress({ progress: 50, message: '재물운 생성 중...' });
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_fortune_all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({ year_count: yearCount })
          });
          const data = await res.json();
          if (res.ok && data.fortunes) {
            const yearlyFortunes = Object.entries(data.fortunes).map(([year, fortune]) => ({
              year: parseInt(year),
              ...fortune
            })).sort((a, b) => a.year - b.year);
            setFortuneEditorData(yearlyFortunes);
            await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_fortune`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
              body: JSON.stringify({ fortune_data: { baseFortune: {}, yearlyFortunes } })
            });
            results.push('재물운 ✓');
          } else {
            results.push('재물운 ✗');
          }
        } catch (err) {
          results.push('재물운 ✗');
          console.error('재물운 생성 실패:', err);
        } finally {
          setFortuneProgress(null);
        }
      }

      // 직업운 생성
      if (missingChapters.includes('career')) {
        setGeneratingChapter(6);
        setCareerProgress({ progress: 50, message: '직업운 생성 중...' });
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_career_all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({ year_count: yearCount })
          });
          const data = await res.json();
          if (res.ok && data.careers) {
            const yearlyCareers = Object.entries(data.careers).map(([year, career]) => ({
              year: parseInt(year),
              ...career
            })).sort((a, b) => a.year - b.year);
            setCareerEditorData(yearlyCareers);
            await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_career`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
              body: JSON.stringify({ career_data: { baseCareer: {}, yearlyCareers } })
            });
            results.push('직업운 ✓');
          } else {
            results.push('직업운 ✗');
          }
        } catch (err) {
          results.push('직업운 ✗');
          console.error('직업운 생성 실패:', err);
        } finally {
          setCareerProgress(null);
        }
      }

      // 연애운 생성
      if (missingChapters.includes('love')) {
        setGeneratingChapter(7);
        setLoveProgress({ progress: 50, message: '연애운 생성 중...' });
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_love_fortune`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({ year_count: yearCount })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            const loveResult = {
              baseAnalysis: {},
              yearlyLoveFortunes: data.yearly_love_fortunes || [{ year: new Date().getFullYear(), generated_content: data.content || '' }]
            };
            setLoveFortuneData(loveResult);
            await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_love_fortune`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
              body: JSON.stringify({ love_fortune_data: loveResult })
            });
            results.push('연애운 ✓');
          } else {
            results.push('연애운 ✗');
          }
        } catch (err) {
          results.push('연애운 ✗');
          console.error('연애운 생성 실패:', err);
        } finally {
          setLoveProgress(null);
        }
      }

      // 코칭 생성
      if (missingChapters.includes('coaching')) {
        setGeneratingChapter(8);
        setCoachingProgress({ progress: 50, message: '코칭 생성 중...' });
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_coaching`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({})
          });
          const data = await res.json();
          if (res.ok && data.success) {
            const coachingItems = data.coaching_items || [];
            setCoachingData(coachingItems);
            await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_coaching`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
              body: JSON.stringify({ coaching_items: coachingItems })
            });
            results.push('코칭 ✓');
          } else {
            results.push('코칭 ✗');
          }
        } catch (err) {
          results.push('코칭 ✗');
          console.error('코칭 생성 실패:', err);
        } finally {
          setCoachingProgress(null);
        }
      }

      // 생성 완료 후 데이터 새로고침
      await fetchSavedReport();

      alert(`누락 챕터 생성 완료!\n${results.join('\n')}`);
    } catch (err) {
      console.error('누락 챕터 생성 실패:', err);
      alert(`생성 실패: ${err.message}`);
    } finally {
      setRegeneratingAllChapters(false);
      setGeneratingChapter(null);
    }
  };

  // 레포트 챕터 설정 - 번호와 라벨 포함
  const getReportChapters = (reportType) => {
    const currentYear = new Date().getFullYear();
    // 연도 수 결정 (blueprint_lite는 3년, 나머지는 5년)
    const yearCount = reportType === 'blueprint_lite' ? 3 : 5;

    // 공통 챕터 정의 (번호, 라벨 포함) - 기본정보가 1번, 아이덴티티가 2번부터 시작
    const baseChapter = { id: 'saju_info', number: 1, label: '기본정보', title: '사주정보', icon: '📋', category: 'info' };
    const chapter1 = { id: 'chapter1', number: 2, label: '아이덴티티', title: '나의 아이덴티티', icon: '🧭', category: 'analysis' };
    const chapter2 = { id: 'chapter2', number: 3, label: '잠재력', title: '나의 잠재력과 사회적 역할', icon: '🏛️', category: 'analysis' };
    const chapter3 = { id: 'chapter3', number: 4, label: '대운흐름', title: '대운 흐름 분석', icon: '📊', category: 'luck' };
    const chapter4 = { id: 'chapter4', number: 5, label: `${yearCount}개년운세`, title: `향후 ${yearCount}년간의 운세`, icon: '🔮', category: 'luck' };
    const chapter5 = { id: 'chapter5', number: 6, label: '재물운', title: `재물운 (향후 ${yearCount}년)`, icon: '💰', category: 'luck' };
    const chapter6 = { id: 'chapter6', number: 7, label: '직업운', title: `직업운/사회운 (향후 ${yearCount}년)`, icon: '💼', category: 'luck' };
    const chapter7 = { id: 'chapter7', number: 8, label: '연애운', title: `연애운/배우자운 (향후 ${yearCount}년)`, icon: '💕', category: 'luck' };
    const chapter8 = { id: 'chapter8', number: 9, label: '코칭', title: '상담사의 코칭', icon: '💬', category: 'coaching' };

    switch (reportType) {
      case 'new_year':
        return [
          baseChapter,
          chapter1,
          chapter2,
          chapter3,
          chapter4,
          chapter5,
          chapter6,
          chapter7,
          chapter8,
          { id: 'year_meaning', number: 10, label: '해의의미', title: `${currentYear}년의 의미`, icon: '🎯', category: 'yearly' },
          { id: 'seasonal', number: 11, label: '계절운세', title: '계절별 운세', icon: '🌸', category: 'yearly' },
          { id: 'total', number: 12, label: '총운', title: `${currentYear}년 총운`, icon: '⭐', category: 'yearly' },
          { id: 'fortune', number: 13, label: '재물', title: `${currentYear}년 재물운`, icon: '💰', category: 'detail' },
          { id: 'career', number: 14, label: '직장/사업', title: `${currentYear}년 직장/사업운`, icon: '💼', category: 'detail' },
          { id: 'love', number: 15, label: '연애', title: `${currentYear}년 연애운`, icon: '💕', category: 'detail' },
          { id: 'interpersonal', number: 16, label: '대인관계', title: `${currentYear}년 대인관계운`, icon: '🤝', category: 'detail' },
          { id: 'monthly', number: 17, label: '월운', title: `${currentYear}년 월운`, icon: '📅', category: 'detail' },
        ];
      case 'love':
        return [
          baseChapter,
          chapter1,
          chapter2,
          chapter3,
          chapter4,
          chapter5,
          chapter6,
          chapter7,
          chapter8,
          { id: 'love_style', number: 10, label: '연애스타일', title: '연애 스타일', icon: '💕', category: 'detail' },
          { id: 'ideal_type', number: 11, label: '이상형', title: '이상형 분석', icon: '👤', category: 'detail' },
          { id: 'love_luck', number: 12, label: '연애운', title: '연애운 분석', icon: '💘', category: 'detail' },
          { id: 'compatibility', number: 13, label: '궁합', title: '궁합 포인트', icon: '💑', category: 'detail' },
        ];
      case 'wealth':
        return [
          baseChapter,
          chapter1,
          chapter2,
          chapter3,
          chapter4,
          chapter5,
          chapter6,
          chapter7,
          chapter8,
          { id: 'wealth_type', number: 10, label: '재물유형', title: '재물 유형', icon: '💎', category: 'detail' },
          { id: 'fortune_luck', number: 11, label: '재물운', title: '재물운 분석', icon: '💰', category: 'detail' },
          { id: 'investment', number: 12, label: '투자', title: '투자 성향', icon: '📈', category: 'detail' },
          { id: 'advice', number: 13, label: '조언', title: '재물 조언', icon: '💡', category: 'detail' },
        ];
      case 'career':
        return [
          baseChapter,
          chapter1,
          chapter2,
          chapter3,
          chapter4,
          chapter5,
          chapter6,
          chapter7,
          chapter8,
          { id: 'career_type', number: 10, label: '직업적성', title: '직업 적성', icon: '🎯', category: 'detail' },
          { id: 'career_luck', number: 11, label: '직업운상세', title: '직업운 분석', icon: '💼', category: 'detail' },
          { id: 'suitable_jobs', number: 12, label: '적합직종', title: '적합 직종', icon: '📋', category: 'detail' },
          { id: 'advice', number: 13, label: '조언', title: '커리어 조언', icon: '💡', category: 'detail' },
        ];
      case 'blueprint':
      case 'blueprint_lite':
        return [
          baseChapter,
          chapter1,
          chapter2,
          chapter3,
          chapter4,
          chapter5,
          chapter6,
          chapter7,
          chapter8,
          { id: 'chapter_qa', number: 10, label: 'Q&A', title: '고객 질문 답변', icon: '❓', category: 'qa' },
        ];
      default:
        return [
          baseChapter,
          chapter1,
          chapter2,
          chapter3,
          chapter4,
          chapter5,
          chapter6,
          chapter7,
          chapter8,
        ];
    }
  };

  // 전체화면 미리보기 열기
  const openFullPreview = async () => {
    // 먼저 사주 검증이 안 되어있으면 검증 먼저
    if (!validationResult) {
      setValidating(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/validate_saju`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          }
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setValidationResult(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setValidating(false);
      }
    }

    // 레포트 챕터 설정 (Q&A 챕터는 항상 표시 - Chapter 10 질문 여부는 내부에서 처리)
    let chapters = getReportChapters(order.report_type);
    setReportChapters(chapters);
    setSelectedChapter(0);
    setShowFullPreview(true);

    // 저장된 레포트가 있는지 확인
    fetchSavedReport();
  };

  // 저장된 레포트 조회
  const fetchSavedReport = async () => {
    setSavedReportLoading(true);
    try {
      console.log('[fetchSavedReport] Fetching report for order:', id);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/report_output`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();
      console.log('[fetchSavedReport] Response:', { ok: response.ok, success: data.success, hasReportOutput: !!data.report_output, data });

      if (response.ok && data.success && data.report_output) {
        console.log('[fetchSavedReport] Setting savedReport with secure_token:', data.report_output.secure_token);
        setSavedReport(data.report_output);

        // 저장된 데이터로 챕터 상태 복원 (챕터 번호 +1: 기본정보가 1번)
        // chapter2 = 아이덴티티, chapter3 = 잠재력, chapter4 = 대운흐름, chapter5 = 5년운세
        if (data.report_output.chapter2_content) {
          setChapter1Data({
            content: data.report_output.chapter2_content,
            basis: data.report_output.chapter2_basis
          });
          setBasis1Data(data.report_output.chapter2_basis);
        }
        if (data.report_output.chapter3_content) {
          setChapter2Data({
            content: data.report_output.chapter3_content,
            basis: data.report_output.chapter3_basis
          });
          setBasis2Data(data.report_output.chapter3_basis);
        }
        if (data.report_output.chapter4_content || data.report_output.chapter4_decade_flow) {
          setChapter3Data({
            content: data.report_output.chapter4_content,
            decade_flow: data.report_output.chapter4_decade_flow,
            basis: data.report_output.chapter4_basis
          });
          setBasis3Data(data.report_output.chapter4_basis);
        }
        if (data.report_output.chapter5_content) {
          setFiveYearFortuneData({
            content: data.report_output.chapter5_content,
            basis: data.report_output.chapter5_basis
          });
          setBasis4Data(data.report_output.chapter5_basis);
        }
        // 연애운 데이터 복원
        console.log('[fetchSavedReport] love_fortune:', data.report_output.love_fortune);
        if (data.report_output.love_fortune) {
          const loveData = data.report_output.love_fortune;
          // LoveFortuneEditor가 기대하는 형식으로 설정
          setLoveFortuneData({
            yearlyLoveFortunes: loveData.yearlyLoveFortunes || [],
            baseAnalysis: loveData.baseAnalysis || loveData.cached_analysis?.base_analysis || {},
            cached_analysis: loveData.cached_analysis || {}
          });
        }
        // 재물운 데이터 복원
        if (data.report_output.fortune_years) {
          const fortuneData = data.report_output.fortune_years;
          if (fortuneData.yearlyFortunes) {
            setFortuneEditorData(fortuneData.yearlyFortunes);
          }
          if (fortuneData.baseFortune) {
            setFortuneBaseFortune(fortuneData.baseFortune);
          }
        }
        // 직업운 데이터 복원
        console.log('[fetchSavedReport] career_years:', data.report_output.career_years);
        if (data.report_output.career_years) {
          const careerData = data.report_output.career_years;
          console.log('[fetchSavedReport] careerData.yearlyCareers:', careerData.yearlyCareers);
          console.log('[fetchSavedReport] careerData.baseCareer:', careerData.baseCareer);
          if (careerData.yearlyCareers) {
            setCareerEditorData(careerData.yearlyCareers);
          }
          if (careerData.baseCareer) {
            setCareerBaseCareer(careerData.baseCareer);
          }
        }
        // 코칭 데이터 복원
        console.log('[fetchSavedReport] coaching:', data.report_output.coaching);
        if (data.report_output.coaching) {
          const coachingItems = data.report_output.coaching.items || [];
          setCoachingData(coachingItems);
        }
      } else {
        console.log('[fetchSavedReport] No report found or error:', { ok: response.ok, success: data.success, error: data.error });
      }
    } catch (err) {
      console.error('[fetchSavedReport] 저장된 레포트 조회 실패:', err);
    } finally {
      setSavedReportLoading(false);
    }
  };

  // 전체 레포트 저장
  const saveFullReport = async () => {
    return saveFullReportWithData(chapter1Data, chapter2Data, chapter3Data, fiveYearFortuneData, loveFortuneData);
  };

  // 전체 레포트 저장 (데이터 직접 전달)
  const saveFullReportWithData = async (ch1Data, ch2Data, ch3Data, ch4Data, ch6LoveData) => {
    console.log('[saveFullReportWithData] 저장 시작 - order:', id);
    console.log('[saveFullReportWithData] 데이터 확인:', {
      ch1Data_hasContent: !!ch1Data?.content,
      ch2Data_hasContent: !!ch2Data?.content,
      ch3Data_hasContent: !!ch3Data?.content,
      ch4Data_hasContent: !!ch4Data?.content,
      ch6LoveData_hasContent: !!ch6LoveData?.content
    });
    try {
      // 챕터 번호가 +1 됨 (기본정보가 1번이므로)
      // ch1Data(아이덴티티) -> chapter2, ch2Data(잠재력) -> chapter3
      // ch3Data(대운흐름) -> chapter4, ch4Data(5년운세) -> chapter5
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_full_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          chapter2_content: ch1Data?.content,
          chapter2_basis: basis1Data,
          chapter3_content: ch2Data?.content,
          chapter3_basis: basis2Data,
          chapter4_content: ch3Data?.content,
          chapter4_basis: basis3Data,
          chapter4_decade_flow: ch3Data?.decade_flow,
          chapter5_content: ch4Data?.content,
          chapter5_basis: basis4Data,
          chapter6_content: ch6LoveData?.content
        })
      });

      const data = await response.json();
      console.log('[saveFullReportWithData] 응답:', { ok: response.ok, success: data.success, hasReportOutput: !!data.report_output, secureToken: data.report_output?.secure_token });

      if (response.ok && data.success) {
        console.log('[saveFullReportWithData] 저장 성공! secure_token:', data.report_output?.secure_token);
        setSavedReport(data.report_output);
      } else {
        console.error('[saveFullReportWithData] 저장 실패:', data.error);
        throw new Error(data.error || '레포트 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('[saveFullReportWithData] 에러:', err);
      throw err;
    }
  };

  // 챕터 정보 (아이콘, 제목) - 생성 진행 표시용
  const progressYearCount = order?.report_type === 'blueprint_lite' ? 3 : 5;
  const chapterInfo = {
    validating: { icon: '🔍', title: '사주 검증' },
    1: { icon: '🧭', title: '나의 아이덴티티' },
    2: { icon: '🏛️', title: '나의 잠재력과 사회적 역할' },
    3: { icon: '📊', title: '대운 흐름 분석' },
    4: { icon: '🔮', title: `향후 ${progressYearCount}년간의 운세` },
    5: { icon: '💰', title: `재물운 (향후 ${progressYearCount}년)` },
    6: { icon: '💼', title: `직업운/사회운 (향후 ${progressYearCount}년)` },
    7: { icon: '💕', title: `연애운/배우자운 (향후 ${progressYearCount}년)` },
    8: { icon: '💬', title: '상담사의 코칭' },
    saving: { icon: '💾', title: '레포트 저장' }
  };

  // 전체 레포트 생성 (모든 챕터 순차 생성 후 저장)
  const generateAllChapters = async (forceRegenerate = false) => {
    setSavingReport(true);
    setGeneratingChapter('validating');

    // 사주 검증이 안 되어 있으면 먼저 검증 수행
    if (!validationResult) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/validate_saju`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          }
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setValidationResult(data);
        } else {
          throw new Error(data.error || '사주 검증에 실패했습니다.');
        }
      } catch (err) {
        alert(err.message);
        setSavingReport(false);
        setGeneratingChapter(null);
        return;
      }
    }

    // 임시 변수로 생성된 데이터 추적
    let newChapter1Data = chapter1Data;
    let newChapter2Data = chapter2Data;
    let newChapter3Data = chapter3Data;
    let newChapter4Data = fiveYearFortuneData;
    let newChapter6Data = loveFortuneData;

    // 연도 수 결정 (blueprint_lite는 3년, 나머지는 5년)
    const yearCount = order?.report_type === 'blueprint_lite' ? 3 : 5;

    try {
      // 챕터1 생성
      setGeneratingChapter(1);
      if (forceRegenerate || !chapter1Data?.content) {
        setChapter1Loading(true);
        try {
          console.log('[generateAllChapters] 챕터1 (아이덴티티) 생성 시작');
          const res1 = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
          });
          const data1 = await res1.json();
          console.log('[generateAllChapters] 챕터1 응답:', { ok: res1.ok, success: data1.success, hasContent: !!data1.chapter?.content });
          if (res1.ok && data1.success) {
            setChapter1Data(data1.chapter);
            newChapter1Data = data1.chapter;

            // 즉시 DB에 저장 (chapter2 = 아이덴티티)
            if (data1.chapter?.content) {
              await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_chapter_to_report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
                body: JSON.stringify({
                  chapter_number: 2,
                  content: data1.chapter.content,
                  basis: data1.chapter.basis
                })
              });
              console.log('[generateAllChapters] 챕터1(아이덴티티) DB 저장 완료');
            }
          } else {
            console.error('[generateAllChapters] 챕터1 생성 실패:', data1.error);
          }
        } catch (err) {
          console.error('[generateAllChapters] 챕터1 생성 에러:', err);
        }
        setChapter1Loading(false);
      }

      // 챕터2 생성
      setGeneratingChapter(2);
      if (forceRegenerate || !chapter2Data?.content) {
        setChapter2Loading(true);
        try {
          console.log('[generateAllChapters] 챕터2 (잠재력) 생성 시작');
          const res2 = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
          });
          const data2 = await res2.json();
          console.log('[generateAllChapters] 챕터2 응답:', { ok: res2.ok, success: data2.success, hasContent: !!data2.chapter?.content });
          if (res2.ok && data2.success) {
            setChapter2Data(data2.chapter);
            newChapter2Data = data2.chapter;

            // 즉시 DB에 저장 (chapter3 = 잠재력)
            if (data2.chapter?.content) {
              await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_chapter_to_report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
                body: JSON.stringify({
                  chapter_number: 3,
                  content: data2.chapter.content,
                  basis: data2.chapter.basis
                })
              });
              console.log('[generateAllChapters] 챕터2(잠재력) DB 저장 완료');
            }
          } else {
            console.error('[generateAllChapters] 챕터2 생성 실패:', data2.error);
          }
        } catch (err) {
          console.error('[generateAllChapters] 챕터2 생성 에러:', err);
        }
        setChapter2Loading(false);
      }

      // 챕터3 생성 (대운 흐름 분석) - 비동기 방식
      setGeneratingChapter(3);
      if (forceRegenerate || !chapter3Data?.content) {
        setChapter3Loading(true);
        setChapter3Progress({ progress: 0, message: '작업 시작 중...' });
        try {
          console.log('[generateAllChapters] 챕터3 (대운흐름) 비동기 생성 시작');

          // 1. 비동기 작업 시작
          const startRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter3_async`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
          });
          const startData = await startRes.json();

          if (!startRes.ok || !startData.success) {
            throw new Error(startData.error || '작업 시작 실패');
          }

          const jobId = startData.job_id;
          console.log('[generateAllChapters] 챕터3 Job 시작:', jobId);

          // 2. 폴링으로 상태 확인 (최대 10분)
          const maxPollingTime = 600000;
          const pollingInterval = 2000;
          const startTime = Date.now();

          while (Date.now() - startTime < maxPollingTime) {
            await new Promise(resolve => setTimeout(resolve, pollingInterval));

            const statusRes = await fetch(
              `${API_BASE_URL}/api/v1/admin/orders/${id}/chapter3_job_status?job_id=${jobId}`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
              }
            );
            const statusData = await statusRes.json();

            if (statusData.progress !== undefined) {
              setChapter3Progress({ progress: statusData.progress, message: statusData.message || '처리 중...' });
            }

            if (statusData.status === 'completed') {
              console.log('[generateAllChapters] 챕터3 완료');
              setChapter3Data(statusData.chapter);
              newChapter3Data = statusData.chapter;

              // 즉시 DB에 저장 (chapter4 = 대운흐름)
              if (statusData.chapter?.content || statusData.chapter?.decade_flow) {
                const basisWithDecadeFlow = {
                  ...(statusData.chapter.basis || {}),
                  decade_flow: statusData.chapter.decade_flow
                };
                await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_chapter_to_report`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
                  body: JSON.stringify({
                    chapter_number: 4,
                    content: statusData.chapter.content,
                    basis: basisWithDecadeFlow
                  })
                });
                console.log('[generateAllChapters] 챕터3(대운흐름) DB 저장 완료');
              }
              break;
            }

            if (statusData.status === 'failed') {
              throw new Error(statusData.error || '챕터3 생성 실패');
            }
          }
        } catch (err) {
          console.error('[generateAllChapters] 챕터3 생성 에러:', err);
        }
        setChapter3Loading(false);
        setChapter3Progress(null);
      }

      // 챕터4 생성 (향후 N년간의 운세 - 세운)
      setGeneratingChapter(4);
      if (forceRegenerate || !fiveYearFortuneData?.content) {
        setChapter4Loading(true);
        try {
          // 먼저 N년운세 기본 데이터 로드
          const dataRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/five_year_fortune_data?year_count=${yearCount}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` }
          });
          const baseData = await dataRes.json();

          if (dataRes.ok && baseData.data?.years) {
            const yearsData = [];
            // 각 연도별로 운세 생성
            for (const yearInfo of baseData.data.years) {
              const yearRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_five_year_fortune`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
                body: JSON.stringify({ year: yearInfo.year, manager_input: {} })
              });
              const yearData = await yearRes.json();
              if (yearRes.ok) {
                const yearIndex = baseData.data.years.findIndex(y => y.year === yearInfo.year);

                // 분석 컨텍스트 구성
                const analysisContext = {
                  sky_outcome: yearData.sky_outcome || {},
                  earth_outcome: yearData.earth_outcome || {},
                  strength: yearData.strength || {},
                  temperature: yearData.temperature || {},
                  johu: yearData.johu || {}
                };

                // 각 분석 영역별 AI 해석 생성
                const areas = ['gyeokguk_sky', 'gyeokguk_earth', 'eokbu', 'johu', 'overall'];
                const interpretations = {};

                for (const area of areas) {
                  let primaryText = '';
                  switch (area) {
                    case 'gyeokguk_sky':
                      primaryText = analysisContext.sky_outcome?.reason || analysisContext.sky_outcome?.result || `${yearInfo.ganji} 천간 분석`;
                      break;
                    case 'gyeokguk_earth':
                      primaryText = analysisContext.earth_outcome?.reason || analysisContext.earth_outcome?.result || `${yearInfo.ganji} 지지 분석`;
                      break;
                    case 'eokbu':
                      primaryText = analysisContext.strength?.analysis || analysisContext.strength?.description || `${yearInfo.ganji} 억부 분석`;
                      break;
                    case 'johu':
                      primaryText = analysisContext.temperature?.description || analysisContext.johu?.analysis || `${yearInfo.ganji} 조후 분석`;
                      break;
                    case 'overall':
                      primaryText = [
                        analysisContext.sky_outcome?.reason,
                        analysisContext.earth_outcome?.reason,
                        analysisContext.strength?.analysis,
                        analysisContext.temperature?.description
                      ].filter(Boolean).join('\n') || `${yearInfo.ganji} 종합 분석`;
                      break;
                  }

                  try {
                    const aiRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_yearly_interpretation_ai`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
                      body: JSON.stringify({
                        year: yearInfo.year,
                        year_index: yearIndex,
                        ganji: yearInfo.ganji,
                        analysis_area: area,
                        primary_interpretation: primaryText,
                        analysis_context: analysisContext,
                        is_overall_synthesis: area === 'overall'
                      })
                    });
                    const aiData = await aiRes.json();
                    if (aiRes.ok && aiData.interpretation) {
                      interpretations[area] = aiData.interpretation;
                    }
                  } catch (aiErr) {
                    console.warn(`${area} AI 해석 생성 실패 (${yearInfo.year}):`, aiErr);
                  }
                }

                yearsData.push({
                  year: yearInfo.year,
                  ganji: yearInfo.ganji,
                  generated_content: yearData.generated_content,
                  sky_outcome: yearData.sky_outcome,
                  earth_outcome: yearData.earth_outcome,
                  // 억부/조후 분석 데이터 추가
                  strength: yearData.strength,
                  temperature: yearData.temperature,
                  johu: yearData.johu,
                  life_areas: yearData.life_areas,
                  combined_score: yearData.combined_score,
                  // AI 생성된 해석 추가
                  interpretations: interpretations,
                  manager_edit: { fortune_level: 'normal' }
                });
              }
            }

            // 콘텐츠 합치기
            const combinedContent = yearsData
              .filter(y => y.generated_content)
              .map(y => `【${y.year}년 (${y.ganji})】\n${y.generated_content}`)
              .join('\n\n');

            const ch4Result = {
              baseAnalysis: baseData.data.base_analysis,
              yearlyFiveYearFortunes: yearsData,
              content: combinedContent || null
            };
            setFiveYearFortuneData(ch4Result);
            newChapter4Data = ch4Result;

            // 5년운세 데이터 저장
            await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_five_year_fortune`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
              body: JSON.stringify({ yearlyFiveYearFortunes: yearsData })
            });
          }
        } catch (err) {
          console.error(`${yearCount}년운세 생성 실패:`, err);
        }
        setChapter4Loading(false);
      }

      // 챕터5 (재물운) - 동기 생성
      setGeneratingChapter(5);
      setFortuneProgress({ progress: 50, message: '재물운 생성 중...' });
      try {
        console.log(`[generateAllChapters] 재물운 동기 생성 시작 (${yearCount}년)`);
        const fortuneRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_fortune_all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
          body: JSON.stringify({ year_count: yearCount })
        });
        const fortuneData = await fortuneRes.json();
        console.log('[generateAllChapters] 재물운 생성 응답:', fortuneData);

        if (fortuneRes.ok && fortuneData.fortunes) {
          const yearlyFortunes = Object.entries(fortuneData.fortunes).map(([year, fortune]) => ({
            year: parseInt(year),
            ...fortune
          })).sort((a, b) => a.year - b.year);

          setFortuneEditorData(yearlyFortunes);

          // 재물운 저장
          console.log('[generateAllChapters] 재물운 저장 시작');
          const saveRes5 = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_fortune`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({
              fortune_data: {
                baseFortune: {},
                yearlyFortunes: yearlyFortunes
              }
            })
          });
          const saveData5 = await saveRes5.json();
          console.log('[generateAllChapters] 재물운 저장 응답:', saveData5);
        }
      } catch (err) {
        console.error('재물운 생성/저장 실패:', err);
      } finally {
        setFortuneProgress(null);
      }

      // 챕터6 (직업운) - 동기 생성
      setGeneratingChapter(6);
      setCareerProgress({ progress: 50, message: '직업운 생성 중...' });
      try {
        console.log(`[generateAllChapters] 직업운 동기 생성 시작 (${yearCount}년)`);
        const careerRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_career_all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
          body: JSON.stringify({ year_count: yearCount })
        });
        const careerData = await careerRes.json();
        console.log('[generateAllChapters] 직업운 생성 응답:', careerData);

        if (careerRes.ok && careerData.careers) {
          const yearlyCareers = Object.entries(careerData.careers).map(([year, career]) => ({
            year: parseInt(year),
            ...career
          })).sort((a, b) => a.year - b.year);

          setCareerEditorData(yearlyCareers);

          // 직업운 저장
          console.log('[generateAllChapters] 직업운 저장 시작');
          const saveRes6 = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_career`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({
              career_data: {
                baseCareer: {},
                yearlyCareers: yearlyCareers
              }
            })
          });
          const saveData6 = await saveRes6.json();
          console.log('[generateAllChapters] 직업운 저장 응답:', saveData6);
        }
      } catch (err) {
        console.error('직업운 생성/저장 실패:', err);
      } finally {
        setCareerProgress(null);
      }

      // 챕터7 (연애운) - 동기 생성
      setGeneratingChapter(7);
      setLoveProgress({ progress: 50, message: '연애운 생성 중...' });
      try {
        console.log(`[generateAllChapters] 연애운 동기 생성 시작 (${yearCount}년)`);
        const loveRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_love_fortune`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
          body: JSON.stringify({ year_count: yearCount })
        });
        const loveData = await loveRes.json();
        console.log('[generateAllChapters] 연애운 생성 응답:', loveData);

        if (loveRes.ok && loveData.success) {
          const loveFortuneResult = {
            baseAnalysis: {},
            yearlyLoveFortunes: loveData.yearly_love_fortunes || [{
              year: new Date().getFullYear(),
              generated_content: loveData.content || ''
            }]
          };
          setLoveFortuneData(loveFortuneResult);
          newChapter6Data = loveFortuneResult;

          console.log('[generateAllChapters] 연애운 저장 시작');
          const saveRes7 = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_love_fortune`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({ love_fortune_data: loveFortuneResult })
          });
          const saveData7 = await saveRes7.json();
          console.log('[generateAllChapters] 연애운 저장 응답:', saveData7);
        }
      } catch (err) {
        console.error('연애운 생성/저장 실패:', err);
      } finally {
        setLoveProgress(null);
      }

      // 챕터8 (코칭) - 동기 생성
      setGeneratingChapter(8);
      setCoachingProgress({ progress: 50, message: '코칭 생성 중...' });
      try {
        console.log('[generateAllChapters] 코칭 동기 생성 시작');
        const coachingRes = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/regenerate_coaching`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
          body: JSON.stringify({})
        });
        const coachingData = await coachingRes.json();
        console.log('[generateAllChapters] 코칭 생성 응답:', coachingData);

        if (coachingRes.ok && coachingData.success) {
          const coachingItems = coachingData.coaching_items || [];
          setCoachingData(coachingItems);

          // 코칭 저장
          console.log('[generateAllChapters] 코칭 저장 시작');
          const saveRes8 = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/save_coaching`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Saju-Authorization': `Bearer-${API_TOKEN}` },
            body: JSON.stringify({ coaching_items: coachingItems })
          });
          const saveData8 = await saveRes8.json();
          console.log('[generateAllChapters] 코칭 저장 응답:', saveData8);
        } else {
          console.error('[generateAllChapters] 코칭 생성 실패:', coachingData.error);
        }
      } catch (err) {
        console.error('코칭 생성/저장 실패:', err);
      } finally {
        setCoachingProgress(null);
      }

      // 전체 저장 (새로 생성된 데이터 사용)
      setGeneratingChapter('saving');

      // 저장 전 데이터 검증 로그
      const missingChapters = [];
      if (!newChapter1Data?.content) missingChapters.push('챕터1(아이덴티티)');
      if (!newChapter2Data?.content) missingChapters.push('챕터2(잠재력)');
      if (!newChapter3Data?.content) missingChapters.push('챕터3(대운흐름)');
      if (!newChapter4Data?.content) missingChapters.push('챕터4(5년운세)');

      if (missingChapters.length > 0) {
        console.warn('[generateAllChapters] ⚠️ 누락된 챕터 데이터:', missingChapters.join(', '));
      }

      console.log('[generateAllChapters] 전체 레포트 저장 시작...', {
        ch1: !!newChapter1Data?.content,
        ch2: !!newChapter2Data?.content,
        ch3: !!newChapter3Data?.content,
        ch4: !!newChapter4Data?.content,
        ch6: !!newChapter6Data?.content
      });
      try {
        await saveFullReportWithData(newChapter1Data, newChapter2Data, newChapter3Data, newChapter4Data, newChapter6Data);
        console.log('[generateAllChapters] 전체 레포트 저장 완료!');
      } catch (saveErr) {
        console.error('[generateAllChapters] 전체 레포트 저장 실패:', saveErr);
        alert(`레포트 저장 실패: ${saveErr.message}`);
        throw saveErr;
      }

      // 주문 상태를 pending으로 변경
      if (order.status !== 'pending' && order.status !== 'completed') {
        await updateOrderStatus('pending');
      }

    } catch (err) {
      console.error('전체 레포트 생성 실패:', err);
      alert(`레포트 생성 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setSavingReport(false);
      setGeneratingChapter(null);
    }
  };

  // 레포트 미리보기 URL 열기 (관리자용)
  const openReportPreview = () => {
    if (savedReport?.secure_token) {
      window.open(`/admin/preview/${savedReport.secure_token}`, '_blank');
    } else {
      alert('저장된 레포트가 없습니다. 먼저 레포트를 생성해주세요.');
    }
  };

  // 레포트 발송 (이메일 + 상태 변경)
  const sendReport = async () => {
    if (!savedReport) {
      alert('먼저 레포트를 생성해주세요.');
      return;
    }

    if (!order.email) {
      alert('주문에 이메일 정보가 없습니다.');
      return;
    }

    if (!confirm(`유저에게 전송됩니다. 완료하시겠습니까?\n\n수신자: ${order.name} (${order.email})\n레포트 URL + PDF 첨부 이메일이 발송됩니다.`)) {
      return;
    }

    setSendingReport(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/send_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('레포트가 성공적으로 발송되었습니다.');
        setOrder(data.order); // 업데이트된 주문 정보 반영 (status: completed)
      } else {
        throw new Error(data.error || '레포트 발송에 실패했습니다.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingReport(false);
    }
  };

  // 모바일 프리뷰를 새 탭에서 열기
  const openMobilePreview = (chapterNumber) => {
    window.open(`/preview/${id}?chapter=${chapterNumber}`, '_blank');
  };

  // 챕터별 제목
  const chapterTitlesForPdf = {
    1: '나의 타고난 성격과 기질',
    2: '삶의 방향과 격국 분석',
    3: '대운의 흐름',
    4: '현재 대운 운세',
    5: '올해의 운세'
  };

  // PDF 다운로드 함수
  const downloadChapterPDF = async (chapterNumber, chapterData) => {
    if (!chapterData?.content) {
      alert('다운로드할 리포트 내용이 없습니다.');
      return;
    }

    setPdfLoading(prev => ({ ...prev, [chapterNumber]: true }));

    try {
      const userName = order?.name || '사용자';
      const chapterTitle = chapterTitlesForPdf[chapterNumber] || `챕터${chapterNumber}`;
      const fileName = `${userName}_사주리포트_${chapterTitle}.pdf`;

      // PDF용 HTML 생성
      const pdfContent = document.createElement('div');
      pdfContent.style.cssText = `
        padding: 20px 30px;
        background: #1a1a2e;
        color: #ffffff;
        font-family: 'Noto Sans KR', sans-serif;
        line-height: 2;
        font-size: 14px;
      `;

      const formattedContent = chapterData.content
        .replace(/#{4,}\s*(.*?)\s*#{0,}/g, '<strong style="color: #d4af37;">$1</strong>')
        .replace(/^###\s*(.*?)\s*#{0,}$/gm, '</p><h3 style="font-size: 15px; color: #f4d03f; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #d4af37; page-break-inside: avoid;">$1</h3><p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">')
        .replace(/^##\s*(.*?)\s*#{0,}$/gm, '</p><h2 style="font-size: 17px; color: #d4af37; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(212, 175, 55, 0.3); page-break-inside: avoid; page-break-after: avoid;">$1</h2><p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">')
        .replace(/^#\s*(.*?)\s*#{0,}$/gm, '</p><h1 style="font-size: 20px; color: #ffffff; margin: 28px 0 16px; text-align: center; page-break-inside: avoid;">$1</h1><p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #d4af37;">$1</strong>')
        .replace(/\n\n/g, '</p><p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">')
        .replace(/\n/g, '<br/>');

      pdfContent.innerHTML = `
        <style>
          * { box-sizing: border-box; color: #ffffff; }
          p { color: #ffffff !important; }
          p, h1, h2, h3, div { page-break-inside: avoid; orphans: 3; widows: 3; }
          h1, h2, h3 { page-break-after: avoid; }
        </style>
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.3); page-break-inside: avoid;">
          <h1 style="font-size: 22px; color: #d4af37; margin: 0 0 10px 0;">${chapterTitle}</h1>
          <p style="font-size: 13px; color: #ffffff; margin: 0;">${userName}님의 사주 리포트</p>
        </div>
        <div style="font-size: 14px; line-height: 2; color: #ffffff;">
          <p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">${formattedContent}</p>
        </div>
      `;

      const opt = {
        margin: [25, 20, 25, 20], // 상, 우, 하, 좌 여백 (mm)
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#1a1a2e',
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['p', 'h1', 'h2', 'h3', 'div']
        }
      };

      await html2pdf().set(opt).from(pdfContent).save();
    } catch (err) {
      console.error('PDF 생성 오류:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setPdfLoading(prev => ({ ...prev, [chapterNumber]: false }));
    }
  };

  // 전체 챕터 PDF 다운로드 (API에서 직접 가져오기)
  const downloadAllChaptersPDF = async () => {
    setPdfLoading(prev => ({ ...prev, all: true }));

    try {
      const userName = order?.name || '사용자';
      const fileName = `${userName}_사주리포트_전체.pdf`;

      // 모든 챕터 API 호출
      const chapterPromises = [1, 2, 3, 4, 5].map(async (num) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter${num}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Saju-Authorization': `Bearer-${API_TOKEN}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.chapter?.content) {
              return { num, content: data.chapter.content };
            }
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(chapterPromises);
      const chapters = results.filter(ch => ch !== null);

      if (chapters.length === 0) {
        alert('리포트 생성에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      // 전체 PDF용 HTML 생성
      const pdfContent = document.createElement('div');
      pdfContent.style.cssText = `
        padding: 20px 30px;
        background: #1a1a2e;
        color: #ffffff;
        font-family: 'Noto Sans KR', sans-serif;
        line-height: 2;
        font-size: 14px;
      `;

      // 표지
      let htmlContent = `
        <style>
          * { box-sizing: border-box; color: #ffffff; }
          p { color: #ffffff !important; }
          p, h1, h2, h3, div { page-break-inside: avoid; orphans: 3; widows: 3; }
          h1, h2, h3 { page-break-after: avoid; }
        </style>
        <div style="text-align: center; padding: 80px 0; margin-bottom: 40px; border-bottom: 2px solid rgba(212, 175, 55, 0.3);">
          <h1 style="font-size: 28px; color: #d4af37; margin: 0 0 20px 0;">사주 리포트</h1>
          <p style="font-size: 16px; color: #ffffff; margin: 0;">${userName}님</p>
        </div>
      `;

      // 각 챕터 추가
      for (const chapter of chapters) {
        const chapterTitle = chapterTitlesForPdf[chapter.num] || `챕터 ${chapter.num}`;
        const formattedContent = chapter.content
          .replace(/#{4,}\s*(.*?)\s*#{0,}/g, '<strong style="color: #d4af37;">$1</strong>')
          .replace(/^###\s*(.*?)\s*#{0,}$/gm, '</p><h3 style="font-size: 15px; color: #f4d03f; margin: 20px 0 10px; padding-left: 10px; border-left: 3px solid #d4af37; page-break-inside: avoid;">$1</h3><p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">')
          .replace(/^##\s*(.*?)\s*#{0,}$/gm, '</p><h2 style="font-size: 17px; color: #d4af37; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(212, 175, 55, 0.3); page-break-inside: avoid; page-break-after: avoid;">$1</h2><p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">')
          .replace(/^#\s*(.*?)\s*#{0,}$/gm, '</p><h1 style="font-size: 20px; color: #ffffff; margin: 28px 0 16px; text-align: center; page-break-inside: avoid;">$1</h1><p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">')
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #d4af37;">$1</strong>')
          .replace(/\n\n/g, '</p><p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">')
          .replace(/\n/g, '<br/>');

        htmlContent += `
          <div class="chapter-section" style="page-break-before: always; padding-top: 30px; color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 1px solid rgba(212, 175, 55, 0.3); page-break-inside: avoid; page-break-after: avoid;">
              <h2 style="font-size: 20px; color: #d4af37; margin: 0;">제${chapter.num}장. ${chapterTitle}</h2>
            </div>
            <div style="font-size: 14px; line-height: 2; color: #ffffff;">
              <p style="margin: 12px 0; color: #ffffff; page-break-inside: avoid;">${formattedContent}</p>
            </div>
          </div>
        `;
      }

      pdfContent.innerHTML = htmlContent;

      const opt = {
        margin: [25, 20, 25, 20], // 상, 우, 하, 좌 여백 (mm)
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#1a1a2e',
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.chapter-section',
          avoid: ['p', 'h1', 'h2', 'h3', 'div']
        }
      };

      await html2pdf().set(opt).from(pdfContent).save();
    } catch (err) {
      console.error('PDF 생성 오류:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setPdfLoading(prev => ({ ...prev, all: false }));
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="loading-state">
          <Loader size={32} className="spinning" />
          <p>주문 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-detail-page">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchOrder}>다시 시도</button>
          <button onClick={() => navigate('/orders')} className="back-btn-error">목록으로</button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        <div className="error-state">
          <p>주문을 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/orders')}>목록으로</button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <div className="detail-page-header">
        <button className="back-button" onClick={() => navigate('/orders')}>
          <ArrowLeft size={20} />
          <span>목록으로</span>
        </button>
        <div className="header-title">
          <h1>주문 #{order.id}</h1>
          <span className={`status-badge ${getStatusClass(order.status)}`}>
            {order.status_label}
          </span>
        </div>
      </div>

      <div className="detail-page-content">
        <div className="detail-grid">
          {/* 고객 정보 */}
          <div className="detail-card">
            <div className="card-header">
              <User size={20} />
              <h3>고객 정보</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <label>고객명</label>
                <span>{order.name}</span>
              </div>
              <div className="info-row">
                <label>성별</label>
                <span>{order.gender_label}</span>
              </div>
              <div className="info-row">
                <label><Phone size={14} /> 연락처</label>
                <span>{order.phone_number}</span>
              </div>
              <div className="info-row">
                <label><Mail size={14} /> 이메일</label>
                <span>{order.email}</span>
              </div>
            </div>
          </div>

          {/* 생년월일 정보 */}
          <div className="detail-card">
            <div className="card-header">
              <Calendar size={20} />
              <h3>생년월일 정보</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <label>생년월일</label>
                <span>{order.birth_date}</span>
              </div>
              <div className="info-row">
                <label>역법</label>
                <span>{order.calendar_type_label}</span>
              </div>
              <div className="info-row">
                <label><Clock size={14} /> 태어난 시간</label>
                <span>{order.birth_time}</span>
              </div>
            </div>
          </div>

          {/* 리포트 정보 */}
          <div className="detail-card">
            <div className="card-header">
              <FileText size={20} />
              <h3>리포트 정보</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <label>리포트 타입</label>
                <span className="report-type-badge">{order.report_type_label}</span>
              </div>
              <div className="info-row">
                <label>구매 출처</label>
                <span className={`origin-badge ${order.origin === 'blueprint_app' ? 'origin-app' : 'origin-web'}`}>
                  {order.origin_label || '웹'}
                </span>
              </div>
              {order.report_name && (
                <div className="info-row">
                  <label>리포트명</label>
                  <span>{order.report_name}</span>
                </div>
              )}
              <div className="info-row">
                <label>주문일시</label>
                <span>{order.created_at_formatted}</span>
              </div>
            </div>
          </div>

          {/* 상태 관리 */}
          <div className="detail-card status-card">
            <div className="card-header">
              <CheckCircle size={20} />
              <h3>상태 관리</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <label>현재 상태</label>
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(e.target.value)}
                  disabled={updating}
                  className="status-select"
                >
                  <option value="pending">대기중</option>
                  <option value="processing">처리중</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소됨</option>
                </select>
              </div>
              <div className="info-row">
                <label>결제 상태</label>
                {order.origin === 'blueprint_app' ? (
                  <span className="payment-status-badge paid">앱결제 / 결제완료</span>
                ) : order.payment_method ? (
                  <span className={`payment-status-badge ${order.payment_status || 'none'}`}>
                    {order.payment_method === 'card' ? '카드' : '가상계좌'}
                    {order.payment_status && ` / ${order.payment_status === 'paid' ? '결제완료' : order.payment_status === 'ready' ? '입금대기' : order.payment_status}`}
                    {order.payment_amount && ` (${order.payment_amount.toLocaleString()}원)`}
                  </span>
                ) : (
                  <span className="payment-status-badge none">미등록</span>
                )}
              </div>
            </div>
          </div>

          {/* 고객 질문 */}
          {order.questions && order.questions.filter(q => q && q.trim()).length > 0 && (
            <div className="detail-card questions-card">
              <div className="card-header">
                <MessageCircle size={20} />
                <h3>고객 질문 ({order.questions.filter(q => q && q.trim()).length}개)</h3>
              </div>
              <div className="card-content">
                {order.questions.filter(q => q && q.trim()).map((question, idx) => (
                  <div key={idx} className="question-item">
                    <div className="question-number">Q{idx + 1}</div>
                    <div className="question-text">{question}</div>
                  </div>
                ))}
                <p className="questions-hint">* 질문 답변은 Q&A 챕터에서 작성할 수 있습니다.</p>
              </div>
            </div>
          )}

          {/* 리포트 질문 (Chapter 10 Q&A) */}
          {chapter10Question && (
            <div className="detail-card chapter10-qa-card">
              <div className="card-header">
                <MessageCircle size={20} />
                <h3>
                  리포트 질문
                  <span className={`qa-status-badge ${chapter10Question.status === 'answered' ? 'answered' : 'pending'}`}>
                    {chapter10Question.status === 'answered' ? '답변 완료' : '답변 대기'}
                  </span>
                </h3>
              </div>
              <div className="card-content">
                <div className="chapter10-question-section">
                  <div className="chapter10-question-label">질문</div>
                  <div className="chapter10-question-content">{chapter10Question.question?.content}</div>
                  <div className="chapter10-question-meta">
                    {chapter10Question.question?.user_email && (
                      <span>이메일: {chapter10Question.question.user_email}</span>
                    )}
                    {chapter10Question.question?.submitted_at && (
                      <span>
                        제출: {new Date(chapter10Question.question.submitted_at).toLocaleString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>

                {chapter10Question.status === 'answered' && chapter10Question.answer ? (
                  <div className="chapter10-answer-section answered">
                    <div className="chapter10-answer-label">답변</div>
                    <div className="chapter10-answer-content">{chapter10Question.answer.content}</div>
                    <div className="chapter10-answer-meta">
                      <span>답변자: {chapter10Question.answer.answered_by || 'Admin'}</span>
                      <span>
                        답변일: {new Date(chapter10Question.answer.answered_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="chapter10-answer-section">
                    <div className="chapter10-answer-label">답변 작성</div>
                    <textarea
                      className="chapter10-answer-input"
                      value={chapter10Answer}
                      onChange={(e) => setChapter10Answer(e.target.value)}
                      placeholder="고객 질문에 대한 답변을 작성해주세요..."
                      rows={5}
                    />
                    <div className="chapter10-answer-actions">
                      <button
                        className="btn btn-chapter10-submit"
                        onClick={submitChapter10Answer}
                        disabled={chapter10Submitting || !chapter10Answer.trim()}
                      >
                        {chapter10Submitting ? (
                          <>
                            <Loader size={16} className="spinning" />
                            제출 중...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            답변 제출 (고객에게 이메일 발송)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="detail-actions">
          <button
            className="btn btn-preview"
            onClick={openFullPreview}
            disabled={validating}
          >
            {validating ? (
              <>
                <Loader size={18} className="spinning" />
                로딩 중...
              </>
            ) : (
              <>
                <FileText size={18} />
                사주 검증
              </>
            )}
          </button>
          {savedReport && (
            <button
              className="btn btn-pdf"
              onClick={() => downloadAllChaptersPDF()}
              disabled={pdfLoading.all}
            >
              {pdfLoading.all ? (
                <>
                  <Loader size={18} className="spinning" />
                  생성 중...
                </>
              ) : (
                <>
                  <Download size={18} />
                  PDF 다운로드
                </>
              )}
            </button>
          )}
        </div>

        {/* 레포트 생성 및 미리보기 섹션 */}
        <div className="report-generation-section">
          <div className="section-header">
            <Sparkles size={18} />
            <h3>AI 레포트 생성</h3>
          </div>
          <div className="report-generation-content">
            {savedReportLoading ? (
              <div className="report-status loading">
                <Loader size={16} className="spinning" />
                <span>저장된 레포트 확인 중...</span>
              </div>
            ) : savedReport ? (
              <div className="report-status saved">
                <div className="status-info">
                  <CheckCircle size={16} className="status-icon success" />
                  <span>레포트가 생성되어 있습니다</span>
                  <span className="status-date">
                    (생성일: {new Date(savedReport.updated_at || savedReport.created_at).toLocaleDateString('ko-KR')})
                  </span>
                </div>
                <div className="report-actions">
                  <button
                    className="btn btn-report-preview"
                    onClick={openReportPreview}
                  >
                    <FileText size={16} />
                    미리보기
                  </button>
                  <button
                    className="btn btn-report-regenerate"
                    onClick={() => generateAllChapters(true)}
                    disabled={savingReport || regeneratingAllChapters}
                  >
                    {savingReport ? <Loader size={16} className="spinning" /> : <Sparkles size={16} />}
                    다시 생성
                  </button>
                  <button
                    className="btn btn-report-regenerate"
                    onClick={handleRegenerateMissingChapters}
                    disabled={savingReport || regeneratingAllChapters}
                    style={{ backgroundColor: '#e67e22' }}
                  >
                    {regeneratingAllChapters ? <Loader size={16} className="spinning" /> : <Sparkles size={16} />}
                    누락 챕터 생성
                  </button>
                  <button
                    className="btn btn-copy-link"
                    onClick={() => {
                      const url = `${REPORT_BASE_URL}/report/${savedReport.secure_token}`;
                      navigator.clipboard.writeText(url);
                      alert('레포트 링크가 복사되었습니다.');
                    }}
                  >
                    📋 링크 복사
                  </button>
                  <button
                    className="btn btn-complete"
                    onClick={sendReport}
                    disabled={sendingReport || order.status === 'completed' || order.status === 'cancelled'}
                  >
                    {sendingReport ? (
                      <>
                        <Loader size={16} className="spinning" />
                        전송 중...
                      </>
                    ) : order.status === 'completed' ? (
                      <>
                        <CheckCircle size={16} />
                        제작 완료됨
                      </>
                    ) : order.status === 'cancelled' ? (
                      <>
                        <AlertCircle size={16} />
                        취소된 주문
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        제작완료
                      </>
                    )}
                  </button>
                </div>
                <div className="preview-link">
                  <span className="link-label">미리보기 URL:</span>
                  <a
                    href={`/admin/preview/${savedReport.secure_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-url"
                  >
                    {`${window.location.origin}/admin/preview/${savedReport.secure_token}`}
                  </a>
                </div>
                {order.status === 'completed' && (
                  <div className="preview-link">
                    <span className="link-label">고객용 URL:</span>
                    <a
                      href={`${REPORT_BASE_URL}/report/${savedReport.secure_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-url"
                    >
                      {`${REPORT_BASE_URL}/report/${savedReport.secure_token}`}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="report-status not-generated">
                <div className="status-info">
                  <AlertCircle size={16} className="status-icon warning" />
                  <span>{order.status === 'cancelled' ? '취소된 주문입니다' : '아직 레포트가 생성되지 않았습니다'}</span>
                </div>
                <button
                  className="btn btn-generate-report"
                  onClick={() => generateAllChapters(false)}
                  disabled={savingReport || order.status === 'cancelled'}
                >
                  {savingReport ? (
                    <>
                      <Loader size={16} className="spinning" />
                      생성 중...
                    </>
                  ) : order.status === 'cancelled' ? (
                    <>
                      <AlertCircle size={16} />
                      취소된 주문
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      레포트 생성하기
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 사주 검증 결과 모달 */}
      {showValidation && (
        <div className="modal-overlay" onClick={() => setShowValidation(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Search size={20} />
                사주 검증 결과
              </h3>
              <button className="modal-close-btn" onClick={() => setShowValidation(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              {validationError ? (
                <div className="validation-error">
                  <p>{validationError}</p>
                </div>
              ) : validationResult ? (
                <SajuValidationDisplay data={validationResult} orderId={id} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 레포트 생성 진행 모달 */}
      {generatingChapter && (
        <div className="generation-overlay">
          <div className="generation-modal">
            <div className="generation-animation">
              <div className="generation-circle">
                <span className="generation-icon">{chapterInfo[generatingChapter]?.icon}</span>
              </div>
              <div className="generation-pulse"></div>
              <div className="generation-pulse delay-1"></div>
              <div className="generation-pulse delay-2"></div>
            </div>
            <div className="generation-text">
              <h3>AI가 레포트를 생성하고 있습니다</h3>
              <p className="generation-chapter-title">
                {generatingChapter === 'validating'
                  ? '사주 검증 중...'
                  : generatingChapter === 'saving'
                    ? '레포트 저장 중...'
                    : `챕터 ${generatingChapter}: ${chapterInfo[generatingChapter]?.title}`}
              </p>
              <div className="generation-progress">
                {/* 사주 검증 단계 */}
                <div className={`progress-step ${
                  generatingChapter === 'validating' ? 'active' :
                  (generatingChapter === 'saving' || typeof generatingChapter === 'number') ? 'completed' : ''
                }`}>
                  <span className="step-icon">🔍</span>
                </div>
                {/* 챕터 1-8 */}
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <div
                    key={num}
                    className={`progress-step ${
                      generatingChapter === 'saving' || (typeof generatingChapter === 'number' && num < generatingChapter)
                        ? 'completed'
                        : num === generatingChapter
                          ? 'active'
                          : ''
                    }`}
                  >
                    <span className="step-icon">{chapterInfo[num]?.icon}</span>
                  </div>
                ))}
                {/* 저장 단계 */}
                <div className={`progress-step ${generatingChapter === 'saving' ? 'active' : ''}`}>
                  <span className="step-icon">💾</span>
                </div>
              </div>
            </div>
            <div className="generation-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {/* 전체화면 미리보기 모달 */}
      {showFullPreview && (
        <div className="fullscreen-preview">
          <div className="fullscreen-header">
            <div className="fullscreen-title">
              <FileText size={24} />
              <h2>사주 검증 및 레포트 미리보기</h2>
              <span className="preview-order-info">주문 #{order.id} - {order.name} ({order.report_type_label})</span>
            </div>
            <button className="fullscreen-close-btn" onClick={() => setShowFullPreview(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="fullscreen-content">
            {/* 왼쪽: 사주 검증 */}
            <div className={`preview-left ${leftPanelCollapsed ? 'collapsed' : ''}`}>
              <div className="preview-section-header">
                <Search size={18} />
                <h3>사주 검증 결과</h3>
                <button
                  className="panel-toggle-btn"
                  onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                  title={leftPanelCollapsed ? '패널 펼치기' : '패널 접기'}
                >
                  {leftPanelCollapsed ? '▶' : '◀'}
                </button>
              </div>
              {!leftPanelCollapsed && (
                <div className="preview-left-content">
                  {validationResult ? (
                    <SajuValidationDisplay data={validationResult} orderId={id} />
                  ) : (
                    <div className="preview-loading">
                      <Loader size={24} className="spinning" />
                      <p>사주 정보를 불러오는 중...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 오른쪽: 레포트 챕터 */}
            <div className="preview-right">
              <div className="preview-section-header">
                <FileText size={18} />
                <h3>레포트 챕터</h3>
                <div className="report-action-buttons">
                  {savedReportLoading ? (
                    <span className="loading-text"><Loader size={14} className="spinning" /> 로딩중...</span>
                  ) : savedReport ? (
                    <>
                      <button
                        className="btn btn-preview-report"
                        onClick={openReportPreview}
                      >
                        <FileText size={14} />
                        미리보기
                      </button>
                      <button
                        className="btn btn-regenerate-report"
                        onClick={() => generateAllChapters(true)}
                        disabled={savingReport || regeneratingAllChapters}
                      >
                        {savingReport ? <Loader size={14} className="spinning" /> : <Sparkles size={14} />}
                        다시생성
                      </button>
                      <button
                        className="btn btn-regenerate-report"
                        onClick={handleRegenerateMissingChapters}
                        disabled={savingReport || regeneratingAllChapters}
                        style={{ backgroundColor: '#e67e22' }}
                      >
                        {regeneratingAllChapters ? <Loader size={14} className="spinning" /> : <Sparkles size={14} />}
                        누락생성
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-generate-all"
                      onClick={generateAllChapters}
                      disabled={savingReport || !validationResult}
                    >
                      {savingReport ? <Loader size={14} className="spinning" /> : <Sparkles size={14} />}
                      전체 레포트 생성
                    </button>
                  )}
                </div>
              </div>

              {/* 챕터 탭 - 카테고리별 그룹화 */}
              <div className="chapter-tabs-container">
                <div className="chapter-tabs">
                  {reportChapters.map((chapter, idx) => (
                    <button
                      key={chapter.id}
                      className={`chapter-tab ${selectedChapter === idx ? 'active' : ''} category-${chapter.category || 'default'}`}
                      onClick={() => setSelectedChapter(idx)}
                      title={chapter.title}
                    >
                      <span className="chapter-number">
                        {chapter.number === 0 ? '📋' : (chapter.number ?? chapter.icon ?? idx)}
                      </span>
                      <span className="chapter-label">{chapter.label || chapter.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 챕터 내용 */}
              <div className="chapter-content">
                {reportChapters[selectedChapter] && (
                  <div className="chapter-display">
                    <div className="chapter-header">
                      <div className="chapter-header-badge">
                        {reportChapters[selectedChapter].number === 0 || reportChapters[selectedChapter].number === undefined
                          ? <span className="header-icon">{reportChapters[selectedChapter].icon}</span>
                          : <span className="header-number">Chapter {reportChapters[selectedChapter].number}</span>
                        }
                      </div>
                      <div className="chapter-header-text">
                        <span className="header-label">{reportChapters[selectedChapter].label || ''}</span>
                        <h4>{reportChapters[selectedChapter].title}</h4>
                      </div>
                    </div>
                    <div className="chapter-body">
                      {reportChapters[selectedChapter].id === 'saju_info' && validationResult ? (
                        <div className="chapter-saju-info">
                          <div className="info-grid">
                            <div className="info-item">
                              <label>이름</label>
                              <span>{validationResult.order_info?.name}</span>
                            </div>
                            <div className="info-item">
                              <label>생년월일</label>
                              <span>{validationResult.order_info?.birth_date}</span>
                            </div>
                            <div className="info-item">
                              <label>출생시간</label>
                              <span>{validationResult.order_info?.birth_time}</span>
                            </div>
                            <div className="info-item">
                              <label>성별</label>
                              <span>{validationResult.order_info?.gender}</span>
                            </div>
                          </div>
                          <div className="saju-pillars">
                            <h5>사주팔자</h5>
                            <div className="saju-table-wrapper">
                              <table className="saju-analysis-table">
                                <thead>
                                  <tr>
                                    <th className="row-header"></th>
                                    <th>시주</th>
                                    <th>일주</th>
                                    <th>월주</th>
                                    <th>연주</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="sipsung-row">
                                    <td className="row-label">천간십성</td>
                                    <td className="sipsung-cell">{validationResult.saju_data?.sipsung?.cheongan?.time || '-'}</td>
                                    <td className="sipsung-cell ilgan-marker">일간</td>
                                    <td className="sipsung-cell">{validationResult.saju_data?.sipsung?.cheongan?.month || '-'}</td>
                                    <td className="sipsung-cell">{validationResult.saju_data?.sipsung?.cheongan?.year || '-'}</td>
                                  </tr>
                                  <tr className="cheongan-row">
                                    <td className="row-label">천간</td>
                                    <td className="ganji-cell">{validationResult.saju_data?.cheongan?.time || '?'}</td>
                                    <td className="ganji-cell ilgan-cell">{validationResult.saju_data?.cheongan?.day || '?'}</td>
                                    <td className="ganji-cell">{validationResult.saju_data?.cheongan?.month || '?'}</td>
                                    <td className="ganji-cell">{validationResult.saju_data?.cheongan?.year || '?'}</td>
                                  </tr>
                                  <tr className="jiji-row">
                                    <td className="row-label">지지</td>
                                    <td className="ganji-cell">{validationResult.saju_data?.jiji?.time || '?'}</td>
                                    <td className="ganji-cell">{validationResult.saju_data?.jiji?.day || '?'}</td>
                                    <td className="ganji-cell">{validationResult.saju_data?.jiji?.month || '?'}</td>
                                    <td className="ganji-cell">{validationResult.saju_data?.jiji?.year || '?'}</td>
                                  </tr>
                                  <tr className="sipsung-row">
                                    <td className="row-label">지지십성</td>
                                    <td className="sipsung-cell">{validationResult.saju_data?.sipsung?.jiji?.time || '-'}</td>
                                    <td className="sipsung-cell">{validationResult.saju_data?.sipsung?.jiji?.day || '-'}</td>
                                    <td className="sipsung-cell">{validationResult.saju_data?.sipsung?.jiji?.month || '-'}</td>
                                    <td className="sipsung-cell">{validationResult.saju_data?.sipsung?.jiji?.year || '-'}</td>
                                  </tr>
                                  <tr className="unseong-row">
                                    <td className="row-label">십이운성</td>
                                    <td className="unseong-cell">{validationResult.saju_data?.sipyi_unseong?.time || '-'}</td>
                                    <td className="unseong-cell">{validationResult.saju_data?.sipyi_unseong?.day || '-'}</td>
                                    <td className="unseong-cell">{validationResult.saju_data?.sipyi_unseong?.month || '-'}</td>
                                    <td className="unseong-cell">{validationResult.saju_data?.sipyi_unseong?.year || '-'}</td>
                                  </tr>
                                  <tr className="sinsal-row">
                                    <td className="row-label">십이신살</td>
                                    <td className="sinsal-cell">{validationResult.saju_data?.sipyi_sinsal?.time || '-'}</td>
                                    <td className="sinsal-cell">{validationResult.saju_data?.sipyi_sinsal?.day || '-'}</td>
                                    <td className="sinsal-cell">{validationResult.saju_data?.sipyi_sinsal?.month || '-'}</td>
                                    <td className="sinsal-cell">{validationResult.saju_data?.sipyi_sinsal?.year || '-'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 격국 정보 */}
                          {validationResult.saju_data?.geju && (
                            <div className="geju-section">
                              <h5>격국 분석</h5>
                              <div className="geju-grid">
                                <div className="geju-item">
                                  <div className="geju-label">천간격국</div>
                                  <div className="geju-value">
                                    <span className="geju-name">{validationResult.saju_data.geju.sky_type || '미정'}</span>
                                  </div>
                                </div>
                                <div className="geju-item">
                                  <div className="geju-label">지지격국</div>
                                  <div className="geju-value">
                                    <span className="geju-name">{validationResult.saju_data.geju.earth_type || '미정'}</span>
                                  </div>
                                </div>
                              </div>
                              {(validationResult.saju_data.geju.sky_reason || validationResult.saju_data.geju.earth_reason) && (
                                <div className="geju-reasons">
                                  {validationResult.saju_data.geju.sky_reason && (
                                    <div className="geju-reason">
                                      <div className="reason-label">천간격국 판단 근거</div>
                                      <div className="reason-text">{validationResult.saju_data.geju.sky_reason}</div>
                                    </div>
                                  )}
                                  {validationResult.saju_data.geju.earth_reason && (
                                    <div className="geju-reason">
                                      <div className="reason-label">지지격국 판단 근거</div>
                                      <div className="reason-text">{validationResult.saju_data.geju.earth_reason}</div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter1' ? (
                        <div className="chapter1-content">
                          {/* 챕터1 생성 버튼 또는 콘텐츠 */}
                          {!chapter1Data && !chapter1Loading && (
                            <div className="chapter1-generate">
                              <p className="chapter1-description">
                                일주(日柱)를 기반으로 이 사람의 성격과 특성을 AI가 분석합니다.
                              </p>

                              {/* 명리학적 근거 조회 영역 */}
                              {!basis1Data && !basis1Loading && (
                                <div className="basis-preview-section">
                                  <button
                                    className="btn btn-basis-preview"
                                    onClick={fetchBasis1}
                                    disabled={basis1Loading}
                                  >
                                    <FileText size={18} />
                                    명리학적 근거 살펴보기
                                  </button>
                                  {basis1Error && (
                                    <p className="basis-error">{basis1Error}</p>
                                  )}
                                </div>
                              )}

                              {/* 명리학적 근거 로딩 */}
                              {basis1Loading && (
                                <div className="basis-loading">
                                  <Loader size={24} className="spinning" />
                                  <p>명리학적 근거를 조회하고 있습니다...</p>
                                </div>
                              )}

                              {/* 명리학적 근거 표시 */}
                              {basis1Data && (
                                <div className="basis-preview-result">
                                  <div className="basis-preview-box">
                                    <div className="basis-header">
                                      <span className="basis-icon">📊</span>
                                      <h5>사주명리학적 분석 근거</h5>
                                    </div>
                                    <div className="basis-content">
                                      <div className="basis-item">
                                        <span className="basis-label">분석 기준</span>
                                        <span className="basis-value">{basis1Data.type}</span>
                                      </div>
                                      <div className="basis-item">
                                        <span className="basis-label">일주</span>
                                        <span className="basis-value zodiac-day">
                                          {basis1Data.zodiac_day}
                                          <span className="zodiac-detail">
                                            (일간: {basis1Data.ilgan}, 일지: {basis1Data.ilji})
                                          </span>
                                        </span>
                                      </div>
                                      {basis1Data.twelve_star && (
                                        <div className="basis-item twelve-star-item">
                                          <span className="basis-label">십이운성</span>
                                          <span className="basis-value twelve-star-value">
                                            {basis1Data.twelve_star_meaning?.name || basis1Data.twelve_star}
                                          </span>
                                        </div>
                                      )}
                                      <p className="basis-description">
                                        {basis1Data.description}
                                      </p>
                                    </div>

                                    {/* 십이운성 해석 */}
                                    {basis1Data.twelve_star_meaning && (
                                      <div className="twelve-star-preview">
                                        <div className="twelve-star-header">
                                          <span className="twelve-star-icon">🌟</span>
                                          <h6>십이운성 해석: {basis1Data.twelve_star_meaning.name}</h6>
                                        </div>
                                        <div className="twelve-star-info">
                                          <div className="info-row">
                                            <span className="info-label">생애 단계</span>
                                            <span className="info-value">{basis1Data.twelve_star_meaning.life_stage}</span>
                                          </div>
                                          <div className="info-row">
                                            <span className="info-label">키워드</span>
                                            <span className="info-value">{basis1Data.twelve_star_meaning.keywords}</span>
                                          </div>
                                          <p className="twelve-star-meaning-text">{basis1Data.twelve_star_meaning.meaning}</p>
                                        </div>
                                      </div>
                                    )}

                                    {/* 원본 해석 데이터 */}
                                    {basis1Data.original_interpretation && (
                                      <details className="basis-original-data">
                                        <summary>
                                          <span className="original-icon">📖</span>
                                          원본 일주 해석 데이터 보기
                                        </summary>
                                        <div className="original-content">
                                          {basis1Data.original_interpretation}
                                        </div>
                                      </details>
                                    )}
                                  </div>

                                  {/* AI 생성 버튼 */}
                                  <div className="generate-after-basis">
                                    <p className="generate-prompt">위 명리학적 근거를 바탕으로 AI가 상세 리포트를 생성합니다.</p>
                                    <button
                                      className="btn btn-generate-chapter1"
                                      onClick={generateChapter1}
                                      disabled={chapter1Loading}
                                    >
                                      <Search size={18} />
                                      AI 리포트 생성하기
                                    </button>
                                  </div>
                                </div>
                              )}

                              {chapter1Error && (
                                <p className="chapter1-error">{chapter1Error}</p>
                              )}
                            </div>
                          )}

                          {/* 로딩 상태 */}
                          {chapter1Loading && (
                            <div className="chapter1-loading">
                              <Loader size={32} className="spinning" />
                              <p>AI가 일주 분석 리포트를 생성하고 있습니다...</p>
                              <p className="loading-note">잠시만 기다려주세요 (약 10-15초 소요)</p>
                            </div>
                          )}

                          {/* 챕터1 콘텐츠 표시 */}
                          {chapter1Data && !chapter1Loading && (
                            <div className="chapter1-result">
                              {/* 명리학적 근거 박스 */}
                              <div className="chapter1-basis-box">
                                <div className="basis-header">
                                  <span className="basis-icon">📊</span>
                                  <h5>사주명리학적 분석 근거</h5>
                                </div>
                                <div className="basis-content">
                                  <div className="basis-item">
                                    <span className="basis-label">분석 기준</span>
                                    <span className="basis-value">{chapter1Data.basis?.type}</span>
                                  </div>
                                  <div className="basis-item">
                                    <span className="basis-label">일주</span>
                                    <span className="basis-value zodiac-day">
                                      {chapter1Data.basis?.zodiac_day}
                                      <span className="zodiac-detail">
                                        (일간: {chapter1Data.basis?.ilgan}, 일지: {chapter1Data.basis?.ilji})
                                      </span>
                                    </span>
                                  </div>
                                  {/* 십이운성 정보 */}
                                  {chapter1Data.basis?.twelve_star && (
                                    <div className="basis-item twelve-star-item">
                                      <span className="basis-label">십이운성</span>
                                      <span className="basis-value twelve-star-value">
                                        {chapter1Data.basis?.twelve_star_meaning?.name || chapter1Data.basis?.twelve_star}
                                      </span>
                                    </div>
                                  )}
                                  <p className="basis-description">
                                    {chapter1Data.basis?.description}
                                  </p>
                                </div>
                              </div>

                              {/* 십이운성 해석 박스 */}
                              {chapter1Data.basis?.twelve_star_meaning && (
                                <div className="chapter1-twelve-star-box">
                                  <div className="twelve-star-header">
                                    <span className="twelve-star-icon">🌟</span>
                                    <h5>십이운성(十二運星) 해석: {chapter1Data.basis?.twelve_star_meaning?.name}</h5>
                                  </div>
                                  <div className="twelve-star-content">
                                    <div className="twelve-star-info-row">
                                      <span className="info-label">생애 단계</span>
                                      <span className="info-value">{chapter1Data.basis?.twelve_star_meaning?.life_stage}</span>
                                    </div>
                                    <div className="twelve-star-info-row">
                                      <span className="info-label">키워드</span>
                                      <span className="info-value keywords">{chapter1Data.basis?.twelve_star_meaning?.keywords}</span>
                                    </div>
                                    <div className="twelve-star-meaning">
                                      <p>{chapter1Data.basis?.twelve_star_meaning?.meaning}</p>
                                    </div>
                                    <div className="twelve-star-explanation">
                                      <p className="explanation-note">
                                        <strong>해석:</strong> 일간 <strong>{chapter1Data.basis?.ilgan}</strong>이(가)
                                        일지 <strong>{chapter1Data.basis?.ilji}</strong>에서
                                        '<strong>{chapter1Data.basis?.twelve_star_meaning?.name}</strong>'의 위치에 있습니다.
                                        이는 이 사람의 에너지 상태가 '{chapter1Data.basis?.twelve_star_meaning?.life_stage}' 단계에 있음을 의미합니다.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 리포트 본문 (마크다운) */}
                              <div className="chapter1-report-content">
                                <div
                                  className="markdown-content"
                                  dangerouslySetInnerHTML={{
                                    __html: chapter1Data.content
                                      ?.replace(/#{4,}\s*(.*?)\s*#{0,}/g, '<strong>$1</strong>')
                                      ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                      ?.replace(/\n\n/g, '</p><p>')
                                      ?.replace(/\n/g, '<br/>')
                                      ?.replace(/^/, '<p>')
                                      ?.replace(/$/, '</p>')
                                      ?.replace(/###\s*(.*?)\s*#{0,}(<br\/>|<\/p>)/g, '<h3>$1</h3>')
                                      ?.replace(/##\s*(.*?)\s*#{0,}(<br\/>|<\/p>)/g, '<h2>$1</h2>')
                                      ?.replace(/(^|<p>)#\s*(.*?)\s*#{0,}(<br\/>|<\/p>)/g, '$1<h1>$2</h1>')
                                  }}
                                />
                              </div>

                              {/* 원본 일주 해석 (접이식) */}
                              <details className="chapter1-original">
                                <summary>
                                  <span className="original-icon">📖</span>
                                  원본 일주 해석 데이터 보기
                                </summary>
                                <div className="original-content">
                                  {chapter1Data.original_interpretation}
                                </div>
                              </details>

                              {/* 재생성 및 미리보기 버튼 */}
                              <div className="chapter1-regenerate">
                                <button
                                  className="btn btn-preview"
                                  onClick={() => openMobilePreview(1)}
                                >
                                  <FileText size={14} />
                                  모바일 미리보기
                                </button>
                                <button
                                  className="btn btn-pdf"
                                  onClick={() => downloadChapterPDF(1, chapter1Data)}
                                  disabled={pdfLoading[1]}
                                >
                                  {pdfLoading[1] ? <Loader size={14} className="spinning" /> : <Download size={14} />}
                                  PDF 다운로드
                                </button>
                                <button
                                  className="btn btn-regenerate"
                                  onClick={generateChapter1}
                                  disabled={chapter1Loading}
                                >
                                  <Loader size={14} />
                                  다시 생성하기
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter2' ? (
                        <div className="chapter2-content">
                          {/* 챕터2 생성 버튼 또는 콘텐츠 */}
                          {!chapter2Data && !chapter2Loading && (
                            <div className="chapter2-generate">
                              <p className="chapter2-description">
                                월주(月柱)와 격국(格局)을 기반으로 이 사람의 사회적 역할과 적성을 AI가 분석합니다.
                              </p>
                              <p className="chapter2-subdescription">
                                월지의 격국(천간격국, 지지격국)을 중심으로 해석합니다.
                              </p>

                              {/* 명리학적 근거 조회 영역 */}
                              {!basis2Data && !basis2Loading && (
                                <div className="basis-preview-section">
                                  <button
                                    className="btn btn-basis-preview"
                                    onClick={fetchBasis2}
                                    disabled={basis2Loading}
                                  >
                                    <FileText size={18} />
                                    명리학적 근거 살펴보기
                                  </button>
                                  {basis2Error && (
                                    <p className="basis-error">{basis2Error}</p>
                                  )}
                                </div>
                              )}

                              {/* 명리학적 근거 로딩 */}
                              {basis2Loading && (
                                <div className="basis-loading">
                                  <Loader size={24} className="spinning" />
                                  <p>명리학적 근거를 조회하고 있습니다...</p>
                                </div>
                              )}

                              {/* 명리학적 근거 표시 */}
                              {basis2Data && (
                                <div className="basis-preview-result">
                                  <div className="basis-preview-box">
                                    <div className="basis-header">
                                      <span className="basis-icon">🏛️</span>
                                      <h5>사주명리학적 분석 근거</h5>
                                    </div>
                                    <div className="basis-content">
                                      <div className="basis-item">
                                        <span className="basis-label">분석 기준</span>
                                        <span className="basis-value">{basis2Data.type}</span>
                                      </div>
                                      <div className="basis-item">
                                        <span className="basis-label">월주</span>
                                        <span className="basis-value zodiac-month">
                                          {basis2Data.zodiac_month}
                                          <span className="zodiac-detail">
                                            (월간: {basis2Data.month_sky}, 월지: {basis2Data.month_earth})
                                          </span>
                                        </span>
                                      </div>
                                      <div className="basis-item">
                                        <span className="basis-label">천간격국</span>
                                        <span className="basis-value geju-type">{basis2Data.sky_type || '없음'}</span>
                                      </div>
                                      <div className="basis-item">
                                        <span className="basis-label">지지격국</span>
                                        <span className="basis-value geju-type">{basis2Data.earth_type || '없음'}</span>
                                      </div>
                                      <p className="basis-description">
                                        {basis2Data.description}
                                      </p>
                                    </div>

                                    {/* 격국 정보 */}
                                    {basis2Data.geju_info && (
                                      <div className="geju-preview">
                                        <div className="geju-header">
                                          <span className="geju-icon">📜</span>
                                          <h6>격국 해설</h6>
                                        </div>
                                        <div className="geju-info">
                                          {basis2Data.geju_info.sky_type && (
                                            <div className="geju-item">
                                              <span className="geju-label">천간격국 ({basis2Data.geju_info.sky_type})</span>
                                              <p className="geju-definition">{basis2Data.geju_info.sky_definition}</p>
                                            </div>
                                          )}
                                          {basis2Data.geju_info.earth_type && (
                                            <div className="geju-item">
                                              <span className="geju-label">지지격국 ({basis2Data.geju_info.earth_type})</span>
                                              <p className="geju-definition">{basis2Data.geju_info.earth_definition}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* 격국 성패 코드표 */}
                                    {(basis2Data.decade_lucks || basis2Data.year_lucks) && (
                                      <div className="luck-codes-preview">
                                        <div className="luck-codes-header">
                                          <span className="luck-codes-icon">⚖️</span>
                                          <h6>격국 성패 코드표</h6>
                                        </div>
                                        <p className="luck-codes-description">
                                          각 글자가 격국과 어떤 관계인지 성패 코드로 표시합니다.
                                        </p>

                                        {/* 대운 성패 */}
                                        {basis2Data.decade_lucks && (
                                          <div className="luck-code-section">
                                            <h6 className="luck-section-title">대운(大運) 성패</h6>
                                            <div className="luck-code-row">
                                              <span className="luck-code-label">천간</span>
                                              <div className="luck-code-items">
                                                {basis2Data.decade_lucks.sky?.map((item, idx) => (
                                                  <span key={idx} className={`luck-code-item ${
                                                    item.result === '成' || item.result === '성' ? 'success' :
                                                    item.result === '敗' || item.result === '패' ? 'failure' :
                                                    item.result?.includes('成中有敗') || item.result?.includes('성중유패') ? 'mixed-good' :
                                                    item.result?.includes('敗中有成') || item.result?.includes('패중유성') ? 'mixed-bad' :
                                                    item.result?.includes('成敗共存') || item.result?.includes('성패공존') ? 'neutral' : 'none'
                                                  }`}>
                                                    <span className="luck-char">{item.char}</span>
                                                    <span className="luck-result">{item.result || '―'}</span>
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                            <div className="luck-code-row">
                                              <span className="luck-code-label">지지</span>
                                              <div className="luck-code-items">
                                                {basis2Data.decade_lucks.earth?.map((item, idx) => (
                                                  <span key={idx} className={`luck-code-item ${
                                                    item.result === '成' || item.result === '성' ? 'success' :
                                                    item.result === '敗' || item.result === '패' ? 'failure' :
                                                    item.result?.includes('成中有敗') || item.result?.includes('성중유패') ? 'mixed-good' :
                                                    item.result?.includes('敗中有成') || item.result?.includes('패중유성') ? 'mixed-bad' :
                                                    item.result?.includes('成敗共存') || item.result?.includes('성패공존') ? 'neutral' : 'none'
                                                  }`}>
                                                    <span className="luck-char">{item.char}</span>
                                                    <span className="luck-result">{item.result || '―'}</span>
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* 세운 성패 */}
                                        {basis2Data.year_lucks && (
                                          <div className="luck-code-section">
                                            <h6 className="luck-section-title">세운(歲運) 성패</h6>
                                            <div className="luck-code-row">
                                              <span className="luck-code-label">천간</span>
                                              <div className="luck-code-items">
                                                {basis2Data.year_lucks.sky?.map((item, idx) => (
                                                  <span key={idx} className={`luck-code-item ${
                                                    item.result === '成' || item.result === '성' ? 'success' :
                                                    item.result === '敗' || item.result === '패' ? 'failure' :
                                                    item.result?.includes('成中有敗') || item.result?.includes('성중유패') ? 'mixed-good' :
                                                    item.result?.includes('敗中有成') || item.result?.includes('패중유성') ? 'mixed-bad' :
                                                    item.result?.includes('成敗共存') || item.result?.includes('성패공존') ? 'neutral' : 'none'
                                                  }`}>
                                                    <span className="luck-char">{item.char}</span>
                                                    <span className="luck-result">{item.result || '―'}</span>
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                            <div className="luck-code-row">
                                              <span className="luck-code-label">지지</span>
                                              <div className="luck-code-items">
                                                {basis2Data.year_lucks.earth?.map((item, idx) => (
                                                  <span key={idx} className={`luck-code-item ${
                                                    item.result === '成' || item.result === '성' ? 'success' :
                                                    item.result === '敗' || item.result === '패' ? 'failure' :
                                                    item.result?.includes('成中有敗') || item.result?.includes('성중유패') ? 'mixed-good' :
                                                    item.result?.includes('敗中有成') || item.result?.includes('패중유성') ? 'mixed-bad' :
                                                    item.result?.includes('成敗共存') || item.result?.includes('성패공존') ? 'neutral' : 'none'
                                                  }`}>
                                                    <span className="luck-char">{item.char}</span>
                                                    <span className="luck-result">{item.result || '―'}</span>
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* 성패 코드 범례 */}
                                        <div className="luck-code-legend">
                                          <span className="legend-title">성패 코드:</span>
                                          <span className="legend-item success">成 (성)</span>
                                          <span className="legend-item failure">敗 (패)</span>
                                          <span className="legend-item mixed-good">成中有敗 (성중유패)</span>
                                          <span className="legend-item mixed-bad">敗中有成 (패중유성)</span>
                                          <span className="legend-item neutral">成敗共存 (성패공존)</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 원본 해석 데이터 */}
                                    {basis2Data.original_interpretation && (
                                      <details className="basis-original-data">
                                        <summary>
                                          <span className="original-icon">📖</span>
                                          원본 월주 해석 데이터 보기
                                        </summary>
                                        <div className="original-content">
                                          {basis2Data.original_interpretation}
                                        </div>
                                      </details>
                                    )}
                                  </div>

                                  {/* AI 생성 버튼 */}
                                  <div className="generate-after-basis">
                                    <p className="generate-prompt">위 명리학적 근거를 바탕으로 AI가 상세 리포트를 생성합니다.</p>
                                    <button
                                      className="btn btn-generate-chapter2"
                                      onClick={generateChapter2}
                                      disabled={chapter2Loading}
                                    >
                                      <Search size={18} />
                                      AI 리포트 생성하기
                                    </button>
                                  </div>
                                </div>
                              )}

                              {chapter2Error && (
                                <p className="chapter2-error">{chapter2Error}</p>
                              )}
                            </div>
                          )}

                          {/* 로딩 상태 */}
                          {chapter2Loading && (
                            <div className="chapter2-loading">
                              <Loader size={32} className="spinning" />
                              <p>AI가 월주 및 격국 분석 리포트를 생성하고 있습니다...</p>
                              <p className="loading-note">잠시만 기다려주세요 (약 10-15초 소요)</p>
                            </div>
                          )}

                          {/* 챕터2 콘텐츠 표시 */}
                          {chapter2Data && !chapter2Loading && (
                            <div className="chapter2-result">
                              {/* 명리학적 근거 박스 */}
                              <div className="chapter2-basis-box">
                                <div className="basis-header">
                                  <span className="basis-icon">🏛️</span>
                                  <h5>사주명리학적 분석 근거</h5>
                                </div>
                                <div className="basis-content">
                                  <div className="basis-item">
                                    <span className="basis-label">분석 기준</span>
                                    <span className="basis-value">{chapter2Data.basis?.type}</span>
                                  </div>
                                  <div className="basis-item">
                                    <span className="basis-label">월주</span>
                                    <span className="basis-value zodiac-month">
                                      {chapter2Data.basis?.zodiac_month}
                                      <span className="zodiac-detail">
                                        (월간: {chapter2Data.basis?.month_sky}, 월지: {chapter2Data.basis?.month_earth})
                                      </span>
                                    </span>
                                  </div>
                                  <div className="basis-item">
                                    <span className="basis-label">천간 격국</span>
                                    <span className="basis-value geju-type">
                                      {chapter2Data.basis?.sky_type || '없음'}
                                    </span>
                                  </div>
                                  <div className="basis-item">
                                    <span className="basis-label">지지 격국</span>
                                    <span className="basis-value geju-type">
                                      {chapter2Data.basis?.earth_type || '없음'}
                                    </span>
                                  </div>
                                  <p className="basis-description">
                                    {chapter2Data.basis?.description}
                                  </p>
                                </div>
                              </div>

                              {/* 격국 상세 정보 */}
                              {chapter2Data.geju_info && (
                                <div className="chapter2-geju-info">
                                  <div className="geju-section">
                                    <h6>격국 정보</h6>
                                    {chapter2Data.geju_info.sky_type && (
                                      <div className="geju-item">
                                        <span className="geju-label">천간 격국 ({chapter2Data.geju_info.sky_type})</span>
                                        <p className="geju-definition">
                                          {typeof chapter2Data.geju_info.sky_definition === 'object'
                                            ? chapter2Data.geju_info.sky_definition?.content || chapter2Data.geju_info.sky_definition?.title || JSON.stringify(chapter2Data.geju_info.sky_definition)
                                            : chapter2Data.geju_info.sky_definition}
                                        </p>
                                      </div>
                                    )}
                                    {chapter2Data.geju_info.earth_type && (
                                      <div className="geju-item">
                                        <span className="geju-label">지지 격국 ({chapter2Data.geju_info.earth_type})</span>
                                        <p className="geju-definition">
                                          {typeof chapter2Data.geju_info.earth_definition === 'object'
                                            ? chapter2Data.geju_info.earth_definition?.content || chapter2Data.geju_info.earth_definition?.title || JSON.stringify(chapter2Data.geju_info.earth_definition)
                                            : chapter2Data.geju_info.earth_definition}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 리포트 본문 (마크다운) */}
                              <div className="chapter2-report-content">
                                <div
                                  className="markdown-content"
                                  dangerouslySetInnerHTML={{
                                    __html: chapter2Data.content
                                      ?.replace(/#{4,}\s*(.*?)\s*#{0,}/g, '<strong>$1</strong>')
                                      ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                      ?.replace(/\n\n/g, '</p><p>')
                                      ?.replace(/\n/g, '<br/>')
                                      ?.replace(/^/, '<p>')
                                      ?.replace(/$/, '</p>')
                                      ?.replace(/###\s*(.*?)\s*#{0,}(<br\/>|<\/p>)/g, '<h3>$1</h3>')
                                      ?.replace(/##\s*(.*?)\s*#{0,}(<br\/>|<\/p>)/g, '<h2>$1</h2>')
                                      ?.replace(/(^|<p>)#\s*(.*?)\s*#{0,}(<br\/>|<\/p>)/g, '$1<h1>$2</h1>')
                                  }}
                                />
                              </div>

                              {/* 원본 월주 해석 (접이식) */}
                              {chapter2Data.original_interpretation && (
                                <details className="chapter2-original">
                                  <summary>
                                    <span className="original-icon">📖</span>
                                    원본 월주 해석 데이터 보기
                                  </summary>
                                  <div className="original-content">
                                    {chapter2Data.original_interpretation}
                                  </div>
                                </details>
                              )}

                              {/* 재생성 및 미리보기 버튼 */}
                              <div className="chapter2-regenerate">
                                <button
                                  className="btn btn-preview"
                                  onClick={() => openMobilePreview(2)}
                                >
                                  <FileText size={14} />
                                  모바일 미리보기
                                </button>
                                <button
                                  className="btn btn-pdf"
                                  onClick={() => downloadChapterPDF(2, chapter2Data)}
                                  disabled={pdfLoading[2]}
                                >
                                  {pdfLoading[2] ? <Loader size={14} className="spinning" /> : <Download size={14} />}
                                  PDF 다운로드
                                </button>
                                <button
                                  className="btn btn-regenerate"
                                  onClick={generateChapter2}
                                  disabled={chapter2Loading}
                                >
                                  <Loader size={14} />
                                  다시 생성하기
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter3' ? (
                        <div className="chapter3-content">
                          {chapter3Error && (
                            <div className="chapter-error">
                              <AlertCircle size={20} />
                              <span>{chapter3Error}</span>
                            </div>
                          )}

                          {!chapter3Data && !chapter3Loading && !chapter3Error && (
                            <div className="chapter3-generate">
                              <p className="chapter3-description">
                                전체 대운의 흐름을 시각화합니다.
                              </p>
                              <p className="chapter3-subdescription">
                                첫 대운부터 마지막 대운까지 천간/지지의 성패를 AI가 분석합니다.
                              </p>

                              {/* AI 생성 버튼 - 바로 표시 */}
                              <div className="generate-direct">
                                <button
                                  className="btn-generate-chapter3"
                                  onClick={generateChapter3WithAutoSave}
                                  disabled={chapter3Loading}
                                >
                                  <Sparkles size={18} />
                                  AI 대운 분석 생성하기
                                </button>
                                <button
                                  className="btn-generate-chapter3 btn-check-only"
                                  onClick={generateChapter3}
                                  disabled={chapter3Loading}
                                >
                                  <Search size={18} />
                                  로직 확인만 (저장 안함)
                                </button>
                              </div>
                            </div>
                          )}

                          {chapter3Loading && (
                            <div className="generation-overlay">
                              <div className="generation-modal">
                                <div className="generation-animation">
                                  <div className="generation-circle">
                                    <span className="generation-icon">🔮</span>
                                  </div>
                                  <div className="generation-pulse"></div>
                                  <div className="generation-pulse delay-1"></div>
                                  <div className="generation-pulse delay-2"></div>
                                </div>
                                <div className="generation-text">
                                  <h3>대운흐름 분석 중</h3>
                                  <p className="generation-chapter-title">
                                    {chapter3Progress?.message || '전체 대운의 성패를 분석하고 있습니다...'}
                                  </p>
                                  {chapter3Progress && (
                                    <div className="generation-progress">
                                      <div className="progress-bar">
                                        <div
                                          className="progress-fill"
                                          style={{ width: `${chapter3Progress.progress || 0}%` }}
                                        />
                                      </div>
                                      <span className="progress-text">{chapter3Progress.progress || 0}%</span>
                                    </div>
                                  )}
                                  <p className="generation-note">잠시만 기다려주세요 (최대 5분 소요)</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {chapter3Data && (
                            <div className="chapter3-result">
                              {/* 대운 흐름 그래프 */}
                              <div className="decade-flow-container">
                                <div className="decade-flow-header">
                                  <h5>📊 대운 성패 흐름</h5>
                                  <p className="decade-flow-description">
                                    천간(정신적 영역)과 지지(현실적 영역)의 성패 점수를 시각화한 그래프입니다.
                                    양수는 성(成), 음수는 패(敗)를 의미합니다.
                                  </p>
                                </div>

                                {/* 전체 대운 타임라인 - 한눈에 보기 */}
                                <div className="decade-timeline-overview">
                                  {chapter3Data.decade_flow?.map((decade, idx) => {
                                    const getResultClass = (result) => {
                                      if (!result || typeof result !== 'string') return 'none';
                                      if (result === '成' || result === '성') return 'success';
                                      if (result === '敗' || result === '패') return 'failure';
                                      if (result.includes('成中有敗') || result.includes('성중유패')) return 'mixed-good';
                                      if (result.includes('敗中有成') || result.includes('패중유성')) return 'mixed-bad';
                                      if (result.includes('成敗共存') || result.includes('성패공존')) return 'neutral';
                                      return 'none';
                                    };

                                    const getResultSymbol = (result) => {
                                      if (!result || typeof result !== 'string') return '―';
                                      if (result === '成' || result === '성') return '●';
                                      if (result === '敗' || result === '패') return '✕';
                                      if (result.includes('成中有敗') || result.includes('성중유패')) return '✕';
                                      if (result.includes('敗中有成') || result.includes('패중유성')) return '●';
                                      if (result.includes('成敗共存') || result.includes('성패공존')) return '◐';
                                      return '―';
                                    };

                                    // 성공/실패 판단 (성, 패중유성 = O / 패, 성중유패 = X)
                                    const isSuccess = (result) => {
                                      if (!result || typeof result !== 'string') return false;
                                      if (result === '成' || result === '성') return true;
                                      if (result.includes('敗中有成') || result.includes('패중유성')) return true;
                                      return false;
                                    };
                                    const isFailure = (result) => {
                                      if (!result || typeof result !== 'string') return false;
                                      if (result === '敗' || result === '패') return true;
                                      if (result.includes('成中有敗') || result.includes('성중유패')) return true;
                                      return false;
                                    };

                                    const skyIsO = isSuccess(decade.sky_result);
                                    const skyIsX = isFailure(decade.sky_result);
                                    const earthIsO = isSuccess(decade.earth_result);
                                    const earthIsX = isFailure(decade.earth_result);

                                    // 종합 결과: 둘 다 O → O, 둘 다 X → X, 하나만 O → ▲
                                    let overallSymbol = '―';
                                    let overallClass = 'overall-neutral';
                                    if (skyIsO && earthIsO) {
                                      overallSymbol = '●';
                                      overallClass = 'overall-success';
                                    } else if (skyIsX && earthIsX) {
                                      overallSymbol = '✕';
                                      overallClass = 'overall-failure';
                                    } else if (skyIsO || earthIsO) {
                                      overallSymbol = '▲';
                                      overallClass = 'overall-mixed';
                                    } else if (skyIsX || earthIsX) {
                                      overallSymbol = '▼';
                                      overallClass = 'overall-bad';
                                    }

                                    return (
                                      <div
                                        key={idx}
                                        className={`timeline-item ${decade.is_current ? 'current' : ''} ${overallClass}`}
                                      >
                                        {/* 상단: 나이 */}
                                        <div className="timeline-age">{decade.start_age}세</div>

                                        {/* 천간 성패 */}
                                        <div className={`timeline-result sky ${getResultClass(decade.sky_result)}`}>
                                          <span className="timeline-char">{decade.sky}</span>
                                          <span className="timeline-symbol">{getResultSymbol(decade.sky_result)}</span>
                                        </div>

                                        {/* 지지 성패 */}
                                        <div className={`timeline-result earth ${getResultClass(decade.earth_result)}`}>
                                          <span className="timeline-char">{decade.earth}</span>
                                          <span className="timeline-symbol">{getResultSymbol(decade.earth_result)}</span>
                                        </div>

                                        {/* 종합 결과 */}
                                        <div className={`timeline-overall ${overallClass}`}>
                                          <span className="overall-symbol">{overallSymbol}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* 범례 */}
                                <div className="graph-legend-container">
                                  <div className="graph-legend">
                                    <div className="legend-group">
                                      <div className="legend-group-title">영역</div>
                                      <div className="legend-items">
                                        <div className="legend-item">
                                          <span className="legend-color sky"></span>
                                          <span className="legend-text">천간</span>
                                        </div>
                                        <div className="legend-item">
                                          <span className="legend-color earth"></span>
                                          <span className="legend-text">지지</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="legend-divider"></div>
                                    <div className="legend-group">
                                      <div className="legend-group-title">성패</div>
                                      <div className="legend-items">
                                        <div className="legend-item">
                                          <span className="legend-symbol success">●</span>
                                          <span className="legend-text">成</span>
                                        </div>
                                        <div className="legend-item">
                                          <span className="legend-symbol failure">✕</span>
                                          <span className="legend-text">敗</span>
                                        </div>
                                        <div className="legend-item">
                                          <span className="legend-symbol failure">✕</span>
                                          <span className="legend-text">성중유패</span>
                                        </div>
                                        <div className="legend-item">
                                          <span className="legend-symbol mixed">●</span>
                                          <span className="legend-text">패중유성</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="legend-divider"></div>
                                    <div className="legend-group">
                                      <div className="legend-item current">
                                        <span className="legend-color current-indicator"></span>
                                        <span className="legend-text">현재 대운</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* 억부/조후 분석 섹션 */}
                                <div className="eokbu-johu-section">
                                  <div className="section-header">
                                    <h5>💫 억부/조후 분석 (관계·건강·행복)</h5>
                                    <p className="section-description">
                                      신강신약(억부)과 조후용신 충족도를 통해 관계운, 건강운, 행복지수를 분석합니다.
                                    </p>
                                    {chapter3Data.basis?.base_strength && (
                                      <div className="base-strength-info">
                                        <span className="label">원국 강약:</span>
                                        <span className={`strength-badge ${chapter3Data.basis.base_strength.level === '중화' ? 'balanced' : chapter3Data.basis.base_strength.level?.includes('신강') ? 'strong' : 'weak'}`}>
                                          {chapter3Data.basis.base_strength.level}
                                        </span>
                                        <span className="score">({chapter3Data.basis.base_strength.score}점)</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* 억부/조후 타임라인 */}
                                  <div className="eokbu-johu-timeline">
                                    {chapter3Data.decade_flow?.map((decade, idx) => {
                                      const strengthChange = decade.strength?.change || 0;
                                      const tempScore = decade.temperature?.decade_score || 50;
                                      const tempActual = decade.temperature?.decade_actual_temp;
                                      const tempLabel = decade.temperature?.decade_label;
                                      const lifeAreas = decade.life_areas || {};

                                      const getStrengthClass = () => {
                                        if (!decade.strength) return 'none';
                                        const level = decade.strength.decade_level;
                                        if (level === '중화') return 'balanced';
                                        if (level?.includes('극신강') || level?.includes('극신약')) return 'extreme';
                                        if (level?.includes('신강')) return 'strong';
                                        if (level?.includes('신약')) return 'weak';
                                        return 'none';
                                      };

                                      // 온도 레벨 결정 (0-100 점수 기준)
                                      const getTempLevel = () => {
                                        if (tempScore <= 20) return { level: '매우 추움', icon: '❄️', class: 'very-cold' };
                                        if (tempScore <= 40) return { level: '추움', icon: '🌨️', class: 'cold' };
                                        if (tempScore <= 65) return { level: '적당함', icon: '🌤️', class: 'moderate' };
                                        if (tempScore <= 85) return { level: '더움', icon: '☀️', class: 'hot' };
                                        return { level: '매우 더움', icon: '🔥', class: 'very-hot' };
                                      };

                                      const tempInfo = getTempLevel();

                                      // 억부 레벨에 따른 이모지
                                      const getStrengthEmoji = () => {
                                        const level = decade.strength?.decade_level;
                                        if (!level) return '❓';
                                        if (level.includes('극신강')) return '🔥';
                                        if (level.includes('신강')) return '💪';
                                        if (level === '중화') return '⚖️';
                                        if (level.includes('극신약')) return '💧';
                                        if (level.includes('신약')) return '🌱';
                                        return '❓';
                                      };

                                      const decadeScore = decade.strength?.decade_score || 50;

                                      return (
                                        <div
                                          key={idx}
                                          className={`eokbu-johu-item ${decade.is_current ? 'current' : ''}`}
                                        >
                                          <div className="ej-header">
                                            <span className="ej-ganji">{decade.ganji}</span>
                                            <span className="ej-age">{decade.start_age}세</span>
                                          </div>

                                          {/* 억부 (신강신약) - 더 명확하게 */}
                                          <div className={`ej-strength ${getStrengthClass()}`}>
                                            <div className="ej-strength-main">
                                              <span className="ej-emoji">{getStrengthEmoji()}</span>
                                              <span className="ej-level-text">{decade.strength?.decade_level || '계산중'}</span>
                                            </div>
                                            <div className="ej-strength-bar">
                                              <div
                                                className="ej-strength-fill"
                                                style={{ width: `${decadeScore}%` }}
                                              ></div>
                                              <span className="ej-strength-marker" style={{ left: '50%' }}>|</span>
                                            </div>
                                            <div className="ej-strength-score">{decadeScore}점</div>
                                          </div>

                                          {/* 온도 (조후) */}
                                          <div className={`ej-johu ${tempInfo.class}`}>
                                            <div className="ej-johu-main">
                                              <span className="ej-johu-icon">{tempInfo.icon}</span>
                                              <span className="ej-johu-text">{tempLabel || tempInfo.level}</span>
                                            </div>
                                            <div className="ej-johu-score">{tempActual !== undefined ? `${tempActual}°C` : `${tempScore}점`}</div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* 억부/조후 범례 */}
                                  <div className="eokbu-johu-legend">
                                    <div className="legend-group">
                                      <span className="legend-title">억부 (신강신약):</span>
                                      <span className="legend-badge extreme">🔥 극신강</span>
                                      <span className="legend-badge strong">💪 신강</span>
                                      <span className="legend-badge balanced">⚖️ 중화</span>
                                      <span className="legend-badge weak">🌱 신약</span>
                                      <span className="legend-badge extreme">💧 극신약</span>
                                    </div>
                                    <div className="legend-group">
                                      <span className="legend-title">온도 (조후):</span>
                                      <span className="legend-badge very-cold">❄️ 매우 추움 (0-20)</span>
                                      <span className="legend-badge cold">🌨️ 추움 (21-40)</span>
                                      <span className="legend-badge moderate">🌤️ 적당함 (41-65)</span>
                                      <span className="legend-badge hot">☀️ 더움 (66-85)</span>
                                      <span className="legend-badge very-hot">🔥 매우 더움 (86-100)</span>
                                    </div>
                                    <div className="legend-group">
                                      <span className="legend-title">생활영역:</span>
                                      <span className="legend-item">❤️ 관계운</span>
                                      <span className="legend-item">💪 건강운</span>
                                      <span className="legend-item">😊 행복지수</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 대운 상세 테이블 */}
                                <div className="decade-flow-table">
                                  <h5>📋 대운별 상세 분석</h5>
                                  <div className="table-wrapper">
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>대운</th>
                                          <th>나이</th>
                                          <th>천간</th>
                                          <th>천간 성패</th>
                                          <th>지지</th>
                                          <th>지지 성패</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {chapter3Data.decade_flow?.map((decade, idx) => (
                                          <tr key={idx} className={decade.is_current ? 'current-row' : ''}>
                                            <td className="ganji-cell">
                                              <span className="ganji-text">{decade.ganji}</span>
                                              {decade.is_current && <span className="current-badge">현재</span>}
                                            </td>
                                            <td>{decade.start_age}~{decade.end_age}세</td>
                                            <td>
                                              <span className="element-badge sky">{decade.sky}</span>
                                              <span className="sipsin-text">{decade.sky_sipsin}</span>
                                            </td>
                                            <td>
                                              <span className={`result-badge ${
                                                typeof decade.sky_result === 'string' ? (
                                                  decade.sky_result.includes('成中有敗') || decade.sky_result.includes('성중유패') ? 'mixed-good' :
                                                  decade.sky_result.includes('敗中有成') || decade.sky_result.includes('패중유성') ? 'mixed-bad' :
                                                  decade.sky_result === '成' || decade.sky_result === '성' ? 'success' :
                                                  decade.sky_result === '敗' || decade.sky_result === '패' ? 'failure' : 'mixed'
                                                ) : 'none'
                                              }`}>
                                                {typeof decade.sky_result === 'string' ? decade.sky_result : '-'}
                                              </span>
                                            </td>
                                            <td>
                                              <span className="element-badge earth">{decade.earth}</span>
                                              <span className="sipsin-text">{decade.earth_sipsin}</span>
                                            </td>
                                            <td>
                                              <span className={`result-badge ${
                                                typeof decade.earth_result === 'string' ? (
                                                  decade.earth_result.includes('成中有敗') || decade.earth_result.includes('성중유패') ? 'mixed-good' :
                                                  decade.earth_result.includes('敗中有成') || decade.earth_result.includes('패중유성') ? 'mixed-bad' :
                                                  decade.earth_result === '成' || decade.earth_result === '성' ? 'success' :
                                                  decade.earth_result === '敗' || decade.earth_result === '패' ? 'failure' : 'mixed'
                                                ) : 'none'
                                              }`}>
                                                {typeof decade.earth_result === 'string' ? decade.earth_result : '-'}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* 대운별 운세 해석 (격국/억부/조후 통합) */}
                                {chapter3Data.decade_flow && (
                                  <div className="decade-interpretations-section">
                                    <h5>🔮 대운별 운세 해석</h5>
                                    <p className="section-description">각 대운의 격국(천간/지지), 억부, 조후 해석을 확인하고 수정할 수 있습니다.</p>
                                    <div className="interpretations-list">
                                      {chapter3Data.decade_flow?.map((decade, idx) => (
                                        <div key={idx} className={`interpretation-card ${decade.is_current ? 'current' : ''}`}>
                                          <div className="interpretation-card-header">
                                            <span className="card-ganji">{decade.ganji}</span>
                                            <span className="card-age">{decade.start_age}~{decade.end_age}세</span>
                                            {decade.is_current && <span className="card-current-badge">현재</span>}
                                            {decade.has_custom_interpretation && <span className="card-custom-badge">수정됨</span>}
                                            {/* 종합 판정 배지 */}
                                            <span className={`overall-rating-badge ${getOverallRatingClass(decade)}`}>
                                              {getOverallRatingText(decade)}
                                            </span>
                                          </div>

                                          {/* 키워드 */}
                                          {decade.keywords?.length > 0 && (
                                            <div className="decade-keywords-section">
                                              {decade.keywords.map((kw, kIdx) => (
                                                <span key={kIdx} className="keyword-badge">{kw}</span>
                                              ))}
                                            </div>
                                          )}

                                          <div className="interpretation-areas">
                                            {/* 격국 - 천간 */}
                                            {(() => {
                                              const area = 'gyeokguk_sky';
                                              const interp = decade.interpretations?.[area];
                                              const isEditing = editingDecadeInterpretation?.decadeIndex === idx && editingDecadeInterpretation?.area === area;
                                              const displayText = interp?.effective_interpretation || decade.sky_analysis;

                                              return (
                                                <div className={`interpretation-area gyeokguk-sky-area ${interp?.has_custom ? 'custom' : ''}`}>
                                                  <div className="area-header">
                                                    <span className="area-label">
                                                      <span className="block-char">{decade.sky}</span> 천간 격국
                                                    </span>
                                                    <span className={`single-rating-badge ${getSingleRating(decade.sky_result, decade.sky_score, decade.sky_degree).class}`}>
                                                      {getSingleRating(decade.sky_result, decade.sky_score, decade.sky_degree).text}
                                                    </span>
                                                    {interp?.has_custom && <span className="custom-indicator">수정됨</span>}
                                                    {!isEditing && (
                                                      <button
                                                        className="btn-edit-area"
                                                        onClick={() => startEditingDecadeInterpretation(
                                                          idx,
                                                          area,
                                                          decade.ganji,
                                                          interp?.primary_interpretation || displayText || ''
                                                        )}
                                                      >
                                                        <Edit3 size={12} /> 수정
                                                      </button>
                                                    )}
                                                  </div>

                                                  {isEditing ? (
                                                    <DecadeInterpretationEditor
                                                      initialText={interp?.primary_interpretation || displayText || ''}
                                                      placeholder="천간 격국 해석을 입력하세요..."
                                                      onSavePrimary={(text) => saveDecadeInterpretation(false, text)}
                                                      onSaveFinal={(text) => saveDecadeInterpretation(true, text)}
                                                      onAiRewrite={(text) => regenerateDecadeInterpretationWithAi(text)}
                                                      onCancel={cancelEditingDecadeInterpretation}
                                                      isSaving={decadeInterpretationSaving}
                                                      isAiGenerating={decadeAiGenerating}
                                                    />
                                                  ) : (
                                                    <div className="area-content">
                                                      <p>{displayText || '해석이 없습니다.'}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}

                                            {/* 격국 - 지지 */}
                                            {(() => {
                                              const area = 'gyeokguk_earth';
                                              const interp = decade.interpretations?.[area];
                                              const isEditing = editingDecadeInterpretation?.decadeIndex === idx && editingDecadeInterpretation?.area === area;
                                              const displayText = interp?.effective_interpretation || decade.earth_analysis;

                                              return (
                                                <div className={`interpretation-area gyeokguk-earth-area ${interp?.has_custom ? 'custom' : ''}`}>
                                                  <div className="area-header">
                                                    <span className="area-label">
                                                      <span className="block-char">{decade.earth}</span> 지지 격국
                                                    </span>
                                                    <span className={`single-rating-badge ${getSingleRating(decade.earth_result, decade.earth_score, decade.earth_degree).class}`}>
                                                      {getSingleRating(decade.earth_result, decade.earth_score, decade.earth_degree).text}
                                                    </span>
                                                    {interp?.has_custom && <span className="custom-indicator">수정됨</span>}
                                                    {!isEditing && (
                                                      <button
                                                        className="btn-edit-area"
                                                        onClick={() => startEditingDecadeInterpretation(
                                                          idx,
                                                          area,
                                                          decade.ganji,
                                                          interp?.primary_interpretation || displayText || ''
                                                        )}
                                                      >
                                                        <Edit3 size={12} /> 수정
                                                      </button>
                                                    )}
                                                  </div>

                                                  {isEditing ? (
                                                    <DecadeInterpretationEditor
                                                      initialText={interp?.primary_interpretation || displayText || ''}
                                                      placeholder="지지 격국 해석을 입력하세요..."
                                                      onSavePrimary={(text) => saveDecadeInterpretation(false, text)}
                                                      onSaveFinal={(text) => saveDecadeInterpretation(true, text)}
                                                      onAiRewrite={(text) => regenerateDecadeInterpretationWithAi(text)}
                                                      onCancel={cancelEditingDecadeInterpretation}
                                                      isSaving={decadeInterpretationSaving}
                                                      isAiGenerating={decadeAiGenerating}
                                                    />
                                                  ) : (
                                                    <div className="area-content">
                                                      <p>{displayText || '해석이 없습니다.'}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}

                                            {/* 억부 */}
                                            {(() => {
                                              const area = 'eokbu';
                                              const interp = decade.interpretations?.[area];
                                              const isEditing = editingDecadeInterpretation?.decadeIndex === idx && editingDecadeInterpretation?.area === area;

                                              return (
                                                <div className={`interpretation-area eokbu-area ${interp?.has_custom ? 'custom' : ''}`}>
                                                  <div className="area-header">
                                                    <span className="area-label">억부 (신강/신약)</span>
                                                    {(decade.eokbu_display || decade.strength) && (
                                                      <span className={`strength-mini-badge ${decade.strength?.level === 'balanced' ? 'balanced' : decade.strength?.level?.includes('strong') ? 'strong' : 'weak'}`}>
                                                        {decade.eokbu_display || decade.strength?.level_name || decade.strength?.level}
                                                      </span>
                                                    )}
                                                    {interp?.has_custom && <span className="custom-indicator">수정됨</span>}
                                                    {!isEditing && (
                                                      <button
                                                        className="btn-edit-area"
                                                        onClick={() => startEditingDecadeInterpretation(
                                                          idx,
                                                          area,
                                                          decade.ganji,
                                                          interp?.primary_interpretation || interp?.effective_interpretation || ''
                                                        )}
                                                      >
                                                        <Edit3 size={12} /> 수정
                                                      </button>
                                                    )}
                                                  </div>

                                                  {isEditing ? (
                                                    <DecadeInterpretationEditor
                                                      initialText={interp?.primary_interpretation || interp?.effective_interpretation || ''}
                                                      placeholder="억부 해석을 입력하세요..."
                                                      onSavePrimary={(text) => saveDecadeInterpretation(false, text)}
                                                      onSaveFinal={(text) => saveDecadeInterpretation(true, text)}
                                                      onAiRewrite={(text) => regenerateDecadeInterpretationWithAi(text)}
                                                      onCancel={cancelEditingDecadeInterpretation}
                                                      isSaving={decadeInterpretationSaving}
                                                      isAiGenerating={decadeAiGenerating}
                                                    />
                                                  ) : (
                                                    <div className="area-content">
                                                      <p>{interp?.effective_interpretation || decade.strength?.description || '해석이 없습니다.'}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}

                                            {/* 조후 */}
                                            {(() => {
                                              const area = 'johu';
                                              const interp = decade.interpretations?.[area];
                                              const isEditing = editingDecadeInterpretation?.decadeIndex === idx && editingDecadeInterpretation?.area === area;
                                              const isEspeciallyGood = decade.temperature?.is_especially_good;

                                              return (
                                                <div className={`interpretation-area johu-area ${interp?.has_custom ? 'custom' : ''} ${isEspeciallyGood ? 'especially-good' : ''}`}>
                                                  <div className="area-header">
                                                    <span className="area-label">조후 (기후/온도)</span>
                                                    {(decade.johu_display || decade.temperature) && (
                                                      <span className={`temp-mini-badge ${decade.temperature?.level === 'moderate' || decade.temperature?.level === 'optimal' ? 'optimal' : decade.temperature?.level?.includes('hot') ? 'hot' : 'cold'}`}>
                                                        {decade.johu_display || `${decade.temperature?.level_name || decade.temperature?.level}${decade.temp_actual !== undefined ? ` (${decade.temp_actual}°C)` : ''}`}
                                                      </span>
                                                    )}
                                                    {isEspeciallyGood && <span className="especially-good-badge">⭐ 특히 좋음</span>}
                                                    {interp?.has_custom && <span className="custom-indicator">수정됨</span>}
                                                    {!isEditing && (
                                                      <button
                                                        className="btn-edit-area"
                                                        onClick={() => startEditingDecadeInterpretation(
                                                          idx,
                                                          area,
                                                          decade.ganji,
                                                          interp?.primary_interpretation || interp?.effective_interpretation || ''
                                                        )}
                                                      >
                                                        <Edit3 size={12} /> 수정
                                                      </button>
                                                    )}
                                                  </div>

                                                  {isEditing ? (
                                                    <DecadeInterpretationEditor
                                                      initialText={interp?.primary_interpretation || interp?.effective_interpretation || ''}
                                                      placeholder="조후 해석을 입력하세요..."
                                                      onSavePrimary={(text) => saveDecadeInterpretation(false, text)}
                                                      onSaveFinal={(text) => saveDecadeInterpretation(true, text)}
                                                      onAiRewrite={(text) => regenerateDecadeInterpretationWithAi(text)}
                                                      onCancel={cancelEditingDecadeInterpretation}
                                                      isSaving={decadeInterpretationSaving}
                                                      isAiGenerating={decadeAiGenerating}
                                                    />
                                                  ) : (
                                                    <div className="area-content">
                                                      {isEspeciallyGood && decade.temperature?.especially_good_reason && (
                                                        <p className="especially-good-reason">⭐ {decade.temperature.especially_good_reason}</p>
                                                      )}
                                                      <p>{interp?.effective_interpretation || decade.temperature?.description || '해석이 없습니다.'}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}

                                            {/* 영역별 조언 */}
                                            {decade.life_areas && Object.keys(decade.life_areas).length > 0 && (
                                              <div className="life-areas-summary">
                                                {decade.life_areas.career && (
                                                  <div className="life-area-item"><strong>💼 사업:</strong> {decade.life_areas.career}</div>
                                                )}
                                                {decade.life_areas.wealth && (
                                                  <div className="life-area-item"><strong>💰 재물:</strong> {decade.life_areas.wealth}</div>
                                                )}
                                                {decade.life_areas.relationship && (
                                                  <div className="life-area-item"><strong>❤️ 관계:</strong> {decade.life_areas.relationship}</div>
                                                )}
                                                {decade.life_areas.health && (
                                                  <div className="life-area-item"><strong>🏥 건강:</strong> {decade.life_areas.health}</div>
                                                )}
                                              </div>
                                            )}

                                            {/* 조언 & 주의 */}
                                            {(decade.advice || decade.caution) && (
                                              <div className="advice-caution-summary">
                                                {decade.advice && (
                                                  <div className="advice-item">💡 <strong>조언:</strong> {decade.advice}</div>
                                                )}
                                                {decade.caution && (
                                                  <div className="caution-item">⚠️ <strong>주의:</strong> {decade.caution}</div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 재생성 및 미리보기 버튼 */}
                              <div className="chapter3-regenerate">
                                <button
                                  className="btn btn-check-logic"
                                  onClick={generateChapter3}
                                  disabled={chapter3Loading}
                                >
                                  <Search size={14} />
                                  로직 확인만
                                </button>
                                <button
                                  className="btn btn-regenerate"
                                  onClick={generateChapter3WithAutoSave}
                                  disabled={chapter3Loading}
                                >
                                  <Sparkles size={14} />
                                  다시 생성 + 저장
                                </button>
                                <button
                                  className="btn btn-preview"
                                  onClick={() => openMobilePreview(3)}
                                >
                                  <FileText size={14} />
                                  모바일 미리보기
                                </button>
                                <button
                                  className="btn btn-pdf"
                                  onClick={() => downloadChapterPDF(3, chapter3Data)}
                                  disabled={pdfLoading[3]}
                                >
                                  {pdfLoading[3] ? <Loader size={14} className="spinning" /> : <Download size={14} />}
                                  PDF 다운로드
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter4' ? (
                        <div className="chapter4-content five-year-fortune">
                          {validationResult ? (
                            <FiveYearFortuneEditor
                              ref={fiveYearFortuneEditorRef}
                              orderId={id}
                              validationResult={validationResult}
                              initialData={fiveYearFortuneData?.yearlyFiveYearFortunes || []}
                              onChange={(data) => setFiveYearFortuneData(data)}
                            />
                          ) : (
                            <div className="chapter4-generate">
                              <p className="chapter4-description">
                                향후 {progressYearCount}년간의 운세 흐름을 분석합니다.
                              </p>
                              <p className="chapter4-subdescription">
                                격국 성패, 억부, 조후, 합형충파해를 종합 분석합니다. 먼저 사주 검증을 실행해주세요.
                              </p>
                              <button
                                className="btn btn-validate-first"
                                onClick={() => {
                                  const validateBtn = document.querySelector('.btn-validate');
                                  if (validateBtn) validateBtn.scrollIntoView({ behavior: 'smooth' });
                                }}
                              >
                                사주 검증하러 가기
                              </button>
                            </div>
                          )}
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter5' ? (
                        <div className="chapter5-content fortune-chapter">
                          {chapter4Error && (
                            <div className="chapter-error">
                              <AlertCircle size={20} />
                              <span>{chapter4Error}</span>
                            </div>
                          )}

                          {/* 재물운 비동기 생성 진행률 표시 */}
                          {fortuneProgress && (
                            <div className="async-progress-overlay">
                              <div className="generation-loading">
                                <div className="generation-spinner"></div>
                                <div className="generation-text">
                                  <h3>재물운 분석 중</h3>
                                  <p className="generation-chapter-title">
                                    {fortuneProgress.message || '재물운을 분석하고 있습니다...'}
                                  </p>
                                  <div className="generation-progress">
                                    <div className="progress-bar">
                                      <div
                                        className="progress-fill"
                                        style={{ width: `${fortuneProgress.progress || 0}%` }}
                                      />
                                    </div>
                                    <span className="progress-text">{fortuneProgress.progress || 0}%</span>
                                  </div>
                                  <p className="generation-note">잠시만 기다려주세요 (최대 5분 소요)</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 재물운 편집기 - 사주 검증이 완료된 경우 표시 */}
                          {validationResult ? (
                            <FortuneEditor
                              ref={fortuneEditorRef}
                              orderId={id}
                              validationResult={validationResult}
                              initialData={fortuneEditorData}
                              initialBaseFortune={fortuneBaseFortune}
                              onChange={(data) => {
                                if (data.yearlyFortunes) {
                                  setFortuneEditorData(data.yearlyFortunes);
                                }
                                if (data.baseFortune) {
                                  setFortuneBaseFortune(data.baseFortune);
                                }
                              }}
                            />
                          ) : (
                            <div className="chapter5-generate">
                              <p className="chapter5-description">
                                향후 {progressYearCount}년간의 재물운을 분석합니다.
                              </p>
                              <p className="chapter5-subdescription">
                                격국 성패 분석 결과를 바탕으로 AI가 상세 재물운을 생성합니다. 먼저 사주 검증을 실행해주세요.
                              </p>
                              <button
                                className="btn btn-validate-first"
                                onClick={() => {
                                  const validateBtn = document.querySelector('.btn-validate');
                                  if (validateBtn) validateBtn.scrollIntoView({ behavior: 'smooth' });
                                }}
                              >
                                사주 검증하러 가기
                              </button>
                            </div>
                          )}

                          {/* 저장된 재물운 데이터가 있을 때 PDF/미리보기 버튼 표시 */}
                          {chapter4Data && chapter4Data.fortune_years && (
                            <div className="chapter5-saved-actions">
                              <div className="saved-status">
                                <span className="status-icon">✅</span>
                                <span className="status-text">
                                  {Object.keys(chapter4Data.fortune_years).length}년치 재물운이 저장되었습니다.
                                </span>
                              </div>
                              <div className="chapter5-regenerate">
                                <button
                                  className="btn btn-preview"
                                  onClick={() => openMobilePreview(5)}
                                >
                                  <FileText size={14} />
                                  모바일 미리보기
                                </button>
                                <button
                                  className="btn btn-pdf"
                                  onClick={() => downloadChapterPDF(5, chapter4Data)}
                                  disabled={pdfLoading[5]}
                                >
                                  {pdfLoading[5] ? <Loader size={14} className="spinning" /> : <Download size={14} />}
                                  PDF 다운로드
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter6' ? (
                        <div className="chapter6-content career-chapter">
                          {/* 직업운 비동기 생성 진행률 표시 */}
                          {careerProgress && (
                            <div className="async-progress-overlay">
                              <div className="generation-loading">
                                <div className="generation-spinner"></div>
                                <div className="generation-text">
                                  <h3>직업운 분석 중</h3>
                                  <p className="generation-chapter-title">
                                    {careerProgress.message || '직업운을 분석하고 있습니다...'}
                                  </p>
                                  <div className="generation-progress">
                                    <div className="progress-bar">
                                      <div
                                        className="progress-fill"
                                        style={{ width: `${careerProgress.progress || 0}%` }}
                                      />
                                    </div>
                                    <span className="progress-text">{careerProgress.progress || 0}%</span>
                                  </div>
                                  <p className="generation-note">잠시만 기다려주세요 (최대 5분 소요)</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 직업운/사회운 - CareerEditor 사용 */}
                          <CareerEditor
                            ref={careerEditorRef}
                            orderId={id}
                            validationResult={validationResult}
                            initialData={careerEditorData}
                            initialBaseCareer={careerBaseCareer}
                            onChange={(data) => {
                              setCareerEditorData(data.yearlyCareers || []);
                              setCareerBaseCareer(data.baseCareer || null);
                            }}
                          />
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter7' ? (
                        <div className="chapter7-content">
                          {/* 연애운 비동기 생성 진행률 표시 */}
                          {loveProgress && (
                            <div className="async-progress-overlay">
                              <div className="generation-loading">
                                <div className="generation-spinner"></div>
                                <div className="generation-text">
                                  <h3>연애운 분석 중</h3>
                                  <p className="generation-chapter-title">
                                    {loveProgress.message || '연애운을 분석하고 있습니다...'}
                                  </p>
                                  <div className="generation-progress">
                                    <div className="progress-bar">
                                      <div
                                        className="progress-fill"
                                        style={{ width: `${loveProgress.progress || 0}%` }}
                                      />
                                    </div>
                                    <span className="progress-text">{loveProgress.progress || 0}%</span>
                                  </div>
                                  <p className="generation-note">잠시만 기다려주세요 (최대 5분 소요)</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <LoveFortuneEditor
                            ref={loveFortuneEditorRef}
                            orderId={order.id}
                            validationResult={validationResult}
                            initialData={loveFortuneData}
                            onChange={(data) => setLoveFortuneData(data)}
                            yearCount={progressYearCount}
                          />
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter8' ? (
                        <div className="chapter8-content">
                          {/* 코칭 비동기 생성 진행률 표시 */}
                          {coachingProgress && (
                            <div className="async-progress-overlay">
                              <div className="generation-loading">
                                <div className="generation-spinner"></div>
                                <div className="generation-text">
                                  <h3>코칭 생성 중</h3>
                                  <p className="generation-chapter-title">
                                    {coachingProgress.message || '코칭 포인트를 생성하고 있습니다...'}
                                  </p>
                                  <div className="generation-progress">
                                    <div className="progress-bar">
                                      <div
                                        className="progress-fill"
                                        style={{ width: `${coachingProgress.progress || 0}%` }}
                                      />
                                    </div>
                                    <span className="progress-text">{coachingProgress.progress || 0}%</span>
                                  </div>
                                  <p className="generation-note">잠시만 기다려주세요 (최대 5분 소요)</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <CoachingEditor
                            ref={coachingEditorRef}
                            orderId={order.id}
                            validationResult={validationResult}
                            initialData={coachingData}
                            onChange={(data) => setCoachingData(data)}
                          />
                        </div>
                      ) : reportChapters[selectedChapter].id === 'chapter_qa' ? (
                        <div className="chapter-qa-content">
                          {chapter10Question && chapter10Question.question ? (
                            <div className="qa-editor">
                              <p className="qa-intro">
                                고객이 웹 리포트에서 남긴 질문입니다. 답변을 작성해 주세요.
                              </p>
                              <div className="qa-item">
                                <div className="qa-question">
                                  <span className="qa-number">Q</span>
                                  <span className="qa-question-text">{chapter10Question.question.content}</span>
                                </div>
                                <div className="qa-question-meta">
                                  {chapter10Question.question.user_email && (
                                    <span>이메일: {chapter10Question.question.user_email}</span>
                                  )}
                                  {chapter10Question.question.submitted_at && (
                                    <span style={{marginLeft: '16px'}}>
                                      제출: {new Date(chapter10Question.question.submitted_at).toLocaleString('ko-KR')}
                                    </span>
                                  )}
                                </div>
                                {chapter10Question.status === 'answered' && chapter10Question.answer ? (
                                  <div className="qa-answer-display">
                                    <div className="qa-answer-label">✅ 답변 완료</div>
                                    <div className="qa-answer-content">{chapter10Question.answer.content}</div>
                                    <div className="qa-answer-meta">
                                      <span>답변자: {chapter10Question.answer.answered_by || 'Admin'}</span>
                                      {chapter10Question.answer.answered_at && (
                                        <span style={{marginLeft: '16px'}}>
                                          답변일: {new Date(chapter10Question.answer.answered_at).toLocaleString('ko-KR')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="qa-answer">
                                    <textarea
                                      className="qa-answer-input"
                                      value={chapter10Answer}
                                      onChange={(e) => setChapter10Answer(e.target.value)}
                                      placeholder="답변을 입력하세요..."
                                      rows={6}
                                    />
                                    <div className="qa-save-actions">
                                      <button
                                        className="btn btn-save-qa"
                                        onClick={submitChapter10Answer}
                                        disabled={chapter10Submitting || !chapter10Answer.trim()}
                                      >
                                        {chapter10Submitting ? (
                                          <>
                                            <Loader size={16} className="spinning" />
                                            저장 중...
                                          </>
                                        ) : (
                                          <>
                                            <Save size={16} />
                                            답변 저장 및 발송
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="qa-empty">
                              <MessageCircle size={48} strokeWidth={1} />
                              <p>고객이 질문을 남기지 않았습니다.</p>
                              <p className="qa-empty-sub">리포트를 발송한 후 고객이 질문을 남기면 여기에 표시됩니다.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="chapter-placeholder">
                          <p>이 챕터의 레포트 내용이 여기에 표시됩니다.</p>
                          <p className="placeholder-note">레포트 생성 후 내용을 확인할 수 있습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default OrderDetail;
