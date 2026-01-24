import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Loader, RefreshCw, X, Phone, Mail, ShoppingBag, Calendar, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Customers.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function Customers() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: 20,
    totalCount: 0,
    totalPages: 0
  });

  // Customer detail modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async (page = 1) => {
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

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/customers?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('고객 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setCustomers(data.customers);
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
  }, [searchTerm, pagination.perPage, getToken]);

  const fetchCustomerDetail = async (phoneNumber) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/customers/${encodeURIComponent(phoneNumber)}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('고객 상세 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setCustomerDetail(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchCustomers(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchCustomers(newPage);
    }
  };

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    fetchCustomerDetail(customer.phone_number);
  };

  const closeModal = () => {
    setSelectedCustomer(null);
    setCustomerDetail(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <div className="customers">
      <div className="page-header">
        <h1>고객 관리</h1>
        <p>핸드폰 번호 기준으로 고객 목록과 주문 내역을 확인합니다.</p>
      </div>

      <div className="customer-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="고객명, 전화번호, 이메일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="refresh-btn" onClick={() => fetchCustomers(pagination.currentPage)} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="customer-content">
        {loading ? (
          <div className="loading-state">
            <Loader size={32} className="spinning" />
            <p>고객 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => fetchCustomers(pagination.currentPage)}>다시 시도</button>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <p>고객이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>전화번호</th>
                    <th>고객명</th>
                    <th>이메일</th>
                    <th>주문 횟수</th>
                    <th>첫 주문일</th>
                    <th>최근 주문일</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.phone_number}
                      onClick={() => handleCustomerClick(customer)}
                      className="clickable-row"
                    >
                      <td className="phone-cell">
                        <Phone size={14} />
                        {customer.phone_number}
                      </td>
                      <td>{customer.name || '-'}</td>
                      <td className="email-cell">{customer.email || '-'}</td>
                      <td className="order-count-cell">
                        <span className="order-count-badge">{customer.order_count}회</span>
                      </td>
                      <td>{formatDate(customer.first_order_at)}</td>
                      <td>{formatDate(customer.last_order_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>고객 상세 정보</h2>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="modal-loading">
                <Loader size={32} className="spinning" />
                <p>고객 정보를 불러오는 중...</p>
              </div>
            ) : customerDetail ? (
              <>
                <div className="customer-info-section">
                  <div className="info-grid">
                    <div className="info-item">
                      <Phone size={16} />
                      <span className="info-label">전화번호</span>
                      <span className="info-value">{customerDetail.customer.phone_number}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">고객명</span>
                      <span className="info-value">{customerDetail.customer.name || '-'}</span>
                    </div>
                    <div className="info-item">
                      <Mail size={16} />
                      <span className="info-label">이메일</span>
                      <span className="info-value">{customerDetail.customer.email || '-'}</span>
                    </div>
                    <div className="info-item">
                      <ShoppingBag size={16} />
                      <span className="info-label">총 주문</span>
                      <span className="info-value">{customerDetail.customer.order_count}회</span>
                    </div>
                    <div className="info-item">
                      <Calendar size={16} />
                      <span className="info-label">첫 주문</span>
                      <span className="info-value">{formatDate(customerDetail.customer.first_order_at)}</span>
                    </div>
                    <div className="info-item">
                      <Calendar size={16} />
                      <span className="info-label">최근 주문</span>
                      <span className="info-value">{formatDate(customerDetail.customer.last_order_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="order-history-section">
                  <h3>주문 내역</h3>
                  <div className="order-history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>이름</th>
                          <th>리포트</th>
                          <th>상태</th>
                          <th>생년월일</th>
                          <th>주문일</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetail.orders.map((order) => (
                          <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td>{order.name}</td>
                            <td>{order.report_type_label}</td>
                            <td>
                              <span className={`status-badge ${getStatusClass(order.status)}`}>
                                {order.status_label}
                              </span>
                            </td>
                            <td>{order.birth_info}</td>
                            <td>{formatDateTime(order.created_at)}</td>
                            <td>
                              <button
                                className="view-order-btn"
                                onClick={() => navigate(`/admin/orders/${order.id}`)}
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
