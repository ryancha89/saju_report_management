import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Building, CreditCard, FileText, Save, Loader, Link, Copy, Check, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const REFERRAL_BASE_URL = import.meta.env.VITE_REFERRAL_BASE_URL || 'https://fortunetorch.com';

const PRODUCTS_CONFIG = {
  blueprint: {
    name: 'Blueprint Pro',
    display_name: 'Blueprint Pro (5년)',
    price: 77000,
    description: '평생 대운 + 5년 운세 분석',
    max_questions: 2
  },
  blueprint_lite: {
    name: 'Blueprint Lite',
    display_name: 'Blueprint Lite (3년)',
    price: 44000,
    description: '현재/다음 대운 + 3년 운세 분석',
    max_questions: 1
  }
};

function Profile() {
  const navigate = useNavigate();
  const { getToken, manager, refreshManager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    display_name: '',
    phone_number: '',
    bank_name: '',
    bank_account: '',
    resident_number: '',
    manager_message: ''
  });

  const [errors, setErrors] = useState({});
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [commissionRate, setCommissionRate] = useState(50);
  const products = PRODUCTS_CONFIG;
  const isProfileCompleted = manager?.profile_completed;
  const isAdmin = manager?.role === 'admin';

  // 수익 계산 함수
  const calculateRevenue = (price) => {
    const priceWithoutVat = Math.round(price / 1.1);
    const grossRevenue = Math.round(priceWithoutVat * commissionRate / 100);
    const withholdingTax = Math.round(grossRevenue * 0.033);
    const netRevenue = grossRevenue - withholdingTax;
    return { priceWithoutVat, grossRevenue, withholdingTax, netRevenue };
  };

  useEffect(() => {
    fetchProfile();
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
        if (data.success) {
          setFormData({
            display_name: data.profile.display_name || '',
            phone_number: data.profile.phone_number || '',
            bank_name: data.profile.bank_name || '',
            bank_account: data.profile.bank_account || '',
            resident_number: '',
            manager_message: data.profile.manager_message || ''
          });
          setReferralCode(data.profile.referral_code || '');
          setCommissionRate(data.profile.commission_rate || 50);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setMessage({ type: 'error', text: '프로필 정보를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.display_name.trim()) {
      newErrors.display_name = '활동명을 입력해주세요.';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = '전화번호를 입력해주세요.';
    } else if (!/^[0-9-]+$/.test(formData.phone_number)) {
      newErrors.phone_number = '올바른 전화번호 형식을 입력해주세요.';
    }

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = '은행명을 입력해주세요.';
    }

    if (!formData.bank_account.trim()) {
      newErrors.bank_account = '계좌번호를 입력해주세요.';
    }

    if (!isProfileCompleted && !formData.resident_number.trim()) {
      newErrors.resident_number = '주민번호를 입력해주세요.';
    } else if (formData.resident_number && !/^\d{6}-?\d{7}$/.test(formData.resident_number.replace(/-/g, ''))) {
      newErrors.resident_number = '올바른 주민번호 형식을 입력해주세요 (예: 900101-1234567).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCopyLink = async (product) => {
    const link = `${REFERRAL_BASE_URL}/user-info?product=${product}&ref=${referralCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(product);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const submitData = { ...formData };
      if (!submitData.resident_number) {
        delete submitData.resident_number;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/manager/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        if (refreshManager) {
          await refreshManager();
        }
        if (!isProfileCompleted) {
          setTimeout(() => {
            navigate('/admin/orders');
          }, 1500);
        }
      } else {
        setMessage({ type: 'error', text: data.error || '프로필 저장에 실패했습니다.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '서버 연결에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile">
        <div className="loading-state">
          <Loader size={32} className="spinning" />
          <p>프로필 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="page-header">
        <h1>매니저 프로필</h1>
        <p>
          {isProfileCompleted
            ? '프로필 정보를 수정할 수 있습니다.'
            : '서비스 이용을 위해 프로필 정보를 입력해주세요.'
          }
        </p>
      </div>

      {!isProfileCompleted && (
        <div className="profile-notice">
          <strong>필수 입력 안내</strong>
          <p>아래 정보를 모두 입력해야 서비스를 이용할 수 있습니다.</p>
        </div>
      )}

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 판매 링크 섹션 - 매니저만 표시 (프로필 완료 후) */}
      {!isAdmin && isProfileCompleted && referralCode && products && (
        <div className="referral-section">
          <h2>
            <Link size={18} />
            내 판매 링크
          </h2>
          <p className="referral-description">
            아래 링크를 통해 고객이 구매하면 해당 주문이 자동으로 배정됩니다.
          </p>
          <div className="referral-links">
            <div className="referral-link-item">
              <span className="link-label">{products.blueprint?.display_name || 'Blueprint Pro'}</span>
              <div className="link-box">
                <input
                  type="text"
                  readOnly
                  value={`${REFERRAL_BASE_URL}/user-info?product=blueprint&ref=${referralCode}`}
                />
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => handleCopyLink('blueprint')}
                >
                  {copied === 'blueprint' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div className="referral-link-item">
              <span className="link-label">{products.blueprint_lite?.display_name || 'Blueprint Lite'}</span>
              <div className="link-box">
                <input
                  type="text"
                  readOnly
                  value={`${REFERRAL_BASE_URL}/user-info?product=blueprint_lite&ref=${referralCode}`}
                />
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => handleCopyLink('blueprint_lite')}
                >
                  {copied === 'blueprint_lite' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 수익 정보 섹션 - 매니저만 표시 (프로필 완료 후) */}
      {!isAdmin && isProfileCompleted && products && (
        <div className="revenue-section">
          <h2>
            <DollarSign size={18} />
            수익 구조
          </h2>
          <div className="commission-rate-badge">
            수익률 <strong>{commissionRate}%</strong>
          </div>

          <div className="revenue-table">
            <div className="revenue-header">
              <span>상품</span>
              <span>판매가</span>
              <span>정산금</span>
              <span>원천징수</span>
              <span>실수령</span>
            </div>

            {/* Blueprint Pro */}
            {products.blueprint && (() => {
              const price = products.blueprint.price;
              const rev = calculateRevenue(price);
              return (
                <div className="revenue-row">
                  <span className="product-name">{products.blueprint.name}</span>
                  <span>{price.toLocaleString()}원</span>
                  <span>{rev.grossRevenue.toLocaleString()}원</span>
                  <span className="tax">-{rev.withholdingTax.toLocaleString()}원</span>
                  <span className="net-revenue">{rev.netRevenue.toLocaleString()}원</span>
                </div>
              );
            })()}

            {/* Blueprint Lite */}
            {products.blueprint_lite && (() => {
              const price = products.blueprint_lite.price;
              const rev = calculateRevenue(price);
              return (
                <div className="revenue-row">
                  <span className="product-name">{products.blueprint_lite.name}</span>
                  <span>{price.toLocaleString()}원</span>
                  <span>{rev.grossRevenue.toLocaleString()}원</span>
                  <span className="tax">-{rev.withholdingTax.toLocaleString()}원</span>
                  <span className="net-revenue">{rev.netRevenue.toLocaleString()}원</span>
                </div>
              );
            })()}
          </div>

          <div className="revenue-note">
            <Calendar size={14} />
            <span>익월 25일 입금</span>
          </div>
          <p className="revenue-description">
            * 정산금 = (판매가 ÷ 1.1) × {commissionRate}% (부가세 제외 후 수익률 적용)<br />
            * 원천징수 3.3% 공제 후 실수령액이 입금됩니다.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-section">
          <h2>기본 정보</h2>

          <div className="form-group">
            <label htmlFor="display_name">
              <User size={16} />
              활동명 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="display_name"
              name="display_name"
              value={formData.display_name}
              onChange={handleChange}
              placeholder="리포트에 표시될 활동명"
              className={errors.display_name ? 'error' : ''}
            />
            {errors.display_name && <span className="error-message">{errors.display_name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">
              <Phone size={16} />
              전화번호 <span className="required">*</span>
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="010-1234-5678"
              className={errors.phone_number ? 'error' : ''}
            />
            {errors.phone_number && <span className="error-message">{errors.phone_number}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="resident_number">
              <FileText size={16} />
              주민번호 {!isProfileCompleted && <span className="required">*</span>}
            </label>
            <input
              type="text"
              id="resident_number"
              name="resident_number"
              value={formData.resident_number}
              onChange={handleChange}
              placeholder={isProfileCompleted ? '변경시에만 입력' : '900101-1234567'}
              className={errors.resident_number ? 'error' : ''}
            />
            {errors.resident_number && <span className="error-message">{errors.resident_number}</span>}
            <span className="help-text">주민번호는 암호화되어 안전하게 저장됩니다.</span>
          </div>
        </div>

        <div className="form-section">
          <h2>정산 정보</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bank_name">
                <Building size={16} />
                은행명 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="bank_name"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="예: 국민은행"
                className={errors.bank_name ? 'error' : ''}
              />
              {errors.bank_name && <span className="error-message">{errors.bank_name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="bank_account">
                <CreditCard size={16} />
                계좌번호 <span className="required">*</span>
              </label>
              <input
                type="text"
                id="bank_account"
                name="bank_account"
                value={formData.bank_account}
                onChange={handleChange}
                placeholder="계좌번호 입력"
                className={errors.bank_account ? 'error' : ''}
              />
              {errors.bank_account && <span className="error-message">{errors.bank_account}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>매니저 소개</h2>

          <div className="form-group">
            <label htmlFor="manager_message">
              <FileText size={16} />
              매니저의 한마디
            </label>
            <textarea
              id="manager_message"
              name="manager_message"
              value={formData.manager_message}
              onChange={handleChange}
              placeholder="예시: 당신의 사주를 통해 숨겨진 가능성과 미래의 길을 발견하시길 바랍니다. 이 리포트가 당신의 인생 여정에 작은 빛이 되기를 진심으로 응원합니다."
              rows={4}
            />
            <span className="help-text">리포트 하단에 표시됩니다. (선택사항)</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-button" disabled={saving}>
            {saving ? (
              <>
                <Loader size={18} className="spinning" />
                저장 중...
              </>
            ) : (
              <>
                <Save size={18} />
                {isProfileCompleted ? '프로필 수정' : '프로필 저장'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
