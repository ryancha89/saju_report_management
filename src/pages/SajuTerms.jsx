import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Book, Plus, Edit2, Trash2, Check, X, Crown,
  ChevronDown, ChevronUp, MessageSquare, Search,
  Filter
} from 'lucide-react';
import './SajuTerms.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function SajuTerms() {
  const { getToken, isAdmin, manager } = useAuth();
  const [terms, setTerms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTermId, setExpandedTermId] = useState(null);

  // 모달 상태
  const [showTermModal, setShowTermModal] = useState(false);
  const [showDescModal, setShowDescModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [editingDesc, setEditingDesc] = useState(null);
  const [selectedTermForDesc, setSelectedTermForDesc] = useState(null);

  // 폼 상태
  const [termForm, setTermForm] = useState({ name: '', category: '', hanja: '', display_order: 0 });
  const [descForm, setDescForm] = useState({ description: '' });

  useEffect(() => {
    fetchCategories();
    fetchTerms();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/saju_terms/categories`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchTerms = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/v1/manager/saju_terms`;
      if (selectedCategory) {
        url += `?category=${encodeURIComponent(selectedCategory)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setTerms(data.terms);
      } else {
        setError(data.error || '용어를 불러오는데 실패했습니다');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 용어 생성/수정
  const handleTermSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!editingTerm;
    const url = isEdit
      ? `${API_BASE_URL}/api/v1/manager/saju_terms/${editingTerm.id}`
      : `${API_BASE_URL}/api/v1/manager/saju_terms`;

    try {
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(termForm),
      });

      const data = await response.json();
      if (data.success) {
        setShowTermModal(false);
        setEditingTerm(null);
        setTermForm({ name: '', category: '', hanja: '', display_order: 0 });
        fetchTerms();
      } else {
        alert(data.errors?.join(', ') || '저장에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    }
  };

  // 용어 삭제
  const handleDeleteTerm = async (termId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/saju_terms/${termId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchTerms();
      } else {
        alert(data.error || '삭제에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    }
  };

  // 설명 생성/수정
  const handleDescSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!editingDesc;
    const url = isEdit
      ? `${API_BASE_URL}/api/v1/manager/saju_terms/${selectedTermForDesc.id}/descriptions/${editingDesc.id}`
      : `${API_BASE_URL}/api/v1/manager/saju_terms/${selectedTermForDesc.id}/descriptions`;

    try {
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(descForm),
      });

      const data = await response.json();
      if (data.success) {
        setShowDescModal(false);
        setEditingDesc(null);
        setSelectedTermForDesc(null);
        setDescForm({ description: '' });
        fetchTerms();
      } else {
        alert(data.errors?.join(', ') || '저장에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    }
  };

  // 설명 삭제
  const handleDeleteDesc = async (termId, descId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/saju_terms/${termId}/descriptions/${descId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchTerms();
      } else {
        alert(data.error || '삭제에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    }
  };

  // Master로 승격
  const handleAdopt = async (termId, descId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/saju_terms/${termId}/descriptions/${descId}/adopt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchTerms();
      } else {
        alert(data.error || 'Master 승격에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    }
  };

  // Master 해제
  const handleUnadopt = async (termId, descId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/saju_terms/${termId}/descriptions/${descId}/adopt`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchTerms();
      } else {
        alert(data.error || 'Master 해제에 실패했습니다');
      }
    } catch (err) {
      alert('서버 연결에 실패했습니다');
    }
  };

  // 검색 필터
  const filteredTerms = terms.filter(term =>
    term.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (term.hanja && term.hanja.includes(searchQuery))
  );

  const openTermModal = (term = null) => {
    if (term) {
      setEditingTerm(term);
      setTermForm({
        name: term.name,
        category: term.category || '',
        hanja: term.hanja || '',
        display_order: term.display_order || 0,
      });
    } else {
      setEditingTerm(null);
      setTermForm({ name: '', category: '', hanja: '', display_order: 0 });
    }
    setShowTermModal(true);
  };

  const openDescModal = (term, desc = null) => {
    setSelectedTermForDesc(term);
    if (desc) {
      setEditingDesc(desc);
      setDescForm({ description: desc.description });
    } else {
      setEditingDesc(null);
      setDescForm({ description: '' });
    }
    setShowDescModal(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>용어 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="saju-terms-page">
      <div className="page-header">
        <div className="header-left">
          <Book size={28} className="page-icon" />
          <div>
            <h1>사주 용어 사전</h1>
            <p>사주 명리학 용어 정의 및 설명을 관리합니다</p>
          </div>
        </div>
        {isAdmin() && (
          <button className="btn-primary" onClick={() => openTermModal()}>
            <Plus size={18} />
            용어 추가
          </button>
        )}
      </div>

      {/* 필터 및 검색 */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="용어 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="category-filter">
          <Filter size={18} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">전체 카테고리</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 용어 목록 */}
      <div className="terms-list">
        {filteredTerms.length === 0 ? (
          <div className="empty-state">
            <Book size={48} />
            <h3>등록된 용어가 없습니다</h3>
            <p>새로운 사주 용어를 추가해보세요</p>
          </div>
        ) : (
          filteredTerms.map(term => (
            <div key={term.id} className="term-card">
              <div
                className="term-header"
                onClick={() => setExpandedTermId(expandedTermId === term.id ? null : term.id)}
              >
                <div className="term-info">
                  <h3 className="term-name">
                    {term.name}
                    {term.hanja && <span className="term-hanja">({term.hanja})</span>}
                  </h3>
                  {term.category && (
                    <span className="term-category">{term.category}</span>
                  )}
                </div>
                <div className="term-actions">
                  {isAdmin() && (
                    <>
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); openTermModal(term); }}
                        title="수정"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTerm(term.id); }}
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  <button className="btn-icon expand">
                    {expandedTermId === term.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Master Description */}
              {term.master_description && (
                <div className="master-description">
                  <div className="desc-header">
                    <Crown size={16} className="master-icon" />
                    <span className="desc-label">Master 설명</span>
                    <span className="desc-author">{term.master_description.manager_name}</span>
                  </div>
                  <p className="desc-content">{term.master_description.description}</p>
                </div>
              )}

              {/* My Description */}
              {term.my_description && !term.my_description.is_master && (
                <div className="my-description">
                  <div className="desc-header">
                    <MessageSquare size={16} />
                    <span className="desc-label">내 설명</span>
                  </div>
                  <p className="desc-content">{term.my_description.description}</p>
                  <div className="desc-actions">
                    <button
                      className="btn-small"
                      onClick={() => openDescModal(term, term.my_description)}
                    >
                      <Edit2 size={14} /> 수정
                    </button>
                    <button
                      className="btn-small danger"
                      onClick={() => handleDeleteDesc(term.id, term.my_description.id)}
                    >
                      <Trash2 size={14} /> 삭제
                    </button>
                  </div>
                </div>
              )}

              {/* 내 설명 추가 버튼 */}
              {!term.my_description && (
                <button
                  className="btn-add-desc"
                  onClick={() => openDescModal(term)}
                >
                  <Plus size={16} /> 내 설명 추가하기
                </button>
              )}

              {/* 확장된 상세 보기 (Admin Only) */}
              {expandedTermId === term.id && isAdmin() && term.all_descriptions && (
                <div className="all-descriptions">
                  <div className="all-desc-header">
                    <h4>모든 설명 ({term.all_descriptions.length})</h4>
                  </div>
                  {term.all_descriptions.map(desc => (
                    <div key={desc.id} className={`desc-item ${desc.is_master ? 'is-master' : ''}`}>
                      <div className="desc-item-header">
                        <span className="desc-item-author">
                          {desc.manager.name}
                          <span className={`role-badge ${desc.manager.role}`}>
                            {desc.manager.role}
                          </span>
                        </span>
                        {desc.is_master && <Crown size={14} className="master-badge" />}
                      </div>
                      <p className="desc-item-content">{desc.description}</p>
                      <div className="desc-item-actions">
                        {desc.is_master ? (
                          <button
                            className="btn-small warning"
                            onClick={() => handleUnadopt(term.id, desc.id)}
                          >
                            <X size={14} /> Master 해제
                          </button>
                        ) : (
                          <button
                            className="btn-small success"
                            onClick={() => handleAdopt(term.id, desc.id)}
                          >
                            <Crown size={14} /> Master로 승격
                          </button>
                        )}
                        <button
                          className="btn-small danger"
                          onClick={() => handleDeleteDesc(term.id, desc.id)}
                        >
                          <Trash2 size={14} /> 삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 용어 추가/수정 모달 */}
      {showTermModal && (
        <div className="modal-overlay" onClick={() => setShowTermModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTerm ? '용어 수정' : '용어 추가'}</h2>
              <button className="btn-close" onClick={() => setShowTermModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTermSubmit}>
              <div className="form-group">
                <label>용어명 *</label>
                <input
                  type="text"
                  value={termForm.name}
                  onChange={(e) => setTermForm({...termForm, name: e.target.value})}
                  required
                  placeholder="예: 비견, 식신, 정관"
                />
              </div>
              <div className="form-group">
                <label>한자</label>
                <input
                  type="text"
                  value={termForm.hanja}
                  onChange={(e) => setTermForm({...termForm, hanja: e.target.value})}
                  placeholder="예: 比肩, 食神, 正官"
                />
              </div>
              <div className="form-group">
                <label>카테고리</label>
                <input
                  type="text"
                  value={termForm.category}
                  onChange={(e) => setTermForm({...termForm, category: e.target.value})}
                  placeholder="예: 십신, 천간, 지지, 격국"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label>표시 순서</label>
                <input
                  type="number"
                  value={termForm.display_order}
                  onChange={(e) => setTermForm({...termForm, display_order: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowTermModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={18} />
                  {editingTerm ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 설명 추가/수정 모달 */}
      {showDescModal && (
        <div className="modal-overlay" onClick={() => setShowDescModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingDesc ? '설명 수정' : '설명 추가'}
                <span className="modal-subtitle">- {selectedTermForDesc?.name}</span>
              </h2>
              <button className="btn-close" onClick={() => setShowDescModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDescSubmit}>
              <div className="form-group">
                <label>설명 *</label>
                <textarea
                  value={descForm.description}
                  onChange={(e) => setDescForm({...descForm, description: e.target.value})}
                  required
                  rows={6}
                  placeholder="이 용어에 대한 설명을 입력하세요..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDescModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={18} />
                  {editingDesc ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SajuTerms;
