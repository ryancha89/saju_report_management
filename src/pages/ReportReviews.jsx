import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Check, X, Clock, Search, Filter } from 'lucide-react';
import './ReportReviews.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const REPORT_TYPES = [
  { value: '', label: '전체' },
  { value: 'general', label: '기본 리포트' },
  { value: 'love_fortune', label: '연애운' },
  { value: 'new_year_2025', label: '2025 신년운세' },
  { value: 'new_year_2026', label: '2026 신년운세' },
  { value: 'blueprint', label: 'Blueprint PRO' },
  { value: 'blueprint_lite', label: 'Blueprint LITE' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'pending', label: '대기중' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '거절됨' },
];

const RATING_LABELS = {
  helpful: '도움이 돼요',
  fun: '재밌어요',
  educational: '공부가 돼요',
  encouraging: '격려가 돼요',
};

const RATING_EMOJIS = {
  helpful: '👍',
  fun: '😊',
  educational: '📚',
  encouraging: '💪',
};

function ReportReviews() {
  const { getToken, isAdmin } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 20;

  // Filters
  const [reportTypeFilter, setReportTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        per_page: perPage,
      });

      if (reportTypeFilter) params.append('report_type', reportTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('q', searchQuery);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/report_reviews?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setTotalPages(data.total_pages || 1);
        setTotalCount(data.total_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken, currentPage, reportTypeFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const updateStatus = async (reviewId, newStatus) => {
    setUpdating(reviewId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/report_reviews/${reviewId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        setReviews(prev =>
          prev.map(review =>
            review.id === reviewId ? { ...review, status: newStatus } : review
          )
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReviews();
  };

  // Admin only access
  if (!isAdmin()) {
    return (
      <div className="report-reviews">
        <div className="page-header">
          <h1>리뷰 관리</h1>
          <p>접근 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReportTypeLabel = (type) => {
    const found = REPORT_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="status-badge approved"><Check size={12} /> 승인됨</span>;
      case 'rejected':
        return <span className="status-badge rejected"><X size={12} /> 거절됨</span>;
      default:
        return <span className="status-badge pending"><Clock size={12} /> 대기중</span>;
    }
  };

  return (
    <div className="report-reviews">
      <div className="page-header">
        <div>
          <h1>리뷰 관리</h1>
          <p>리포트 리뷰를 관리합니다. 총 {totalCount}개</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label><Filter size={14} /> 리포트 유형</label>
          <select
            value={reportTypeFilter}
            onChange={(e) => {
              setReportTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {REPORT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>상태</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="리뷰 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit">검색</button>
        </form>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <p>리뷰가 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="reviews-table-wrap">
            <table className="reviews-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>리포트 유형</th>
                  <th>평점</th>
                  <th>내용</th>
                  <th>작성자</th>
                  <th>상태</th>
                  <th>작성일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className={`status-${review.status}`}>
                    <td className="id-cell">{review.id}</td>
                    <td>
                      <span className="report-type-badge">
                        {getReportTypeLabel(review.report_type)}
                      </span>
                    </td>
                    <td>
                      <span className="rating-badge">
                        {RATING_EMOJIS[review.rating]} {RATING_LABELS[review.rating]}
                      </span>
                    </td>
                    <td className="content-cell">
                      <div className="review-content">{review.content || '-'}</div>
                    </td>
                    <td className="user-cell">
                      {review.user?.nickname || review.user?.name || `User #${review.user_id}`}
                    </td>
                    <td>{getStatusBadge(review.status)}</td>
                    <td className="date-cell">{formatDate(review.created_at)}</td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button
                          className={`action-btn approve ${review.status === 'approved' ? 'active' : ''}`}
                          onClick={() => updateStatus(review.id, 'approved')}
                          disabled={updating === review.id}
                        >
                          <Check size={14} strokeWidth={3} />
                          <span>승인</span>
                        </button>
                        <button
                          className={`action-btn pending ${review.status === 'pending' ? 'active' : ''}`}
                          onClick={() => updateStatus(review.id, 'pending')}
                          disabled={updating === review.id}
                        >
                          <Clock size={14} strokeWidth={3} />
                          <span>대기</span>
                        </button>
                        <button
                          className={`action-btn reject ${review.status === 'rejected' ? 'active' : ''}`}
                          onClick={() => updateStatus(review.id, 'rejected')}
                          disabled={updating === review.id}
                        >
                          <X size={14} strokeWidth={3} />
                          <span>거절</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>

              <div className="page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="page-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>

              <span className="page-info">
                {currentPage} / {totalPages} 페이지
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReportReviews;
