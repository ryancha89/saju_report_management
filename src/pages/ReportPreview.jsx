import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, FileText, User, Calendar, ChevronLeft, ChevronRight, Home, Download, ChevronDown, ArrowLeft } from 'lucide-react';
import './ReportPreview.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function ReportPreview({ isAdminPreview = false }) {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // 배경색 설정
    const originalBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;

    document.body.style.backgroundColor = '#ffffff';
    document.documentElement.style.backgroundColor = '#ffffff';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
    };
  }, []);

  useEffect(() => {
    fetchReport();
  }, [token]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowChapterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/report/${token}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '레포트를 불러오는데 실패했습니다.');
      }

      setReportData(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (downloading) return;

    setDownloading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/report/${token}/download`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('PDF 다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `사주리포트_${reportData?.order?.name || 'report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleGoBack = () => {
    if (isAdminPreview) {
      // 관리자 프리뷰에서는 뒤로가기
      navigate(-1);
    } else {
      // 고객용에서는 홈으로
      window.location.href = '/';
    }
  };

  const chapterTitles = {
    1: '나의 아이덴티티',
    2: '나의 사회적 역할',
    3: '대운 흐름 분석',
    4: '현재 대운의 운세',
    5: '올해의 운세'
  };

  const chapterIcons = {
    1: '🧭',
    2: '🏛️',
    3: '📊',
    4: '🔮',
    5: '🌟'
  };

  const totalChapters = 5;

  const renderContent = (content) => {
    if (!content) return <p className="no-content">내용이 없습니다.</p>;

    // Markdown-like formatting
    const formatted = content
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    return (
      <div
        className="chapter-content-text"
        dangerouslySetInnerHTML={{ __html: `<p>${formatted}</p>` }}
      />
    );
  };

  const getChapterContent = (num) => {
    if (!reportData?.chapters) return null;
    const chapterKey = `chapter${num}`;
    return reportData.chapters[chapterKey]?.content;
  };

  const goToPrevChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter(currentChapter - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextChapter = () => {
    if (currentChapter < totalChapters) {
      setCurrentChapter(currentChapter + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectChapter = (num) => {
    setCurrentChapter(num);
    setShowChapterDropdown(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="report-page">
        <div className="report-wrapper">
          <div className="report-loading">
            <Loader size={48} className="spinning" />
            <p>레포트를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-page">
        <div className="report-wrapper">
          <div className="report-error">
            <FileText size={48} />
            <h2>레포트를 찾을 수 없습니다</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="report-wrapper">
        {/* Admin Preview Banner */}
        {isAdminPreview && (
          <div className="admin-preview-banner">
            관리자 미리보기
          </div>
        )}

        {/* Header */}
        <header className="report-header">
          <button className="header-btn" onClick={handleGoBack} title={isAdminPreview ? "뒤로가기" : "홈으로"}>
            {isAdminPreview ? <ArrowLeft size={22} /> : <Home size={22} />}
          </button>
          <div className="report-title-area" ref={dropdownRef}>
            <button
              className="report-title-btn"
              onClick={() => setShowChapterDropdown(!showChapterDropdown)}
            >
              <span className="report-title">FortuneTorch</span>
              <ChevronDown
                size={18}
                className={`title-chevron ${showChapterDropdown ? 'open' : ''}`}
              />
            </button>

            {/* Chapter Dropdown */}
            {showChapterDropdown && (
              <div className="chapter-dropdown">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    className={`chapter-dropdown-item ${currentChapter === num ? 'active' : ''}`}
                    onClick={() => selectChapter(num)}
                  >
                    <span className="dropdown-icon">{chapterIcons[num]}</span>
                    <span className="dropdown-text">
                      <span className="dropdown-chapter">Chapter {num}</span>
                      <span className="dropdown-title">{chapterTitles[num]}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className={`header-btn ${downloading ? 'loading' : ''}`}
            onClick={handleDownloadPDF}
            title="PDF 다운로드"
            disabled={downloading}
          >
            {downloading ? <Loader size={22} className="spinning" /> : <Download size={22} />}
          </button>
        </header>

        {/* User Info Card - 첫 페이지에만 표시 */}
        {currentChapter === 1 && (
          <div className="user-info-card">
            <div className="user-info-row">
              <User size={18} />
              <span className="user-name">{reportData?.order?.name}</span>
            </div>
            <div className="user-info-row">
              <Calendar size={18} />
              <span>{reportData?.order?.birth_info}</span>
            </div>
            <div className="report-type-badge">
              {reportData?.order?.report_type_label}
            </div>
          </div>
        )}

        {/* Chapter Content */}
        <div className="chapter-display">
          <div className="chapter-title-bar">
            <span className="chapter-icon">{chapterIcons[currentChapter]}</span>
            <div className="chapter-title-info">
              <span className="chapter-number">Chapter {currentChapter}</span>
              <h2 className="chapter-title">{chapterTitles[currentChapter]}</h2>
            </div>
          </div>
          <div className="chapter-content">
            {renderContent(getChapterContent(currentChapter))}
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="chapter-navigation">
          <button
            className={`nav-btn prev ${currentChapter === 1 ? 'disabled' : ''}`}
            onClick={goToPrevChapter}
            disabled={currentChapter === 1}
          >
            <ChevronLeft size={24} />
            <span>이전</span>
          </button>

          <div className="nav-page-info">
            {currentChapter} / {totalChapters}
          </div>

          <button
            className={`nav-btn next ${currentChapter === totalChapters ? 'disabled' : ''}`}
            onClick={goToNextChapter}
            disabled={currentChapter === totalChapters}
          >
            <span>다음</span>
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Footer */}
        <footer className="report-footer">
          <p>이 리포트는 사주명리학적 분석을 기반으로 생성되었습니다.</p>
          <p className="footer-date">
            생성일: {new Date(reportData?.created_at).toLocaleDateString('ko-KR')}
          </p>
          <p className="footer-copyright">© 2026 FortuneTorch</p>
        </footer>
      </div>
    </div>
  );
}

export default ReportPreview;
