import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import './BlueprintIntroPage.css';

function BlueprintIntroPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#fff';
    document.documentElement.style.backgroundColor = '#fff';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  const handleStartClick = () => {
    const params = new URLSearchParams(location.search);
    params.set('product', 'blueprint');
    navigate(`/user-info?${params.toString()}`);
  };

  const features = [
    '나의 아이덴티티 잠재력 분석',
    '평생 대운 흐름 분석',
    '5개년 전략 로드맵',
    '커리어/재물/연애운',
    '맞춤 개운법 가이드'
  ];

  return (
    <div className="blueprint-intro-page">
      <div className="blueprint-mobile-wrapper">
      {/* Hero Section with Video Background */}
      <section className="blueprint-hero">
        <video
          className="hero-video"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/theblueprint.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>PREMIUM REPORT</span>
          </div>
          <div className="hero-image-wrapper">
            <img src="/img/theblueprint.png" alt="The Blueprint" className="hero-image" />
          </div>
          <h1 className="hero-title">The Blueprint</h1>
          <p className="hero-subtitle-small">인생 청사진</p>
          <p className="hero-subtitle">당신의 인생을 설계합니다</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="blueprint-content">
        <div className="content-wrapper">
          <div className="intro-text">
            <h2>당신만을 위한<br />인생 최적화 가이드</h2>
            <p>
              수천 년의 동양 지혜, 사주명리학을 바탕으로<br />
              평생 대운과 5개년도의 전략 리포트로<br />
              인생의 방향과 중요한 전환점을 제시합니다.
            </p>
          </div>

          {/* Features */}
          <div className="features-list">
            {features.map((feature, index) => (
              <div key={index} className="feature-item" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="feature-check">
                  <Check size={14} />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Price Section */}
          <div className="price-section">
            <span className="original-price">150,000원</span>
            <span className="current-price">99,000원</span>
            <span className="discount-badge">34% OFF</span>
          </div>

          {/* CTA Button */}
          <button className="cta-button" onClick={handleStartClick}>
            <span>시작하기</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
      </div>
    </div>
  );
}

export default BlueprintIntroPage;
