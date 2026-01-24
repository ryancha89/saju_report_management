import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Sparkles, ChevronDown, Star } from 'lucide-react';
import './BlueprintIntroPage.css';

function BlueprintIntroPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openFaq, setOpenFaq] = useState(null);

  // URL에서 plan, ref 파라미터 읽기
  const params = new URLSearchParams(location.search);
  const initialPlan = params.get('plan') === 'lite' ? 'lite' : 'full';
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);

  // ref 파라미터: URL에서 먼저 확인, 없으면 sessionStorage에서 가져옴
  const urlRef = params.get('ref');
  const referralCode = urlRef || sessionStorage.getItem('blueprint_ref');

  // ref가 URL에 있으면 sessionStorage에 저장 (새로고침 시에도 유지)
  useEffect(() => {
    if (urlRef) {
      sessionStorage.setItem('blueprint_ref', urlRef);
    }
  }, [urlRef]);

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
      name: 'FULL',
      title: '인생 청사진',
      subtitle: '평생 대운 + 5개년 전략',
      originalPrice: 150000,
      currentPrice: 99000,
      discount: 34
    },
    lite: {
      name: 'LITE',
      title: '3년 플랜',
      subtitle: '현재/다음 대운 + 3개년 운세',
      originalPrice: 99000,
      currentPrice: 59000,
      discount: 40
    }
  };

  const currentPlan = plans[selectedPlan];

  // 플랜별 features
  const featuresData = {
    full: [
      {
        title: '나의 아이덴티티 잠재력 분석',
        desc: '타고난 성격, 강점, 약점을 파악하고 숨겨진 잠재력을 발견합니다.'
      },
      {
        title: '평생 대운 분석, 평생 소장',
        desc: '10년 단위의 대운 흐름으로 인생의 큰 전환점과 기회를 예측합니다.'
      },
      {
        title: '5개년 전략 로드맵',
        desc: '향후 5년간의 연도별 운세와 구체적인 행동 전략을 제시합니다.'
      },
      {
        title: '커리어/재물/연애운',
        desc: '직업, 재정, 연애 각 영역별 맞춤 분석과 조언을 드립니다.'
      },
      {
        title: '맞춤 개운법 가이드',
        desc: '나에게 맞는 색상, 방향, 숫자 등 실생활 개운 팁을 알려드립니다.'
      }
    ],
    lite: [
      {
        title: '나의 아이덴티티 잠재력 분석',
        desc: '타고난 성격, 강점, 약점을 파악하고 숨겨진 잠재력을 발견합니다.'
      },
      {
        title: '현재 & 다음 대운 분석',
        desc: '현재 대운과 다음 대운의 흐름을 중점적으로 분석합니다.'
      },
      {
        title: '3개년 전략 로드맵',
        desc: '올해부터 3년간의 연도별 운세와 구체적인 행동 전략을 제시합니다.'
      },
      {
        title: '맞춤 개운법 가이드',
        desc: '나에게 맞는 색상, 방향, 숫자 등 실생활 개운 팁을 알려드립니다.'
      }
    ]
  };

  const features = featuresData[selectedPlan];

  const reviews = [
    {
      name: '김**',
      age: '32세',
      rating: 5,
      text: '제 성격과 적성을 정확히 짚어줘서 놀랐어요. 커리어 방향을 고민하던 중이었는데 큰 도움이 됐습니다.'
    },
    {
      name: '이**',
      age: '28세',
      rating: 5,
      text: '단순한 운세가 아니라 실질적인 인생 전략을 알려줘서 좋았어요. 5개년 로드맵이 특히 유용했습니다.'
    },
    {
      name: '박**',
      age: '45세',
      rating: 5,
      text: '대운 분석이 정말 신기했어요. 지난 일들이 왜 그랬는지 이해가 되고, 앞으로의 방향이 보였습니다.'
    }
  ];

  const faqs = [
    {
      question: '리포트 내용은 얼마나 상세한가요?',
      answer: '총 9개 챕터로 구성되어 있으며, 아이덴티티 분석부터, 잠재력 분석, 대운 분석, 5개년 운세 분석, 재물은, 사회/직업운, 연애운, 상담사의 코칭, 질문에 대한 답변까지 약 30~40페이지 분량의 상세한 분석을 제공합니다.'
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

          {/* Features */}
          <div className="features-header">
            <h3 className="section-title">리포트 구성</h3>
            <p className="features-subtitle">총 9개 챕터 중 주요 내용</p>
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
                <span className="plan-badge">FULL</span>
                <span className="plan-title">인생 청사진</span>
                <span className="plan-subtitle">평생 대운 + 5개년 전략</span>
                <span className="plan-price">99,000원</span>
              </button>
              <button
                className={`plan-toggle-btn ${selectedPlan === 'lite' ? 'active' : ''}`}
                onClick={() => setSelectedPlan('lite')}
              >
                <span className="plan-badge lite">LITE</span>
                <span className="plan-title">3년 플랜</span>
                <span className="plan-subtitle">현재/다음 대운 + 3개년 운세</span>
                <span className="plan-price">59,000원</span>
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

          {/* CTA Button */}
          <button className="cta-button" onClick={handleStartClick}>
            <span>시작하기</span>
            <ArrowRight size={20} />
          </button>

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
                  <span className="process-badge">보통 몇 시간 ~ 1일 (최대 3일) 소요</span>
                </div>
              </div>
              <div className="process-item">
                <div className="process-number">3</div>
                <div className="process-content">
                  <h4>리포트 발송</h4>
                  <p>입력하신 이메일로 웹 리포트 링크와 PDF 파일이 함께 발송됩니다.</p>
                </div>
              </div>
            </div>
            <div className="process-contact">
              문의 <a href="mailto:help@ftorch.com">help@ftorch.com</a>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="reviews-section">
            <h3 className="section-title">실제 후기</h3>
            <div className="reviews-list">
              {reviews.map((review, index) => (
                <div key={index} className="review-card">
                  <div className="review-header">
                    <div className="review-info">
                      <span className="review-name">{review.name}</span>
                      <span className="review-age">{review.age}</span>
                    </div>
                    <div className="review-stars">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} size={14} fill="#B8860B" color="#B8860B" />
                      ))}
                    </div>
                  </div>
                  <p className="review-text">{review.text}</p>
                </div>
              ))}
            </div>
          </div>

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

          {/* Bottom CTA */}
          <button className="cta-button" onClick={handleStartClick}>
            <span>지금 시작하기</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
      </div>
    </div>
  );
}

export default BlueprintIntroPage;
