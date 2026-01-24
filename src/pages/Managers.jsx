import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Edit2, Save, X, Loader, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Managers.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function Managers() {
  const navigate = useNavigate();
  const { getToken, manager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_count: 0,
    total_pages: 1
  });

  // 수정 모달 상태
  const [editingManager, setEditingManager] = useState(null);
  const [editForm, setEditForm] = useState({
    commission_rate: 50,
    display_name: '',
    phone_number: '',
    bank_name: '',
    bank_account: ''
  });
  const [saving, setSaving] = useState(false);

  // Admin 권한 확인
  useEffect(() => {
    if (manager && manager.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [manager, navigate]);

  useEffect(() => {
    fetchManagers();
  }, [pagination.current_page, search]);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current_page,
        per_page: pagination.per_page
      });
      if (search) params.append('search', search);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/managers?${params}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setManagers(data.managers);
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, current_page: 1 }));
    fetchManagers();
  };

  const openEditModal = (mgr) => {
    setEditingManager(mgr);
    setEditForm({
      commission_rate: mgr.commission_rate || 60,
      display_name: mgr.display_name || '',
      phone_number: mgr.phone_number || '',
      bank_name: mgr.bank_name || '',
      bank_account: mgr.bank_account || ''
    });
  };

  const closeEditModal = () => {
    setEditingManager(null);
    setEditForm({
      commission_rate: 50,
      display_name: '',
      phone_number: '',
      bank_name: '',
      bank_account: ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'commission_rate' ? parseInt(value) || 0 : value
    }));
  };

  const handleSave = async () => {
    if (!editingManager) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/managers/${editingManager.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 목록 업데이트
          setManagers(prev => prev.map(m =>
            m.id === editingManager.id ? data.manager : m
          ));
          closeEditModal();
        }
      }
    } catch (err) {
      console.error('Failed to save manager:', err);
    } finally {
      setSaving(false);
    }
  };

  // 수익 계산
  const calculateRevenue = (price, rate) => {
    const priceWithoutVat = Math.round(price / 1.1);
    const grossRevenue = Math.round(priceWithoutVat * rate / 100);
    const withholdingTax = Math.round(grossRevenue * 0.033);
    const netRevenue = grossRevenue - withholdingTax;
    return { grossRevenue, withholdingTax, netRevenue };
  };

  if (loading && managers.length === 0) {
    return (
      <div className="managers-page">
        <div className="loading-state">
          <Loader size={32} className="spinning" />
          <p>매니저 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="managers-page">
      <div className="page-header">
        <h1>
          <Users size={24} />
          매니저 관리
        </h1>
        <p>매니저 정보 및 수익률을 관리합니다.</p>
      </div>

      {/* 검색 */}
      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            placeholder="이름, 이메일, 활동명으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit">검색</button>
      </form>

      {/* 매니저 목록 */}
      <div className="managers-table">
        <div className="table-header">
          <span>매니저</span>
          <span>활동명</span>
          <span>수익률</span>
          <span>연락처</span>
          <span>상태</span>
          <span>관리</span>
        </div>

        {managers.map((mgr) => (
          <div key={mgr.id} className="table-row">
            <div className="manager-info">
              <span className="name">{mgr.name}</span>
              <span className="email">{mgr.email}</span>
            </div>
            <span className="display-name">{mgr.display_name || '-'}</span>
            <span className="commission-rate">
              <strong>{mgr.commission_rate || 50}%</strong>
            </span>
            <span className="phone">{mgr.phone_number || '-'}</span>
            <span className={`status ${mgr.profile_completed ? 'completed' : 'pending'}`}>
              {mgr.profile_completed ? '완료' : '미완료'}
            </span>
            <button className="edit-btn" onClick={() => openEditModal(mgr)}>
              <Edit2 size={16} />
            </button>
          </div>
        ))}

        {managers.length === 0 && (
          <div className="empty-state">
            <p>매니저가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {pagination.total_pages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.current_page === 1}
            onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
          >
            이전
          </button>
          <span>{pagination.current_page} / {pagination.total_pages}</span>
          <button
            disabled={pagination.current_page === pagination.total_pages}
            onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
          >
            다음
          </button>
        </div>
      )}

      {/* 수정 모달 */}
      {editingManager && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>매니저 정보 수정</h2>
              <button className="close-btn" onClick={closeEditModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="manager-basic-info">
                <p><strong>이메일:</strong> {editingManager.email}</p>
                <p><strong>이름:</strong> {editingManager.name}</p>
                <p><strong>추천코드:</strong> {editingManager.referral_code || '-'}</p>
              </div>

              <div className="form-group">
                <label>활동명</label>
                <input
                  type="text"
                  name="display_name"
                  value={editForm.display_name}
                  onChange={handleEditChange}
                  placeholder="활동명"
                />
              </div>

              <div className="form-group">
                <label>전화번호</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={editForm.phone_number}
                  onChange={handleEditChange}
                  placeholder="010-1234-5678"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>은행명</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={editForm.bank_name}
                    onChange={handleEditChange}
                    placeholder="은행명"
                  />
                </div>
                <div className="form-group">
                  <label>계좌번호</label>
                  <input
                    type="text"
                    name="bank_account"
                    value={editForm.bank_account}
                    onChange={handleEditChange}
                    placeholder="계좌번호"
                  />
                </div>
              </div>

              <div className="form-group commission-group">
                <label>
                  <DollarSign size={16} />
                  수익률
                </label>
                <div className="commission-input">
                  <input
                    type="number"
                    name="commission_rate"
                    value={editForm.commission_rate}
                    onChange={handleEditChange}
                    min="0"
                    max="100"
                  />
                  <span>%</span>
                </div>
              </div>

              {/* 수익 미리보기 */}
              <div className="revenue-preview">
                <h4>수익 미리보기</h4>
                <div className="revenue-items">
                  <div className="revenue-item">
                    <span>Blueprint Full (99,000원)</span>
                    <span className="amount">
                      {calculateRevenue(99000, editForm.commission_rate).netRevenue.toLocaleString()}원
                    </span>
                  </div>
                  <div className="revenue-item">
                    <span>Blueprint Lite (59,000원)</span>
                    <span className="amount">
                      {calculateRevenue(59000, editForm.commission_rate).netRevenue.toLocaleString()}원
                    </span>
                  </div>
                </div>
                <p className="note">
                  <Calendar size={12} /> 익월 25일 입금 (원천징수 3.3% 공제 후)
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeEditModal}>
                취소
              </button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? <Loader size={16} className="spinning" /> : <Save size={16} />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Managers;
