import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Register.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect to admin
    if (isAuthenticated) {
      navigate('/admin');
      return;
    }

    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError('초대 링크가 유효하지 않습니다');
      setLoading(false);
      return;
    }

    setToken(tokenParam);
    verifyToken(tokenParam);
  }, [searchParams, isAuthenticated, navigate]);

  const verifyToken = async (invitationToken) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/manager/invitations/verify?token=${invitationToken}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setEmail(data.email);
        setTokenValid(true);
      } else {
        setError(data.error || '유효하지 않거나 만료된 초대 링크입니다');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('이름을 입력해주세요');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/invitations/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name: name.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Save token and redirect
        localStorage.setItem('manager_token', data.token);
        window.location.href = '/admin';
      } else {
        setError(data.error || '등록에 실패했습니다');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="register-container">
        <div className="register-card">
          <div className="loading">초대 링크 확인 중...</div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="register-container">
        <div className="register-card">
          <h1>매니저 등록</h1>
          <div className="error-message">{error}</div>
          <p className="help-text">
            초대 링크가 만료되었거나 유효하지 않습니다.
            <br />
            관리자에게 새로운 초대를 요청해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>매니저 등록</h1>
        <p className="subtitle">계정 정보를 입력하여 등록을 완료해 주세요.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              value={email}
              disabled
              className="disabled-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">이름</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              required
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상 입력하세요"
              required
              minLength={6}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              required
              disabled={submitting}
            />
          </div>

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? '등록 중...' : '등록 완료'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
