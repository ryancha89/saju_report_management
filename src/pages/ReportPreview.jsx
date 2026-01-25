import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, FileText, User, Calendar, ChevronLeft, ChevronRight, Home, Share2, ChevronDown, MessageSquarePlus, Edit3, Trash2, X } from 'lucide-react';
import './ReportPreview.css';
import '../components/CounselorKeyPoint.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

function ReportPreview({ isAdminPreview = false }) {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [sharing, setSharing] = useState(false);
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const [currentDecadePage, setCurrentDecadePage] = useState(1); // 0: 요약, 1~N: 개별 대운 (기본값: 첫 대운)
  const [currentFiveYearPage, setCurrentFiveYearPage] = useState(1); // 1~5: 연도별 페이지
  const [currentFortuneYearPage, setCurrentFortuneYearPage] = useState(1); // 재물운 연도별 페이지
  const [currentCareerYearPage, setCurrentCareerYearPage] = useState(1); // 직업운 연도별 페이지
  const [currentLoveYearPage, setCurrentLoveYearPage] = useState(1); // 연애운 연도별 페이지
  const [showChapterImage, setShowChapterImage] = useState(false); // 챕터 이미지 표시 여부
  const [showManagerGreeting, setShowManagerGreeting] = useState(true); // 매니저 인사말 표시 여부
  const dropdownRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // 상담사의 핵심 포인트 관련 상태
  const [keyPoints, setKeyPoints] = useState({});
  const [keyPointModalOpen, setKeyPointModalOpen] = useState(false);
  const [editingKeyPoint, setEditingKeyPoint] = useState(null);
  const [keyPointPosition, setKeyPointPosition] = useState(0);
  const [keyPointChapter, setKeyPointChapter] = useState('');
  const [keyPointContent, setKeyPointContent] = useState('');
  const [keyPointLabel, setKeyPointLabel] = useState('핵심 포인트');
  const [keyPointSaving, setKeyPointSaving] = useState(false);

  // 라벨 옵션
  const keyPointLabelOptions = [
    { value: '핵심 포인트', icon: '💡' },
    { value: '코멘트', icon: '💬' },
    { value: '조언', icon: '🎯' }
  ];

  // Q&A 관련 상태 (Chapter 10)
  const [qaStatus, setQaStatus] = useState(null); // { has_question, status, question, answer }
  const [questionText, setQuestionText] = useState('');
  const [questionEmail, setQuestionEmail] = useState('');
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionError, setQuestionError] = useState(null);

  // 리뷰 관련 상태
  const [reviewStatus, setReviewStatus] = useState(null); // { has_review, review }
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState('helpful');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // 라벨에 해당하는 아이콘 가져오기
  const getKeyPointIcon = (label) => {
    const option = keyPointLabelOptions.find(opt => opt.value === label);
    return option?.icon || '💡';
  };

  // 연도 수 결정 (blueprint_lite는 3년, 나머지는 5년)
  const yearCount = reportData?.order?.report_type === 'blueprint_lite' ? 3 : 5;

  // 챕터 정보 (yearCount에 따라 동적으로 변경)
  const chapterInfo = {
    1: { title: '사주정보' },
    2: { title: '나의 아이덴티티' },
    3: { title: '나의 잠재력과 사회적 역할' },
    4: { title: '대운 흐름 분석' },
    5: { title: `향후 ${yearCount}년간의 운세` },
    6: { title: '재물운' },
    7: { title: '직업운/사회운' },
    8: { title: '연애운/배우자운' },
    9: { title: '상담사의 코칭' },
    10: { title: '질문과 답변' },
    11: { title: '부록' }
  };

  // 총 챕터 수: 기본 9 + Q&A(질문 있으면) + 부록
  const hasQA = qaStatus?.has_question;
  const totalChapters = hasQA ? 11 : 10; // Q&A 있으면 11, 없으면 10 (부록 포함)

  // 현재 챕터 제목 가져오기 (부록 챕터 번호가 동적이므로)
  const getChapterTitle = (num) => {
    if (hasQA) {
      // Q&A 있으면: 1-9 기본, 10 Q&A, 11 부록
      return chapterInfo[num]?.title || '';
    } else {
      // Q&A 없으면: 1-9 기본, 10 부록
      if (num === 10) return '부록';
      return chapterInfo[num]?.title || '';
    }
  };

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
    fetchQaStatus(); // Q&A 상태도 함께 조회
    fetchReviewStatus(); // 리뷰 상태도 함께 조회
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

  // 챕터 10 이상은 커버 이미지 없음 (직접 콘텐츠 표시)
  useEffect(() => {
    if (currentChapter >= 10) {
      setShowChapterImage(false);
    }
  }, [currentChapter]);

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
      // 핵심포인트 설정
      if (data.report.counselor_key_points) {
        setKeyPoints(data.report.counselor_key_points);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Q&A 상태 조회
  const fetchQaStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/report/${token}/question_status`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setQaStatus(data);
      }
    } catch (err) {
      console.error('Q&A 상태 조회 실패:', err);
    }
  };

  // 질문 제출
  const submitQuestion = async () => {
    if (!questionText.trim()) {
      setQuestionError('질문을 입력해주세요.');
      return;
    }

    setQuestionSubmitting(true);
    setQuestionError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/report/${token}/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          email: questionEmail || reportData?.order?.email || ''
        })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '질문 제출에 실패했습니다.');
      }

      // 성공 시 Q&A 상태 업데이트
      setQaStatus({
        has_question: true,
        status: 'pending',
        question: {
          content: questionText,
          submitted_at: new Date().toISOString(),
          user_email: questionEmail
        },
        answer: null
      });
      setQuestionText('');
      setQuestionEmail('');
    } catch (err) {
      setQuestionError(err.message);
    } finally {
      setQuestionSubmitting(false);
    }
  };

  // 리뷰 상태 조회
  const fetchReviewStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/report/${token}/review_status`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setReviewStatus(data);
      }
    } catch (err) {
      console.error('리뷰 상태 조회 실패:', err);
    }
  };

  // 리뷰 제출
  const submitReview = async () => {
    if (!reviewText.trim()) {
      setReviewError('리뷰 내용을 입력해주세요.');
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/report/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          content: reviewText
        })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '리뷰 제출에 실패했습니다.');
      }

      // 성공 시 상태 업데이트
      setReviewStatus({
        has_review: true,
        review: data.review
      });
      setReviewSuccess(true);
      setReviewText('');
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // 리뷰 평가 옵션
  const reviewRatingOptions = [
    { value: 'helpful', label: '도움이 됐어요', emoji: '💡' },
    { value: 'fun', label: '재미있었어요', emoji: '😊' },
    { value: 'educational', label: '배우는게 많았어요', emoji: '📚' },
    { value: 'encouraging', label: '용기를 얻었어요', emoji: '💪' }
  ];

  // 핵심포인트 추가
  const handleAddKeyPoint = async () => {
    if (!keyPointContent.trim() || !keyPointChapter) return;
    setKeyPointSaving(true);

    try {
      const orderId = reportData?.order?.id;
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/orders/${orderId}/counselor_key_points/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            chapter_key: keyPointChapter,
            content: keyPointContent,
            position: keyPointPosition,
            label: keyPointLabel
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setKeyPoints(data.key_points);
        closeKeyPointModal();
      }
    } catch (error) {
      console.error('핵심포인트 추가 실패:', error);
    } finally {
      setKeyPointSaving(false);
    }
  };

  // 핵심포인트 수정
  const handleUpdateKeyPoint = async () => {
    if (!keyPointContent.trim() || !editingKeyPoint) return;
    setKeyPointSaving(true);

    try {
      const orderId = reportData?.order?.id;
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/orders/${orderId}/counselor_key_points/update`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            chapter_key: keyPointChapter,
            point_id: editingKeyPoint.id,
            content: keyPointContent,
            label: keyPointLabel
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setKeyPoints(data.key_points);
        closeKeyPointModal();
      }
    } catch (error) {
      console.error('핵심포인트 수정 실패:', error);
    } finally {
      setKeyPointSaving(false);
    }
  };

  // 핵심포인트 삭제
  const handleDeleteKeyPoint = async (chapterKey, pointId) => {
    if (!confirm('핵심포인트를 삭제하시겠습니까?')) return;

    try {
      const orderId = reportData?.order?.id;
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/orders/${orderId}/counselor_key_points/delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Saju-Authorization': `Bearer-${API_TOKEN}`
          },
          body: JSON.stringify({
            chapter_key: chapterKey,
            point_id: pointId
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        setKeyPoints(data.key_points);
      }
    } catch (error) {
      console.error('핵심포인트 삭제 실패:', error);
    }
  };

  // 핵심포인트 모달 열기 (추가)
  const openAddKeyPointModal = (chapterKey, position) => {
    setKeyPointChapter(chapterKey);
    setKeyPointPosition(position);
    setKeyPointContent('');
    setKeyPointLabel('핵심 포인트');
    setEditingKeyPoint(null);
    setKeyPointModalOpen(true);
  };

  // 핵심포인트 모달 열기 (수정)
  const openEditKeyPointModal = (chapterKey, keyPoint) => {
    setKeyPointChapter(chapterKey);
    setKeyPointPosition(keyPoint.position);
    setKeyPointContent(keyPoint.content);
    setKeyPointLabel(keyPoint.label || '핵심 포인트');
    setEditingKeyPoint(keyPoint);
    setKeyPointModalOpen(true);
  };

  // 핵심포인트 모달 닫기
  const closeKeyPointModal = () => {
    setKeyPointModalOpen(false);
    setKeyPointContent('');
    setEditingKeyPoint(null);
    setKeyPointChapter('');
    setKeyPointPosition(0);
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    // 추천 코드가 있으면 구매 페이지 링크로, 없으면 리포트 링크
    const referralCode = reportData?.order?.user_referral_code;
    const baseUrl = window.location.origin;
    const productType = reportData?.order?.report_type || 'blueprint';

    let shareUrl;
    let shareText;
    const shareTitle = reportData?.order?.origin === 'blueprint_app' ? '만세력 설명서' : '포춘톨치 사주 리포트';

    if (referralCode) {
      // 추천 코드가 있으면 구매 페이지로 연결 (친구가 구매하면 1000코인 지급)
      shareUrl = `${baseUrl}/user-info?product=${productType}&ref=${referralCode}`;
      shareText = `나도 ${shareTitle}를 받아봤는데 정말 좋았어요! 이 링크로 구매하면 할인 혜택이 있어요 🎁`;
    } else {
      // 추천 코드가 없으면 리포트 보기 링크
      shareUrl = window.location.href;
      shareText = `${reportData?.order?.name || ''}님의 ${shareTitle}를 확인해보세요!`;
    }

    try {
      // Web Share API 지원 확인
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Web Share API 미지원 시 클립보드에 복사
        await navigator.clipboard.writeText(shareUrl);
        alert('링크가 클립보드에 복사되었습니다!');
      }
    } catch (err) {
      // 사용자가 공유를 취소한 경우 무시
      if (err.name !== 'AbortError') {
        // 클립보드 폴백
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert('링크가 클립보드에 복사되었습니다!');
        } catch {
          alert('공유에 실패했습니다.');
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const handleGoBack = () => {
    window.location.href = '/';
  };

  const renderContent = (content) => {
    if (!content) return <p className="no-content">내용이 없습니다.</p>;

    // content가 객체인 경우 (generated_content가 {sky, earth, month, summary, combined} 등일 때)
    let textContent = content;
    if (typeof content === 'object') {
      // combined가 있으면 사용, 없으면 각 섹션을 합침
      textContent = content.combined ||
        [content.sky, content.earth, content.month || content.johu, content.summary]
          .filter(Boolean)
          .join('\n\n');
    }

    if (!textContent || typeof textContent !== 'string') {
      return <p className="no-content">내용이 없습니다.</p>;
    }

    const formatted = textContent
      .replace(/^---+$/gm, '')  // 수평선(---) 제거
      .replace(/#{4,}\s*(.*?)\s*#{0,}/g, '<strong>$1</strong>')  // #### 내용 #### → 강조(bold)
      .replace(/^###\s*(.*?)\s*#{0,}$/gm, '<h3>$1</h3>')    // ### 제목 ### 또는 ### 제목
      .replace(/^##\s*(.*?)\s*#{0,}$/gm, '<h2>$1</h2>')     // ## 제목 ## 또는 ## 제목
      .replace(/^#\s*(.*?)\s*#{0,}$/gm, '<h1>$1</h1>')      // # 제목 # 또는 # 제목
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

  // 핵심포인트가 포함된 콘텐츠 렌더링 (관리자 모드에서 사용)
  const renderContentWithKeyPoints = (content, chapterKey) => {
    if (!content) return <p className="no-content">내용이 없습니다.</p>;

    // 문단 분리
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    const chapterKeyPoints = keyPoints[chapterKey] || [];

    // position별로 핵심포인트 그룹핑
    const keyPointsByPosition = {};
    chapterKeyPoints.forEach(kp => {
      const pos = kp.position || 0;
      if (!keyPointsByPosition[pos]) keyPointsByPosition[pos] = [];
      keyPointsByPosition[pos].push(kp);
    });

    const formatParagraph = (text) => {
      return text
        .replace(/^---+$/gm, '')
        .replace(/#{4,}\s*(.*?)\s*#{0,}/g, '<strong>$1</strong>')
        .replace(/^###\s*(.*?)\s*#{0,}$/gm, '<h3>$1</h3>')
        .replace(/^##\s*(.*?)\s*#{0,}$/gm, '<h2>$1</h2>')
        .replace(/^#\s*(.*?)\s*#{0,}$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
    };

    return (
      <div className="chapter-content-text with-key-points">
        {paragraphs.map((para, idx) => (
          <div key={idx}>
            {/* 이 위치의 핵심포인트들 표시 */}
            {keyPointsByPosition[idx]?.map(kp => (
              <div key={kp.id} className="key-point-display">
                <div className="key-point-badge">
                  <span className="key-point-icon">{getKeyPointIcon(kp.label)}</span>
                  <span className="key-point-label">상담사의 {kp.label || '핵심 포인트'}</span>
                </div>
                <div className="key-point-content">{kp.content}</div>
                {isAdminPreview && (
                  <div className="key-point-actions">
                    <button
                      className="btn-key-point-action"
                      onClick={() => openEditKeyPointModal(chapterKey, kp)}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="btn-key-point-action btn-delete"
                      onClick={() => handleDeleteKeyPoint(chapterKey, kp.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* 관리자 모드: 핵심포인트 추가 버튼 */}
            {isAdminPreview && (
              <div
                className="add-key-point-trigger"
                onClick={() => openAddKeyPointModal(chapterKey, idx)}
              >
                <div className="add-key-point-line"></div>
                <button className="btn-add-key-point">
                  <MessageSquarePlus size={14} />
                  <span>텍스트 추가</span>
                </button>
                <div className="add-key-point-line"></div>
              </div>
            )}

            {/* 문단 */}
            <p dangerouslySetInnerHTML={{ __html: formatParagraph(para) }} />
          </div>
        ))}

        {/* 마지막 위치의 핵심포인트들 */}
        {keyPointsByPosition[paragraphs.length]?.map(kp => (
          <div key={kp.id} className="key-point-display">
            <div className="key-point-badge">
              <span className="key-point-icon">{getKeyPointIcon(kp.label)}</span>
              <span className="key-point-label">상담사의 {kp.label || '핵심 포인트'}</span>
            </div>
            <div className="key-point-content">{kp.content}</div>
            {isAdminPreview && (
              <div className="key-point-actions">
                <button
                  className="btn-key-point-action"
                  onClick={() => openEditKeyPointModal(chapterKey, kp)}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  className="btn-key-point-action btn-delete"
                  onClick={() => handleDeleteKeyPoint(chapterKey, kp.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* 관리자 모드: 마지막에 핵심포인트 추가 버튼 */}
        {isAdminPreview && (
          <div
            className="add-key-point-trigger"
            onClick={() => openAddKeyPointModal(chapterKey, paragraphs.length)}
          >
            <div className="add-key-point-line"></div>
            <button className="btn-add-key-point">
              <MessageSquarePlus size={14} />
              <span>텍스트 추가</span>
            </button>
            <div className="add-key-point-line"></div>
          </div>
        )}
      </div>
    );
  };

  // 챕터별 핵심포인트 섹션 렌더링 (복잡한 구조의 챕터용)
  const renderKeyPointsSection = (chapterKey) => {
    const chapterKeyPoints = keyPoints[chapterKey] || [];

    return (
      <div className="key-points-section">
        {/* 저장된 핵심포인트들 표시 */}
        {chapterKeyPoints.map(kp => (
          <div key={kp.id} className="key-point-display">
            <div className="key-point-badge">
              <span className="key-point-icon">{getKeyPointIcon(kp.label)}</span>
              <span className="key-point-label">상담사의 {kp.label || '핵심 포인트'}</span>
            </div>
            <div className="key-point-content">{kp.content}</div>
            {isAdminPreview && (
              <div className="key-point-actions">
                <button
                  className="btn-key-point-action"
                  onClick={() => openEditKeyPointModal(chapterKey, kp)}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  className="btn-key-point-action btn-delete"
                  onClick={() => handleDeleteKeyPoint(chapterKey, kp.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* 관리자 모드: 핵심포인트 추가 버튼 */}
        {isAdminPreview && (
          <div
            className="add-key-point-trigger"
            onClick={() => openAddKeyPointModal(chapterKey, chapterKeyPoints.length)}
          >
            <div className="add-key-point-line"></div>
            <button className="btn-add-key-point">
              <MessageSquarePlus size={14} />
              <span>텍스트 추가</span>
            </button>
            <div className="add-key-point-line"></div>
          </div>
        )}
      </div>
    );
  };

  const getChapterContent = (num) => {
    if (!reportData?.chapters) return null;
    const chapterKey = `chapter${num}`;
    return reportData.chapters[chapterKey]?.content;
  };

  // 대운 데이터에서 천간 분석 텍스트 추출 (여러 소스 체크)
  const getSkyAnalysis = (decade) => {
    // 1. 직접 sky_analysis 필드
    if (decade.sky_analysis) return decade.sky_analysis;
    // 2. ai_sky_gyeokguk 필드
    if (decade.ai_sky_gyeokguk) return decade.ai_sky_gyeokguk;
    // 3. interpretations 내 gyeokguk_sky
    const gyeokgukSky = decade.interpretations?.gyeokguk_sky;
    if (gyeokgukSky?.effective_interpretation) return gyeokgukSky.effective_interpretation;
    if (gyeokgukSky?.default_interpretation) return gyeokgukSky.default_interpretation;
    // 4. interpretations 내 gyeokguk (통합)
    const gyeokguk = decade.interpretations?.gyeokguk;
    if (gyeokguk?.effective_interpretation) {
      // 통합 해석에서 천간 부분 추출 시도
      const parts = gyeokguk.effective_interpretation.split('\n\n');
      if (parts.length >= 1) return parts[0];
    }
    return null;
  };

  // 대운 데이터에서 지지 분석 텍스트 추출 (여러 소스 체크)
  const getEarthAnalysis = (decade) => {
    // 1. 직접 earth_analysis 필드
    if (decade.earth_analysis) return decade.earth_analysis;
    // 2. ai_earth_gyeokguk 필드
    if (decade.ai_earth_gyeokguk) return decade.ai_earth_gyeokguk;
    // 3. interpretations 내 gyeokguk_earth
    const gyeokgukEarth = decade.interpretations?.gyeokguk_earth;
    if (gyeokgukEarth?.effective_interpretation) return gyeokgukEarth.effective_interpretation;
    if (gyeokgukEarth?.default_interpretation) return gyeokgukEarth.default_interpretation;
    // 4. interpretations 내 gyeokguk (통합)
    const gyeokguk = decade.interpretations?.gyeokguk;
    if (gyeokguk?.effective_interpretation) {
      // 통합 해석에서 지지 부분 추출 시도
      const parts = gyeokguk.effective_interpretation.split('\n\n');
      if (parts.length >= 2) return parts[1];
    }
    return null;
  };

  // 대운 데이터에서 억부 분석 텍스트 추출
  const getEokbuAnalysis = (decade) => {
    if (decade.ai_eokbu) return decade.ai_eokbu;
    const eokbu = decade.interpretations?.eokbu;
    if (eokbu?.effective_interpretation) return eokbu.effective_interpretation;
    if (eokbu?.default_interpretation) return eokbu.default_interpretation;
    return null;
  };

  // 대운 데이터에서 조후 분석 텍스트 추출
  const getJohuAnalysis = (decade) => {
    if (decade.ai_johu) return decade.ai_johu;
    const johu = decade.interpretations?.johu;
    if (johu?.effective_interpretation) return johu.effective_interpretation;
    if (johu?.default_interpretation) return johu.default_interpretation;
    return null;
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
    // 연애운 (챕터 7) - love_fortune에서 연도별 데이터 추출
    if (chapterNum === 7 && reportData.love_fortune) {
      const loveData = reportData.love_fortune;
      const cachedYears = loveData.cached_analysis?.years || [];

      // yearlyLoveFortunes는 배열 형태
      const yearlyArray = loveData.yearlyLoveFortunes;

      if (Array.isArray(yearlyArray) && yearlyArray.length > 0) {
        // 배열 형태: [{year: 2026, generated_content: "...", ...}, ...]
        return yearlyArray
          .filter(item => item && item.year && item.year >= 2000)
          .map((item) => {
            // cached_analysis에서 해당 연도의 추가 데이터 찾기
            const cachedYear = cachedYears.find(c => c && c.year === item.year);
            return [String(item.year), { ...(cachedYear || {}), ...item }];
          })
          .sort((a, b) => a[1].year - b[1].year);
      }

      // 객체 형태 (연도가 키인 경우): { "2026": {...}, "2027": {...} }
      if (typeof loveData === 'object' && !Array.isArray(loveData)) {
        const yearEntries = Object.entries(loveData)
          .filter(([key, value]) => {
            const yearNum = parseInt(key);
            return value && typeof value === 'object' &&
                   !isNaN(yearNum) &&
                   yearNum >= 2000 &&
                   key !== 'cached_analysis' &&
                   key !== 'yearlyLoveFortunes' &&
                   key !== 'baseAnalysis';
          })
          .map(([year, data]) => {
            const cachedYear = cachedYears.find(c => c && String(c.year) === String(year));
            const yearNum = parseInt(year);
            return [year, { ...(cachedYear || {}), ...data, year: yearNum }];
          })
          .sort((a, b) => a[1].year - b[1].year);

        if (yearEntries.length > 0) {
          return yearEntries;
        }
      }

      // fallback: cached_analysis.years만 있는 경우
      if (cachedYears.length > 0 && cachedYears[0]?.year >= 2000) {
        return cachedYears
          .filter(item => item && item.year && item.year >= 2000)
          .map((item) => [String(item.year), { ...item }])
          .sort((a, b) => a[1].year - b[1].year);
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

    // 챕터별 페이지 상태 및 setter
    const getPageState = () => {
      if (chapterNum === 5) return [currentFortuneYearPage, setCurrentFortuneYearPage];
      if (chapterNum === 6) return [currentCareerYearPage, setCurrentCareerYearPage];
      if (chapterNum === 7) return [currentLoveYearPage, setCurrentLoveYearPage];
      return [1, () => {}];
    };

    const [currentPage, setCurrentPage] = getPageState();
    const totalYears = yearsData?.length || 0;

    // 페이지 네비게이션
    const goToPrevYear = () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const goToNextYear = () => {
      if (currentPage < totalYears) {
        setCurrentPage(currentPage + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const goToYear = (idx) => {
      setCurrentPage(idx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 현재 선택된 연도 (1-indexed → 0-indexed)
    const yearIdx = currentPage - 1;
    const currentYearEntry = yearsData?.[yearIdx];

    if (!currentYearEntry && !baseFortune) {
      return <p className="no-content">연도 데이터가 없습니다.</p>;
    }

    const [yearKey, yearData] = currentYearEntry || ['', {}];
    const year = yearData.year ?? (parseInt(yearKey) || yearKey);
    const content = yearData.generated_content || yearData.content;
    const ganji = yearData.ganji || yearData.year_ganji;
    const decade = yearData.decade;

    // 챕터 타이틀
    const chapterTitles = { 5: '재물운', 6: '직업운/사회운', 7: '연애운/배우자운' };

    return (
      <div className="yearly-fortune-container">
        {/* 상단 연도 요약 테이블 */}
        {yearsData && yearsData.length > 0 && (
          <div className="year-summary-section">
            <div className="year-summary-table-wrapper">
              <table className="year-summary-table">
                <thead>
                  <tr>
                    {yearsData.map(([key, data], idx) => {
                      const y = data.year ?? (parseInt(key) || key);
                      const isCurrent = idx === 0;
                      const isSelected = idx === yearIdx;
                      return (
                        <th
                          key={idx}
                          className={`${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''} clickable`}
                          onClick={() => goToYear(idx)}
                          ref={isSelected ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) : null}
                        >
                          {y}년
                          {isCurrent && <span className="current-label">올해</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* ganji 데이터가 하나라도 있는 경우에만 표시 */}
                  {yearsData.some(([, data]) => data.ganji || data.year_ganji) && (
                    <tr>
                      {yearsData.map(([key, data], idx) => {
                        const g = data.ganji || data.year_ganji || '';
                        const sky = g?.charAt?.(0) || '';
                        const earth = g?.charAt?.(1) || '';
                        return (
                          <td
                            key={idx}
                            className={`ganji-cell ${idx === 0 ? 'current' : ''} ${idx === yearIdx ? 'selected' : ''} clickable`}
                            onClick={() => goToYear(idx)}
                          >
                            <div className="ganji-row">
                              <span className={`ganji-char ${getElementClass(sky)}`}>{sky}</span>
                              <span className={`ganji-char ${getElementClass(earth)}`}>{earth}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {/* 연도별 운세 등급 표시 행 */}
                  <tr className="yearly-rating-row">
                    {yearsData.map(([key, data], idx) => {
                      const ratingInfo = getYearlyRatingInfo(data);
                      return (
                        <td
                          key={idx}
                          className={`yearly-rating-cell ${ratingInfo.className} ${idx === 0 ? 'current' : ''} ${idx === yearIdx ? 'selected' : ''} clickable`}
                          onClick={() => goToYear(idx)}
                        >
                          <span className="yearly-rating-icon">{ratingInfo.icon}</span>
                          <span className="yearly-rating-text">{ratingInfo.shortText}</span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 기본 설명 (재물운/직업운) - 첫 페이지에만 표시 */}
        {baseFortune && currentPage === 1 && (
          <div className="base-fortune-intro">
            <h3 className="base-fortune-title">
              {chapterNum === 5 ? '사주의 전반적 재물운' : chapterNum === 6 ? '사주의 전반적 직업운' : '기본 운세'}
            </h3>
            {/* 기본 운세 설명 앞 텍스트 추가 영역 */}
            {renderKeyPointsSection(`chapter${chapterNum}_base_fortune_top`)}
            {renderContent(baseFortune)}
            {/* 기본 운세 설명 뒤 텍스트 추가 영역 */}
            {renderKeyPointsSection(`chapter${chapterNum}_base_fortune_end`)}
          </div>
        )}

        {/* 선택된 연도 상세 */}
        {currentYearEntry && (() => {
          const yearRatingInfo = getYearlyRatingInfo(yearData);
          return (
            <>
              {/* 연도별 핵심포인트 섹션 */}
              {renderKeyPointsSection(`chapter${chapterNum}_year_${year}`)}
              <div className={`year-fortune-card ${yearRatingInfo.className}`}>
                <div className="year-fortune-header">
                  <div className="year-info">
                    <span className="year-number">{year}년</span>
                    {ganji && <span className={`year-ganji ${getElementClass(ganji?.charAt?.(0))}`}>{ganji}</span>}
                  </div>
                  {decade && (
                    <span className="decade-text">{decade.ganji} 대운</span>
                  )}
                  {/* 연도별 운세 등급 배지 */}
                  <span className={`yearly-rating-badge ${yearRatingInfo.className}`}>
                    <span className="badge-icon">{yearRatingInfo.icon}</span>
                    <span className="badge-text">{yearRatingInfo.text}</span>
                  </span>
                </div>
                {/* 긍정적 메시지 */}
                {yearRatingInfo.message && (
                  <div className={`yearly-rating-message ${yearRatingInfo.className}`}>
                    {yearRatingInfo.message}
                  </div>
                )}
                <div className="year-fortune-content">
                  {content ? renderContent(content) : <p className="no-content">내용 없음</p>}
                </div>
                {/* 연도별 핵심포인트 섹션 (글 끝) */}
                {renderKeyPointsSection(`chapter${chapterNum}_year_${year}_end`)}
              </div>
            </>
          );
        })()}

        {/* 연도 네비게이션 */}
        {totalYears > 1 && (
          <div className="year-page-navigation">
            <button
              className={`year-nav-btn prev ${currentPage <= 1 ? 'disabled' : ''}`}
              onClick={goToPrevYear}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="year-page-info">
              {currentPage} / {totalYears}
            </div>
            <button
              className={`year-nav-btn next ${currentPage >= totalYears ? 'disabled' : ''}`}
              onClick={goToNextYear}
              disabled={currentPage >= totalYears}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // 결과값을 안전하게 문자열로 변환 (객체인 경우 처리)
  const safeResultString = (result, fallback = '-') => {
    if (!result) return fallback;
    if (typeof result === 'string') return result;
    if (typeof result === 'object') return fallback;
    return String(result);
  };

  // 대운 흐름 결과 클래스
  const getDecadeResultClass = (result) => {
    if (!result) return 'none';
    if (typeof result !== 'string') return 'neutral';
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

    // 0.5. 연애운/5년운세 manager_edit.fortune_level 필드 확인
    if (decade.manager_edit?.fortune_level) {
      const level = decade.manager_edit.fortune_level;
      if (level === 'very_good') return 'excellent';
      if (level === 'good') return 'good';
      if (level === 'normal') return 'neutral';
      if (level === 'caution') return 'caution';
      if (level === 'difficult') return 'difficult';
    }

    // 0.6. 재물운 manager_edit.sky/earth.fortune_level 필드 확인
    if (decade.manager_edit?.sky?.fortune_level || decade.manager_edit?.earth?.fortune_level) {
      const skyLevel = decade.manager_edit?.sky?.fortune_level;
      const earthLevel = decade.manager_edit?.earth?.fortune_level;

      // sky와 earth 점수 합산으로 전체 등급 계산
      const levelToScore = (level) => {
        if (level === 'very_good') return 2;
        if (level === 'good') return 1;
        if (level === 'normal') return 0;
        if (level === 'caution') return -1;
        if (level === 'difficult') return -2;
        return 0;
      };

      const totalScore = levelToScore(skyLevel) + levelToScore(earthLevel);
      if (totalScore >= 3) return 'excellent';
      if (totalScore >= 1) return 'good';
      if (totalScore >= -1) return 'neutral';
      if (totalScore >= -3) return 'caution';
      return 'difficult';
    }

    // 1. result 문자열로 판정
    const isGood = (result) => {
      if (!result || typeof result !== 'string') return false;
      return result === '成' || result === '성' ||
             result.includes('敗中有成') || result.includes('패중유성');
    };
    const isBad = (result) => {
      if (!result || typeof result !== 'string') return false;
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

  // 연도별 운세 등급 표시 (재물운/직업운/연애운용) - 긍정적이고 부드러운 표현
  const getYearlyRatingInfo = (yearData) => {
    const rating = getOverallRating(yearData);
    switch (rating) {
      case 'excellent':
        return {
          rating: 'excellent',
          icon: '🌟',
          shortText: '최고',
          text: '최고의 해',
          message: '이 해는 큰 성과와 기회가 찾아오는 특별히 좋은 시기입니다!',
          className: 'yearly-rating-excellent'
        };
      case 'good':
        return {
          rating: 'good',
          icon: '✨',
          shortText: '좋음',
          text: '좋은 해',
          message: '긍정적인 흐름이 예상되는 좋은 시기입니다.',
          className: 'yearly-rating-good'
        };
      case 'neutral':
        return {
          rating: 'neutral',
          icon: '○',
          shortText: '평탄',
          text: '안정적인 해',
          message: '안정적인 흐름 속에서 차근차근 준비하기 좋은 시기입니다.',
          className: 'yearly-rating-neutral'
        };
      case 'caution':
        return {
          rating: 'caution',
          icon: '💪',
          shortText: '도전',
          text: '도전의 해',
          message: '신중한 판단과 준비가 더 좋은 결과로 이어지는 시기입니다.',
          className: 'yearly-rating-caution'
        };
      case 'difficult':
        return {
          rating: 'difficult',
          icon: '🌱',
          shortText: '성장',
          text: '성장의 해',
          message: '내면의 성장과 기초를 다지는 소중한 시기입니다. 인내가 미래의 열매가 됩니다.',
          className: 'yearly-rating-difficult'
        };
      default:
        return {
          rating: 'neutral',
          icon: '○',
          shortText: '―',
          text: '―',
          message: '',
          className: 'yearly-rating-neutral'
        };
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
    if (result && typeof result === 'string') {
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

  // 챕터 4 대운 흐름 렌더링 - 페이지별 분리
  const renderDecadeFlow = () => {
    const decadeFlow = reportData?.chapter4_decade_flow;
    const content = getChapterContent(4);

    if (!decadeFlow && !content) {
      return <p className="no-content">아직 생성된 내용이 없습니다.</p>;
    }

    if (!decadeFlow || decadeFlow.length === 0) {
      return content ? renderContent(content) : <p className="no-content">아직 생성된 내용이 없습니다.</p>;
    }

    const totalDecades = decadeFlow.length;

    // 대운 페이지 네비게이션 (1부터 시작)
    const goToPrevDecade = () => {
      if (currentDecadePage > 1) {
        setCurrentDecadePage(currentDecadePage - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const goToNextDecade = () => {
      if (currentDecadePage < totalDecades) {
        setCurrentDecadePage(currentDecadePage + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const goToDecade = (idx) => {
      setCurrentDecadePage(idx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 현재 선택된 대운 (1-indexed → 0-indexed)
    const decadeIdx = currentDecadePage - 1;
    const decade = decadeFlow[decadeIdx];

    if (!decade) {
      return <p className="no-content">대운 데이터가 없습니다.</p>;
    }

    return (
      <div className="decade-flow-preview">
        {/* 상단 요약 테이블 */}
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
                  {decadeFlow.map((d, idx) => {
                    const isSelected = idx === decadeIdx;
                    return (
                      <th
                        key={idx}
                        className={`${d.is_current ? 'current' : ''} ${isSelected ? 'selected' : ''} clickable`}
                        onClick={() => goToDecade(idx)}
                        ref={isSelected ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) : null}
                      >
                        {d.start_age}~{d.end_age}
                        {d.is_current && <span className="current-label">현재대운</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="row-label">대운</td>
                  {decadeFlow.map((d, idx) => (
                    <td
                      key={idx}
                      className={`ganji-cell ${d.is_current ? 'current' : ''} ${idx === decadeIdx ? 'selected' : ''} clickable`}
                      onClick={() => goToDecade(idx)}
                    >
                      <span className={getElementClass(d.sky)}>{d.sky}</span>
                      <span className={getElementClass(d.earth)}>{d.earth}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="row-label">천간</td>
                  {decadeFlow.map((d, idx) => (
                    <td key={idx} className={`result-cell sky ${getDecadeResultClass(d.sky_result)} ${d.is_current ? 'current' : ''} ${idx === decadeIdx ? 'selected' : ''} clickable`} onClick={() => goToDecade(idx)}>
                      <span className={`cell-char ${getElementClass(d.sky)}`}>{d.sky}</span>
                      <span className="cell-result">{safeResultString(d.sky_result)}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="row-label">지지</td>
                  {decadeFlow.map((d, idx) => (
                    <td key={idx} className={`result-cell earth ${getDecadeResultClass(d.earth_result)} ${d.is_current ? 'current' : ''} ${idx === decadeIdx ? 'selected' : ''} clickable`} onClick={() => goToDecade(idx)}>
                      <span className={`cell-char ${getElementClass(d.earth)}`}>{d.earth}</span>
                      <span className="cell-result">{safeResultString(d.earth_result)}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="row-label">억부</td>
                  {decadeFlow.map((d, idx) => {
                    const strength = d.strength || d.eokbu;
                    const level = strength?.decade_level || strength?.level;
                    const trend = strength?.trend; // 'improving', 'worsening', 'stable'
                    const levelLabels = { 'very_weak': '극신약', 'weak': '신약', 'slightly_weak': '약', 'balanced': '중화', 'strong': '신강', 'very_strong': '극신강' };
                    const label = d.eokbu_display || levelLabels[level] || '-';
                    // 트렌드 기반 셀 클래스 (중화 방향이면 좋음)
                    const cellClass = trend === 'improving' || level === 'balanced' ? 'improving' :
                                      trend === 'worsening' ? 'worsening' : 'stable';
                    return (
                      <td key={idx} className={`result-cell eokbu ${cellClass} ${d.is_current ? 'current' : ''} ${idx === decadeIdx ? 'selected' : ''} clickable`} onClick={() => goToDecade(idx)}>
                        <span className="cell-result">{label}</span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="row-label">조후</td>
                  {decadeFlow.map((d, idx) => {
                    const temp = d.temperature || d.johu;
                    const level = temp?.decade_level || temp?.level;
                    const tempActual = temp?.decade_actual_temp || temp?.actual_temp || d.temp_actual;
                    const levelLabels = { 'very_cold': '극한', 'cold': '추움', 'moderate': '적당', 'optimal': '적당', 'hot': '더움', 'very_hot': '극열' };
                    const label = levelLabels[level] || '-';
                    const display = d.johu_display || (tempActual !== undefined ? `${tempActual}°` : label);
                    const cellClass = (level === 'moderate' || level === 'optimal') ? 'optimal' : (level?.includes('hot') ? 'hot' : 'cold');
                    return (
                      <td key={idx} className={`result-cell johu ${cellClass} ${d.is_current ? 'current' : ''} ${idx === decadeIdx ? 'selected' : ''} clickable`} onClick={() => goToDecade(idx)}>
                        <span className="cell-result">{display}</span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 선택된 대운 상세 */}
        {/* 대운별 핵심포인트 섹션 */}
        {renderKeyPointsSection(`chapter4_decade_${decadeIdx}`)}
        <div className={`decade-item ${getOverallRatingClass(decade)}`}>
          <div className="decade-card-header">
            <span className="decade-age">{decade.start_age}~{decade.end_age}세</span>
            <span className="decade-ganji">
              <span className={getElementClass(decade.sky)}>{decade.sky}</span>
              <span className={getElementClass(decade.earth)}>{decade.earth}</span>
              <span className="decade-suffix">대운</span>
            </span>
            {decade.is_current && <span className="current-badge">현재</span>}

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

            <div className="decade-eokbu-johu">
              {(() => {
                const strength = decade.strength || decade.eokbu;
                const level = strength?.decade_level || strength?.level;
                const trend = strength?.trend; // 'improving', 'worsening', 'stable'
                const trendLabel = strength?.trend_label; // '좋아짐', '나빠짐', '유지'
                const levelLabels = {
                  'very_weak': '극신약', 'weak': '신약', 'slightly_weak': '다소 신약',
                  'balanced': '중화', 'strong': '신강', 'very_strong': '극신강'
                };
                const label = decade.eokbu_display || levelLabels[level] || level;
                if (!label) return null;
                // 트렌드 기반 배지 클래스 (중화 방향이면 좋음)
                const badgeClass = trend === 'improving' || level === 'balanced' ? 'improving' :
                                   trend === 'worsening' ? 'worsening' : 'stable';
                const displayLabel = level === 'balanced' ? label :
                                     trendLabel ? `${label} (${trendLabel})` : label;
                return (
                  <span className={`eokbu-badge ${badgeClass}`}>
                    ⚖️ {displayLabel}
                  </span>
                );
              })()}
              {(() => {
                const temp = decade.temperature || decade.johu;
                const level = temp?.decade_level || temp?.level;
                const trend = temp?.trend; // 'improving', 'worsening', 'stable'
                const trendLabel = temp?.trend_label; // '좋아짐', '나빠짐', '유지'
                const tempActual = temp?.decade_actual_temp || temp?.actual_temp || decade.temp_actual;
                const levelLabels = {
                  'very_cold': '매우 추움', 'cold': '추움', 'moderate': '적당함',
                  'optimal': '적당함', 'hot': '더움', 'very_hot': '매우 더움'
                };
                const label = levelLabels[level] || level;
                if (!label && !decade.johu_display) return null;
                // 트렌드 기반 배지 클래스 (적당함 방향이면 좋음)
                const isOptimal = level === 'moderate' || level === 'optimal';
                const badgeClass = trend === 'improving' || isOptimal ? 'optimal' :
                                   trend === 'worsening' ? 'cold' :
                                   (level?.includes('hot') ? 'hot' : 'cold');
                const baseDisplay = decade.johu_display || (tempActual !== undefined ? `${label} (${tempActual}°C)` : label);
                const displayLabel = isOptimal ? baseDisplay :
                                     trendLabel ? `${baseDisplay} (${trendLabel})` : baseDisplay;
                return (
                  <span className={`johu-badge ${badgeClass}`}>
                    🌡️ {displayLabel}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="decade-analysis-content">
            {decade.keywords && decade.keywords.length > 0 && (
              <div className="decade-keywords">
                {decade.keywords.map((keyword, kIdx) => (
                  <span key={kIdx} className="keyword-tag">{keyword}</span>
                ))}
              </div>
            )}

            {/* 격국 분석 */}
            {(() => {
              const skyAnalysisText = getSkyAnalysis(decade);
              const earthAnalysisText = getEarthAnalysis(decade);
              if (!skyAnalysisText && !earthAnalysisText) return null;
              return (
              <div className="analysis-area gyeokguk-area">
                <div className="area-section-header">
                  <span className="area-section-icon">🏛️</span>
                  <span className="area-section-title">격국(格局) 분석</span>
                  <span className="area-section-subtitle">사회적 성패(출세적 관점)</span>
                </div>
                <div className="area-section-content">
                  {skyAnalysisText && (
                    <div className="analysis-section sky-section">
                      <div className="analysis-header">
                        <span className={`analysis-icon ${getElementClass(decade.sky)}`}>{decade.sky}</span>
                        <span className="analysis-title">천간 격국 <small>(정신·의지·계획)</small></span>
                        <span className={`result-badge ${getSingleRating(decade.sky_result, decade.sky_score, decade.sky_degree).class}`}>
                          {getSingleRating(decade.sky_result, decade.sky_score, decade.sky_degree).icon} {safeResultString(decade.sky_result, '')}
                        </span>
                      </div>
                      <div className="analysis-body">
                        {renderContent(skyAnalysisText)}
                      </div>
                    </div>
                  )}
                  {earthAnalysisText && (
                    <div className="analysis-section earth-section">
                      <div className="analysis-header">
                        <span className={`analysis-icon ${getElementClass(decade.earth)}`}>{decade.earth}</span>
                        <span className="analysis-title">지지 격국 <small>(현실·환경·실행)</small></span>
                        <span className={`result-badge ${getSingleRating(decade.earth_result, decade.earth_score, decade.earth_degree).class}`}>
                          {getSingleRating(decade.earth_result, decade.earth_score, decade.earth_degree).icon} {safeResultString(decade.earth_result, '')}
                        </span>
                      </div>
                      {(decade.keywords?.length > 0 || decade.samhap) && (
                        <div className="analysis-keywords">
                          {decade.samhap && (
                            <span className="keyword-tag samhap-keyword">#{decade.samhap.type}</span>
                          )}
                          {decade.keywords?.map((keyword, kIdx) => (
                            <span key={kIdx} className="keyword-tag">{keyword.startsWith('#') ? keyword : `#${keyword}`}</span>
                          ))}
                        </div>
                      )}
                      <div className="analysis-body">
                        {renderContent(earthAnalysisText)}
                      </div>
                    </div>
                  )}
                  {decade.samhap && (
                    <div className="analysis-section samhap-section">
                      <div className="samhap-badge">
                        <span className="samhap-icon">🔗</span>
                        <span className="samhap-type">{decade.samhap.type}</span>
                        <span className="samhap-name">{decade.samhap.name}</span>
                      </div>
                      <div className="samhap-description">
                        {decade.samhap.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

            {/* 억부 분석 */}
            {(() => {
              const strength = decade.strength || decade.eokbu;
              const level = strength?.decade_level || strength?.level;
              const score = strength?.decade_score || strength?.score;
              const baseScore = strength?.base_score;
              const trend = strength?.trend;
              const trendLabel = strength?.trend_label;
              const isImproving = strength?.is_improving;
              const eokbuInterp = decade.interpretations?.eokbu;
              const analysis = eokbuInterp?.effective_interpretation || eokbuInterp?.default_interpretation || decade.ai_eokbu || strength?.analysis;
              const levelLabels = {
                'very_weak': '극신약', 'weak': '신약', 'slightly_weak': '다소 신약',
                'balanced': '중화', 'strong': '신강', 'very_strong': '극신강'
              };
              const label = decade.eokbu_display || levelLabels[level] || level;
              // 트렌드 기반 배지 클래스
              const badgeClass = trend === 'improving' || level === 'balanced' ? 'improving' :
                                 trend === 'worsening' ? 'worsening' : 'stable';

              if (!label && !analysis) return null;

              // 트렌드 기반 기본 분석 메시지
              const getDefaultAnalysis = () => {
                if (level === 'balanced') {
                  return '중화 상태로, 균형 잡힌 에너지 흐름을 나타냅니다.';
                } else if (trend === 'improving') {
                  return `${label} 상태이나 원국 대비 중화 방향으로 개선되어 긍정적인 시기입니다.`;
                } else if (trend === 'worsening') {
                  return `${label} 상태로 원국 대비 중화에서 멀어져 주의가 필요한 시기입니다.`;
                } else {
                  return `${label} 상태가 유지되는 안정적인 시기입니다.`;
                }
              };

              return (
                <div className="analysis-area eokbu-area">
                  <div className="area-section-header">
                    <span className="area-section-icon">⚖️</span>
                    <span className="area-section-title">억부(抑扶) 분석</span>
                    <span className="area-section-subtitle">건강, 행복적 관점</span>
                  </div>
                  <div className="area-section-content">
                    <div className="analysis-section eokbu-section">
                      <div className="analysis-header">
                        <span className={`eokbu-status-badge ${badgeClass}`}>
                          {label} {trendLabel && level !== 'balanced' && `(${trendLabel})`}
                        </span>
                        {baseScore !== undefined && score !== undefined && (
                          <span className="score-change">
                            원국 {baseScore}점 → {score}점
                          </span>
                        )}
                      </div>
                      <div className="analysis-body">
                        {analysis ? renderContent(analysis) : (
                          <p className="no-analysis-note">{getDefaultAnalysis()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 조후 분석 */}
            {(() => {
              const temp = decade.temperature || decade.johu;
              const level = temp?.decade_level || temp?.level;
              const tempActual = temp?.decade_actual_temp || temp?.actual_temp || decade.temp_actual;
              const johuInterp = decade.interpretations?.johu;
              const analysis = johuInterp?.effective_interpretation || johuInterp?.default_interpretation || decade.ai_johu || temp?.analysis;
              const levelLabels = {
                'very_cold': '매우 추움', 'cold': '추움', 'moderate': '적당함',
                'optimal': '적당함', 'hot': '더움', 'very_hot': '매우 더움'
              };
              const label = levelLabels[level] || level;
              const display = decade.johu_display || (tempActual !== undefined ? `${label} (${tempActual}°C)` : label);
              const badgeClass = (level === 'moderate' || level === 'optimal') ? 'optimal' : (level?.includes('hot') ? 'hot' : 'cold');

              if (!label && !analysis && !decade.johu_display) return null;

              return (
                <div className="analysis-area johu-area">
                  <div className="area-section-header">
                    <span className="area-section-icon">🌡️</span>
                    <span className="area-section-title">조후(調候) 분석</span>
                    <span className="area-section-subtitle">건강, 행복적 관점</span>
                  </div>
                  <div className="area-section-content">
                    <div className="analysis-section johu-section">
                      <div className="analysis-header">
                        <span className={`johu-status-badge ${badgeClass}`}>
                          {display}
                        </span>
                      </div>
                      <div className="analysis-body">
                        {analysis ? renderContent(analysis) : (
                          <p className="no-analysis-note">
                            {(level === 'moderate' || level === 'optimal')
                              ? '온도가 적당하여 조화로운 에너지 흐름을 나타냅니다.'
                              : level?.includes('hot')
                                ? '기운이 뜨거운 시기입니다. 차분함과 냉정함이 필요합니다.'
                                : '기운이 추운 시기입니다. 따뜻함과 활력이 필요합니다.'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 인생 영역별 조언 */}
            {decade.life_areas && Object.keys(decade.life_areas).length > 0 && (
              <div className="analysis-area life-areas-area">
                <div className="area-section-header">
                  <span className="area-section-icon">🎯</span>
                  <span className="area-section-title">인생 영역별 조언</span>
                  <span className="area-section-subtitle">분야별 실천 가이드</span>
                </div>
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

            {decade.ai_description && !getSkyAnalysis(decade) && (
              <div className="decade-desc-body legacy">
                {renderContent(decade.ai_description)}
              </div>
            )}

            {!getSkyAnalysis(decade) && !getEarthAnalysis(decade) && !decade.ai_description && (!decade.keywords || decade.keywords.length === 0) && (
              <div className="decade-no-content">
                <p>AI 분석을 생성해주세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* 대운 내부 네비게이션 */}
        <div className="decade-page-navigation">
          <button
            className={`decade-nav-btn prev ${currentDecadePage <= 1 ? 'disabled' : ''}`}
            onClick={goToPrevDecade}
            disabled={currentDecadePage <= 1}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="decade-page-info">
            {currentDecadePage} / {totalDecades}
          </div>
          <button
            className={`decade-nav-btn next ${currentDecadePage >= totalDecades ? 'disabled' : ''}`}
            onClick={goToNextDecade}
            disabled={currentDecadePage >= totalDecades}
          >
            <ChevronRight size={20} />
          </button>
        </div>
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
                          <span className="cell-result">{safeResultString(yearData.sky_result)}</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="row-label">지지</td>
                      {yearlyFortuneFlow.map((yearData, idx) => (
                        <td key={idx} className={`result-cell earth ${getDecadeResultClass(yearData.earth_result)} ${yearData.is_current ? 'current' : ''}`}>
                          <span className={`cell-char ${getElementClass(yearData.earth)}`}>{yearData.earth}</span>
                          <span className="cell-result">{safeResultString(yearData.earth_result)}</span>
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

  // 챕터 5 - 향후 N년의 운세 (격국, 천간, 지지운 기반)
  const renderFiveYearFortune = () => {
    const yearlyFortune = reportData?.yearly_fortune;
    const content = getChapterContent(5);

    if (!yearlyFortune && !content) {
      return <p className="no-content">아직 생성된 내용이 없습니다.</p>;
    }

    // yearly_fortune 데이터가 있는 경우
    if (yearlyFortune && Array.isArray(yearlyFortune) && yearlyFortune.length > 0) {
      const totalYears = yearlyFortune.length;

      // 연도별 페이지 네비게이션
      const goToPrevYear = () => {
        if (currentFiveYearPage > 1) {
          setCurrentFiveYearPage(currentFiveYearPage - 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };

      const goToNextYear = () => {
        if (currentFiveYearPage < totalYears) {
          setCurrentFiveYearPage(currentFiveYearPage + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };

      const goToYear = (idx) => {
        setCurrentFiveYearPage(idx + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      // 현재 선택된 연도 (1-indexed → 0-indexed)
      const yearIdx = currentFiveYearPage - 1;
      const yearData = yearlyFortune[yearIdx];

      if (!yearData) {
        return <p className="no-content">연도 데이터가 없습니다.</p>;
      }

      return (
        <div className="five-year-fortune-preview">
          <div className="fortune-header">
            <h5>향후 {yearCount}년 운세 흐름</h5>
            <p className="fortune-desc">격국·천간·지지운을 기반으로 한 연도별 종합 분석</p>
          </div>

          {/* 상단 연도 요약 테이블 */}
          <div className="year-summary-section">
            <div className="year-summary-table-wrapper">
              <table className="year-summary-table">
                <thead>
                  <tr>
                    {yearlyFortune.map((y, idx) => {
                      const isSelected = idx === yearIdx;
                      return (
                        <th
                          key={idx}
                          className={`${y.is_current ? 'current' : ''} ${isSelected ? 'selected' : ''} clickable`}
                          onClick={() => goToYear(idx)}
                          ref={isSelected ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) : null}
                        >
                          {y.year}년
                          {y.is_current && <span className="current-label">올해</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {yearlyFortune.map((y, idx) => {
                      const sajuData = reportData?.saju_data;
                      const rawDayGan = sajuData?.cheongan?.day || sajuData?.day?.sky || '';
                      const dayGan = hangulToHanja(rawDayGan);
                      const skyHanja = hangulToHanja(y.sky || '');
                      const earthHanja = hangulToHanja(y.earth || '');
                      const skySipsin = y.sky_sipsin || getSipsung(dayGan, skyHanja, false);
                      const earthSipsin = y.earth_sipsin || getSipsung(dayGan, earthHanja, true);
                      return (
                        <td
                          key={idx}
                          className={`ganji-cell ${y.is_current ? 'current' : ''} ${idx === yearIdx ? 'selected' : ''} clickable`}
                          onClick={() => goToYear(idx)}
                        >
                          <div className="ganji-row">
                            <span className={`ganji-char ${getElementClass(y.sky)}`}>{y.sky}</span>
                            <span className={`ganji-char ${getElementClass(y.earth)}`}>{y.earth}</span>
                          </div>
                          <div className="sipsin-row">
                            <span className="sipsin-text">{skySipsin || '-'}</span>
                            <span className="sipsin-text">{earthSipsin || '-'}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 선택된 연도 상세 */}
          {/* 연도별 핵심포인트 섹션 */}
          {renderKeyPointsSection(`chapter5_year_${yearData.year}`)}
          <div className={`year-fortune-item ${yearData.is_current ? 'current' : ''}`}>
            <div className="year-fortune-header">
              <div className="year-info">
                <span className="year-number">{yearData.year}년</span>
                <span className={`year-ganji ${getElementClass(yearData.sky)}`}>{yearData.ganji}</span>
              </div>
            </div>

            {/* 핵심 분석 요소 */}
            <div className="fortune-analysis-grid">
              {(yearData.sky_outcome?.gyeokguk || yearData.sky_gyeokguk) && (
                <div className="analysis-item">
                  <span className="analysis-label">천간 격국</span>
                  <span className="analysis-value">{yearData.sky_outcome?.gyeokguk || yearData.sky_gyeokguk}</span>
                </div>
              )}
              {(yearData.earth_outcome?.gyeokguk || yearData.earth_gyeokguk) && (
                <div className="analysis-item">
                  <span className="analysis-label">지지 격국</span>
                  <span className="analysis-value">{yearData.earth_outcome?.gyeokguk || yearData.earth_gyeokguk}</span>
                </div>
              )}
              {(yearData.chungan || yearData.sky_outcome?.reason || yearData.sky_outcome?.result) && (
                <div className="analysis-item">
                  <span className="analysis-label">천간운</span>
                  <span className={`analysis-value ${getElementClass(yearData.sky)}`}>
                    {yearData.chungan || yearData.sky_outcome?.reason || yearData.sky_outcome?.result}
                  </span>
                </div>
              )}
              {(yearData.jiji || yearData.earth_outcome?.reason || yearData.earth_outcome?.result) && (
                <div className="analysis-item">
                  <span className="analysis-label">지지운</span>
                  <span className={`analysis-value ${getElementClass(yearData.earth)}`}>
                    {yearData.jiji || yearData.earth_outcome?.reason || yearData.earth_outcome?.result}
                  </span>
                </div>
              )}
              {(yearData.eokbu || yearData.strength?.analysis || yearData.strength?.decade_level) && (
                <div className="analysis-item">
                  <span className="analysis-label">억부</span>
                  <span className="analysis-value">{yearData.eokbu || yearData.strength?.analysis || yearData.strength?.decade_level}</span>
                </div>
              )}
              {(yearData.johu_text || yearData.temperature?.description || yearData.johu?.analysis || yearData.temperature?.decade_label) && (
                <div className="analysis-item">
                  <span className="analysis-label">조후</span>
                  <span className="analysis-value">{yearData.johu_text || yearData.temperature?.description || yearData.johu?.analysis || yearData.temperature?.decade_label}</span>
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

          {/* 연도 내부 네비게이션 */}
          <div className="year-page-navigation">
            <button
              className={`year-nav-btn prev ${currentFiveYearPage <= 1 ? 'disabled' : ''}`}
              onClick={goToPrevYear}
              disabled={currentFiveYearPage <= 1}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="year-page-info">
              {currentFiveYearPage} / {totalYears}
            </div>
            <button
              className={`year-nav-btn next ${currentFiveYearPage >= totalYears ? 'disabled' : ''}`}
              onClick={goToNextYear}
              disabled={currentFiveYearPage >= totalYears}
            >
              <ChevronRight size={20} />
            </button>
          </div>
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

  // 한글 → 한자 변환
  const hangulToHanja = (char) => {
    const map = {
      // 천간
      '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
      '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸',
      // 지지
      '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
      '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥'
    };
    return map[char] || char;
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

  // 십이신살 계산 (일지 기준)
  const getSibiSinsal = (dayEarth, targetEarth) => {
    if (!dayEarth || !targetEarth) return '';

    const sinsalTable = {
      '申': { '子': '장성살', '丑': '반안살', '寅': '역마살', '卯': '육해살', '辰': '화개살', '巳': '겁살', '午': '재살', '未': '천살', '申': '지살', '酉': '도화살', '戌': '월살', '亥': '망신살' },
      '子': { '子': '장성살', '丑': '반안살', '寅': '역마살', '卯': '육해살', '辰': '화개살', '巳': '겁살', '午': '재살', '未': '천살', '申': '지살', '酉': '도화살', '戌': '월살', '亥': '망신살' },
      '辰': { '子': '장성살', '丑': '반안살', '寅': '역마살', '卯': '육해살', '辰': '화개살', '巳': '겁살', '午': '재살', '未': '천살', '申': '지살', '酉': '도화살', '戌': '월살', '亥': '망신살' },
      '寅': { '午': '장성살', '未': '반안살', '申': '역마살', '酉': '육해살', '戌': '화개살', '亥': '겁살', '子': '재살', '丑': '천살', '寅': '지살', '卯': '도화살', '辰': '월살', '巳': '망신살' },
      '午': { '午': '장성살', '未': '반안살', '申': '역마살', '酉': '육해살', '戌': '화개살', '亥': '겁살', '子': '재살', '丑': '천살', '寅': '지살', '卯': '도화살', '辰': '월살', '巳': '망신살' },
      '戌': { '午': '장성살', '未': '반안살', '申': '역마살', '酉': '육해살', '戌': '화개살', '亥': '겁살', '子': '재살', '丑': '천살', '寅': '지살', '卯': '도화살', '辰': '월살', '巳': '망신살' },
      '巳': { '酉': '장성살', '戌': '반안살', '亥': '역마살', '子': '육해살', '丑': '화개살', '寅': '겁살', '卯': '재살', '辰': '천살', '巳': '지살', '午': '도화살', '未': '월살', '申': '망신살' },
      '酉': { '酉': '장성살', '戌': '반안살', '亥': '역마살', '子': '육해살', '丑': '화개살', '寅': '겁살', '卯': '재살', '辰': '천살', '巳': '지살', '午': '도화살', '未': '월살', '申': '망신살' },
      '丑': { '酉': '장성살', '戌': '반안살', '亥': '역마살', '子': '육해살', '丑': '화개살', '寅': '겁살', '卯': '재살', '辰': '천살', '巳': '지살', '午': '도화살', '未': '월살', '申': '망신살' },
      '亥': { '卯': '장성살', '辰': '반안살', '巳': '역마살', '午': '육해살', '未': '화개살', '申': '겁살', '酉': '재살', '戌': '천살', '亥': '지살', '子': '도화살', '丑': '월살', '寅': '망신살' },
      '卯': { '卯': '장성살', '辰': '반안살', '巳': '역마살', '午': '육해살', '未': '화개살', '申': '겁살', '酉': '재살', '戌': '천살', '亥': '지살', '子': '도화살', '丑': '월살', '寅': '망신살' },
      '未': { '卯': '장성살', '辰': '반안살', '巳': '역마살', '午': '육해살', '未': '화개살', '申': '겁살', '酉': '재살', '戌': '천살', '亥': '지살', '子': '도화살', '丑': '월살', '寅': '망신살' }
    };

    return sinsalTable[dayEarth]?.[targetEarth] || '';
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

        {/* 사주팔자 상단 핵심포인트 */}
        {renderKeyPointsSection('chapter1_saju_chart')}
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
                const dayEarth = getEarth('day'); // 일지

                // 프론트엔드에서 직접 계산
                const skySipsung = key === 'day' ? '일간' : getSipsung(dayGan, sky, false);
                const earthSipsung = getSipsung(dayGan, earth, true);
                const sibiUnsung = getSibiUnsung(dayGan, earth);
                const sibiSinsal = getSibiSinsal(dayEarth, earth);

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
                        <div className="char-sinsal-row">
                          <span className="char-sinsal">{sibiSinsal || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* 격국 정보 - 백엔드에서 가져옴 */}
        {(() => {
          const gejuData = sajuData?.geju;
          const skyType = gejuData?.sky_type;
          const earthType = gejuData?.earth_type;
          const skyReason = gejuData?.sky_reason || gejuData?.primary?.reason;
          const earthReason = gejuData?.earth_reason;

          if (!skyType && !earthType) return null;

          return (
            <>
            {/* 격국 분석 상단 핵심포인트 */}
            {renderKeyPointsSection('chapter1_geju')}
            <div className="geju-section-preview">
              <h4 className="geju-title">격국 분석</h4>
              <div className="geju-grid-preview">
                <div className="geju-item-preview">
                  <span className="geju-label-preview">천간격국</span>
                  <span className="geju-value-preview">{skyType || '미정'}</span>
                </div>
                <div className="geju-item-preview">
                  <span className="geju-label-preview">지지격국</span>
                  <span className="geju-value-preview">{earthType || '미정'}</span>
                </div>
              </div>
              {(skyReason || earthReason) && (
                <div className="geju-reasons-preview">
                  {skyReason && (
                    <div className="geju-reason-preview">
                      <span className="reason-label-preview">천간격국 판단 근거</span>
                      <p className="reason-text-preview">{skyReason}</p>
                    </div>
                  )}
                  {earthReason && (
                    <div className="geju-reason-preview">
                      <span className="reason-label-preview">지지격국 판단 근거</span>
                      <p className="reason-text-preview">{earthReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* 격국 분석 하단 핵심포인트 */}
            {renderKeyPointsSection('chapter1_geju_end')}
            </>
          );
        })()}

        {/* 앱 연동 코드 - 웹에서 구매한 경우에만 표시 */}
        {order.claim_code && order.origin !== 'blueprint_app' && (
          <div className="claim-code-section">
            <div className="claim-code-header">
              <span className="claim-code-icon">📱</span>
              <span className="claim-code-title">앱 연동 코드</span>
            </div>
            <div className="claim-code-box">
              <span className="claim-code-value">{order.claim_code}</span>
              <button
                className="claim-code-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(order.claim_code);
                  alert('연동 코드가 복사되었습니다!');
                }}
              >
                복사
              </button>
            </div>
            <p className="claim-code-description">
              만세력 앱에서 이 코드를 입력하면 리포트를 앱에서도 볼 수 있습니다.
            </p>
          </div>
        )}
      </div>
    );
  };

  // 챕터 내용 렌더링
  const renderChapterContent = () => {
    const num = currentChapter;
    const chapterKey = `chapter${num}`;

    // 챕터 2, 3은 텍스트 콘텐츠 - 문단 사이에 핵심포인트 삽입 가능
    if (num === 2 || num === 3) {
      return renderContentWithKeyPoints(getChapterContent(num), chapterKey);
    }

    // 나머지 챕터들은 복잡한 구조 - 상단에 핵심포인트 섹션 추가
    let content;

    // 챕터 1은 사주정보
    if (num === 1) {
      content = renderSajuInfo();
    }
    // 챕터 4는 대운 흐름
    else if (num === 4) {
      content = renderDecadeFlow();
    }
    // 챕터 5는 향후 5년의 운세
    else if (num === 5) {
      content = renderFiveYearFortune();
    }
    // 챕터 9는 코칭
    else if (num === 9) {
      content = renderCoaching();
    }
    // 챕터 10: Q&A가 있으면 Q&A, 없으면 부록
    else if (num === 10) {
      content = hasQA ? renderQAChapter() : renderAppendix();
    }
    // 챕터 11: 부록 (Q&A가 있을 때만)
    else if (num === 11) {
      content = renderAppendix();
    }
    // 챕터 6, 7, 8은 연도별 데이터 (재물운, 직업운, 연애운)
    else {
      content = renderYearlyContent(num - 1);
    }

    // 복잡한 구조의 챕터에 핵심포인트 섹션 추가 (상단)
    return (
      <>
        {renderKeyPointsSection(chapterKey)}
        {content}
      </>
    );
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

  // Chapter 10 Q&A 렌더링
  const renderQAChapter = () => {
    if (!qaStatus?.has_question) {
      return (
        <div className="no-content">
          <p>질문이 없습니다.</p>
        </div>
      );
    }

    return (
      <div className="qa-chapter-content">
        <div className="qa-chapter-question">
          <div className="qa-chapter-label">질문</div>
          <div className="qa-chapter-text">{qaStatus.question?.content}</div>
          <div className="qa-chapter-meta">
            {qaStatus.question?.submitted_at && (
              <span>
                제출일: {new Date(qaStatus.question.submitted_at).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
        </div>

        {qaStatus.status === 'answered' && qaStatus.answer ? (
          <div className="qa-chapter-answer">
            <div className="qa-chapter-label">상담사 답변</div>
            <div className="qa-chapter-text">
              {qaStatus.answer.content?.split('\n').map((paragraph, idx) => (
                paragraph.trim() && <p key={idx}>{paragraph}</p>
              ))}
            </div>
            <div className="qa-chapter-meta">
              {qaStatus.answer.answered_by && (
                <span>답변: {qaStatus.answer.answered_by}</span>
              )}
              {qaStatus.answer.answered_at && (
                <span>
                  답변일: {new Date(qaStatus.answer.answered_at).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="qa-chapter-pending">
            <div className="qa-pending-icon">⏳</div>
            <p>상담사가 답변을 준비 중입니다.</p>
            <p className="qa-pending-note">답변이 완료되면 이메일로 알려드립니다.</p>
          </div>
        )}
      </div>
    );
  };

  // 부록 렌더링 (공유하기 + 리뷰 + 질문 폼)
  const renderAppendix = () => {
    return (
      <div className="appendix-content">
        {/* 공유하기 섹션 */}
        <div className="appendix-share-section">
          <h3>리포트가 마음에 드셨나요?</h3>
          <p>친구나 가족에게도 공유해 보세요!</p>
          <button className="btn-share-report" onClick={handleShare}>
            <Share2 size={18} />
            리포트 공유하기
          </button>
        </div>

        {/* 리뷰 섹션 */}
        {!isAdminPreview && (
          <div className="appendix-review-section">
            {reviewStatus?.has_review || reviewSuccess ? (
              <div className="appendix-review-submitted">
                <div className="review-success-icon">✨</div>
                <h3>소중한 리뷰 감사합니다!</h3>
                <p>더 좋은 서비스로 보답하겠습니다.</p>
              </div>
            ) : (
              <div className="appendix-review-form">
                <h3>📝 리뷰를 남겨주세요</h3>
                <p className="review-description">여러분의 소중한 후기가 더 좋은 서비스를 만드는 데 큰 힘이 됩니다.</p>

                <div className="review-rating-options">
                  {reviewRatingOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`review-rating-btn ${reviewRating === option.value ? 'active' : ''}`}
                      onClick={() => setReviewRating(option.value)}
                      disabled={reviewSubmitting}
                    >
                      <span className="rating-emoji">{option.emoji}</span>
                      <span className="rating-label">{option.label}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  className="review-textarea"
                  placeholder="리포트에 대한 솔직한 후기를 남겨주세요..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  disabled={reviewSubmitting}
                />

                {reviewError && (
                  <div className="review-error">{reviewError}</div>
                )}

                <button
                  className="btn-submit-review"
                  onClick={submitReview}
                  disabled={reviewSubmitting || !reviewText.trim()}
                >
                  {reviewSubmitting ? (
                    <>
                      <Loader size={18} className="spinning" />
                      제출 중...
                    </>
                  ) : (
                    '리뷰 제출하기'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 질문 섹션 */}
        {!isAdminPreview && (
          <div className="appendix-question-section">
            {qaStatus?.has_question ? (
              <div className="appendix-question-submitted">
                <h3>질문이 제출되었습니다</h3>
                {qaStatus.status === 'answered' ? (
                  <p>답변이 완료되었습니다. <button className="link-btn" onClick={() => setCurrentChapter(10)}>질문과 답변 보기</button></p>
                ) : (
                  <p>상담사가 답변을 준비 중입니다. 답변이 완료되면 이메일로 알려드립니다.</p>
                )}
              </div>
            ) : (
              <div className="appendix-question-form">
                <h3>상담사에게 질문하기</h3>
                <p className="question-limit-notice">리포트에 대해 궁금한 점이 있으시면 1회 질문하실 수 있습니다.</p>

                <textarea
                  className="question-textarea"
                  placeholder="질문을 입력해주세요..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={4}
                  disabled={questionSubmitting}
                />

                <input
                  type="email"
                  className="question-email-input"
                  placeholder="답변 받을 이메일 주소 (선택)"
                  value={questionEmail}
                  onChange={(e) => setQuestionEmail(e.target.value)}
                  disabled={questionSubmitting}
                />

                {questionError && (
                  <div className="question-error">{questionError}</div>
                )}

                <button
                  className="btn-submit-question"
                  onClick={submitQuestion}
                  disabled={questionSubmitting || !questionText.trim()}
                >
                  {questionSubmitting ? (
                    <>
                      <Loader size={18} className="spinning" />
                      제출 중...
                    </>
                  ) : (
                    <>
                      <MessageSquarePlus size={18} />
                      질문 제출하기
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const goToPrevChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter(currentChapter - 1);
      setShowChapterImage(true); // 챕터 전환 시 이미지 먼저 보여줌
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextChapter = () => {
    if (currentChapter < totalChapters) {
      setCurrentChapter(currentChapter + 1);
      setShowChapterImage(true); // 챕터 전환 시 이미지 먼저 보여줌
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 현재 챕터의 연도별 페이지 상태 및 setter 가져오기
  const getChapterPageState = () => {
    // Chapter 4: 대운흐름 - decade pages
    if (currentChapter === 4) {
      const decadeCount = reportData?.chapter4_decade_flow?.length || 1;
      return [currentDecadePage, setCurrentDecadePage, decadeCount];
    }
    // Chapter 5: 5년운세 - yearly fortune pages
    if (currentChapter === 5) {
      const fiveYearCount = reportData?.yearly_fortune?.length || yearCount;
      return [currentFiveYearPage, setCurrentFiveYearPage, fiveYearCount];
    }
    // Chapter 6: 재물운 - fortune year pages
    if (currentChapter === 6) {
      return [currentFortuneYearPage, setCurrentFortuneYearPage, yearCount];
    }
    // Chapter 7: 직업운 - career year pages
    if (currentChapter === 7) {
      return [currentCareerYearPage, setCurrentCareerYearPage, yearCount];
    }
    // Chapter 8: 연애운 - love year pages
    if (currentChapter === 8) {
      return [currentLoveYearPage, setCurrentLoveYearPage, yearCount];
    }
    // Other chapters have no pages
    return [1, null, 1];
  };

  // 다음 페이지로 이동 (페이지 → 챕터 순)
  const goToNextPage = () => {
    // 1. 매니저 인사말 화면이면 → 챕터 커버로
    if (showManagerGreeting && currentChapter === 1) {
      setShowManagerGreeting(false);
      setShowChapterImage(true);
      return;
    }

    // 2. 챕터 커버 화면이면 → 챕터 콘텐츠로
    if (showChapterImage) {
      setShowChapterImage(false);
      return;
    }

    // 3. 페이지가 있는 챕터 (4:대운흐름, 5:5년운세, 6:재물운, 7:직업운, 8:연애운)
    const [currentPage, setCurrentPage, maxPages] = getChapterPageState();
    if (setCurrentPage && currentPage < maxPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 4. 다음 챕터로
    if (currentChapter < totalChapters) {
      const nextChapter = currentChapter + 1;
      setCurrentChapter(nextChapter);
      setShowChapterImage(true);
      // 다음 챕터의 페이지를 1로 리셋
      if (nextChapter === 4) setCurrentDecadePage(1);
      else if (nextChapter === 5) setCurrentFiveYearPage(1);
      else if (nextChapter === 6) setCurrentFortuneYearPage(1);
      else if (nextChapter === 7) setCurrentCareerYearPage(1);
      else if (nextChapter === 8) setCurrentLoveYearPage(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 이전 페이지로 이동 (페이지 → 챕터 순)
  const goToPrevPage = () => {
    // 1. 연도별 페이지가 있는 챕터에서 2페이지 이상이면 → 이전 페이지로
    const [currentPage, setCurrentPage] = getChapterPageState();
    if (setCurrentPage && currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. 챕터 콘텐츠 1페이지면 → 현재 챕터 커버로
    if (!showChapterImage && !showManagerGreeting) {
      setShowChapterImage(true);
      return;
    }

    // 3. 챕터 커버면 → 이전 챕터 마지막 페이지로
    if (showChapterImage && currentChapter > 1) {
      const prevChapter = currentChapter - 1;
      setCurrentChapter(prevChapter);
      setShowChapterImage(false);
      // 이전 챕터의 마지막 페이지로 설정
      if (prevChapter === 4) {
        const decadeCount = reportData?.chapter4_decade_flow?.length || 1;
        setCurrentDecadePage(decadeCount);
      } else if (prevChapter === 5) {
        const fiveYearCount = reportData?.yearly_fortune?.length || yearCount;
        setCurrentFiveYearPage(fiveYearCount);
      } else if (prevChapter === 6) {
        setCurrentFortuneYearPage(yearCount);
      } else if (prevChapter === 7) {
        setCurrentCareerYearPage(yearCount);
      } else if (prevChapter === 8) {
        setCurrentLoveYearPage(yearCount);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 4. 첫 챕터 커버에서 매니저 인사말로
    if (showChapterImage && currentChapter === 1 && reportData?.order?.manager) {
      setShowChapterImage(false);
      setShowManagerGreeting(true);
    }
  };

  // 스와이프 핸들러
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // 최소 스와이프 거리

    if (Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // 왼쪽으로 스와이프 → 다음 페이지
        goToNextPage();
      } else {
        // 오른쪽으로 스와이프 → 이전 페이지
        goToPrevPage();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const selectChapter = (num) => {
    setCurrentChapter(num);
    setShowChapterDropdown(false);
    setShowChapterImage(true); // 챕터 전환 시 이미지 먼저 보여줌
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
              <span className="report-title">{reportData?.order?.origin === 'blueprint_app' ? '만세력 설명서' : '포춘톨치'}</span>
              <ChevronDown size={18} className={`title-chevron ${showChapterDropdown ? 'open' : ''}`} />
            </button>

            {showChapterDropdown && (
              <div className="chapter-dropdown">
                {/* 상담사가 전하는 말 - 매니저 인사말 */}
                <button
                  className={`chapter-dropdown-item ${showManagerGreeting && currentChapter === 1 ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentChapter(1);
                    setShowManagerGreeting(true);
                    setShowChapterDropdown(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span className="dropdown-icon">✦</span>
                  <span className="dropdown-text">
                    <span className="dropdown-title">상담사가 전하는 말</span>
                  </span>
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    className={`chapter-dropdown-item ${currentChapter === num && !showManagerGreeting ? 'active' : ''}`}
                    onClick={() => selectChapter(num)}
                  >
                    <span className="dropdown-number">{num}</span>
                    <span className="dropdown-text">
                      <span className="dropdown-title">{chapterInfo[num].title}</span>
                    </span>
                  </button>
                ))}
                {/* Q&A 챕터 - 질문이 있으면 표시 */}
                {hasQA && (
                  <button
                    className={`chapter-dropdown-item ${currentChapter === 10 ? 'active' : ''}`}
                    onClick={() => selectChapter(10)}
                  >
                    <span className="dropdown-number">10</span>
                    <span className="dropdown-text">
                      <span className="dropdown-title">{chapterInfo[10].title}</span>
                    </span>
                  </button>
                )}
                {/* 부록 - 항상 표시 */}
                <button
                  className={`chapter-dropdown-item ${currentChapter === (hasQA ? 11 : 10) ? 'active' : ''}`}
                  onClick={() => selectChapter(hasQA ? 11 : 10)}
                >
                  <span className="dropdown-number">{hasQA ? 11 : 10}</span>
                  <span className="dropdown-text">
                    <span className="dropdown-title">부록</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            className={`header-btn ${sharing ? 'loading' : ''}`}
            onClick={handleShare}
            title="공유하기"
            disabled={sharing}
          >
            {sharing ? <Loader size={22} className="spinning" /> : <Share2 size={22} />}
          </button>
        </header>

        {/* Chapter Content */}
        <div
          className="chapter-display"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {showManagerGreeting && currentChapter === 1 && reportData?.order?.manager ? (
            <div className="manager-greeting-overlay" onClick={() => {
              setShowManagerGreeting(false);
              setShowChapterImage(true);
            }}>
              <div className="manager-greeting-content">
                <div className="manager-greeting-badge">
                  {reportData.order.manager.is_default
                    ? (reportData.order.origin === 'blueprint_app' ? '만세력 설명서' : '포춘톨치')
                    : 'Your Counselor'}
                </div>
                <div className="manager-greeting-role">
                  {reportData.order.manager.is_default
                    ? (reportData.order.origin === 'blueprint_app' ? '만세력 설명서 상담사가 전하는 말' : '포춘톨치 상담사가 전하는 말')
                    : '담당 상담사가 전하는 말'}
                </div>
                <h2 className="manager-greeting-name">{reportData.order.manager.display_name}</h2>
                {reportData.order.manager.message && (
                  <p className="manager-greeting-message">"{reportData.order.manager.message}"</p>
                )}
              </div>
            </div>
          ) : showChapterImage && currentChapter >= 1 && currentChapter <= 9 ? (
            <div className="chapter-image-overlay" onClick={() => setShowChapterImage(false)}>
              <img
                src={`/img/chapter${currentChapter}.png`}
                alt={`Chapter ${currentChapter}`}
                className="chapter-intro-image"
              />
              <div className="chapter-image-text">
                <span className="chapter-label">Chapter {currentChapter}</span>
                <h2 className="chapter-title-overlay">{chapterInfo[currentChapter].title}</h2>
              </div>
            </div>
          ) : (
            <>
              <div className="chapter-title-bar">
                <div className="chapter-title-info">
                  <span className="chapter-number">Chapter {currentChapter}</span>
                  <h2 className="chapter-title">{getChapterTitle(currentChapter)}</h2>
                </div>
              </div>
              <div className="chapter-content">
                {renderChapterContent()}
              </div>
            </>
          )}

          {/* 스와이프 힌트 - 좌우 페이지 네비게이션 */}
          {!(showManagerGreeting && currentChapter === 1) && (
            <div className="swipe-hint swipe-hint-left" onClick={goToPrevPage}>
              <ChevronLeft size={22} />
            </div>
          )}
          {(() => {
            // 마지막 챕터의 마지막 페이지가 아니면 오른쪽 힌트 표시
            const [currentPage, , maxPages] = getChapterPageState();
            const hasMorePages = currentPage < maxPages;
            const canGoNext = currentChapter < totalChapters || showChapterImage || showManagerGreeting || hasMorePages;
            return canGoNext ? (
              <div className="swipe-hint swipe-hint-right" onClick={goToNextPage}>
                <ChevronRight size={22} />
              </div>
            ) : null;
          })()}
        </div>

        {/* Chapter Pagination (Bottom) */}
        <div className="chapter-pagination">
          <button
            className="chapter-page-arrow"
            onClick={goToPrevChapter}
            disabled={currentChapter === 1}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="chapter-page-numbers">
            {(() => {
              let start = Math.max(1, currentChapter - 2);
              let end = Math.min(totalChapters, start + 4);
              if (end - start < 4) {
                start = Math.max(1, end - 4);
              }
              const pages = [];
              for (let i = start; i <= end; i++) {
                pages.push(
                  <button
                    key={i}
                    className={`chapter-page-num ${currentChapter === i ? 'active' : ''}`}
                    onClick={() => selectChapter(i)}
                  >
                    {i}
                  </button>
                );
              }
              return pages;
            })()}
          </div>
          <button
            className="chapter-page-arrow"
            onClick={goToNextChapter}
            disabled={currentChapter === totalChapters}
          >
            <ChevronRight size={20} />
          </button>
        </div>

      </div>

      {/* 핵심포인트 편집 모달 */}
      {keyPointModalOpen && (
        <div className="key-point-modal-overlay" onClick={closeKeyPointModal}>
          <div className="key-point-modal" onClick={e => e.stopPropagation()}>
            <div className="key-point-modal-header">
              <h3>
                <span className="modal-icon">💡</span>
                {editingKeyPoint ? '텍스트 수정' : '텍스트 추가'}
              </h3>
              <button className="btn-close" onClick={closeKeyPointModal}>
                <X size={20} />
              </button>
            </div>
            <div className="key-point-modal-body">
              <div className="key-point-label-selector">
                <span className="label-selector-title">유형 선택</span>
                <div className="label-options">
                  {keyPointLabelOptions.map(option => (
                    <button
                      key={option.value}
                      className={`label-option ${keyPointLabel === option.value ? 'selected' : ''}`}
                      onClick={() => setKeyPointLabel(option.value)}
                      type="button"
                    >
                      <span className="label-option-icon">{option.icon}</span>
                      <span className="label-option-text">상담사의 {option.value}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="key-point-hint">
                고객에게 전달하고 싶은 메시지나 조언을 작성해주세요.
              </p>
              <textarea
                value={keyPointContent}
                onChange={e => setKeyPointContent(e.target.value)}
                placeholder="예: 이 시기에는 특히 건강 관리에 신경 쓰시는 것이 좋습니다..."
                rows={4}
                autoFocus
              />
            </div>
            <div className="key-point-modal-footer">
              <button className="btn-cancel" onClick={closeKeyPointModal}>
                취소
              </button>
              <button
                className="btn-save"
                onClick={editingKeyPoint ? handleUpdateKeyPoint : handleAddKeyPoint}
                disabled={!keyPointContent.trim() || keyPointSaving}
              >
                {keyPointSaving ? '저장 중...' : (editingKeyPoint ? '수정' : '추가')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportPreview;
