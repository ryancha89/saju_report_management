import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Sparkles, ArrowRight, Star, ChevronDown, RefreshCw, Download } from 'lucide-react';
import { getTrackingData } from '../lib/tracking';
import './FreeSajuResultPage.css';

// Import 일주론 data
import zodiacDayData from '/src/local-data/GuideMode/zodiac_day_ko.json';

// 60갑자 리스트 (영상 파일 매핑용)
const SIXTY_GANJI = [
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'
];

// 일주 한글 이름 매핑
const GANJI_KOREAN = {
  '甲子': '갑자', '乙丑': '을축', '丙寅': '병인', '丁卯': '정묘', '戊辰': '무진',
  '己巳': '기사', '庚午': '경오', '辛未': '신미', '壬申': '임신', '癸酉': '계유',
  '甲戌': '갑술', '乙亥': '을해', '丙子': '병자', '丁丑': '정축', '戊寅': '무인',
  '己卯': '기묘', '庚辰': '경진', '辛巳': '신사', '壬午': '임오', '癸未': '계미',
  '甲申': '갑신', '乙酉': '을유', '丙戌': '병술', '丁亥': '정해', '戊子': '무자',
  '己丑': '기축', '庚寅': '경인', '辛卯': '신묘', '壬辰': '임진', '癸巳': '계사',
  '甲午': '갑오', '乙未': '을미', '丙申': '병신', '丁酉': '정유', '戊戌': '무술',
  '己亥': '기해', '庚子': '경자', '辛丑': '신축', '壬寅': '임인', '癸卯': '계묘',
  '甲辰': '갑진', '乙巳': '을사', '丙午': '병오', '丁未': '정미', '戊申': '무신',
  '己酉': '기유', '庚戌': '경술', '辛亥': '신해', '壬子': '임자', '癸丑': '계축',
  '甲寅': '갑인', '乙卯': '을묘', '丙辰': '병진', '丁巳': '정사', '戊午': '무오',
  '己未': '기미', '庚申': '경신', '辛酉': '신유', '壬戌': '임술', '癸亥': '계해'
};

function FreeSajuResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef(null);
  const contentRef = useRef(null);

  const [showContent, setShowContent] = useState(true);
  const [expandedSection, setExpandedSection] = useState(0);
  const [videoEnded, setVideoEnded] = useState(true);

  // Get data from navigation state
  const sajuData = location.state?.sajuData;
  const birthInfo = location.state?.birthInfo;
  const trackingData = location.state?.trackingData;

  // Get ref code for blueprint navigation (state 또는 localStorage에서)
  const storedTracking = getTrackingData();
  const refCode = trackingData?.ref || storedTracking?.ref || null;

  // 디버깅용
  console.log('sajuData:', sajuData);
  console.log('refCode:', refCode);

  // Redirect if no data
  useEffect(() => {
    if (!sajuData || !birthInfo) {
      navigate('/free-saju');
    }
  }, [sajuData, birthInfo, navigate]);

  // Set background color
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#0a0a0a';
    document.documentElement.style.backgroundColor = '#0a0a0a';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  if (!sajuData || !birthInfo) {
    return null;
  }

  const zodiacDay = sajuData.ganji_day; // e.g., "甲子"
  const zodiacDayKorean = GANJI_KOREAN[zodiacDay] || zodiacDay;

  // Get 일주론 data
  const ilJuData = zodiacDayData[zodiacDay];

  // Get video path for the zodiac day (fallback to green_monkey.mp4)
  const getVideoPath = (ganji) => {
    // 영상 파일명 규칙: /img/zodiac_day/{ganji}.mp4
    // 현재는 green_monkey.mp4 만 있으므로 이를 사용
    // 60개 추가 시 아래 주석 해제
    // return `/img/zodiac_day/${ganji}.mp4`;
    return '/img/green_monkey.mp4';
  };

  const handleVideoEnd = () => {
    setVideoEnded(true);
    setShowContent(true);
    // Scroll to content
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  const handleSkipVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setVideoEnded(true);
    setShowContent(true);
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  const handleReplayVideo = () => {
    setVideoEnded(false);
    setShowContent(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSection = (index) => {
    setExpandedSection(expandedSection === index ? -1 : index);
  };

  // Parse HTML content to show first paragraph for preview
  const getPreviewText = (htmlContent) => {
    const text = htmlContent.replace(/<[^>]*>/g, '').trim();
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  return (
    <div className="free-saju-result-page">
      <div className="result-wrapper">
      {/* Video Section */}
      <section className={`video-section ${videoEnded ? 'ended' : ''}`}>
        {/* <div className="video-container">
          <video
            ref={videoRef}
            className="result-video"
            autoPlay
            muted
            playsInline
            loop
            onEnded={handleVideoEnd}
          >
            <source src={getVideoPath(zodiacDay)} type="video/mp4" />
          </video>
        </div> */}

        {/* Overlay with saju info */}
        <div className="video-overlay">
          <div className="saju-badge">
            <Sparkles size={20} />
            <span>나의 일주</span>
          </div>
          <h1 className="zodiac-day-title">
            {zodiacDay}
            <span className="zodiac-korean">({zodiacDayKorean})</span>
          </h1>
          <p className="zodiac-day-subtitle">일주론으로 알아보는 나의 본성</p>
        </div>

        {/* Saju Pillars Card - shown during video */}
        <div className={`saju-pillars-card ${videoEnded ? 'minimized' : ''}`}>
          <div className="pillars-header">
            <span>사주팔자</span>
            <span className="birth-date">
              {birthInfo.birthDate} {birthInfo.calendarType === 'solar' ? '양력' : '음력'}
            </span>
          </div>
          <div className="pillars-table">
            {/* Header row */}
            <div className="pillars-row header-row">
              <div className="row-label"></div>
              <div className="pillar-cell">시주</div>
              <div className="pillar-cell highlight">일주</div>
              <div className="pillar-cell">월주</div>
              <div className="pillar-cell">년주</div>
            </div>
            {/* 천간 십성 row */}
            <div className="pillars-row sipsung-row cheongan-sipsung-row">
              <div className="row-label">천간십성</div>
              <div className="pillar-cell">{birthInfo.birthTimeUnknown ? '?' : (sajuData.sipsung_cheongan?.time || '-')}</div>
              <div className="pillar-cell highlight">일간</div>
              <div className="pillar-cell">{sajuData.sipsung_cheongan?.month || '-'}</div>
              <div className="pillar-cell">{sajuData.sipsung_cheongan?.year || '-'}</div>
            </div>
            {/* 천간 row */}
            <div className="pillars-row cheongan-row">
              <div className="row-label">천간</div>
              <div className="pillar-cell">{birthInfo.birthTimeUnknown ? '?' : (sajuData.ganji_time?.[0] || '?')}</div>
              <div className="pillar-cell highlight">{sajuData.ganji_day?.[0] || '?'}</div>
              <div className="pillar-cell">{sajuData.ganji_month?.[0] || '?'}</div>
              <div className="pillar-cell">{sajuData.ganji_year?.[0] || '?'}</div>
            </div>
            {/* 지지 row */}
            <div className="pillars-row jiji-row">
              <div className="row-label">지지</div>
              <div className="pillar-cell">{birthInfo.birthTimeUnknown ? '?' : (sajuData.ganji_time?.[1] || '?')}</div>
              <div className="pillar-cell highlight">{sajuData.ganji_day?.[1] || '?'}</div>
              <div className="pillar-cell">{sajuData.ganji_month?.[1] || '?'}</div>
              <div className="pillar-cell">{sajuData.ganji_year?.[1] || '?'}</div>
            </div>
            {/* 지지 십성 row */}
            <div className="pillars-row sipsung-row jiji-sipsung-row">
              <div className="row-label">지지십성</div>
              <div className="pillar-cell">{birthInfo.birthTimeUnknown ? '?' : (sajuData.sipsung_jiji?.time || '-')}</div>
              <div className="pillar-cell">{sajuData.sipsung_jiji?.day || '-'}</div>
              <div className="pillar-cell">{sajuData.sipsung_jiji?.month || '-'}</div>
              <div className="pillar-cell">{sajuData.sipsung_jiji?.year || '-'}</div>
            </div>
            {/* 십이운성 row */}
            <div className="pillars-row unseong-row">
              <div className="row-label">12운성</div>
              <div className="pillar-cell">{birthInfo.birthTimeUnknown ? '?' : (sajuData.sipyi_unseong?.time || '-')}</div>
              <div className="pillar-cell">{sajuData.sipyi_unseong?.day || '-'}</div>
              <div className="pillar-cell">{sajuData.sipyi_unseong?.month || '-'}</div>
              <div className="pillar-cell">{sajuData.sipyi_unseong?.year || '-'}</div>
            </div>
            {/* 십이신살 row */}
            <div className="pillars-row sinsal-row">
              <div className="row-label">12신살</div>
              <div className="pillar-cell">{birthInfo.birthTimeUnknown ? '?' : (sajuData.sipyi_sinsal?.time || '-')}</div>
              <div className="pillar-cell">{sajuData.sipyi_sinsal?.day || '-'}</div>
              <div className="pillar-cell">{sajuData.sipyi_sinsal?.month || '-'}</div>
              <div className="pillar-cell">{sajuData.sipyi_sinsal?.year || '-'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section ref={contentRef} className={`content-section ${showContent ? 'visible' : ''}`}>

        {/* 일주론 Header */}
        <div className="ilju-header">
          <h2>
            <span className="highlight">{zodiacDayKorean}({zodiacDay})</span> 일주론
          </h2>
          <p>당신의 타고난 성향과 잠재력을 알아보세요</p>
        </div>

        {/* 일주론 Sections */}
        {ilJuData?.sections?.map((section, index) => (
          <div
            key={index}
            className={`ilju-section ${expandedSection === index ? 'expanded' : ''}`}
          >
            <button
              className="section-header"
              onClick={() => toggleSection(index)}
            >
              <div className="section-title">
                <span className="section-number">{index + 1}</span>
                <span className="section-name">{section.title}</span>
              </div>
              <ChevronDown size={20} className="chevron" />
            </button>
            <div className="section-content">
              {expandedSection === index ? (
                <div
                  className="content-html"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              ) : (
                <p className="content-preview">{getPreviewText(section.content)}</p>
              )}
            </div>
          </div>
        ))}

        {/* Teaser for more content */}
        <div className="teaser-section">
          <div className="teaser-blur">
            <p>더 자세한 나의 잠재력과 미래 운세가 궁금하다면?</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <div className="cta-badge">
            <Star size={16} fill="currentColor" />
            <span>Premium</span>
          </div>
          <h3>The Blueprint</h3>
          <p className="cta-subtitle">인생의 청사진을 그려보세요</p>
          <p className="cta-desc">맞춤형 사주리포트</p>
          <ul className="cta-features">
            <li>평생 대운 분석</li>
            <li>5개년 운세 전략</li>
            <li>재물운 / 직업운 / 연애운</li>
            <li>전문 상담사의 맞춤 코칭</li>
          </ul>
          <button
            className="cta-button"
            onClick={() => navigate(refCode ? `/blueprint?ref=${refCode}` : '/blueprint')}
          >
            <span>자세히 알아보기</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* App Promotion Section */}
        <div className="app-promo-section">
          <div className="app-promo-header">
            <img src="/img/logo.png" alt="만세력 설명서" className="app-logo" />
            <div className="app-info">
              <h4>만세력 설명서</h4>
              <p className="app-downloads">
                <Download size={14} />
                <span>누적 다운로드 70만+</span>
              </p>
            </div>
          </div>
          <p className="app-description">
            더 깊은 사주 분석과 매일 운세를 앱에서 확인하세요
          </p>
          <div className="app-store-buttons">
            <a
              href="https://play.google.com/store/apps/details?id=com.ryancha.easy_saju_calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="store-btn google-play"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" />
            </a>
            <a
              href="https://apps.apple.com/kr/app/%EB%A7%8C%EC%84%B8%EB%A0%A5-%EC%84%A4%EB%AA%85%EC%84%9C-%EB%A7%8C%EC%84%B8%EB%A0%A5-%EC%82%AC%EC%A3%BC-%EC%9A%B4%EC%84%B8-ai%EC%83%81%EB%8B%B4/id1551797792"
              target="_blank"
              rel="noopener noreferrer"
              className="store-btn app-store"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" />
            </a>
          </div>
        </div>

        {/* Back button */}
        <button className="back-home-btn" onClick={() => navigate('/')}>
          홈으로 돌아가기
        </button>
      </section>
      </div>

      {/* Header */}
      <header className="result-header">
        <button className="back-btn" onClick={() => navigate('/free-saju')}>
          <ChevronLeft size={24} />
        </button>
        <span className="header-title">나의 사주진단</span>
        <div style={{ width: 24 }} />
      </header>
    </div>
  );
}

export default FreeSajuResultPage;
