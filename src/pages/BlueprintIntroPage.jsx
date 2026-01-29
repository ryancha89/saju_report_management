import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Sparkles, ChevronDown } from 'lucide-react';
import { usePricing } from '../hooks/usePricing';
import { getTrackingData } from '../lib/tracking';
import './BlueprintIntroPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

const RATING_LABELS = {
  0: { emoji: '👍', label: '도움이 돼요' },
  1: { emoji: '😊', label: '재밌어요' },
  2: { emoji: '📚', label: '공부가 돼요' },
  3: { emoji: '💪', label: '격려가 돼요' },
};

function BlueprintIntroPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openFaq, setOpenFaq] = useState(null);
  const [reviews, setReviews] = useState([]);

  // URL에서 plan, ref 파라미터 읽기
  const params = new URLSearchParams(location.search);
  const initialPlan = params.get('plan') === 'lite' ? 'lite' : 'full';
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const pricing = usePricing();

  // ref 파라미터: URL > sessionStorage > localStorage(tracking) 순서로 확인
  const urlRef = params.get('ref');
  const storedTracking = getTrackingData();
  const referralCode = urlRef || sessionStorage.getItem('blueprint_ref') || storedTracking?.ref;

  // ref가 URL에 있으면 sessionStorage에 저장 (새로고침 시에도 유지)
  useEffect(() => {
    if (urlRef) {
      sessionStorage.setItem('blueprint_ref', urlRef);
    }
  }, [urlRef]);

  // 리뷰 가져오기
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const headers = { 'Saju-Authorization': `Bearer-${API_TOKEN}` };
        const [bpRes, liteRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/report_reviews?type=blueprint`, { headers }),
          fetch(`${API_BASE_URL}/api/v1/report_reviews?type=blueprint_lite`, { headers }),
        ]);
        const bpData = bpRes.ok ? await bpRes.json() : [];
        const liteData = liteRes.ok ? await liteRes.json() : [];
        const allReviews = [...bpData, ...liteData]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setReviews(allReviews);
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      }
    };
    fetchReviews();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

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
    params.set('product', selectedPlan === 'full' ? 'blueprint' : 'blueprint_lite');
    // ref가 URL에 없지만 sessionStorage에 있으면 추가
    if (!params.get('ref') && referralCode) {
      params.set('ref', referralCode);
    }
    navigate(`/user-info?${params.toString()}`);
  };

  // 플랜 정보
  const plans = {
    full: {
      name: 'PRO',
      title: '인생 청사진',
      subtitle: '평생 대운 + 5개년 전략',
      originalPrice: pricing.pro.originalPrice,
      currentPrice: pricing.pro.currentPrice,
      discount: pricing.pro.discountPercent
    },
    lite: {
      name: 'LITE',
      title: '3년 플랜',
      subtitle: '현재/다음 대운 + 3개년 운세',
      originalPrice: pricing.lite.originalPrice,
      currentPrice: pricing.lite.currentPrice,
      discount: pricing.lite.discountPercent
    }
  };

  const currentPlan = plans[selectedPlan];

  // 플랜별 features (챕터 목록)
  const featuresData = {
    full: [
      { title: '사주정보', desc: '당신의 사주 원국과 기본 정보를 정리합니다.' },
      { title: '나의 아이덴티티', desc: '타고난 성격과 본질적인 특성을 분석합니다.' },
      { title: '나의 잠재력과 사회적 역할', desc: '숨겨진 잠재력과 사회에서의 역할을 파악합니다.' },
      { title: '전체 대운 흐름 분석', desc: '평생의 대운 흐름으로 인생의 전환점을 예측합니다.' },
      { title: '향후 5년간의 운세', desc: '5년간의 연도별 운세와 행동 전략을 제시합니다.' },
      { title: '5년간의 재물운', desc: '재정 흐름과 재물 획득의 기회를 분석합니다.' },
      { title: '5년간의 직업운/사회운', desc: '커리어와 사회적 성공의 흐름을 분석합니다.' },
      { title: '5년간의 연애운/배우자운', desc: '연애와 결혼운의 흐름을 분석합니다.' },
      { title: '상담사의 코칭', desc: '전문 상담사의 맞춤 조언과 개운법을 제공합니다.' },
      { title: '질문과 답변 (2회)', desc: '궁금한 점에 대해 상담사가 직접 답변해 드립니다.' }
    ],
    lite: [
      { title: '사주정보', desc: '당신의 사주 원국과 기본 정보를 정리합니다.' },
      { title: '나의 아이덴티티', desc: '타고난 성격과 본질적인 특성을 분석합니다.' },
      { title: '나의 잠재력과 사회적 역할', desc: '숨겨진 잠재력과 사회에서의 역할을 파악합니다.' },
      { title: '현재/다음 대운 분석', desc: '현재 대운과 다음 대운의 흐름을 분석합니다.' },
      { title: '향후 3년간의 운세', desc: '3년간의 연도별 운세와 행동 전략을 제시합니다.' },
      { title: '3년간의 재물운', desc: '재정 흐름과 재물 획득의 기회를 분석합니다.' },
      { title: '3년간의 직업운/사회운', desc: '커리어와 사회적 성공의 흐름을 분석합니다.' },
      { title: '3년간의 연애운/배우자운', desc: '연애와 결혼운의 흐름을 분석합니다.' },
      { title: '상담사의 코칭', desc: '전문 상담사의 맞춤 조언과 개운법을 제공합니다.' },
      { title: '질문과 답변 (1회)', desc: '궁금한 점에 대해 상담사가 직접 답변해 드립니다.' }
    ]
  };

  const features = featuresData[selectedPlan];

  const faqs = [
    {
      question: '리포트 내용은 얼마나 상세한가요?',
      answer: selectedPlan === 'full'
        ? '총 10개 챕터로 구성되어 있으며, 아이덴티티 분석부터, 잠재력 분석, 평생 대운 분석, 5개년 운세 분석, 재물운, 사회/직업운, 연애운, 상담사의 코칭, 2회 질문에 대한 답변까지 약 30~40페이지 분량의 상세한 분석을 제공합니다.'
        : '총 10개 챕터로 구성되어 있으며, 아이덴티티 분석부터, 잠재력 분석, 현재/다음 대운 분석, 3개년 운세 분석, 재물운, 사회/직업운, 연애운, 상담사의 코칭, 1회 질문에 대한 답변까지 약 20~30페이지 분량의 상세한 분석을 제공합니다.'
    },
    {
      question: '리포트는 어떻게 받나요?',
      answer: '결제 완료 후 입력하신 이메일과 카카오톡으로 리포트 링크가 발송됩니다. 언제든지 다시 열람하실 수 있습니다.'
    },
    {
      question: '사주 정보는 어떻게 입력하나요?',
      answer: '생년월일, 태어난 시간, 성별만 입력하시면 됩니다. 태어난 시간을 모르시는 경우에도 분석이 가능합니다.'
    },
    {
      question: '환불이 가능한가요?',
      answer: '디지털 콘텐츠 특성상 리포트 발송 후에는 환불이 어렵습니다. 결제 전 신중하게 결정해 주세요.'
    }
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
          <p className="hero-tagline">지금까지 없었던 당신만을 위한 특별한 레포트</p>
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

          {/* Warning Section */}
          <div className="warning-section">
            <p className="warning-title">
              달콤한 위로만 드리지 않습니다
            </p>
            <p className="warning-desc">
              인생의 <strong>기회</strong>와 <strong>위기</strong>,<br />
              있는 그대로 솔직하게 분석합니다.
            </p>
            <span className="warning-note">진실을 마주할 준비가 되신 분만 시작해 주세요.</span>
          </div>

          {/* Difference Section */}
          <div className="difference-section">
            <div className="difference-badge">일반 사주 서비스와 다른 특별함을 드립니다</div>
            <p className="difference-desc">
              단순한 수박 겉핥기식 해석이 아닌, 철저한 명리학적 논리를 바탕으로<br />
              성공, 건강, 행복의 흐름을 깊이 있게 분석합니다.
            </p>
            <div className="difference-content">
              <div className="difference-item wrong">
                <span className="difference-icon">✕</span>
                <p>자동 생성된 뻔한 풀이</p>
              </div>
              <div className="difference-item wrong">
                <span className="difference-icon">✕</span>
                <p>누구에게나 적용되는 일반적인 내용</p>
              </div>
              <div className="difference-item right">
                <span className="difference-icon">✓</span>
                <p><strong>전문 상담사의 철저한 사주 검증</strong></p>
              </div>
              <div className="difference-item right">
                <span className="difference-icon">✓</span>
                <p><strong>오직 당신만을 위한 맞춤 분석</strong></p>
              </div>
            </div>
          </div>

          {/* Consultation Appeal Section */}
          <div className="consultation-appeal-section">
            <h3 className="appeal-title">리포트로 끝나지 않습니다</h3>
            <p className="appeal-subtitle">진정한 상담의 시작</p>
            <div className="appeal-content">
              <div className="appeal-step">
                <div className="appeal-step-number">01</div>
                <div className="appeal-step-text">
                  <strong>전문가가 직접 제작하는 맞춤 리포트</strong>
                  <p>자동 생성이 아닌, 상담사가 당신의 사주를 직접 분석하고 작성합니다.</p>
                </div>
              </div>
              <div className="appeal-step">
                <div className="appeal-step-number">02</div>
                <div className="appeal-step-text">
                  <strong>리포트 완성 후 1:1 추가 질문</strong>
                  <p>궁금한 점은 직접 물어보세요. 상담사가 성심껏 답변해 드립니다.</p>
                </div>
              </div>
            </div>
            <p className="appeal-message">
              단순한 리포트 전달이 아닌,<br />
              <strong>진정성 있는 상담</strong>을 경험하세요.
            </p>
          </div>

          {/* Counselor Showcase Section */}
          <div className="counselor-showcase-section">
            <div className="showcase-label">
              <span className="showcase-label-dot"></span>
              실제 리포트 미리보기
            </div>
            <h3 className="showcase-title">
              매 챕터마다<br />
              <span className="gold-text">상담사가 직접 작성한</span><br />
              핵심 포인트가 담겨 있습니다
            </h3>
            <p className="showcase-desc">
              자동 생성된 문장이 아닙니다.<br />
              수천 건의 실전 상담 경험을 가진 전문 상담사가<br />
              당신의 사주를 직접 읽고, 진심을 담아 작성합니다.
            </p>

            {/* 실제 리포트 스크린샷 */}
            <div className="showcase-screenshots">
              <div className="showcase-screenshot-item">
                <img src="/img/marketing1.png" alt="상담사의 핵심 포인트 예시 1" className="showcase-screenshot" />
              </div>
              <div className="showcase-screenshot-item">
                <img src="/img/marketing2.jpg" alt="상담사의 핵심 포인트 예시 2" className="showcase-screenshot" />
              </div>
            </div>

            <div className="showcase-trust-items">
              <div className="showcase-trust-item">
                <span className="showcase-trust-icon">🔍</span>
                <div className="showcase-trust-text">
                  <strong>상담사의 육성이 담긴 분석</strong>
                  <p>기계가 아닌, 사람이 직접 당신의 사주를 읽고 핵심을 짚어드립니다</p>
                </div>
              </div>
              <div className="showcase-trust-item">
                <span className="showcase-trust-icon">💎</span>
                <div className="showcase-trust-text">
                  <strong>세상에 단 하나뿐인 맞춤 리포트</strong>
                  <p>같은 생년월일이라도 다른 분석, 오직 당신만을 위한 인사이트</p>
                </div>
              </div>
              <div className="showcase-trust-item">
                <span className="showcase-trust-icon">🤝</span>
                <div className="showcase-trust-text">
                  <strong>리포트로 끝이 아닌 진짜 상담</strong>
                  <p>궁금한 점은 추가 질문으로 상담사에게 직접 물어보세요</p>
                </div>
              </div>
            </div>
          </div>

          {/* Precision Section */}
          <div className="precision-section">
            <h3 className="precision-title">
              압도적 정밀함,<br />
              <span className="highlight">'격(格)'이 다른</span> 사주 분석을 경험하세요.
            </h3>
            <p className="precision-desc">
              수많은 연구와 실전 임상을 통해 완성된 독보적인 적중 로직을 공개합니다.<br />
              정통 '자평진전'의 격국론에 근거하여, 당신의 운명을 결정짓는 대운의 흐름을 낱낱이 분석해 드립니다.
            </p>
            <div className="precision-features">
              <div className="precision-item">
                <span className="precision-icon">📐</span>
                <div className="precision-text">
                  <strong>철저한 이론 검증</strong>
                  <p>수년간의 R&D를 통해 정립된 논리적 해석</p>
                </div>
              </div>
              <div className="precision-item">
                <span className="precision-icon">🎯</span>
                <div className="precision-text">
                  <strong>명확한 대운 판별</strong>
                  <p>운의 흐름에 따른 명쾌한 솔루션 제공</p>
                </div>
              </div>
              <div className="precision-item">
                <span className="precision-icon">⚖️</span>
                <div className="precision-text">
                  <strong>격국 중심의 분석</strong>
                  <p>당신의 그릇과 성패의 원인을 정확히 타격</p>
                </div>
              </div>
            </div>
            <p className="precision-cta">
              이제 당신의 인생을 운에 맡기지 말고,<br />
              <strong>검증된 논리로 설계하십시오.</strong>
            </p>
          </div>

          {/* Features */}
          <div className="features-header">
            <h3 className="section-title">리포트 구성</h3>
            <p className="features-subtitle">총 10개 챕터 구성</p>
          </div>
          <div className="features-list">
            {features.map((feature, index) => (
              <div key={index} className="feature-item" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="feature-check">
                  <Check size={14} />
                </div>
                <div className="feature-text">
                  <span className="feature-title">{feature.title}</span>
                  <p className="feature-desc">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Price Section */}
          <div className="price-section">
            <div className="plan-toggle-container">
              <button
                className={`plan-toggle-btn ${selectedPlan === 'full' ? 'active' : ''}`}
                onClick={() => setSelectedPlan('full')}
              >
                <span className="plan-badge">PRO</span>
                <span className="plan-title">인생 청사진</span>
                <span className="plan-subtitle">평생 대운 + 5개년 전략</span>
                <span className="plan-price">{pricing.loading ? '···' : `${plans.full.currentPrice.toLocaleString()}원`}</span>
              </button>
              <button
                className={`plan-toggle-btn ${selectedPlan === 'lite' ? 'active' : ''}`}
                onClick={() => setSelectedPlan('lite')}
              >
                <span className="plan-badge lite">LITE</span>
                <span className="plan-title">3년 플랜</span>
                <span className="plan-subtitle">현재/다음 대운 + 3개년 운세</span>
                <span className="plan-price">{pricing.loading ? '···' : `${plans.lite.currentPrice.toLocaleString()}원`}</span>
              </button>
            </div>
            <p className="price-message">
              {selectedPlan === 'full' ? (
                <>
                  일 년을 점치는 운세는 잊혀지지만,<br />
                  평생을 설계하는 블루프린트는 남습니다.<br />
                  단 한 번의 선택으로, 인생의 나침반을 소장하세요.
                </>
              ) : (
                <>
                  지금 당장 필요한 것에 집중하세요.<br />
                  현재와 다음 대운, 3개년 운세를<br />
                  합리적인 가격에 만나보세요.
                </>
              )}
            </p>
          </div>

          {/* Process Section */}
          <div className="process-section">
            <h3 className="section-title">리포트 제작 과정</h3>
            <div className="process-list">
              <div className="process-item">
                <div className="process-number">1</div>
                <div className="process-content">
                  <h4>정보 입력 & 결제</h4>
                  <p>생년월일, 태어난 시간 등 사주 정보를 입력하고 결제를 완료하면 전문 상담사에게 정보가 전달됩니다.</p>
                </div>
              </div>
              <div className="process-item">
                <div className="process-number">2</div>
                <div className="process-content">
                  <h4>사주 검증 & 리포트 제작</h4>
                  <p>결제 확인 후 전문 상담사가 직접 사주를 검증하고 맞춤 리포트를 제작합니다.</p>
                  <span className="process-badge">보통 몇 시간 ~ 1일 소요</span>
                </div>
              </div>
              <div className="process-item">
                <div className="process-number">3</div>
                <div className="process-content">
                  <h4>리포트 발송</h4>
                  <p>입력하신 이메일과 카카오톡으로 리포트 링크가 발송됩니다.</p>
                </div>
              </div>
              <div className="process-item">
                <div className="process-number">4</div>
                <div className="process-content">
                  <h4>추가 질문</h4>
                  <p>리포트를 받으신 후 궁금한 점이 있다면 추가 질문을 남겨주세요. 상담사가 직접 답변해 드립니다.</p>
                  <span className="process-badge highlight">
                    {selectedPlan === 'full' ? '2회 무료 질문 제공' : '1회 무료 질문 제공'}
                  </span>
                </div>
              </div>
            </div>
            <div className="process-contact">
              문의 <a href="mailto:help@ftorch.com">help@ftorch.com</a>
            </div>
          </div>

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <div className="reviews-section">
              <h3 className="section-title">실제 후기</h3>
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="review-info">
                        <span className="review-name">{review.nickname}</span>
                      </div>
                      {RATING_LABELS[review.rating] && (
                        <div className="review-rating-badge">
                          <span>{RATING_LABELS[review.rating].emoji}</span>
                          <span>{RATING_LABELS[review.rating].label}</span>
                        </div>
                      )}
                    </div>
                    <p className="review-text">{review.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="faq-section">
            <h3 className="section-title">자주 묻는 질문</h3>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className={`faq-item ${openFaq === index ? 'open' : ''}`}
                >
                  <button
                    className="faq-question"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={20} className="faq-icon" />
                  </button>
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Floating CTA Button */}
      <div className="floating-cta-container">
        <div className="floating-plan-selector">
          <button
            className={`floating-plan-btn ${selectedPlan === 'full' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('full')}
          >
            <span className="floating-plan-name">PRO</span>
            <span className="floating-plan-desc">평생 대운 + 5년</span>
          </button>
          <button
            className={`floating-plan-btn ${selectedPlan === 'lite' ? 'active' : ''}`}
            onClick={() => setSelectedPlan('lite')}
          >
            <span className="floating-plan-name">LITE</span>
            <span className="floating-plan-desc">현재 대운 + 3년</span>
          </button>
        </div>
        <button className="floating-cta-button" onClick={handleStartClick}>
          <span>{pricing.loading ? '···' : `${currentPlan.currentPrice.toLocaleString()}원`}</span>
          <span className="floating-divider">|</span>
          <span>시작하기</span>
          <ArrowRight size={18} />
        </button>
      </div>
      </div>
    </div>
  );
}

export default BlueprintIntroPage;
