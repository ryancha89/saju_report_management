import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Eye, Search, Filter, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import './GyeokgukSuggestions.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const STATUS_LABELS = {
  pending: '검토 대기',
  approved: '승인됨',
  rejected: '거절됨'
};

const STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger'
};

const TYPE_LABELS = {
  decade_luck_sky: '대운 천간',
  decade_luck_earth: '대운 지지',
  year_luck_sky: '세운 천간',
  year_luck_earth: '세운 지지'
};

const RESULT_OPTIONS = ['성', '패', '성중유패', '패중유성', '성패공존'];

// 코드 길이에 따른 역할 개수 계산 ("합" 모두 제외, 2글자당 1개)
const getRoleCountFromCode = (code) => {
  if (!code) return 0;
  const cleanCode = code.replace(/합/g, '');
  return Math.ceil(cleanCode.length / 2);
};

export default function GyeokgukSuggestions() {
  const { getToken, isAdmin } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_count: 0 });

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [gyeokgukFilter, setGyeokgukFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // 거절 모달 상태
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // 승인 모달 상태 (수정 후 승인)
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvingSuggestion, setApprovingSuggestion] = useState(null);
  const [editResult, setEditResult] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editFirstRoles, setEditFirstRoles] = useState('');
  const [editSecondRoles, setEditSecondRoles] = useState('');
  const [editThirdRoles, setEditThirdRoles] = useState('');
  const [editFourthRoles, setEditFourthRoles] = useState('');

  useEffect(() => {
    fetchSuggestions();
  }, [statusFilter, typeFilter, gyeokgukFilter]);

  const fetchSuggestions = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const params = new URLSearchParams({ page, per_page: 20 });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter) params.append('suggestion_type', typeFilter);
      if (gyeokgukFilter) params.append('gyeokguk_name', gyeokgukFilter);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/manager/gyeokguk_suggestions?${params}`,
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
          setSuggestions(data.suggestions);
          setPagination(data.pagination);
        } else {
          setError(data.error || '데이터를 불러오는데 실패했습니다');
        }
      } else {
        setError('서버 오류가 발생했습니다');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 승인 모달 열기
  const openApproveModal = (suggestion) => {
    if (!isAdmin()) {
      alert('관리자만 승인할 수 있습니다');
      return;
    }
    setApprovingSuggestion(suggestion);
    setEditResult(suggestion.suggested_result || '');
    setEditReason(suggestion.suggested_reason || '');

    // 역할 초기화
    const roles = suggestion.suggested_roles || {};
    if (typeof roles === 'object' && !Array.isArray(roles)) {
      setEditFirstRoles(roles.first || '');
      setEditSecondRoles(roles.second || '');
      setEditThirdRoles(roles.third || '');
      setEditFourthRoles(roles.fourth || '');
    } else {
      setEditFirstRoles('');
      setEditSecondRoles('');
      setEditThirdRoles('');
      setEditFourthRoles('');
    }

    setApproveModalOpen(true);
  };

  // 승인 처리 (수정 후)
  const handleApprove = async () => {
    if (!approvingSuggestion) return;

    setActionLoading(true);
    try {
      const token = getToken();

      // 코드 기반 역할 개수 확인
      const roleCount = getRoleCountFromCode(approvingSuggestion.code);

      // 역할 객체 구성 (해당하는 역할만)
      const suggestedRoles = {};
      if (roleCount >= 1 && editFirstRoles) suggestedRoles.first = editFirstRoles;
      if (roleCount >= 2 && editSecondRoles) suggestedRoles.second = editSecondRoles;
      if (roleCount >= 3 && editThirdRoles) suggestedRoles.third = editThirdRoles;
      if (roleCount >= 4 && editFourthRoles) suggestedRoles.fourth = editFourthRoles;

      const payload = {
        suggested_result: editResult,
        suggested_reason: editReason,
      };

      if (Object.keys(suggestedRoles).length > 0) {
        payload.suggested_roles = suggestedRoles;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/manager/gyeokguk_suggestions/${approvingSuggestion.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (data.success) {
        alert('승인되었습니다');
        setApproveModalOpen(false);
        setApprovingSuggestion(null);
        fetchSuggestions(pagination.current_page);
      } else {
        alert(data.error || '승인에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id) => {
    if (!isAdmin()) {
      alert('관리자만 거절할 수 있습니다');
      return;
    }
    setRejectingId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  // 삭제 처리
  const handleDelete = async (suggestion) => {
    if (!isAdmin()) {
      alert('관리자만 삭제할 수 있습니다');
      return;
    }

    const confirmMsg = `정말 삭제하시겠습니까?\n\n${suggestion.gyeokguk_name} - ${suggestion.target_char} (${suggestion.code})`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/manager/gyeokguk_suggestions/${suggestion.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        alert('삭제되었습니다');
        fetchSuggestions(pagination.current_page);
      } else {
        alert(data.error || '삭제에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('거절 사유를 입력해주세요');
      return;
    }

    setActionLoading(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/manager/gyeokguk_suggestions/${rejectingId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      const data = await response.json();
      if (data.success) {
        alert('거절되었습니다');
        setRejectModalOpen(false);
        setRejectingId(null);
        setRejectReason('');
        fetchSuggestions(pagination.current_page);
      } else {
        alert(data.error || '거절에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getResultClass = (result) => {
    switch (result) {
      case '성': return 'success';
      case '패': return 'fail';
      case '성중유패': return 'mixed-fail';
      case '패중유성': return 'mixed-success';
      case '성패공존': return 'coexist';
      default: return '';
    }
  };

  // 역할 객체를 렌더링하는 함수
  const renderRoles = (roles) => {
    if (!roles) return '-';

    // 배열인 경우 (이전 형식)
    if (Array.isArray(roles)) {
      return roles.join(', ') || '-';
    }

    // 객체인 경우 (새 형식: first, second, third, fourth)
    if (typeof roles === 'object') {
      const roleLabels = { first: '1차', second: '2차', third: '3차', fourth: '4차' };
      const parts = [];

      Object.entries(roleLabels).forEach(([key, label]) => {
        if (roles[key]) {
          parts.push(`${label}: ${roles[key]}`);
        }
      });

      return parts.length > 0 ? parts.join(' / ') : '-';
    }

    return '-';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <div className="suggestions-page">
      <div className="page-header">
        <h1>격국 수정 제안 관리</h1>
        <p className="page-description">격국 성패 수정 제안을 검토하고 승인/거절합니다.</p>
      </div>

      {/* 필터 */}
      <div className="filters-section">
        <div className="filter-group">
          <label>상태</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">전체</option>
            <option value="pending">검토 대기</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
          </select>
        </div>
        <div className="filter-group">
          <label>유형</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">전체</option>
            <option value="decade_luck_sky">대운 천간</option>
            <option value="decade_luck_earth">대운 지지</option>
            <option value="year_luck_sky">세운 천간</option>
            <option value="year_luck_earth">세운 지지</option>
          </select>
        </div>
        <div className="filter-group">
          <label>격국명</label>
          <input
            type="text"
            value={gyeokgukFilter}
            onChange={(e) => setGyeokgukFilter(e.target.value)}
            placeholder="예: 정관격"
          />
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="loading-state">데이터를 불러오는 중...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : suggestions.length === 0 ? (
        <div className="empty-state">수정 제안이 없습니다.</div>
      ) : (
        <>
          <div className="suggestions-list">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className={`suggestion-card ${suggestion.status}`}>
                <div className="card-header" onClick={() => toggleExpand(suggestion.id)}>
                  <div className="card-main-info">
                    <span className={`status-badge ${STATUS_COLORS[suggestion.status]}`}>
                      {suggestion.status === 'pending' && <Clock size={14} />}
                      {suggestion.status === 'approved' && <CheckCircle size={14} />}
                      {suggestion.status === 'rejected' && <XCircle size={14} />}
                      {STATUS_LABELS[suggestion.status]}
                    </span>
                    <span className="type-badge">{TYPE_LABELS[suggestion.suggestion_type] || suggestion.suggestion_type}</span>
                    <span className="gyeokguk-name">{suggestion.gyeokguk_name}</span>
                    <span className="target-char">{suggestion.target_char}</span>
                    <span className="code">{suggestion.code}</span>
                  </div>
                  <div className="card-meta">
                    <span className="suggested-by">제안자: {suggestion.suggested_by?.name || '-'}</span>
                    <span className="created-at">{formatDate(suggestion.created_at)}</span>
                    {expandedId === suggestion.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {expandedId === suggestion.id && (
                  <div className="card-details">
                    <div className="details-grid">
                      <div className="detail-section">
                        <h4>원본 데이터</h4>
                        <div className="detail-row">
                          <span className="label">성패:</span>
                          <span className={`result-badge ${getResultClass(suggestion.original_result)}`}>
                            {suggestion.original_result || '-'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">이유:</span>
                          <span className="value">{suggestion.original_reason || '-'}</span>
                        </div>
                        <div className="detail-row roles-row">
                          <span className="label">역할:</span>
                          <span className="value roles-value">
                            {renderRoles(suggestion.original_roles)}
                          </span>
                        </div>
                      </div>

                      <div className="detail-section suggested">
                        <h4>제안 데이터</h4>
                        <div className="detail-row">
                          <span className="label">성패:</span>
                          <span className={`result-badge ${getResultClass(suggestion.suggested_result)}`}>
                            {suggestion.suggested_result}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">이유:</span>
                          <span className="value">{suggestion.suggested_reason || '-'}</span>
                        </div>
                        <div className="detail-row roles-row">
                          <span className="label">역할:</span>
                          <span className="value roles-value">
                            {renderRoles(suggestion.suggested_roles)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {suggestion.status === 'rejected' && suggestion.rejection_reason && (
                      <div className="rejection-info">
                        <strong>거절 사유:</strong> {suggestion.rejection_reason}
                      </div>
                    )}

                    {suggestion.reviewed_by && (
                      <div className="review-info">
                        <span>검토자: {suggestion.reviewed_by.name}</span>
                        <span>검토일: {formatDate(suggestion.reviewed_at)}</span>
                      </div>
                    )}

                    {suggestion.sample_order && (
                      <div className="order-info">
                        <span>참고 주문: #{suggestion.sample_order.id} ({suggestion.sample_order.name})</span>
                      </div>
                    )}

                    {isAdmin() && (
                      <div className="card-actions">
                        {suggestion.status === 'pending' && (
                          <>
                            <button
                              className="approve-btn"
                              onClick={() => openApproveModal(suggestion)}
                              disabled={actionLoading}
                            >
                              <CheckCircle size={16} />
                              수정/승인
                            </button>
                            <button
                              className="reject-btn"
                              onClick={() => openRejectModal(suggestion.id)}
                              disabled={actionLoading}
                            >
                              <XCircle size={16} />
                              거절
                            </button>
                          </>
                        )}
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(suggestion)}
                          disabled={actionLoading}
                        >
                          <Trash2 size={16} />
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 페이지네이션 */}
          {pagination.total_pages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.current_page <= 1}
                onClick={() => fetchSuggestions(pagination.current_page - 1)}
              >
                이전
              </button>
              <span>{pagination.current_page} / {pagination.total_pages} (총 {pagination.total_count}건)</span>
              <button
                disabled={pagination.current_page >= pagination.total_pages}
                onClick={() => fetchSuggestions(pagination.current_page + 1)}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* 거절 모달 */}
      {rejectModalOpen && (
        <div className="modal-overlay" onClick={() => setRejectModalOpen(false)}>
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
            <h3>거절 사유 입력</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력해주세요"
              rows={4}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setRejectModalOpen(false)}>
                취소
              </button>
              <button
                className="confirm-btn"
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? '처리 중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 승인 모달 (수정 후 승인) */}
      {approveModalOpen && approvingSuggestion && (
        <div className="modal-overlay" onClick={() => setApproveModalOpen(false)}>
          <div className="approve-modal" onClick={(e) => e.stopPropagation()}>
            <h3>수정 후 승인</h3>
            <p className="modal-description">
              필요시 내용을 수정한 후 승인하세요.
            </p>

            {/* 기본 정보 (읽기 전용) */}
            <div className="modal-info">
              <span className="info-badge">{TYPE_LABELS[approvingSuggestion.suggestion_type]}</span>
              <span className="info-badge">{approvingSuggestion.gyeokguk_name}</span>
              <span className="info-badge target">{approvingSuggestion.target_char}</span>
              <span className="info-badge code">{approvingSuggestion.code}</span>
            </div>

            {/* 성패 선택 */}
            <div className="modal-form-group">
              <label>성패 *</label>
              <div className="result-options">
                {RESULT_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`result-option ${editResult === opt ? 'selected' : ''} ${getResultClass(opt)}`}
                    onClick={() => setEditResult(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 이유 */}
            <div className="modal-form-group">
              <label>이유</label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="이유를 입력하세요"
                rows={3}
              />
            </div>

            {/* 역할 입력 - 코드 기반 동적 표시 */}
            {(() => {
              const roleCount = getRoleCountFromCode(approvingSuggestion.code);
              return roleCount > 0 && (
                <div className="modal-form-group">
                  <label>역할 ({roleCount}개)</label>
                  <div className="roles-inputs">
                    {roleCount >= 1 && (
                      <div className="role-input">
                        <span className="role-label">1차</span>
                        <input
                          type="text"
                          value={editFirstRoles}
                          onChange={(e) => setEditFirstRoles(e.target.value)}
                          placeholder="1차 역할"
                        />
                      </div>
                    )}
                    {roleCount >= 2 && (
                      <div className="role-input">
                        <span className="role-label">2차</span>
                        <input
                          type="text"
                          value={editSecondRoles}
                          onChange={(e) => setEditSecondRoles(e.target.value)}
                          placeholder="2차 역할"
                        />
                      </div>
                    )}
                    {roleCount >= 3 && (
                      <div className="role-input">
                        <span className="role-label">3차</span>
                        <input
                          type="text"
                          value={editThirdRoles}
                          onChange={(e) => setEditThirdRoles(e.target.value)}
                          placeholder="3차 역할"
                        />
                      </div>
                    )}
                    {roleCount >= 4 && (
                      <div className="role-input">
                        <span className="role-label">4차</span>
                        <input
                          type="text"
                          value={editFourthRoles}
                          onChange={(e) => setEditFourthRoles(e.target.value)}
                          placeholder="4차 역할"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setApproveModalOpen(false)}>
                취소
              </button>
              <button
                className="confirm-btn approve"
                onClick={handleApprove}
                disabled={actionLoading || !editResult}
              >
                {actionLoading ? '처리 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
