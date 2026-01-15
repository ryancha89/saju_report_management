import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, FileText, User, Calendar, ChevronLeft, ChevronRight, Home, Download, ChevronDown } from 'lucide-react';
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

  // 챕터 정보
  const chapterInfo = {
    1: { title: '사주정보' },
    2: { title: '나의 아이덴티티' },
    3: { title: '나의 잠재력과 사회적 역할' },
    4: { title: '대운 흐름 분석' },
    5: { title: '향후 5년간의 운세' },
    6: { title: '재물운' },
    7: { title: '직업운/사회운' },
    8: { title: '연애운/배우자운' },
    9: { title: '상담사의 코칭' }
  };

  const totalChapters = 9;

  useEffect(() => {
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
        headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('PDF 다운로드에 실패했습니다.');
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
    window.location.href = '/';
  };

  const renderContent = (content) => {
    if (!content) return <p className="no-content">내용이 없습니다.</p>;
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

  // 챕터 5, 6, 7 연도별 데이터 가져오기 (재물운, 직업운, 연애운)
  const getYearsData = (chapterNum) => {
    if (!reportData) return null;

    // 재물운 (챕터 5) - fortune_years.yearlyFortunes
    if (chapterNum === 5 && reportData.fortune_years) {
      const yearlyData = reportData.fortune_years.yearlyFortunes || reportData.fortune_years;
      if (yearlyData && typeof yearlyData === 'object') {
        return Object.entries(yearlyData)
          .filter(([key, value]) => value && typeof value === 'object' && key !== 'baseFortune')
          .sort((a, b) => (a[1].year || parseInt(a[0]) || 0) - (b[1].year || parseInt(b[0]) || 0));
      }
    }
    // 직업운 (챕터 6) - career_years.yearlyFortunes 또는 yearlyCareers
    if (chapterNum === 6 && reportData.career_years) {
      const yearlyData = reportData.career_years.yearlyFortunes || reportData.career_years.yearlyCareers || reportData.career_years;
      if (yearlyData && typeof yearlyData === 'object') {
        return Object.entries(yearlyData)
          .filter(([key, value]) => value && typeof value === 'object' && key !== 'baseFortune' && key !== 'baseCareer')
          .sort((a, b) => (a[1].year || parseInt(a[0]) || 0) - (b[1].year || parseInt(b[0]) || 0));
      }
    }
    // 연애운 (챕터 7) - love_fortune.yearlyLoveFortunes 또는 직접 연도별 데이터
    if (chapterNum === 7 && reportData.love_fortune) {
      const yearlyData = reportData.love_fortune.yearlyLoveFortunes || reportData.love_fortune;
      if (yearlyData && typeof yearlyData === 'object') {
        // 배열인 경우
        if (Array.isArray(yearlyData)) {
          return yearlyData.map((item, idx) => [String(idx), item]);
        }
        // 객체인 경우
        return Object.entries(yearlyData)
          .filter(([key, value]) => value && typeof value === 'object')
          .sort((a, b) => (a[1].year || parseInt(a[0]) || 0) - (b[1].year || parseInt(b[0]) || 0));
      }
    }
    return null;
  };

  // 기본 재물운/직업운 설명 가져오기
  const getBaseFortune = (chapterNum) => {
    if (!reportData) return null;
    if (chapterNum === 5 && reportData.fortune_years?.baseFortune) {
      return reportData.fortune_years.baseFortune.generated_intro || reportData.fortune_years.baseFortune.intro;
    }
    if (chapterNum === 6 && reportData.career_years) {
      const baseData = reportData.career_years.baseFortune || reportData.career_years.baseCareer;
      if (baseData) {
        return baseData.generated_intro || baseData.intro;
      }
    }
    return null;
  };

  // 연도별 콘텐츠 렌더링 (챕터 5, 6, 7 - 재물운, 직업운, 연애운)
  const renderYearlyContent = (chapterNum) => {
    const yearsData = getYearsData(chapterNum);
    const baseFortune = getBaseFortune(chapterNum);

    if ((!yearsData || yearsData.length === 0) && !baseFortune) {
      return <p className="no-content">아직 생성된 내용이 없습니다.</p>;
    }

    return (
      <div className="yearly-fortune-container">
        {/* 기본 설명 (재물운/직업운) */}
        {baseFortune && (
          <div className="base-fortune-intro">
            {renderContent(baseFortune)}
          </div>
        )}

        {/* 연도별 운세 */}
        {yearsData && yearsData.map(([yearKey, yearData]) => {
          const year = yearData.year || yearKey;
          const content = yearData.generated_content || yearData.content;
          const ganji = yearData.ganji || yearData.year_ganji;
          const decade = yearData.decade;

          return (
            <div key={yearKey} className="year-fortune-card">
              <div className="year-fortune-header">
                <div className="year-info">
                  <span className="year-number">{year}년</span>
                  {ganji && <span className="year-ganji">{ganji}</span>}
                </div>
                {decade && (
                  <span className="decade-text">{decade.ganji} 대운</span>
                )}
              </div>
              <div className="year-fortune-content">
                {content ? renderContent(content) : <p className="no-content">내용 없음</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 대운 흐름 결과 클래스
  const getDecadeResultClass = (result) => {
    if (!result) return 'none';
    if (result === '成' || result === '성') return 'success';
    if (result === '敗' || result === '패') return 'failure';
    if (result.includes('成中有敗') || result.includes('성중유패')) return 'mixed-good';
    if (result.includes('敗中有成') || result.includes('패중유성')) return 'mixed-bad';
    return 'neutral';
  };

  // 오행 클래스 반환
  const getElementClass = (char) => {
    const wood = ['甲', '乙', '寅', '卯'];
    const fire = ['丙', '丁', '巳', '午'];
    const earth = ['戊', '己', '辰', '戌', '丑', '未'];
    const metal = ['庚', '辛', '申', '酉'];
    const water = ['壬', '癸', '亥', '子'];

    if (wood.includes(char)) return 'element-wood';
    if (fire.includes(char)) return 'element-fire';
    if (earth.includes(char)) return 'element-earth';
    if (metal.includes(char)) return 'element-metal';
    if (water.includes(char)) return 'element-water';
    return '';
  };

  // 종합 판정 계산 (Degree 우선, 없으면 result, 그 다음 score로 판단)
  const getOverallRating = (decade) => {
    // 0. Degree 필드가 있으면 최우선으로 사용
    if (decade.degree || decade.Degree) {
      const deg = (decade.degree || decade.Degree).toLowerCase();
      if (deg === 'excellent' || deg === '대길') return 'excellent';
      if (deg === 'good' || deg === '길') return 'good';
      if (deg === 'neutral' || deg === '보통') return 'neutral';
      if (deg === 'caution' || deg === '주의') return 'caution';
      if (deg === 'difficult' || deg === '흉') return 'difficult';
    }

    // 1. result 문자열로 판정
    const isGood = (result) => {
      if (!result) return false;
      return result === '成' || result === '성' ||
             result.includes('敗中有成') || result.includes('패중유성');
    };
    const isBad = (result) => {
      if (!result) return false;
      return result === '敗' || result === '패' ||
             result.includes('成中有敗') || result.includes('성중유패');
    };

    const skyGood = isGood(decade.sky_result);
    const skyBad = isBad(decade.sky_result);
    const earthGood = isGood(decade.earth_result);
    const earthBad = isBad(decade.earth_result);

    // 결과가 있으면 결과로 판정
    if (decade.sky_result || decade.earth_result) {
      if (skyGood && earthGood) return 'excellent';
      if (skyGood && !earthBad) return 'good';
      if (earthGood && !skyBad) return 'good';
      if (skyBad && earthBad) return 'difficult';
      if (skyBad || earthBad) return 'caution';
      if (skyGood || earthGood) return 'neutral';
    }

    // 2. score로 판정 (fallback)
    if (typeof decade.sky_score === 'number' && typeof decade.earth_score === 'number') {
      const totalScore = decade.sky_score + decade.earth_score;
      if (totalScore >= 3) return 'excellent';
      if (totalScore >= 1) return 'good';
      if (totalScore >= -1) return 'neutral';
      if (totalScore >= -3) return 'caution';
      return 'difficult';
    }

    return 'neutral';
  };

  const getOverallRatingClass = (decade) => {
    const rating = getOverallRating(decade);
    return `rating-${rating}`;
  };

  const getOverallRatingText = (decade) => {
    const rating = getOverallRating(decade);
    switch (rating) {
      case 'excellent': return '◎ 대길';
      case 'good': return '○ 길';
      case 'neutral': return '△ 보통';
      case 'caution': return '▽ 주의';
      case 'difficult': return '✕ 흉';
      default: return '― 미정';
    }
  };

  // 개별 성패 판정 (천간/지지 각각) - Degree 우선, 없으면 result, 그 다음 score
  const getSingleRating = (result, score, degree) => {
    // 0. Degree가 있으면 최우선
    if (degree) {
      const deg = degree.toLowerCase();
      if (deg === 'excellent' || deg === '대길') return { class: 'excellent', text: '대길', icon: '◎' };
      if (deg === 'good' || deg === '길') return { class: 'good', text: '길', icon: '○' };
      if (deg === 'neutral' || deg === '보통') return { class: 'neutral', text: '보통', icon: '△' };
      if (deg === 'caution' || deg === '주의') return { class: 'caution', text: '주의', icon: '▽' };
      if (deg === 'difficult' || deg === '흉') return { class: 'bad', text: '흉', icon: '✕' };
    }

    // 1. result 문자열로 판정
    if (result) {
      // 길: 成, 敗中有成 (결국 좋아짐)
      if (result === '成' || result === '성') return { class: 'good', text: '길', icon: '○' };
      if (result.includes('敗中有成') || result.includes('패중유성')) return { class: 'good', text: '길', icon: '○' };
      // 흉: 敗, 成中有敗 (결국 나빠짐)
      if (result === '敗' || result === '패') return { class: 'bad', text: '흉', icon: '✕' };
      if (result.includes('成中有敗') || result.includes('성중유패')) return { class: 'bad', text: '흉', icon: '✕' };
      // 보통: 성패공존
      if (result.includes('成敗共存') || result.includes('성패공존')) return { class: 'neutral', text: '보통', icon: '△' };
    }

    // 2. score로 판정 (fallback)
    if (typeof score === 'number') {
      if (score >= 1) return { class: 'good', text: '길', icon: '○' };
      if (score > 0) return { class: 'neutral', text: '보통', icon: '△' };
      if (score <= -1) return { class: 'bad', text: '흉', icon: '✕' };
      return { class: 'neutral', text: '보통', icon: '△' };
    }
    return { class: 'neutral', text: '', icon: '―' };
  };

  // 챕터 3 대운 흐름 렌더링
  const renderDecadeFlow = () => {
    const decadeFlow = reportData?.chapter4_decade_flow;
    const content = getChapterContent(3);

    if (!decadeFlow && !content) {
      return <p className="no-content">아직 생성된 내용이 없습니다.</p>;
    }

    return (
      <div className="decade-flow-preview">
        {decadeFlow && decadeFlow.length > 0 && (
          <>
            {/* 상단 요약 표 */}
            <div className="decade-summary-section">
              <div className="decade-flow-header">
                <h5>대운 성패 흐름</h5>
                <p className="decade-flow-desc">천간(정신)과 지지(현실)의 성패를 나타냅니다.</p>
              </div>
              <div className="decade-summary-table-wrapper">
                <table className="decade-summary-table">
                  <thead>
                    <tr>
                      <th>나이</th>
                      {decadeFlow.map((decade, idx) => (
                        <th key={idx} className={decade.is_current ? 'current' : ''}>
                          {decade.start_age}~{decade.end_age}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="row-label">대운</td>
                      {decadeFlow.map((decade, idx) => (
                        <td key={idx} className={`ganji-cell ${decade.is_current ? 'current' : ''}`}>
                          <span className={getElementClass(decade.sky)}>{decade.sky}</span>
                          <span className={getElementClass(decade.earth)}>{decade.earth}</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="row-label">천간</td>
                      {decadeFlow.map((decade, idx) => (
                        <td key={idx} className={`result-cell sky ${getDecadeResultClass(decade.sky_result)} ${decade.is_current ? 'current' : ''}`}>
                          <span className={`cell-char ${getElementClass(decade.sky)}`}>{decade.sky}</span>
                          <span className="cell-result">{decade.sky_result || '-'}</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="row-label">지지</td>
                      {decadeFlow.map((decade, idx) => (
                        <td key={idx} className={`result-cell earth ${getDecadeResultClass(decade.earth_result)} ${decade.is_current ? 'current' : ''}`}>
                          <span className={`cell-char ${getElementClass(decade.earth)}`}>{decade.earth}</span>
                          <span className="cell-result">{decade.earth_result || '-'}</span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 상세 설명 리스트 */}
            <div className="decade-detail-section">
              <h5 className="detail-section-title">대운별 상세 분석</h5>
              {decadeFlow.map((decade, idx) => (
                <div key={idx} className={`decade-item ${decade.is_current ? 'current' : ''} ${getOverallRatingClass(decade)}`}>
                  <div className="decade-card-header">
                    <span className="decade-age">{decade.start_age}~{decade.end_age}세</span>
                    <span className="decade-ganji">{decade.ganji}</span>
                    {decade.is_current && <span className="current-badge">현재</span>}

                    {/* 종합 판정 배지 */}
                    <span className={`overall-rating-badge ${getOverallRatingClass(decade)}`}>
                      {getOverallRatingText(decade)}
                    </span>

                    <div className="decade-results">
                      <span className={`decade-result ${getElementClass(decade.sky)} rating-${getSingleRating(decade.sky_result, decade.sky_score, decade.sky_degree).class}`}>
                        {decade.sky} <small>({decade.sky_sipsin})</small>
                        <span className="result-indicator">{getSingleRating(decade.sky_result, decade.sky_score, decade.sky_degree).icon}</span>
                      </span>
                      <span className={`decade-result ${getElementClass(decade.earth)} rating-${getSingleRating(decade.earth_result, decade.earth_score, decade.earth_degree).class}`}>
                        {decade.earth} <small>({decade.earth_sipsin})</small>
                        <span className="result-indicator">{getSingleRating(decade.earth_result, decade.earth_score, decade.earth_degree).icon}</span>
                      </span>
                    </div>
                  </div>

                  {/* 프리미엄 대운 분석 카드 */}
                  <div className="decade-analysis-content">
                    {/* 키워드 섹션 */}
                    {decade.keywords && decade.keywords.length > 0 && (
                      <div className="decade-keywords">
                        {decade.keywords.map((keyword, kIdx) => (
                          <span key={kIdx} className="keyword-tag">{keyword}</span>
                        ))}
                      </div>
                    )}

                    {/* 천간 분석 */}
                    {decade.sky_analysis && (
                      <div className="analysis-section sky-section">
                        <div className="analysis-header">
                          <span className={`analysis-icon ${getElementClass(decade.sky)}`}>{decade.sky}</span>
                          <span className="analysis-title">천간 분석 <small>(정신·의지·계획)</small></span>
                        </div>
                        <div className="analysis-body">
                          {renderContent(decade.sky_analysis)}
                        </div>
                      </div>
                    )}

                    {/* 지지 분석 */}
                    {decade.earth_analysis && (
                      <div className="analysis-section earth-section">
                        <div className="analysis-header">
                          <span className={`analysis-icon ${getElementClass(decade.earth)}`}>{decade.earth}</span>
                          <span className="analysis-title">지지 분석 <small>(현실·환경·실행)</small></span>
                        </div>
                        <div className="analysis-body">
                          {renderContent(decade.earth_analysis)}
                        </div>
                      </div>
                    )}

                    {/* 인생 영역별 조언 */}
                    {decade.life_areas && Object.keys(decade.life_areas).length > 0 && (
                      <div className="life-areas-grid">
                        {decade.life_areas.career && (
                          <div className="life-area-card career">
                            <div className="life-area-icon">💼</div>
                            <div className="life-area-label">사업/직장</div>
                            <div className="life-area-content">{decade.life_areas.career}</div>
                          </div>
                        )}
                        {decade.life_areas.wealth && (
                          <div className="life-area-card wealth">
                            <div className="life-area-icon">💰</div>
                            <div className="life-area-label">재물/투자</div>
                            <div className="life-area-content">{decade.life_areas.wealth}</div>
                          </div>
                        )}
                        {decade.life_areas.relationship && (
                          <div className="life-area-card relationship">
                            <div className="life-area-icon">❤️</div>
                            <div className="life-area-label">대인관계</div>
                            <div className="life-area-content">{decade.life_areas.relationship}</div>
                          </div>
                        )}
                        {decade.life_areas.health && (
                          <div className="life-area-card health">
                            <div className="life-area-icon">🏥</div>
                            <div className="life-area-label">건강</div>
                            <div className="life-area-content">{decade.life_areas.health}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 조언 & 주의사항 */}
                    <div className="advice-caution-row">
                      {decade.advice && (
                        <div className="advice-box">
                          <div className="box-header">
                            <span className="box-icon">💡</span>
                            <span className="box-title">핵심 조언</span>
                          </div>
                          <div className="box-content">{decade.advice}</div>
                        </div>
                      )}
                      {decade.caution && (
                        <div className="caution-box">
                          <div className="box-header">
                            <span className="box-icon">⚠️</span>
                            <span className="box-title">주의사항</span>
                          </div>
                          <div className="box-content">{decade.caution}</div>
                        </div>
                      )}
                    </div>

                    {/* 기존 ai_description 하위호환 */}
                    {decade.ai_description && !decade.sky_analysis && (
                      <div className="decade-desc-body legacy">
                        {renderContent(decade.ai_description)}
                      </div>
                    )}

                    {/* 아무 콘텐츠도 없을 때 */}
                    {!decade.sky_analysis && !decade.earth_analysis && !decade.ai_description && (!decade.keywords || decade.keywords.length === 0) && (
                      <div className="decade-no-content">
                        <p>AI 분석을 생성해주세요.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {content && !decadeFlow && renderContent(content)}
      </div>
    );
  };

  // 챕터 4 - 세운 흐름 분석 (향후 10년간 연도별 운세 흐름)
  const renderYearlyFortuneFlow = () => {
    const yearlyFortuneFlow = reportData?.chapter4_yearly_fortune_flow;
    const content = getChapterContent(4);

    if (!yearlyFortuneFlow && !content) {
      return <p className="no-content">아직 생성된 내용이 없습니다.</p>;
    }

    return (
      <div className="yearly-fortune-flow-preview">
        {yearlyFortuneFlow && yearlyFortuneFlow.length > 0 && (
          <>
            {/* 상단 요약 표 */}
            <div className="yearly-summary-section">
              <div className="yearly-flow-header">
                <h5>세운 성패 흐름</h5>
                <p className="yearly-flow-desc">연도별 천간(정신)과 지지(현실)의 성패를 나타냅니다.</p>
              </div>
              <div className="yearly-summary-table-wrapper">
                <table className="yearly-summary-table">
                  <thead>
                    <tr>
                      <th>연도</th>
                      {yearlyFortuneFlow.map((yearData, idx) => (
                        <th key={idx} className={yearData.is_current ? 'current' : ''}>
                          {yearData.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="row-label">세운</td>
                      {yearlyFortuneFlow.map((yearData, idx) => (
                        <td key={idx} className={`ganji-cell ${yearData.is_current ? 'current' : ''}`}>
                          {yearData.ganji}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="row-label">천간</td>
                      {yearlyFortuneFlow.map((yearData, idx) => (
                        <td key={idx} className={`result-cell sky ${getDecadeResultClass(yearData.sky_result)} ${yearData.is_current ? 'current' : ''}`}>
                          <span className={`cell-char ${getElementClass(yearData.sky)}`}>{yearData.sky}</span>
                          <span className="cell-result">{yearData.sky_result || '-'}</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="row-label">지지</td>
                      {yearlyFortuneFlow.map((yearData, idx) => (
                        <td key={idx} className={`result-cell earth ${getDecadeResultClass(yearData.earth_result)} ${yearData.is_current ? 'current' : ''}`}>
                          <span className={`cell-char ${getElementClass(yearData.earth)}`}>{yearData.earth}</span>
                          <span className="cell-result">{yearData.earth_result || '-'}</span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 상세 설명 리스트 */}
            <div className="yearly-detail-section">
              <h5 className="detail-section-title">연도별 상세 분석</h5>
              {yearlyFortuneFlow.map((yearData, idx) => (
                <div key={idx} className={`yearly-item ${yearData.is_current ? 'current' : ''}`}>
                  <div className="yearly-card-header">
                    <span className="yearly-year">{yearData.year}년</span>
                    <span className="yearly-ganji">{yearData.ganji}</span>
                    <div className="yearly-results">
                      <span className={`yearly-result sky ${getDecadeResultClass(yearData.sky_result)}`}>
                        {yearData.sky} <small>({yearData.sky_sipsin || '-'})</small>
                      </span>
                      <span className={`yearly-result earth ${getDecadeResultClass(yearData.earth_result)}`}>
                        {yearData.earth} <small>({yearData.earth_sipsin || '-'})</small>
                      </span>
                    </div>
                  </div>
                  {yearData.ai_description && (
                    <div className="yearly-desc-body">
                      {renderContent(yearData.ai_description)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {content && !yearlyFortuneFlow && renderContent(content)}
      </div>
    );
  };

  // 챕터 5 - 향후 5년의 운세 (격국, 천간, 지지운 기반)
  const renderFiveYearFortune = () => {
    const yearlyFortune = reportData?.yearly_fortune;
    const content = getChapterContent(5);

    if (!yearlyFortune && !content) {
      return <p className="no-content">아직 생성된 내용이 없습니다.</p>;
    }

    // yearly_fortune 데이터가 있는 경우
    if (yearlyFortune && Array.isArray(yearlyFortune) && yearlyFortune.length > 0) {
      return (
        <div className="five-year-fortune-preview">
          <div className="fortune-header">
            <h5>향후 5년 운세 흐름</h5>
            <p className="fortune-desc">격국·천간·지지운을 기반으로 한 연도별 종합 분석</p>
          </div>

          {yearlyFortune.map((yearData, idx) => (
            <div key={idx} className={`year-fortune-item ${yearData.is_current ? 'current' : ''}`}>
              <div className="year-fortune-header">
                <div className="year-info">
                  <span className="year-number">{yearData.year}년</span>
                  <span className={`year-ganji ${getElementClass(yearData.sky)}`}>{yearData.ganji}</span>
                </div>
              </div>

              {/* 핵심 분석 요소 */}
              <div className="fortune-analysis-grid">
                {yearData.gyeokguk && (
                  <div className="analysis-item">
                    <span className="analysis-label">격국</span>
                    <span className="analysis-value">{yearData.gyeokguk}</span>
                  </div>
                )}
                {yearData.chungan && (
                  <div className="analysis-item highlight">
                    <span className="analysis-label">천간운</span>
                    <span className={`analysis-value ${getElementClass(yearData.sky)}`}>{yearData.chungan}</span>
                  </div>
                )}
                {yearData.jiji && (
                  <div className="analysis-item highlight">
                    <span className="analysis-label">지지운</span>
                    <span className={`analysis-value ${getElementClass(yearData.earth)}`}>{yearData.jiji}</span>
                  </div>
                )}
                {yearData.eokbu && (
                  <div className="analysis-item">
                    <span className="analysis-label">억부</span>
                    <span className="analysis-value">{yearData.eokbu}</span>
                  </div>
                )}
                {yearData.johu && (
                  <div className="analysis-item">
                    <span className="analysis-label">조후</span>
                    <span className="analysis-value">{yearData.johu}</span>
                  </div>
                )}
                {yearData.sibiunsung && (
                  <div className="analysis-item">
                    <span className="analysis-label">십이운성</span>
                    <span className="analysis-value">{yearData.sibiunsung}</span>
                  </div>
                )}
                {yearData.sibisinsal && (
                  <div className="analysis-item">
                    <span className="analysis-label">십이신살</span>
                    <span className="analysis-value">{yearData.sibisinsal}</span>
                  </div>
                )}
              </div>

              {/* AI 분석 내용 */}
              {yearData.ai_analysis && (
                <div className="fortune-content">
                  {renderContent(yearData.ai_analysis)}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // 텍스트 내용만 있는 경우
    return content ? renderContent(content) : <p className="no-content">아직 생성된 내용이 없습니다.</p>;
  };

  // 한자 → 한글 변환
  const hanjaToHangul = (char) => {
    const map = {
      // 천간
      '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
      '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
      // 지지
      '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
      '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
    };
    return map[char] || '';
  };

  // 십성 계산 (일간 기준)
  const getSipsung = (dayGan, targetGan, isJiji = false) => {
    if (!dayGan || !targetGan) return '';

    const cheonganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const jijiToCheongan = {
      '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
      '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
    };

    const dayIdx = cheonganOrder.indexOf(dayGan);
    if (dayIdx === -1) return '';

    let targetIdx;
    if (isJiji) {
      const mappedGan = jijiToCheongan[targetGan];
      targetIdx = cheonganOrder.indexOf(mappedGan);
    } else {
      targetIdx = cheonganOrder.indexOf(targetGan);
    }
    if (targetIdx === -1) return '';

    const dayYinYang = dayIdx % 2; // 0: 양, 1: 음
    const targetYinYang = targetIdx % 2;
    const dayElement = Math.floor(dayIdx / 2); // 0:목, 1:화, 2:토, 3:금, 4:수
    const targetElement = Math.floor(targetIdx / 2);

    // 오행 상생상극 관계로 십성 계산
    const diff = (targetElement - dayElement + 5) % 5;

    if (diff === 0) { // 같은 오행 - 비겁
      return dayYinYang === targetYinYang ? '비견' : '겁재';
    } else if (diff === 1) { // 내가 생 - 식상
      return dayYinYang === targetYinYang ? '식신' : '상관';
    } else if (diff === 2) { // 내가 극 - 재성
      return dayYinYang === targetYinYang ? '편재' : '정재';
    } else if (diff === 3) { // 나를 극 - 관성
      return dayYinYang === targetYinYang ? '편관' : '정관';
    } else { // diff === 4, 나를 생 - 인성
      return dayYinYang === targetYinYang ? '편인' : '정인';
    }
  };

  // 십이운성 계산
  const getSibiUnsung = (dayGan, jiji) => {
    if (!dayGan || !jiji) return '';

    const unsungTable = {
      '甲': { '亥': '장생', '子': '목욕', '丑': '관대', '寅': '건록', '卯': '제왕', '辰': '쇠', '巳': '병', '午': '사', '未': '묘', '申': '절', '酉': '태', '戌': '양' },
      '乙': { '午': '장생', '巳': '목욕', '辰': '관대', '卯': '건록', '寅': '제왕', '丑': '쇠', '子': '병', '亥': '사', '戌': '묘', '酉': '절', '申': '태', '未': '양' },
      '丙': { '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠', '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양' },
      '丁': { '酉': '장생', '申': '목욕', '未': '관대', '午': '건록', '巳': '제왕', '辰': '쇠', '卯': '병', '寅': '사', '丑': '묘', '子': '절', '亥': '태', '戌': '양' },
      '戊': { '寅': '장생', '卯': '목욕', '辰': '관대', '巳': '건록', '午': '제왕', '未': '쇠', '申': '병', '酉': '사', '戌': '묘', '亥': '절', '子': '태', '丑': '양' },
      '己': { '酉': '장생', '申': '목욕', '未': '관대', '午': '건록', '巳': '제왕', '辰': '쇠', '卯': '병', '寅': '사', '丑': '묘', '子': '절', '亥': '태', '戌': '양' },
      '庚': { '巳': '장생', '午': '목욕', '未': '관대', '申': '건록', '酉': '제왕', '戌': '쇠', '亥': '병', '子': '사', '丑': '묘', '寅': '절', '卯': '태', '辰': '양' },
      '辛': { '子': '장생', '亥': '목욕', '戌': '관대', '酉': '건록', '申': '제왕', '未': '쇠', '午': '병', '巳': '사', '辰': '묘', '卯': '절', '寅': '태', '丑': '양' },
      '壬': { '申': '장생', '酉': '목욕', '戌': '관대', '亥': '건록', '子': '제왕', '丑': '쇠', '寅': '병', '卯': '사', '辰': '묘', '巳': '절', '午': '태', '未': '양' },
      '癸': { '卯': '장생', '寅': '목욕', '丑': '관대', '子': '건록', '亥': '제왕', '戌': '쇠', '酉': '병', '申': '사', '未': '묘', '午': '절', '巳': '태', '辰': '양' }
    };

    return unsungTable[dayGan]?.[jiji] || '';
  };

  // 사주정보 렌더링 (챕터 1)
  const renderSajuInfo = () => {
    const order = reportData?.order;
    const sajuData = reportData?.saju_data;

    if (!order) return <p className="no-content">사주 정보를 불러올 수 없습니다.</p>;

    // 사주 데이터에서 천간/지지 추출
    const getSky = (key) => {
      if (!sajuData) return null;
      if (sajuData.cheongan) return sajuData.cheongan[key];
      if (sajuData[key]?.sky) return sajuData[key].sky;
      return null;
    };

    const getEarth = (key) => {
      if (!sajuData) return null;
      if (sajuData.jiji) return sajuData.jiji[key];
      if (sajuData[key]?.earth) return sajuData[key].earth;
      return null;
    };

    const dayGan = getSky('day'); // 일간 (나)

    const pillars = [
      { label: '시주', key: 'time' },
      { label: '일주', key: 'day' },
      { label: '월주', key: 'month' },
      { label: '년주', key: 'year' }
    ];

    return (
      <div className="saju-info-content">
        <div className="saju-profile">
          <h3 className="saju-name">{order.name}</h3>
          <div className="saju-meta">
            <span className="saju-birth">{order.birth_info}</span>
            <span className="saju-gender">{order.gender === 'male' ? '남' : '여'}</span>
          </div>
        </div>

        <div className="saju-chart-wrapper">
          <div className="saju-chart-title">
            <span className="chart-title-main">사주팔자</span>
            <span className="chart-title-sub">四柱八字</span>
          </div>

          <div className="saju-chart">
            <div className="saju-pillars">
              {pillars.map(({ label, key }) => {
                const sky = getSky(key);
                const earth = getEarth(key);
                const skySipsung = key === 'day' ? '일간' : getSipsung(dayGan, sky, false);
                const earthSipsung = getSipsung(dayGan, earth, true);
                const sibiUnsung = getSibiUnsung(dayGan, earth);

                return (
                  <div key={key} className="saju-pillar">
                    <div className="pillar-header">
                      <span className="pillar-label">{label}</span>
                    </div>
                    <div className="pillar-chars">
                      {/* 천간 */}
                      <div className="char-wrapper">
                        <span className="char-sipsung sky-sipsung">{skySipsung || '-'}</span>
                        <div className={`pillar-char sky ${sky ? getElementClass(sky) : ''}`}>
                          <span className="char-main">{sky || '-'}</span>
                          <span className="char-hangul-inside">{sky ? hanjaToHangul(sky) : ''}</span>
                        </div>
                      </div>
                      {/* 지지 */}
                      <div className="char-wrapper earth-wrapper">
                        <div className={`pillar-char earth ${earth ? getElementClass(earth) : ''}`}>
                          <span className="char-main">{earth || '-'}</span>
                          <span className="char-hangul-inside">{earth ? hanjaToHangul(earth) : ''}</span>
                        </div>
                        <div className="char-info-row">
                          <span className="char-sipsung">{earthSipsung || '-'}</span>
                          <span className="char-unsung">{sibiUnsung || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  };

  // 챕터 내용 렌더링
  const renderChapterContent = () => {
    const num = currentChapter;

    // 챕터 1은 사주정보
    if (num === 1) {
      return renderSajuInfo();
    }

    // 챕터 2, 3은 기존 방식 (chapter2 = 아이덴티티, chapter3 = 잠재력)
    if (num === 2 || num === 3) {
      return renderContent(getChapterContent(num));
    }

    // 챕터 4는 대운 흐름 (이전 3)
    if (num === 4) {
      return renderDecadeFlow();
    }

    // 챕터 5는 향후 5년의 운세 (이전 4)
    if (num === 5) {
      return renderFiveYearFortune();
    }

    // 챕터 9는 코칭 (이전 8)
    if (num === 9) {
      return renderCoaching();
    }

    // 챕터 6, 7, 8은 연도별 데이터 (재물운, 직업운, 연애운) - 이전 5, 6, 7
    return renderYearlyContent(num - 1);
  };

  // 코칭 렌더링
  const renderCoaching = () => {
    const coaching = reportData?.coaching;
    if (!coaching || !coaching.items || coaching.items.length === 0) {
      return (
        <div className="no-content">
          <p>코칭 데이터가 아직 준비되지 않았습니다.</p>
        </div>
      );
    }

    return (
      <div className="coaching-content">
        {coaching.items.map((item, index) => (
          <div key={index} className="coaching-item-card">
            <div className="coaching-item-header">
              <span className="coaching-item-number">{index + 1}</span>
              <h3 className="coaching-item-topic">{item.topic}</h3>
            </div>
            <div className="coaching-item-content">
              {item.content.split('\n').map((paragraph, pIdx) => (
                paragraph.trim() && <p key={pIdx}>{paragraph}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
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

        {/* Header */}
        <header className="report-header">
          <button className="header-btn" onClick={handleGoBack} title="홈으로">
            <Home size={22} />
          </button>
          <div className="report-title-area" ref={dropdownRef}>
            <button
              className="report-title-btn"
              onClick={() => setShowChapterDropdown(!showChapterDropdown)}
            >
              <span className="report-title">포춘토치</span>
              <ChevronDown size={18} className={`title-chevron ${showChapterDropdown ? 'open' : ''}`} />
            </button>

            {showChapterDropdown && (
              <div className="chapter-dropdown">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    className={`chapter-dropdown-item ${currentChapter === num ? 'active' : ''}`}
                    onClick={() => selectChapter(num)}
                  >
                    <span className="dropdown-number">{num}</span>
                    <span className="dropdown-text">
                      <span className="dropdown-title">{chapterInfo[num].title}</span>
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

        {/* Chapter Content */}
        <div className="chapter-display">
          <div className="chapter-title-bar">
            <div className="chapter-title-info">
              <span className="chapter-number">Chapter {currentChapter}</span>
              <h2 className="chapter-title">{chapterInfo[currentChapter].title}</h2>
            </div>
          </div>
          <div className="chapter-content">
            {renderChapterContent()}
          </div>
        </div>

        {/* Chapter Navigation Dots */}
        <div className="chapter-dots">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className={`chapter-dot ${currentChapter === num ? 'active' : ''}`}
              onClick={() => selectChapter(num)}
              title={chapterInfo[num].title}
            >
              <span className="dot-number">{num}</span>
            </button>
          ))}
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

      </div>
    </div>
  );
}

export default ReportPreview;
