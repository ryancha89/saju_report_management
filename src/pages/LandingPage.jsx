import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Map, ArrowRight } from 'lucide-react';
import { initTracking } from '../lib/tracking';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [footerOpen, setFooterOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('full'); // 'full' or 'lite'

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

    document.body.style.backgroundColor = '#ffffff';
    document.documentElement.style.backgroundColor = '#ffffff';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  // 시작하기 클릭 - UTM 파라미터 유지 + 상품 타입 추가
  const handleStartClick = (productId) => {
    const params = new URLSearchParams(location.search);

    // Blueprint 상품은 소개 페이지로 이동
    if (productId === 'blueprint') {
      params.set('plan', selectedPlan);
      navigate(`/blueprint?${params.toString()}`);
      return;
    }

    params.set('product', productId);
    navigate(`/user-info?${params.toString()}`);
  };

  // 플랜별 데이터
  const blueprintPlans = {
    full: {
      price: '77,000',
      originalPrice: '150,000',
      subtitle: '평생 대운 + 5개년 전략',
      features: ['나의 아이덴티티 잠재력 분석', '평생 대운 흐름 분석', '5개년 전략 로드맵', '커리어/재물/연애운', '맞춤 개운법 가이드']
    },
    lite: {
      price: '44,900',
      originalPrice: '90,000',
      subtitle: '현재/다음 대운 + 3개년 운세',
      features: ['나의 아이덴티티 잠재력 분석', '현재 & 다음 대운 분석', '3개년 전략 로드맵', '맞춤 개운법 가이드']
    }
  };

  const currentBlueprintPlan = blueprintPlans[selectedPlan];

  const reports = [
    {
      id: 'blueprint',
      title: 'The Blueprint',
      subtitleSmall: '인생 청사진',
      subtitle: currentBlueprintPlan.subtitle,
      description: selectedPlan === 'full'
        ? '평생 대운과 5개년도의 전략 리포트로 인생의 방향과 중요한 전환점을 제시합니다.'
        : '현재와 다음 대운, 3개년 운세로 지금 필요한 방향을 제시합니다.',
      icon: Map,
      image: '/img/theblueprint2.png',
      price: currentBlueprintPlan.price,
      originalPrice: currentBlueprintPlan.originalPrice,
      badge: 'PREMIUM',
      gradient: 'from-dark to-gold',
      features: currentBlueprintPlan.features
    }
  ];

  return (
    <div className="landing-page">
      <div className="landing-wrapper">
        {/* Header */}
        <header className="landing-header">
          <div className="logo-container">
            <h1 className="logo-text">포춘톨치</h1>
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
                수천 년의 동양 지혜를 바탕으로<br />
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
          <div className="reports-grid">
            {reports.map((report, index) => (
              <div
                key={report.id}
                className="report-card"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Full Image Card */}
                {report.image && (
                  <div className="card-image-bg" style={{ backgroundImage: `url(${report.image})` }}>
                    <div className="card-image-overlay"></div>
                  </div>
                )}

                <div className="card-content">
                  <div className="card-text">
                    <h4 className="card-title">{report.title}</h4>
                    {report.subtitleSmall && <p className="card-subtitle-small">{report.subtitleSmall}</p>}
                  </div>

                  {/* Plan Toggle */}
                  {report.id === 'blueprint' && (
                    <div className="plan-toggle">
                      <button
                        className={`plan-btn ${selectedPlan === 'full' ? 'active' : ''}`}
                        onClick={() => setSelectedPlan('full')}
                      >
                        <span className="plan-btn-badge">FULL</span>
                        <span className="plan-btn-name">인생 청사진</span>
                        <span className="plan-btn-desc">평생 대운 + 5개년</span>
                        <span className="plan-btn-price">{blueprintPlans.full.price}원</span>
                      </button>
                      <button
                        className={`plan-btn ${selectedPlan === 'lite' ? 'active' : ''}`}
                        onClick={() => setSelectedPlan('lite')}
                      >
                        <span className="plan-btn-badge lite">LITE</span>
                        <span className="plan-btn-name">3년 플랜</span>
                        <span className="plan-btn-desc">현재/다음 대운 + 3개년</span>
                        <span className="plan-btn-price">{blueprintPlans.lite.price}원</span>
                      </button>
                    </div>
                  )}

                  <ul className="feature-list">
                    {report.features.map((feature, idx) => (
                      <li key={idx} className="feature-item">
                        <span className="feature-check">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="card-bottom">
                    <button className="order-button" onClick={() => handleStartClick(report.id)}>
                      <span>시작하기</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
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
            <div className="feature-icon">🔮</div>
            <h4>전문가의 분석</h4>
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
