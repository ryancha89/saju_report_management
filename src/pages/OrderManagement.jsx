import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Send, ChevronLeft, ChevronRight, Loader, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './OrderManagement.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function OrderManagement() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 20,
    totalCount: 0,
    totalPages: 0
  });

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.perPage.toString()
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('주문 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setOrders(data.orders);
      setPagination({
        currentPage: data.pagination.current_page,
        perPage: data.pagination.per_page,
        totalCount: data.pagination.total_count,
        totalPages: data.pagination.total_pages
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, pagination.perPage, getToken]);

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchOrders(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage);
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

  const renderPagination = () => {
    const { currentPage, totalPages, totalCount } = pagination;

    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination">
        <div className="pagination-info">
          총 {totalCount}건 중 {(currentPage - 1) * pagination.perPage + 1}-
          {Math.min(currentPage * pagination.perPage, totalCount)}건
        </div>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
          </button>

          {startPage > 1 && (
            <>
              <button className="pagination-btn" onClick={() => handlePageChange(1)}>1</button>
              {startPage > 2 && <span className="pagination-ellipsis">...</span>}
            </>
          )}

          {pageNumbers.map(num => (
            <button
              key={num}
              className={`pagination-btn ${currentPage === num ? 'active' : ''}`}
              onClick={() => handlePageChange(num)}
            >
              {num}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
              <button className="pagination-btn" onClick={() => handlePageChange(totalPages)}>
                {totalPages}
              </button>
            </>
          )}

          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="order-management">
      <div className="page-header">
        <h1>주문 관리</h1>
        <p>고객 주문을 확인하고 관리합니다.</p>
      </div>

      <div className="order-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="고객명, 전화번호, 이메일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <Filter size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">전체 상태</option>
            <option value="pending">대기중</option>
            <option value="processing">처리중</option>
            <option value="completed">완료</option>
            <option value="cancelled">취소됨</option>
          </select>
        </div>
        <button className="refresh-btn" onClick={() => fetchOrders(pagination.currentPage)} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="order-content">
        <div className="order-list-container">
          {loading ? (
            <div className="loading-state">
              <Loader size={32} className="spinning" />
              <p>주문 목록을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={() => fetchOrders(pagination.currentPage)}>다시 시도</button>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <p>주문이 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>고객명</th>
                      <th>연락처</th>
                      <th>이메일</th>
                      <th>리포트</th>
                      <th>추천인</th>
                      <th>출처</th>
                      <th>상태</th>
                      <th>주문일</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <td>#{order.id}</td>
                        <td>{order.name}</td>
                        <td>{order.phone_number}</td>
                        <td className="email-cell">{order.email}</td>
                        <td>{order.report_type_label}</td>
                        <td className="referrer-cell">
                          {order.referrer_code ? (
                            <span className="referrer-badge" title={order.referrer_name || ''}>
                              {order.referrer_code}
                            </span>
                          ) : (
                            <span className="no-referrer">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`origin-badge ${order.origin === 'blueprint_app' ? 'origin-app' : 'origin-web'}`}>
                            {order.origin_label || '웹'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(order.status)}`}>
                            {order.status_label}
                          </span>
                        </td>
                        <td>{order.created_at_formatted}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="action-btn"
                              title="상세보기"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/orders/${order.id}`);
                              }}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="action-btn"
                              title="카카오 발송"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(`${order.name}님에게 카카오 메시지를 발송합니다.`);
                              }}
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderManagement;
