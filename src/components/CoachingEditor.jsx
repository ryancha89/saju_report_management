import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw, Plus, Trash2, Sparkles, Edit3, Save, MessageSquare, ChevronDown, ChevronRight, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import './CoachingEditor.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// 세션 캐시 키 생성
const getCacheKey = (orderId) => `coaching_${orderId}`;

// 개별 코칭 항목 컴포넌트
function CoachingItem({
  item,
  index,
  totalItems,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onRegenerateItem,
  isRegenerating,
  userName
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [localTopic, setLocalTopic] = useState(item.topic || '');
  const [localContent, setLocalContent] = useState(item.content || '');
  const [draftContent, setDraftContent] = useState('');

  useEffect(() => {
    setLocalTopic(item.topic || '');
    setLocalContent(item.content || '');
  }, [item]);

  const handleSaveEdit = () => {
    onUpdate(index, {
      ...item,
      topic: localTopic,
      content: localContent,
      is_ai_generated: false
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setLocalTopic(item.topic || '');
    setLocalContent(item.content || '');
    setIsEditing(false);
  };

  const handleAIAssist = () => {
    // 초안이 있으면 그걸 기반으로, 없으면 주제만으로 생성
    onRegenerateItem(index, localTopic, draftContent || localContent);
    setDraftContent('');
  };

  return (
    <div className={`coaching-item ${isExpanded ? 'expanded' : ''}`}>
      <div
        className="coaching-item-header"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="coaching-item-title">
          <span className="item-number">{index + 1}</span>
          {isEditing ? (
            <input
              type="text"
              className="topic-edit-input"
              value={localTopic}
              onChange={(e) => setLocalTopic(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="주제를 입력하세요"
            />
          ) : (
            <span className="topic-text">{item.topic || '(주제 없음)'}</span>
          )}
          {item.is_ai_generated && (
            <span className="ai-badge">AI</span>
          )}
        </div>
        <div className="coaching-item-actions" onClick={(e) => e.stopPropagation()}>
          {!isEditing && (
            <>
              <button
                className="btn-icon btn-move"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                title="위로 이동"
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="btn-icon btn-move"
                onClick={() => onMoveDown(index)}
                disabled={index === totalItems - 1}
                title="아래로 이동"
              >
                <ArrowDown size={14} />
              </button>
              <button
                className="btn-icon"
                onClick={() => setIsEditing(true)}
                title="수정"
              >
                <Edit3 size={14} />
              </button>
              <button
                className="btn-icon btn-danger"
                onClick={() => onDelete(index)}
                title="삭제"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          {!isEditing && (
            <span className="toggle-icon">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="coaching-item-body">
          {isEditing ? (
            <div className="edit-mode">
              <div className="content-edit-section">
                <label className="edit-label">코칭 내용</label>
                <textarea
                  className="content-edit-textarea"
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  placeholder="코칭 내용을 입력하세요..."
                  rows={5}
                />
              </div>

              <div className="ai-assist-section">
                <label className="edit-label">AI 도움받기 (선택)</label>
                <textarea
                  className="draft-textarea"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="대략적인 내용이나 키워드를 입력하면 AI가 다듬어줍니다..."
                  rows={3}
                />
                <button
                  className="btn-ai-assist"
                  onClick={handleAIAssist}
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
                      <span>AI로 내용 작성</span>
                    </>
                  )}
                </button>
              </div>

              <div className="edit-actions">
                <button className="btn-save" onClick={handleSaveEdit}>
                  <Save size={14} />
                  <span>저장</span>
                </button>
                <button className="btn-cancel" onClick={handleCancelEdit}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="view-mode">
              {item.content ? (
                <div className="coaching-content">
                  {item.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              ) : (
                <div className="empty-content">
                  <MessageSquare size={24} />
                  <span>아직 내용이 없습니다. 수정 버튼을 눌러 내용을 작성해주세요.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 메인 코칭 에디터 컴포넌트
const CoachingEditor = forwardRef(function CoachingEditor({
  orderId,
  validationResult,
  initialData,
  onChange
}, ref) {
  // 세션 스토리지에서 캐시된 데이터 로드
  const getCachedData = () => {
    try {
      const cached = sessionStorage.getItem(getCacheKey(orderId));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load cached coaching data:', e);
    }
    return null;
  };

  const cachedData = getCachedData();

  const [coachingItems, setCoachingItems] = useState(cachedData?.items || []);
  const [loading, setLoading] = useState(false);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regeneratingItem, setRegeneratingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const dataLoaded = useRef(cachedData !== null);

  const userName = validationResult?.order_info?.name || '고객';

  // 캐시에 데이터 저장
  const saveToCache = (items) => {
    try {
      sessionStorage.setItem(getCacheKey(orderId), JSON.stringify({
        items: items,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to save coaching cache:', e);
    }
  };

  useImperativeHandle(ref, () => ({
    regenerateAll: handleRegenerateAll,
    isRegenerating: () => regeneratingAll,
    save: handleSave
  }));

  // 데이터 로드
  useEffect(() => {
    if (coachingItems.length > 0) {
      dataLoaded.current = true;
      return;
    }

    if (orderId && !dataLoaded.current) {
      if (initialData && initialData.length > 0) {
        setCoachingItems(initialData);
        dataLoaded.current = true;
        return;
      }
      loadCoachingData();
      dataLoaded.current = true;
    }
  }, [orderId, initialData]);

  const loadCoachingData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/coaching_data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '코칭 데이터 로드에 실패했습니다.');
      }

      // 저장된 데이터가 있으면 사용, 없으면 기본 주제 사용
      const savedItems = data.data.saved_coaching?.items || [];
      const items = savedItems.length > 0 ? savedItems : data.data.default_topics;

      setCoachingItems(items);
      saveToCache(items);

      if (onChange) {
        onChange(items);
      }
    } catch (err) {
      console.error('Load coaching data error:', err);
      // 에러 시 기본 주제 생성
      const defaultItems = generateDefaultTopics();
      setCoachingItems(defaultItems);
    } finally {
      setLoading(false);
    }
  };

  // 기본 주제 생성
  const generateDefaultTopics = () => [
    { id: 1, topic: '인생의 방향성과 목표 설정', content: '', is_ai_generated: false },
    { id: 2, topic: '대인관계와 소통 방법', content: '', is_ai_generated: false },
    { id: 3, topic: '재물과 경제 활동', content: '', is_ai_generated: false },
    { id: 4, topic: '건강과 생활 습관', content: '', is_ai_generated: false },
    { id: 5, topic: '마음 수양과 정신적 성장', content: '', is_ai_generated: false }
  ];

  // 전체 재생성
  const handleRegenerateAll = async () => {
    setRegeneratingAll(true);
    try {
      const topics = coachingItems.map(item => item.topic);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_coaching`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({ topics })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '코칭 생성에 실패했습니다.');
      }

      const newItems = data.coaching_items;
      setCoachingItems(newItems);
      saveToCache(newItems);

      if (onChange) {
        onChange(newItems);
      }

      // 자동 저장
      await handleSave(newItems);
    } catch (err) {
      console.error('Regenerate all error:', err);
      alert(`생성 실패: ${err.message}`);
    } finally {
      setRegeneratingAll(false);
    }
  };

  // 개별 항목 재생성
  const handleRegenerateItem = async (index, topic, draftContent) => {
    setRegeneratingItem(index);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/regenerate_coaching_item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({
          index,
          topic,
          draft_content: draftContent
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '항목 생성에 실패했습니다.');
      }

      const newItems = coachingItems.map((item, i) =>
        i === index
          ? { ...item, topic: data.topic, content: data.content, is_ai_generated: true }
          : item
      );

      setCoachingItems(newItems);
      saveToCache(newItems);

      if (onChange) {
        onChange(newItems);
      }
    } catch (err) {
      console.error('Regenerate item error:', err);
      alert(`생성 실패: ${err.message}`);
    } finally {
      setRegeneratingItem(null);
    }
  };

  // 항목 업데이트
  const handleUpdateItem = (index, updatedItem) => {
    const newItems = coachingItems.map((item, i) =>
      i === index ? { ...updatedItem, id: item.id } : item
    );
    setCoachingItems(newItems);
    saveToCache(newItems);

    if (onChange) {
      onChange(newItems);
    }
  };

  // 항목 삭제
  const handleDeleteItem = (index) => {
    if (!confirm('이 코칭 항목을 삭제하시겠습니까?')) return;

    const newItems = coachingItems.filter((_, i) => i !== index);
    // ID 재할당
    const reindexedItems = newItems.map((item, i) => ({ ...item, id: i + 1 }));
    setCoachingItems(reindexedItems);
    saveToCache(reindexedItems);

    if (onChange) {
      onChange(reindexedItems);
    }
  };

  // 항목 위로 이동
  const handleMoveUp = (index) => {
    if (index === 0) return;

    const newItems = [...coachingItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    // ID 재할당
    const reindexedItems = newItems.map((item, i) => ({ ...item, id: i + 1 }));
    setCoachingItems(reindexedItems);
    saveToCache(reindexedItems);

    if (onChange) {
      onChange(reindexedItems);
    }
  };

  // 항목 아래로 이동
  const handleMoveDown = (index) => {
    if (index === coachingItems.length - 1) return;

    const newItems = [...coachingItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    // ID 재할당
    const reindexedItems = newItems.map((item, i) => ({ ...item, id: i + 1 }));
    setCoachingItems(reindexedItems);
    saveToCache(reindexedItems);

    if (onChange) {
      onChange(reindexedItems);
    }
  };

  // 새 항목 추가
  const handleAddItem = () => {
    const newItem = {
      id: coachingItems.length + 1,
      topic: '',
      content: '',
      is_ai_generated: false
    };
    const newItems = [...coachingItems, newItem];
    setCoachingItems(newItems);
    saveToCache(newItems);

    if (onChange) {
      onChange(newItems);
    }
  };

  // 저장
  const handleSave = async (itemsToSave = null) => {
    const items = itemsToSave || coachingItems;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/save_coaching`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        },
        body: JSON.stringify({ coaching_items: items })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      console.log('Coaching saved successfully');
    } catch (err) {
      console.error('Save coaching error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="coaching-editor loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>코칭 데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="coaching-editor">
      {/* 전체 생성 중 오버레이 */}
      {regeneratingAll && (
        <div className="coaching-editor-loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">코칭 내용을 생성하고 있습니다...</div>
            <div className="loading-subtext">AI가 사주 분석을 바탕으로 맞춤형 코칭을 작성 중입니다. 잠시만 기다려주세요.</div>
          </div>
        </div>
      )}

      <div className="coaching-header-section">
        <h3 className="section-title">
          <MessageSquare size={20} />
          상담사의 코칭
        </h3>
        <p className="section-description">
          {userName}님의 사주를 바탕으로 인생의 다양한 영역에서 도움이 될 조언을 작성합니다.
          AI의 도움을 받거나 직접 내용을 작성할 수 있습니다.
        </p>
        <div className="header-actions">
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
                전체 AI 생성
              </>
            )}
          </button>
          <button
            className="btn btn-add"
            onClick={handleAddItem}
          >
            <Plus size={16} />
            항목 추가
          </button>
          <button
            className="btn btn-save-all"
            onClick={() => handleSave()}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="spinning" />
                저장 중...
              </>
            ) : (
              <>
                <Save size={16} />
                저장
              </>
            )}
          </button>
        </div>
      </div>

      <div className="coaching-items-list">
        {coachingItems.length > 0 ? (
          coachingItems.map((item, index) => (
            <CoachingItem
              key={item.id || index}
              item={item}
              index={index}
              totalItems={coachingItems.length}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRegenerateItem={handleRegenerateItem}
              isRegenerating={regeneratingItem === index}
              userName={userName}
            />
          ))
        ) : (
          <div className="empty-state">
            <MessageSquare size={48} />
            <p>아직 코칭 항목이 없습니다.</p>
            <button className="btn btn-add" onClick={handleAddItem}>
              <Plus size={16} />
              첫 번째 항목 추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default CoachingEditor;
