import { useState, useEffect } from 'react';
import { X, Send, AlertCircle, CheckCircle, Edit3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './GyeokgukSuggestionModal.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const RESULT_OPTIONS = ['성', '패', '성중유패', '패중유성', '성패공존'];

// 역할 배열을 문자열로 변환
const rolesToString = (roles) => {
  if (!roles || !Array.isArray(roles)) return '';
  return roles.map(r => {
    if (typeof r === 'string') return r;
    if (typeof r === 'object' && r !== null) {
      return r.name || r.role || '';
    }
    return '';
  }).filter(Boolean).join(', ');
};

export default function GyeokgukSuggestionModal({
  isOpen,
  onClose,
  suggestionType, // decade_luck_sky, decade_luck_earth, year_luck_sky, year_luck_earth
  gyeokgukName,   // 격국명 (예: 정관격)
  targetChar,     // 대상 천간/지지 (예: 甲)
  code,           // 코드 (예: 정인비견합)
  originalResult, // 원본 성패
  originalReason, // 원본 이유
  firstRoles,     // 1차 역할
  secondRoles,    // 2차 역할
  thirdRoles,     // 3차 역할
  fourthRoles,    // 4차 역할
  orderId,        // 참고 주문 ID (선택적)
  onSuccess
}) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [existingData, setExistingData] = useState(null);
  const [checkingPattern, setCheckingPattern] = useState(false);

  // 코드 길이에 따른 역할 개수 결정 (2글자당 1개 역할, "합" 모두 제외)
  const getCodeLengthWithoutHap = (codeStr) => {
    if (!codeStr) return 0;
    // 모든 "합" 제거
    const cleanCode = codeStr.replace(/합/g, '');
    return cleanCode.length;
  };

  const codeLength = getCodeLengthWithoutHap(code);
  const roleCount = Math.ceil(codeLength / 2);

  const hasFirstRoles = roleCount >= 1;
  const hasSecondRoles = roleCount >= 2;
  const hasThirdRoles = roleCount >= 3;
  const hasFourthRoles = roleCount >= 4;

  // 수정 가능한 필드들
  const [suggestedResult, setSuggestedResult] = useState(originalResult || '');
  const [suggestedReason, setSuggestedReason] = useState(originalReason || '');
  const [suggestedFirstRoles, setSuggestedFirstRoles] = useState('');
  const [suggestedSecondRoles, setSuggestedSecondRoles] = useState('');
  const [suggestedThirdRoles, setSuggestedThirdRoles] = useState('');
  const [suggestedFourthRoles, setSuggestedFourthRoles] = useState('');

  // 제안 유형 라벨
  const getSuggestionTypeLabel = () => {
    switch (suggestionType) {
      case 'decade_luck_sky': return '대운 천간';
      case 'decade_luck_earth': return '대운 지지';
      case 'year_luck_sky': return '세운 천간';
      case 'year_luck_earth': return '세운 지지';
      default: return suggestionType;
    }
  };

  // 모달 열릴 때 기존 패턴 확인
  useEffect(() => {
    if (isOpen && suggestionType && gyeokgukName && targetChar && code) {
      checkExistingPattern();
    }
  }, [isOpen, suggestionType, gyeokgukName, targetChar, code]);

  // 초기값 설정
  useEffect(() => {
    if (isOpen) {
      setSuggestedResult(originalResult || '');
      setSuggestedReason(originalReason || '');
      setSuggestedFirstRoles(rolesToString(firstRoles));
      setSuggestedSecondRoles(rolesToString(secondRoles));
      setSuggestedThirdRoles(rolesToString(thirdRoles));
      setSuggestedFourthRoles(rolesToString(fourthRoles));
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, originalResult, originalReason, firstRoles, secondRoles, thirdRoles, fourthRoles]);

  const checkExistingPattern = async () => {
    setCheckingPattern(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({
        suggestion_type: suggestionType,
        gyeokguk_name: gyeokgukName,
        target_char: targetChar,
        code: code || ''
      });

      const response = await fetch(
        `${API_BASE_URL}/api/v1/manager/gyeokguk_suggestions/check_pattern?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExistingData(data);
          // 승인된 제안이 있으면 그 값으로 초기화
          if (data.approved_suggestion) {
            setSuggestedResult(data.approved_suggestion.suggested_result);
            setSuggestedReason(data.approved_suggestion.suggested_reason || '');
            // 역할이 JSON으로 저장되어 있다면 파싱
            const roles = data.approved_suggestion.suggested_roles || {};
            if (typeof roles === 'object' && !Array.isArray(roles)) {
              setSuggestedFirstRoles(roles.first || '');
              setSuggestedSecondRoles(roles.second || '');
              setSuggestedThirdRoles(roles.third || '');
              setSuggestedFourthRoles(roles.fourth || '');
            }
          }
        }
      }
    } catch (err) {
      console.error('Pattern check failed:', err);
    } finally {
      setCheckingPattern(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!suggestedResult) {
      setError('제안 성패를 선택해주세요');
      setLoading(false);
      return;
    }

    try {
      const token = getToken();

      // 역할을 객체로 구성 (코드 기반 역할만 전송)
      const suggestedRolesObj = {};
      if (roleCount >= 1 && suggestedFirstRoles) suggestedRolesObj.first = suggestedFirstRoles;
      if (roleCount >= 2 && suggestedSecondRoles) suggestedRolesObj.second = suggestedSecondRoles;
      if (roleCount >= 3 && suggestedThirdRoles) suggestedRolesObj.third = suggestedThirdRoles;
      if (roleCount >= 4 && suggestedFourthRoles) suggestedRolesObj.fourth = suggestedFourthRoles;

      // 원본 역할도 객체로 구성
      const originalRolesObj = {};
      if (roleCount >= 1 && firstRoles && firstRoles.length > 0) originalRolesObj.first = rolesToString(firstRoles);
      if (roleCount >= 2 && secondRoles && secondRoles.length > 0) originalRolesObj.second = rolesToString(secondRoles);
      if (roleCount >= 3 && thirdRoles && thirdRoles.length > 0) originalRolesObj.third = rolesToString(thirdRoles);
      if (roleCount >= 4 && fourthRoles && fourthRoles.length > 0) originalRolesObj.fourth = rolesToString(fourthRoles);

      const payload = {
        suggestion_type: suggestionType,
        gyeokguk_name: gyeokgukName,
        target_char: targetChar,
        code: code || '',
        original_result: originalResult,
        suggested_result: suggestedResult,
        original_reason: originalReason,
        suggested_reason: suggestedReason,
        original_roles: Object.keys(originalRolesObj).length > 0 ? originalRolesObj : null,
        suggested_roles: Object.keys(suggestedRolesObj).length > 0 ? suggestedRolesObj : null,
      };

      if (orderId) {
        payload.sample_order_id = orderId;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/manager/gyeokguk_suggestions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess(data.suggestion);
        }, 1500);
      } else {
        setError(data.errors?.join(', ') || data.error || '제안 등록에 실패했습니다');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasAnyRoles = hasFirstRoles || hasSecondRoles || hasThirdRoles || hasFourthRoles;

  return (
    <div className="suggestion-modal-overlay" onClick={onClose}>
      <div className="suggestion-modal" onClick={e => e.stopPropagation()}>
        <div className="suggestion-modal-header">
          <h2><Edit3 size={20} /> 격국 수정 제안</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="suggestion-modal-body">
          {/* 기존 패턴 정보 표시 */}
          {existingData?.has_approved && (
            <div className="existing-info approved">
              <CheckCircle size={16} />
              <span>이 패턴에 대해 이미 승인된 수정이 있습니다.</span>
            </div>
          )}
          {existingData?.has_pending && (
            <div className="existing-info pending">
              <AlertCircle size={16} />
              <span>이 패턴에 대해 검토 대기 중인 제안이 있습니다.</span>
            </div>
          )}

          {/* 읽기 전용 정보 */}
          <div className="readonly-section">
            <h3>기본 정보 (읽기 전용)</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>유형</label>
                <span>{getSuggestionTypeLabel()}</span>
              </div>
              <div className="info-item">
                <label>격국명</label>
                <span>{gyeokgukName}</span>
              </div>
              <div className="info-item">
                <label>대상</label>
                <span className="target-char">{targetChar}</span>
              </div>
              <div className="info-item">
                <label>코드</label>
                <span>{code || '-'}</span>
              </div>
            </div>
          </div>

          {/* 원본 정보 */}
          <div className="original-section">
            <h3>원본 데이터</h3>
            <div className="compare-grid">
              <div className="compare-item">
                <label>성패</label>
                <span className={`result-badge ${getResultClass(originalResult)}`}>
                  {originalResult || '-'}
                </span>
              </div>
              <div className="compare-item full-width">
                <label>이유</label>
                <p>{originalReason || '-'}</p>
              </div>
              {hasFirstRoles && (
                <div className="compare-item full-width">
                  <label>1차 역할</label>
                  <p>{rolesToString(firstRoles)}</p>
                </div>
              )}
              {hasSecondRoles && (
                <div className="compare-item full-width">
                  <label>2차 역할</label>
                  <p>{rolesToString(secondRoles)}</p>
                </div>
              )}
              {hasThirdRoles && (
                <div className="compare-item full-width">
                  <label>3차 역할</label>
                  <p>{rolesToString(thirdRoles)}</p>
                </div>
              )}
              {hasFourthRoles && (
                <div className="compare-item full-width">
                  <label>4차 역할</label>
                  <p>{rolesToString(fourthRoles)}</p>
                </div>
              )}
            </div>
          </div>

          {/* 수정 제안 폼 */}
          <form onSubmit={handleSubmit}>
            <div className="edit-section">
              <h3>수정 제안</h3>

              <div className="form-group">
                <label>성패 *</label>
                <div className="result-options">
                  {RESULT_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`result-option ${suggestedResult === opt ? 'selected' : ''} ${getResultClass(opt)}`}
                      onClick={() => setSuggestedResult(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>이유</label>
                <textarea
                  value={suggestedReason}
                  onChange={e => setSuggestedReason(e.target.value)}
                  placeholder="수정하려는 이유를 입력하세요"
                  rows={4}
                />
              </div>

              {/* 동적 역할 입력 필드 */}
              {hasFirstRoles && (
                <div className="form-group">
                  <label>1차 역할</label>
                  <input
                    type="text"
                    value={suggestedFirstRoles}
                    onChange={e => setSuggestedFirstRoles(e.target.value)}
                    placeholder="1차 역할 (쉼표로 구분)"
                  />
                </div>
              )}
              {hasSecondRoles && (
                <div className="form-group">
                  <label>2차 역할</label>
                  <input
                    type="text"
                    value={suggestedSecondRoles}
                    onChange={e => setSuggestedSecondRoles(e.target.value)}
                    placeholder="2차 역할 (쉼표로 구분)"
                  />
                </div>
              )}
              {hasThirdRoles && (
                <div className="form-group">
                  <label>3차 역할</label>
                  <input
                    type="text"
                    value={suggestedThirdRoles}
                    onChange={e => setSuggestedThirdRoles(e.target.value)}
                    placeholder="3차 역할 (쉼표로 구분)"
                  />
                </div>
              )}
              {hasFourthRoles && (
                <div className="form-group">
                  <label>4차 역할</label>
                  <input
                    type="text"
                    value={suggestedFourthRoles}
                    onChange={e => setSuggestedFourthRoles(e.target.value)}
                    placeholder="4차 역할 (쉼표로 구분)"
                  />
                </div>
              )}

              {!hasAnyRoles && (
                <div className="form-group">
                  <label className="no-roles-label">역할 정보 없음</label>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                <CheckCircle size={16} />
                수정 제안이 등록되었습니다. Slack으로 알림이 전송됩니다.
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
                취소
              </button>
              <button type="submit" className="submit-btn" disabled={loading || success}>
                {loading ? '제출 중...' : '제안 등록'}
                {!loading && !success && <Send size={16} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function getResultClass(result) {
  switch (result) {
    case '성': return 'success';
    case '패': return 'fail';
    case '성중유패': return 'mixed-fail';
    case '패중유성': return 'mixed-success';
    case '성패공존': return 'coexist';
    default: return '';
  }
}
