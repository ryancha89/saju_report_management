import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { initTracking } from '../lib/tracking';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [footerOpen, setFooterOpen] = useState(false);

  // 페이지 진입 시 추적 데이터 저장
  useEffect(() => {
    const trackingData = initTracking();
    if (Object.keys(trackingData).length > 0) {
      console.log('📊 Tracking initialized:', trackingData);
    }
  }, []);

  // 배경색 설정
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;

    document.body.style.backgroundColor = '#2d2d3a';
    document.documentElement.style.backgroundColor = '#2d2d3a';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  // 시작하기 클릭 - UTM 파라미터 유지 + 상품 타입 추가
  const handleStartClick = (productId) => {
    const params = new URLSearchParams(location.search);
    params.set('product', productId);
    navigate(`/user-info?${params.toString()}`);
  };

  const reports = [
    {
      id: 'life_journey',
      title: '라이프 Journey',
      subtitle: '당신의 운명을 읽는 프리미엄 사주 리포트',
      description: '2025년 신년운세와 향후 5년 대운 분석을 통해 인생의 방향과 중요한 전환점을 제시합니다.',
      icon: TrendingUp,
      price: '49,000',
      originalPrice: '79,000',
      badge: 'BEST',
      gradient: 'from-purple-500 to-indigo-600',
      features: ['2025 신년운세 분석', '향후 5년 대운 흐름', '월별 상세 운세', '커리어/재물/연애운', '맞춤 개운법 가이드']
    }
  ];

  return (
    <div className="landing-page">
      <div className="landing-wrapper">
        {/* Header */}
        <header className="landing-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Sparkles size={24} />
            </div>
            <h1 className="logo-text">FORTUNE TORCH</h1>
          </div>
          <p className="header-tagline">당신의 운명을 밝히는 빛</p>
        </header>

        {/* Scrollable Content */}
        <div className="landing-scroll-content">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <h2 className="hero-title">
                <span className="gradient-text">사주명리학</span>으로<br />
                인생의 방향을 찾다
              </h2>
              <p className="hero-description">
                수천 년의 동양 지혜와 현대 AI 기술이 만나<br />
                당신만을 위한 맞춤 운세 리포트를 제공합니다
              </p>
            </div>

            {/* Floating Elements */}
            <div className="floating-elements">
              <div className="floating-orb orb-1"></div>
              <div className="floating-orb orb-2"></div>
              <div className="floating-orb orb-3"></div>
            </div>
          </section>

        {/* Report Cards */}
        <section className="reports-section">
          <h3 className="section-title">
            <span className="title-icon">📜</span>
            프리미엄 리포트
          </h3>

          <div className="reports-grid">
            {reports.map((report, index) => (
              <div
                key={report.id}
                className="report-card"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Card Header */}
                <div className={`card-header bg-gradient-to-r ${report.gradient}`}>
                  <div className="card-badge">{report.badge}</div>
                  <div className="card-icon-wrapper">
                    <report.icon size={32} />
                  </div>
                  <h4 className="card-title">{report.title}</h4>
                  <p className="card-subtitle">{report.subtitle}</p>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <p className="card-description">{report.description}</p>

                  <ul className="feature-list">
                    {report.features.map((feature, idx) => (
                      <li key={idx} className="feature-item">
                        <span className="feature-check">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="price-section">
                    <span className="original-price">{report.originalPrice}원</span>
                    <span className="current-price">{report.price}원</span>
                  </div>

                  <button className="order-button" onClick={() => handleStartClick(report.id)}>
                    <span>시작하기</span>
                    <ArrowRight size={18} />
                  </button>
                </div>

                {/* Shine Effect */}
                <div className="card-shine"></div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="feature-box">
            <div className="feature-icon">🔒</div>
            <h4>안전한 결제</h4>
            <p>카카오페이, 신용카드 지원</p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">⚡</div>
            <h4>즉시 발송</h4>
            <p>결제 후 5분 내 카카오톡 전송</p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">📱</div>
            <h4>모바일 최적화</h4>
            <p>언제 어디서나 편하게 열람</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-main">
            <span className="footer-brand">FORTUNE TORCH</span>
            <button
              className="footer-toggle"
              onClick={() => setFooterOpen(!footerOpen)}
            >
              <span>사업자 정보</span>
              <ChevronDown
                size={16}
                className={`toggle-icon ${footerOpen ? 'open' : ''}`}
              />
            </button>
          </div>

          <div className={`footer-details ${footerOpen ? 'open' : ''}`}>
            <div className="footer-info-box">
              <p><strong>포춘톨치</strong> 사업자등록번호: 381-36-00591</p>
              <p>대표: 차정민</p>
              <p>통신판매업신고번호: 제 2019-충남천안-1300 호</p>
              <p>주소: 충청남도 천안시 서북구 성환읍 각금3길 39</p>
              <p>고객센터: 070-7538-7533 / 이메일: help@ftorch.com</p>

              <div className="footer-links">
                <a href="/privacy">개인정보처리방침</a>
                <span className="divider">|</span>
                <a href="/terms">이용약관</a>
              </div>
            </div>
          </div>

          <p className="footer-copyright">
            Copyright ⓒ Fortune Torch. All rights reserved.
          </p>
        </footer>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
