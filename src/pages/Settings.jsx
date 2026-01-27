import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function Settings() {
  const { getToken, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState(50);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  // Notification settings
  const [notificationEmail, setNotificationEmail] = useState('');
  const [savingNotification, setSavingNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState({ type: '', text: '' });

  // Sale settings (daily limit)
  const [saleSettings, setSaleSettings] = useState({
    daily_limit_enabled: false,
    daily_limit_count: 10,
    urgency_threshold: 3,
    today_purchase_count: 0,
  });
  const [savingSaleSettings, setSavingSaleSettings] = useState(false);
  const [saleSettingsMessage, setSaleSettingsMessage] = useState({ type: '', text: '' });

  // Discount settings (특별할인)
  const [discountSettings, setDiscountSettings] = useState({
    sale_active: false,
    pro_sale_price: 10000,
    pro_discount_rate: 33,
    lite_sale_price: 5000,
    lite_discount_rate: 50,
  });
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [discountMessage, setDiscountMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isAdmin()) {
      fetchPendingInvitations();
      fetchProfile();
      fetchSaleSettings();
      fetchDiscountSettings();
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/profile`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          setNotificationEmail(data.profile.notification_email || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const fetchSaleSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/blueprint_sale_settings`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSaleSettings({
          daily_limit_enabled: data.daily_limit_enabled || false,
          daily_limit_count: data.daily_limit_count || 10,
          urgency_threshold: data.urgency_threshold || 3,
          today_purchase_count: data.today_purchase_count || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch sale settings:', err);
    }
  };

  const fetchDiscountSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/blueprint_sale_settings`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiscountSettings({
          sale_active: data.sale_active || false,
          pro_sale_price: parseInt(String(data.pro_sale_price || '10000').replace(/,/g, '')) || 10000,
          pro_discount_rate: data.pro_discount_rate || 33,
          lite_sale_price: parseInt(String(data.lite_sale_price || '5000').replace(/,/g, '')) || 5000,
          lite_discount_rate: data.lite_discount_rate || 50,
        });
      }
    } catch (err) {
      console.error('Failed to fetch discount settings:', err);
    }
  };

  const handleSaveDiscountSettings = async (e) => {
    e.preventDefault();
    setSavingDiscount(true);
    setDiscountMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/blueprint_sale_settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sale_active: discountSettings.sale_active,
          pro_sale_price: discountSettings.pro_sale_price,
          pro_discount_rate: discountSettings.pro_discount_rate,
          lite_sale_price: discountSettings.lite_sale_price,
          lite_discount_rate: discountSettings.lite_discount_rate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDiscountMessage({ type: 'success', text: '할인 설정이 저장되었습니다' });
      } else {
        setDiscountMessage({ type: 'error', text: data.error || '저장에 실패했습니다' });
      }
    } catch (err) {
      setDiscountMessage({ type: 'error', text: '서버 연결에 실패했습니다' });
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleSaveSaleSettings = async (e) => {
    e.preventDefault();
    setSavingSaleSettings(true);
    setSaleSettingsMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/blueprint_sale_settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daily_limit_enabled: saleSettings.daily_limit_enabled,
          daily_limit_count: saleSettings.daily_limit_count,
          urgency_threshold: saleSettings.urgency_threshold,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSaleSettingsMessage({ type: 'success', text: '설정이 저장되었습니다' });
        if (data.data) {
          setSaleSettings(prev => ({
            ...prev,
            today_purchase_count: data.data.today_purchase_count || 0,
          }));
        }
      } else {
        setSaleSettingsMessage({ type: 'error', text: data.error || '저장에 실패했습니다' });
      }
    } catch (err) {
      setSaleSettingsMessage({ type: 'error', text: '서버 연결에 실패했습니다' });
    } finally {
      setSavingSaleSettings(false);
    }
  };

  const handleSaveNotificationEmail = async (e) => {
    e.preventDefault();
    setSavingNotification(true);
    setNotificationMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_email: notificationEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setNotificationMessage({ type: 'success', text: '알림 이메일이 저장되었습니다' });
      } else {
        setNotificationMessage({ type: 'error', text: data.error || '저장에 실패했습니다' });
      }
    } catch (err) {
      setNotificationMessage({ type: 'error', text: '서버 연결에 실패했습니다' });
    } finally {
      setSavingNotification(false);
    }
  };

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
        body: JSON.stringify({ email, commission_rate: commissionRate }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setEmail('');
        setCommissionRate(50);
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
        <h2>알림 수신 설정</h2>
        <p className="section-description">
          신규 주문 알림을 받을 이메일 주소를 설정합니다. 설정하지 않으면 기본값(help@ftorch.com)으로 발송됩니다.
        </p>

        {notificationMessage.text && (
          <div className={`message ${notificationMessage.type}`}>
            {notificationMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveNotificationEmail} className="notification-form">
          <div className="form-row">
            <div className="form-group flex-grow">
              <label htmlFor="notification_email">알림 수신 이메일</label>
              <input
                type="email"
                id="notification_email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="help@ftorch.com"
                disabled={savingNotification}
              />
            </div>
          </div>
          <button type="submit" className="save-button" disabled={savingNotification}>
            {savingNotification ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>

      <div className="settings-section discount-section">
        <h2>🔥 특별할인 설정</h2>
        <p className="section-description">
          특별할인을 활성화하면 앱에서 "특별할인" 배지와 함께 할인 가격이 강조 표시됩니다.
          비활성화 시에도 기본 할인(PRO: 15,000→12,000, LITE: 10,000→7,000)은 유지됩니다.
        </p>

        {discountMessage.text && (
          <div className={`message ${discountMessage.type}`}>
            {discountMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveDiscountSettings} className="discount-form">
          <div className="form-group toggle-group">
            <label className="toggle-label">
              <span>특별할인 활성화</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={discountSettings.sale_active}
                  onChange={(e) => setDiscountSettings(prev => ({
                    ...prev,
                    sale_active: e.target.checked
                  }))}
                  disabled={savingDiscount}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
            {discountSettings.sale_active && (
              <span className="status-badge active">특별할인 진행중</span>
            )}
          </div>

          {discountSettings.sale_active && (
            <div className="discount-plans">
              <div className="discount-plan-card">
                <h3>👑 PRO 플랜</h3>
                <p className="plan-info">기본: 15,000 → 12,000 코인</p>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pro_sale_price">특별할인 가격 (코인)</label>
                    <input
                      type="number"
                      id="pro_sale_price"
                      value={discountSettings.pro_sale_price}
                      onChange={(e) => setDiscountSettings(prev => ({
                        ...prev,
                        pro_sale_price: parseInt(e.target.value) || 10000
                      }))}
                      min="1000"
                      max="15000"
                      disabled={savingDiscount}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pro_discount_rate">할인율 (%)</label>
                    <input
                      type="number"
                      id="pro_discount_rate"
                      value={discountSettings.pro_discount_rate}
                      onChange={(e) => setDiscountSettings(prev => ({
                        ...prev,
                        pro_discount_rate: parseInt(e.target.value) || 33
                      }))}
                      min="1"
                      max="90"
                      disabled={savingDiscount}
                    />
                  </div>
                </div>
                <p className="price-preview">
                  표시: <span className="strike">12,000</span> → <span className="highlight">{discountSettings.pro_sale_price.toLocaleString()}</span> 코인 ({discountSettings.pro_discount_rate}% OFF)
                </p>
              </div>

              <div className="discount-plan-card">
                <h3>✨ LITE 플랜</h3>
                <p className="plan-info">기본: 10,000 → 7,000 코인</p>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="lite_sale_price">특별할인 가격 (코인)</label>
                    <input
                      type="number"
                      id="lite_sale_price"
                      value={discountSettings.lite_sale_price}
                      onChange={(e) => setDiscountSettings(prev => ({
                        ...prev,
                        lite_sale_price: parseInt(e.target.value) || 5000
                      }))}
                      min="1000"
                      max="10000"
                      disabled={savingDiscount}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lite_discount_rate">할인율 (%)</label>
                    <input
                      type="number"
                      id="lite_discount_rate"
                      value={discountSettings.lite_discount_rate}
                      onChange={(e) => setDiscountSettings(prev => ({
                        ...prev,
                        lite_discount_rate: parseInt(e.target.value) || 50
                      }))}
                      min="1"
                      max="90"
                      disabled={savingDiscount}
                    />
                  </div>
                </div>
                <p className="price-preview">
                  표시: <span className="strike">7,000</span> → <span className="highlight">{discountSettings.lite_sale_price.toLocaleString()}</span> 코인 ({discountSettings.lite_discount_rate}% OFF)
                </p>
              </div>
            </div>
          )}

          <button type="submit" className="save-button" disabled={savingDiscount}>
            {savingDiscount ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h2>일일 구매 제한 설정</h2>
        <p className="section-description">
          하루 최대 구매 가능 수량을 설정합니다. 활성화하면 남은 수량이 임박 기준 이하일 때 "마감 임박" 표시가 나타납니다.
        </p>

        {saleSettingsMessage.text && (
          <div className={`message ${saleSettingsMessage.type}`}>
            {saleSettingsMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveSaleSettings} className="sale-settings-form">
          <div className="form-group toggle-group">
            <label className="toggle-label">
              <span>일일 구매 제한 활성화</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={saleSettings.daily_limit_enabled}
                  onChange={(e) => setSaleSettings(prev => ({
                    ...prev,
                    daily_limit_enabled: e.target.checked
                  }))}
                  disabled={savingSaleSettings}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
          </div>

          {saleSettings.daily_limit_enabled && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="daily_limit_count">하루 최대 구매 수량</label>
                  <input
                    type="number"
                    id="daily_limit_count"
                    value={saleSettings.daily_limit_count}
                    onChange={(e) => setSaleSettings(prev => ({
                      ...prev,
                      daily_limit_count: parseInt(e.target.value) || 10
                    }))}
                    min="1"
                    max="1000"
                    disabled={savingSaleSettings}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="urgency_threshold">임박 표시 기준 (잔여 수량)</label>
                  <input
                    type="number"
                    id="urgency_threshold"
                    value={saleSettings.urgency_threshold}
                    onChange={(e) => setSaleSettings(prev => ({
                      ...prev,
                      urgency_threshold: parseInt(e.target.value) || 3
                    }))}
                    min="1"
                    max="100"
                    disabled={savingSaleSettings}
                  />
                </div>
              </div>

              <div className="daily-limit-info">
                <p>
                  <strong>오늘 구매 수:</strong> {saleSettings.today_purchase_count}건
                  <span className="separator">|</span>
                  <strong>남은 수량:</strong> {Math.max(0, saleSettings.daily_limit_count - saleSettings.today_purchase_count)}건
                </p>
                {saleSettings.daily_limit_count - saleSettings.today_purchase_count <= saleSettings.urgency_threshold &&
                 saleSettings.daily_limit_count - saleSettings.today_purchase_count > 0 && (
                  <p className="urgency-preview">
                    현재 설정 기준 "마감 임박" 표시됨
                  </p>
                )}
                {saleSettings.daily_limit_count - saleSettings.today_purchase_count <= 0 && (
                  <p className="soldout-preview">
                    현재 설정 기준 "매진" 상태
                  </p>
                )}
              </div>
            </>
          )}

          <button type="submit" className="save-button" disabled={savingSaleSettings}>
            {savingSaleSettings ? '저장 중...' : '저장'}
          </button>
        </form>
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
          <div className="form-row">
            <div className="form-group flex-grow">
              <label htmlFor="email">이메일 주소</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@example.com"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group commission-input">
              <label htmlFor="commission_rate">수익률</label>
              <div className="rate-input-wrap">
                <input
                  type="number"
                  id="commission_rate"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseInt(e.target.value) || 50)}
                  min="0"
                  max="100"
                  disabled={loading}
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <button type="submit" className="invite-button" disabled={loading || !email}>
            {loading ? '발송 중...' : '초대 발송'}
          </button>
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
                <th>수익률</th>
                <th>발송일시</th>
                <th>만료일시</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td><strong>{invitation.commission_rate || 50}%</strong></td>
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
