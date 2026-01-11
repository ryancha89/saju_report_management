import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import './ResultPage.css';

function ResultPage() {
  const navigate = useNavigate();
  const [sajuResult, setSajuResult] = useState(null);
  const [userFormData, setUserFormData] = useState(null);

  useEffect(() => {
    const storedResult = localStorage.getItem('sajuResult');
    const storedFormData = localStorage.getItem('userFormData');

    if (storedResult) {
      setSajuResult(JSON.parse(storedResult));
    }
    if (storedFormData) {
      setUserFormData(JSON.parse(storedFormData));
    }

    if (!storedResult) {
      navigate('/user-info');
    }
  }, [navigate]);

  const handleGoBack = () => {
    navigate('/');
  };

  const handleGetFullReport = () => {
    // 결제 페이지로 이동하거나 전체 리포트 요청
    alert('전체 리포트 기능은 준비 중입니다.');
  };

  if (!sajuResult || !sajuResult.saju_data) {
    return (
      <div className="result-page">
        <div className="result-wrapper">
          <div className="loading-state">
            <p>결과를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  const { saju_data, order_info } = sajuResult;

  return (
    <div className="result-page">
      {/* 배경 영상 */}
      <video
        className="background-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/img/2026_video_04.mp4" type="video/mp4" />
      </video>

      <div className="overlay" />

      <div className="result-wrapper">
        {/* 헤더 */}
        <header className="result-header">
          <button className="back-btn" onClick={handleGoBack}>
            <ChevronLeft size={24} />
          </button>
          <h1>사주 분석 결과</h1>
          <div style={{ width: 24 }} />
        </header>

        {/* 메인 콘텐츠 */}
        <main className="result-content">
          {/* 사용자 정보 */}
          <div className="user-info-card">
            <div className="user-name">
              <Sparkles size={20} className="sparkle-icon" />
              <span>{order_info?.name || userFormData?.name}님의 사주</span>
            </div>
            <div className="user-details">
              <span>{order_info?.birth_date || userFormData?.birthDate}</span>
              <span className="divider">|</span>
              <span>{order_info?.gender === 'male' ? '남성' : '여성'}</span>
              <span className="divider">|</span>
              <span>{order_info?.calendar_type === 'solar' ? '양력' : '음력'}</span>
            </div>
          </div>

          {/* 사주 팔자 표 */}
          <div className="saju-table-card">
            <h2 className="card-title">사주 팔자</h2>
            <div className="saju-table">
              <div className="table-header">
                <div className="cell header">구분</div>
                <div className="cell header">시주</div>
                <div className="cell header">일주</div>
                <div className="cell header">월주</div>
                <div className="cell header">년주</div>
              </div>
              <div className="table-row">
                <div className="cell label">천간</div>
                <div className="cell value">{saju_data.cheongan?.time || '?'}</div>
                <div className="cell value highlight">{saju_data.cheongan?.day || saju_data.ilgan || '?'}</div>
                <div className="cell value">{saju_data.cheongan?.month || '?'}</div>
                <div className="cell value">{saju_data.cheongan?.year || '?'}</div>
              </div>
              <div className="table-row">
                <div className="cell label">지지</div>
                <div className="cell value">{saju_data.jiji?.time || '?'}</div>
                <div className="cell value highlight">{saju_data.jiji?.day || '?'}</div>
                <div className="cell value">{saju_data.jiji?.month || '?'}</div>
                <div className="cell value">{saju_data.jiji?.year || '?'}</div>
              </div>
            </div>

            {/* 간지 표시 */}
            <div className="zodiac-display">
              <div className="zodiac-item">
                <span className="zodiac-label">년주</span>
                <span className="zodiac-value">{saju_data.zodiac_year || '??'}</span>
              </div>
              <div className="zodiac-item">
                <span className="zodiac-label">월주</span>
                <span className="zodiac-value">{saju_data.zodiac_month || '??'}</span>
              </div>
              <div className="zodiac-item highlight">
                <span className="zodiac-label">일주</span>
                <span className="zodiac-value">{saju_data.zodiac_day || '??'}</span>
              </div>
              <div className="zodiac-item">
                <span className="zodiac-label">시주</span>
                <span className="zodiac-value">{saju_data.zodiac_time || '??'}</span>
              </div>
            </div>
          </div>

          {/* 일간 설명 */}
          <div className="ilgan-card">
            <h3>일간(日干): {saju_data.ilgan || saju_data.cheongan?.day}</h3>
            <p>
              일간은 사주에서 가장 중요한 요소로, 나 자신을 나타냅니다.
              당신의 기본적인 성격과 성향, 삶의 방식을 결정짓는 핵심입니다.
            </p>
          </div>

          {/* 안내 메시지 */}
          <div className="info-card">
            <p>
              알려주신 정보를 바탕으로 기본 사주 구조를 확인해드렸어요.
              좀 더 깊은 해석과 앞으로의 흐름이 궁금하시다면 전체 리포트를 확인해보세요.
            </p>
          </div>
        </main>

        {/* 하단 버튼 */}
        <footer className="result-footer">
          <button className="full-report-btn" onClick={handleGetFullReport}>
            전체 리포트 확인하기
            <ChevronRight size={20} />
          </button>
          <button className="home-btn" onClick={handleGoBack}>
            처음으로 돌아가기
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ResultPage;
