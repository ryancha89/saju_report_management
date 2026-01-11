import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import './MobilePreview.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

function MobilePreview() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const chapter = searchParams.get('chapter') || '1';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [chapterData, setChapterData] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const contentRef = useRef(null);

  // 챕터별 제목
  const chapterTitles = {
    '1': '나의 타고난 성격과 기질',
    '2': '삶의 방향과 격국 분석',
    '3': '대운의 흐름',
    '4': '현재 대운 운세',
    '5': '올해의 운세'
  };

  // 데이터 로드
  useEffect(() => {
    fetchData();
  }, [id, chapter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. 먼저 주문 정보 가져오기
      const orderResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      if (orderResponse.ok) {
        const orderResult = await orderResponse.json();
        if (orderResult.order) {
          setOrderInfo(orderResult.order);
        }
      }

      // 2. 사주 검증 데이터 가져오기
      const validationResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/validate_saju`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      if (validationResponse.ok) {
        const validationResult = await validationResponse.json();
        if (validationResult.success) {
          setValidationData(validationResult);
          if (!orderInfo) {
            setOrderInfo(validationResult.order_info);
          }
        }
      }

      // 3. 챕터 리포트 생성/가져오기 (generate_chapter API 호출)
      const chapterResponse = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${id}/generate_chapter${chapter}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`
        }
      });

      if (chapterResponse.ok) {
        const chapterResult = await chapterResponse.json();
        if (chapterResult.success && chapterResult.chapter) {
          setChapterData(chapterResult.chapter);
        }
      } else {
        const errorResult = await chapterResponse.json();
        throw new Error(errorResult.error || `챕터 ${chapter} 로드 실패`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 마크다운을 HTML로 변환
  const formatContent = (content) => {
    if (!content) return '';

    return content
      // ### 헤더 -> h3
      .replace(/^### (.*?)$/gm, '<h3 class="content-h3">$1</h3>')
      // ## 헤더 -> h2
      .replace(/^## (.*?)$/gm, '<h2 class="content-h2">$1</h2>')
      // # 헤더 -> h1
      .replace(/^# (.*?)$/gm, '<h1 class="content-h1">$1</h1>')
      // **bold** -> strong
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // *italic* -> em
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 줄바꿈 처리
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
  };

  // PDF 다운로드
  const downloadPDF = async () => {
    if (!contentRef.current) return;

    setPdfLoading(true);

    try {
      const element = contentRef.current;
      const userName = orderInfo?.name || '사용자';
      const chapterTitle = chapterTitles[chapter] || `챕터${chapter}`;
      const fileName = `${userName}_사주리포트_${chapterTitle}.pdf`;

      const opt = {
        margin: [25, 20, 25, 20], // 상, 우, 하, 좌 여백 (mm)
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#1a1a2e',
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['p', 'h1', 'h2', 'h3', '.report-section', '.basis-section']
        }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF 생성 오류:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setPdfLoading(false);
    }
  };

  // 사주 정보 표시
  const renderSajuInfo = () => {
    if (!validationData?.saju_data) return null;

    const { saju_data } = validationData;

    return (
      <div className="saju-info-section">
        <h2 className="section-title">사주 명식</h2>
        <div className="saju-pillars">
          <div className="pillar">
            <span className="pillar-label">시주</span>
            <span className="pillar-value">{saju_data.zodiac_time || '??'}</span>
          </div>
          <div className="pillar">
            <span className="pillar-label">일주</span>
            <span className="pillar-value highlight">{saju_data.zodiac_day || '??'}</span>
          </div>
          <div className="pillar">
            <span className="pillar-label">월주</span>
            <span className="pillar-value">{saju_data.zodiac_month || '??'}</span>
          </div>
          <div className="pillar">
            <span className="pillar-label">연주</span>
            <span className="pillar-value">{saju_data.zodiac_year || '??'}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mobile-preview-page">
        <div className="preview-wrapper">
          <div className="loading-container">
            <Loader size={40} className="spinning" />
            <p>리포트를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-preview-page">
        <div className="preview-wrapper">
          <div className="error-container">
            <p>오류가 발생했습니다: {error}</p>
            <button onClick={fetchData}>다시 시도</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-preview-page">
      <div className="preview-wrapper">
        {/* 헤더 */}
        <header className="preview-header">
          <div className="header-top">
            <h1>{chapterTitles[chapter] || `챕터 ${chapter}`}</h1>
            <button
              className="pdf-download-btn"
              onClick={downloadPDF}
              disabled={pdfLoading}
              title="PDF 다운로드"
            >
              {pdfLoading ? (
                <Loader size={20} className="spinning" />
              ) : (
                <Download size={20} />
              )}
            </button>
          </div>
          {orderInfo && (
            <span className="user-info">{orderInfo.name}님의 사주 리포트</span>
          )}
        </header>

      {/* 메인 콘텐츠 */}
      <main className="preview-content" ref={contentRef}>
        {/* 사주 정보 (선택적으로 표시) */}
        {chapter === '1' && renderSajuInfo()}

        {/* 챕터 콘텐츠 */}
        {chapterData ? (
          <div className="chapter-content">
            {/* 챕터 제목 및 부제목 */}
            {chapterData.subtitle && (
              <div className="chapter-subtitle">
                <p>{chapterData.subtitle}</p>
              </div>
            )}

            {/* 기본 정보 (basis) */}
            {chapterData.basis && (
              <div className="basis-section">
                <h2 className="section-title">{chapterData.basis.type || '분석 기반'}</h2>
                <div className="basis-info">
                  {chapterData.basis.zodiac_day && (
                    <div className="basis-item">
                      <span className="basis-label">일주</span>
                      <span className="basis-value highlight">{chapterData.basis.zodiac_day}</span>
                    </div>
                  )}
                  {chapterData.basis.ilgan && (
                    <div className="basis-item">
                      <span className="basis-label">일간</span>
                      <span className="basis-value">{chapterData.basis.ilgan}</span>
                    </div>
                  )}
                  {chapterData.basis.ilji && (
                    <div className="basis-item">
                      <span className="basis-label">일지</span>
                      <span className="basis-value">{chapterData.basis.ilji}</span>
                    </div>
                  )}
                  {chapterData.basis.twelve_star && (
                    <div className="basis-item">
                      <span className="basis-label">십이운성</span>
                      <span className="basis-value">{chapterData.basis.twelve_star}</span>
                    </div>
                  )}
                  {chapterData.basis.geju && (
                    <div className="basis-item">
                      <span className="basis-label">격국</span>
                      <span className="basis-value highlight">{chapterData.basis.geju}</span>
                    </div>
                  )}
                  {chapterData.basis.decade_pillar && (
                    <div className="basis-item">
                      <span className="basis-label">현재 대운</span>
                      <span className="basis-value highlight">{chapterData.basis.decade_pillar}</span>
                    </div>
                  )}
                  {chapterData.basis.year_pillar && (
                    <div className="basis-item">
                      <span className="basis-label">올해 간지</span>
                      <span className="basis-value highlight">{chapterData.basis.year_pillar}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 메인 리포트 내용 (HTML) */}
            {chapterData.content && (
              <div className="report-section">
                <div
                  className="content-text"
                  dangerouslySetInnerHTML={{ __html: `<p>${formatContent(chapterData.content)}</p>` }}
                />
              </div>
            )}

            {/* 대운 흐름 데이터 (챕터3) */}
            {chapterData.decade_flow && (
              <div className="decade-flow-section">
                <h2 className="section-title">대운 흐름</h2>
                <div className="decade-flow-list">
                  {chapterData.decade_flow.map((decade, idx) => (
                    <div key={idx} className="decade-item">
                      <div className="decade-header">
                        <span className="decade-age">{decade.start_age}~{decade.end_age}세</span>
                        <span className="decade-pillar highlight">{decade.decade_pillar}</span>
                      </div>
                      {decade.ai_description && (
                        <p className="decade-description">{decade.ai_description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-content">
            <p>리포트를 불러오는 중 오류가 발생했습니다.</p>
            <p className="sub-text">다시 시도해주세요.</p>
          </div>
        )}
      </main>

      {/* 푸터 - 챕터 네비게이션 */}
      <footer className="preview-footer">
        <div className="chapter-nav">
          {['1', '2', '3', '4', '5'].map((ch) => (
            <a
              key={ch}
              href={`/preview/${id}?chapter=${ch}`}
              className={`chapter-link ${chapter === ch ? 'active' : ''}`}
            >
              {ch}
            </a>
          ))}
        </div>
      </footer>
      </div>
    </div>
  );
}

export default MobilePreview;
