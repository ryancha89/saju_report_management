import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function Settings() {
  const { getToken, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  useEffect(() => {
    if (isAdmin()) {
      fetchPendingInvitations();
    }
  }, []);

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/invitations`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPendingInvitations(data.invitations);
        }
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setEmail('');
        fetchPendingInvitations();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '서버 연결에 실패했습니다' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm('초대를 취소하시겠습니까?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchPendingInvitations();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '서버 연결에 실패했습니다' });
    }
  };

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

  // Only admin can see this page
  if (!isAdmin()) {
    return (
      <div className="settings">
        <div className="page-header">
          <h1>설정</h1>
          <p>접근 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="page-header">
        <h1>설정</h1>
        <p>시스템 설정을 관리합니다.</p>
      </div>

      <div className="settings-section">
        <h2>매니저 계정 초대</h2>
        <p className="section-description">
          새로운 매니저를 이메일로 초대합니다. 초대받은 매니저는 이메일 링크를 통해 계정을 등록할 수 있습니다.
        </p>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleInvite} className="invite-form">
          <div className="form-group">
            <label htmlFor="email">이메일 주소</label>
            <div className="input-with-button">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@example.com"
                required
                disabled={loading}
              />
              <button type="submit" className="invite-button" disabled={loading || !email}>
                {loading ? '발송 중...' : '초대 발송'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="settings-section">
        <h2>대기 중인 초대</h2>
        {loadingInvitations ? (
          <p>로딩 중...</p>
        ) : pendingInvitations.length === 0 ? (
          <p className="empty-message">대기 중인 초대가 없습니다.</p>
        ) : (
          <table className="invitations-table">
            <thead>
              <tr>
                <th>이메일</th>
                <th>발송일시</th>
                <th>만료일시</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>{formatDate(invitation.invitation_sent_at)}</td>
                  <td>{formatDate(invitation.invitation_expires_at)}</td>
                  <td>
                    <button
                      className="cancel-button"
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      취소
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Settings;
