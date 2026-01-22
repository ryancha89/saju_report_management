import { useState } from 'react';
import { MessageSquarePlus, Edit3, Trash2, Check, X, GripVertical } from 'lucide-react';
import './CounselorKeyPoint.css';

// 핵심포인트 표시 컴포넌트
export function KeyPointDisplay({ keyPoint, isAdmin, onEdit, onDelete }) {
  return (
    <div className="key-point-display">
      <div className="key-point-badge">
        <span className="key-point-icon">💡</span>
        <span className="key-point-label">상담사의 핵심 포인트</span>
      </div>
      <div className="key-point-content">
        {keyPoint.content}
      </div>
      {isAdmin && (
        <div className="key-point-actions">
          <button className="btn-key-point-action" onClick={() => onEdit(keyPoint)}>
            <Edit3 size={14} />
          </button>
          <button className="btn-key-point-action btn-delete" onClick={() => onDelete(keyPoint.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// 핵심포인트 추가 버튼 (문단 사이에 표시)
export function AddKeyPointButton({ position, onClick }) {
  return (
    <div className="add-key-point-trigger" onClick={() => onClick(position)}>
      <div className="add-key-point-line"></div>
      <button className="btn-add-key-point">
        <MessageSquarePlus size={14} />
        <span>핵심포인트 추가</span>
      </button>
      <div className="add-key-point-line"></div>
    </div>
  );
}

// 핵심포인트 편집 모달
export function KeyPointEditor({
  isOpen,
  onClose,
  onSave,
  initialContent = '',
  position,
  isEditing = false
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave(content, position);
      onClose();
    } catch (error) {
      console.error('핵심포인트 저장 실패:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="key-point-modal-overlay" onClick={onClose}>
      <div className="key-point-modal" onClick={e => e.stopPropagation()}>
        <div className="key-point-modal-header">
          <h3>
            <span className="modal-icon">💡</span>
            {isEditing ? '핵심포인트 수정' : '핵심포인트 추가'}
          </h3>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="key-point-modal-body">
          <p className="key-point-hint">
            고객에게 전달하고 싶은 핵심 메시지나 조언을 작성해주세요.
          </p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="예: 이 시기에는 특히 건강 관리에 신경 쓰시는 것이 좋습니다..."
            rows={4}
            autoFocus
          />
        </div>
        <div className="key-point-modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            취소
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={!content.trim() || saving}
          >
            {saving ? '저장 중...' : (isEditing ? '수정' : '추가')}
          </button>
        </div>
      </div>
    </div>
  );
}

// 핵심포인트 관리 훅
export function useKeyPoints(orderId, apiBaseUrl, apiToken) {
  const [keyPoints, setKeyPoints] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchKeyPoints = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/orders/${orderId}/counselor_key_points`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${apiToken}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setKeyPoints(data.key_points || {});
      }
    } catch (error) {
      console.error('핵심포인트 조회 실패:', error);
    }
  };

  const addKeyPoint = async (chapterKey, content, position) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/orders/${orderId}/counselor_key_points/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${apiToken}`
          },
          body: JSON.stringify({
            chapter_key: chapterKey,
            content,
            position
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setKeyPoints(data.key_points);
        return data.key_point;
      }
      throw new Error(data.error);
    } finally {
      setLoading(false);
    }
  };

  const updateKeyPoint = async (chapterKey, pointId, content, position) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/orders/${orderId}/counselor_key_points/update`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${apiToken}`
          },
          body: JSON.stringify({
            chapter_key: chapterKey,
            point_id: pointId,
            content,
            position
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setKeyPoints(data.key_points);
      }
      return data.success;
    } finally {
      setLoading(false);
    }
  };

  const deleteKeyPoint = async (chapterKey, pointId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/orders/${orderId}/counselor_key_points/delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${apiToken}`
          },
          body: JSON.stringify({
            chapter_key: chapterKey,
            point_id: pointId
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setKeyPoints(data.key_points);
      }
      return data.success;
    } finally {
      setLoading(false);
    }
  };

  return {
    keyPoints,
    loading,
    fetchKeyPoints,
    addKeyPoint,
    updateKeyPoint,
    deleteKeyPoint
  };
}

export default KeyPointDisplay;
