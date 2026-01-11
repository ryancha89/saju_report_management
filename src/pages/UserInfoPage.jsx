import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Loader, CheckCircle } from 'lucide-react';
import { KOREAN_CITIES, findCityByName, calculateTimeAdjustment } from '../lib/koreanCities';
import { getTrackingForAPI, initTracking } from '../lib/tracking';
import './UserInfoPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

const STEPS = [
  { id: 'name', label: '이름을 알려주세요', placeholder: '이름을 입력해주세요' },
  { id: 'birthDate', label: '생일을 알려주세요', placeholder: '' },
  { id: 'birthTime', label: '태어난 시간을 알려주세요', placeholder: '' },
  { id: 'birthPlace', label: '태어난 곳을 알려주세요', placeholder: '도시를 검색해주세요' },
  { id: 'gender', label: '성별을 알려주세요', placeholder: '' },
  { id: 'email', label: '리포트를 받을 이메일을 알려주세요', placeholder: '이메일을 입력해주세요' },
];

function UserInfoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const nameTimeoutRef = useRef(null);
  const isTransitioning = useRef(false);

  // URL에서 product 파라미터 가져오기
  const productId = new URLSearchParams(location.search).get('product') || 'life_journey';

  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthDateDisplay: '', // 화면 표시용 (2000.01.01)
    birthTime: '',
    birthTimeUnknown: false,
    birthPlace: '',
    birthLat: null,
    birthLon: null,
    timeAdjustment: null,
    timeAdjustMinutes: null,
    gender: '',
    email: '',
    calendarType: 'solar', // solar, lunar, lunarLeap
  });

  // 페이지 진입 시 추적 데이터 초기화 (직접 접근 시)
  useEffect(() => {
    initTracking();
  }, []);

  // 배경색 및 스크롤 설정 (스크롤 시 흰색 방지 + 오버스크롤 방지)
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalHeight = document.body.style.height;

    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.height = originalHeight;
      document.body.style.width = '';
    };
  }, []);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (nameTimeoutRef.current) {
        clearTimeout(nameTimeoutRef.current);
      }
    };
  }, []);

  // 도시 검색 필터
  const filteredCities = useMemo(() => {
    if (!citySearch) return KOREAN_CITIES.slice(0, 10);
    return KOREAN_CITIES.filter(city =>
      city.name.toLowerCase().includes(citySearch.toLowerCase())
    ).slice(0, 10);
  }, [citySearch]);

  // 도시 선택 시 시간 조정 계산
  useEffect(() => {
    if (formData.birthPlace && formData.birthDate) {
      const city = findCityByName(formData.birthPlace);
      if (city) {
        const adjustment = calculateTimeAdjustment(formData.birthDate, city.lon);
        setFormData(prev => ({
          ...prev,
          birthLat: city.lat,
          birthLon: city.lon,
          timeAdjustment: adjustment.timeAdjustment,
          timeAdjustMinutes: adjustment.minutes,
        }));
      }
    }
  }, [formData.birthPlace, formData.birthDate]);

  const handleCitySelect = (city) => {
    setFormData(prev => ({ ...prev, birthPlace: city.name }));
    setCitySearch(city.name);
    setShowCityDropdown(false);
    // 도시 선택 시 자동으로 다음
    autoNext();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.name.trim().length > 0;
      case 1: return formData.birthDate.length === 10;
      case 2: return formData.birthTimeUnknown || formData.birthTime.length === 5;
      case 3: return formData.birthPlace.length > 0;
      case 4: return formData.gender.length > 0;
      case 5: return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      default: return false;
    }
  };

  // 자동으로 다음 단계로 이동
  const autoNext = (skipBirthPlace = false) => {
    // 이미 전환 중이면 무시
    if (isTransitioning.current) return;

    if (currentStep < STEPS.length - 1) {
      isTransitioning.current = true;
      setTimeout(() => {
        setCurrentStep(prev => {
          // 시간 모름 선택 시 태어난 곳(step 3) 건너뛰기
          if (skipBirthPlace && prev === 2) {
            return 4; // step 3을 건너뛰고 step 4(성별)로
          }
          return prev + 1;
        });
        // 전환 완료 후 플래그 해제
        setTimeout(() => {
          isTransitioning.current = false;
        }, 100);
      }, 300);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // 시간 모름 상태에서 뒤로가기 시 step 3 건너뛰기
      if (currentStep === 4 && formData.birthTimeUnknown) {
        setCurrentStep(2);
      } else {
        setCurrentStep(currentStep - 1);
      }
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const [year, month, day] = formData.birthDate.split('-').map(Number);
      let hour = null;
      let minute = null;

      if (!formData.birthTimeUnknown && formData.birthTime) {
        [hour, minute] = formData.birthTime.split(':').map(Number);
      }

      // 추적 데이터 가져오기
      const trackingData = getTrackingForAPI();

      const orderData = {
        // 상품 정보
        product_id: productId,
        // 고객 정보
        name: formData.name,
        email: formData.email,
        // 사주 정보
        birth_year: year,
        birth_month: month,
        birth_day: day,
        gender: formData.gender,
        calendar_type: formData.calendarType,
        time_known: !formData.birthTimeUnknown,
        birth_hour: hour,
        birth_minute: minute,
        birth_place: formData.birthPlace || null,
        birth_lat: formData.birthLat,
        birth_lon: formData.birthLon,
        time_adjustment: formData.timeAdjustment,
        time_adjust_minutes: formData.timeAdjustMinutes,
        // 마케팅 추적 데이터
        tracking: trackingData,
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`,
        },
        body: JSON.stringify(orderData),
      });

      // 응답 텍스트 먼저 확인
      const responseText = await response.text();

      if (!responseText) {
        throw new Error('서버에서 빈 응답을 받았습니다.');
      }

      const result = JSON.parse(responseText);

      if (result.success) {
        // 주문 완료 화면 표시
        setIsOrderComplete(true);
      } else {
        const errorMsg = result.errors?.join(', ') || result.error || '주문 처리 중 오류가 발생했습니다.';
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert(error.message || '서버 연결에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // 이름
        return (
          <div className="input-group">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData({ ...formData, name: newName });

                // 기존 타이머 클리어
                if (nameTimeoutRef.current) {
                  clearTimeout(nameTimeoutRef.current);
                }

                // 입력 후 1.5초 동안 추가 입력 없으면 다음으로
                if (newName.trim().length > 0) {
                  nameTimeoutRef.current = setTimeout(() => {
                    autoNext();
                  }, 1500);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && formData.name.trim().length > 0) {
                  if (nameTimeoutRef.current) {
                    clearTimeout(nameTimeoutRef.current);
                  }
                  autoNext();
                }
              }}
              placeholder="이름을 입력해주세요"
              className="text-input"
              autoFocus
            />
          </div>
        );

      case 1: // 생년월일
        return (
          <div className="input-group">
            <div className="birthdate-input-row">
              <input
                type="text"
                inputMode="numeric"
                value={formData.birthDateDisplay || ''}
                onChange={(e) => {
                  // 숫자만 추출
                  const numbers = e.target.value.replace(/\D/g, '');

                  // 자동 포맷팅 (YYYY.MM.DD)
                  let formatted = '';
                  if (numbers.length <= 4) {
                    formatted = numbers;
                  } else if (numbers.length <= 6) {
                    formatted = `${numbers.slice(0, 4)}.${numbers.slice(4)}`;
                  } else {
                    formatted = `${numbers.slice(0, 4)}.${numbers.slice(4, 6)}.${numbers.slice(6, 8)}`;
                  }

                  // API용 형식 (YYYY-MM-DD)
                  let apiFormat = '';
                  if (numbers.length === 8) {
                    apiFormat = `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
                    // 8자리 입력 완료 시 자동으로 다음
                    setTimeout(() => autoNext(), 300);
                  }

                  setFormData({
                    ...formData,
                    birthDateDisplay: formatted,
                    birthDate: apiFormat
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.birthDate.length === 10) {
                    autoNext();
                  }
                }}
                placeholder="2000.01.01"
                className="text-input"
                maxLength={10}
                autoFocus
              />
              <div className="calendar-type-group">
                <button
                  type="button"
                  className={`calendar-btn ${formData.calendarType === 'solar' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, calendarType: 'solar' })}
                >
                  양력
                </button>
                <button
                  type="button"
                  className={`calendar-btn ${formData.calendarType === 'lunar' || formData.calendarType === 'lunarLeap' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, calendarType: 'lunar' })}
                >
                  음력
                </button>
                {(formData.calendarType === 'lunar' || formData.calendarType === 'lunarLeap') && (
                  <button
                    type="button"
                    className={`calendar-btn leap-btn ${formData.calendarType === 'lunarLeap' ? 'active' : ''}`}
                    onClick={() => setFormData({
                      ...formData,
                      calendarType: formData.calendarType === 'lunarLeap' ? 'lunar' : 'lunarLeap'
                    })}
                  >
                    윤달
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 2: // 태어난 시간
        return (
          <div className="input-group">
            <div className="time-input-row">
              <input
                type="text"
                inputMode="numeric"
                value={formData.birthTime}
                onChange={(e) => {
                  // 숫자만 추출
                  const numbers = e.target.value.replace(/\D/g, '');

                  // 자동 포맷팅 (HH:MM)
                  let formatted = '';
                  if (numbers.length <= 2) {
                    formatted = numbers;
                  } else {
                    formatted = `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
                  }

                  setFormData({ ...formData, birthTime: formatted });

                  // 4자리 입력 완료 시 자동으로 다음
                  if (numbers.length === 4) {
                    setTimeout(() => autoNext(), 300);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.birthTime.length === 5) {
                    autoNext();
                  }
                }}
                placeholder="15:30"
                className="text-input time-text-input"
                maxLength={5}
                disabled={formData.birthTimeUnknown}
                autoFocus
              />
              <button
                type="button"
                className={`time-unknown-btn ${formData.birthTimeUnknown ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !formData.birthTimeUnknown;
                  setFormData({
                    ...formData,
                    birthTimeUnknown: newValue,
                    birthTime: newValue ? '' : formData.birthTime,
                    // 시간 모름 선택 시 태어난 곳 정보 초기화
                    birthPlace: newValue ? '' : formData.birthPlace,
                    birthLat: newValue ? null : formData.birthLat,
                    birthLon: newValue ? null : formData.birthLon,
                    timeAdjustment: newValue ? null : formData.timeAdjustment,
                    timeAdjustMinutes: newValue ? null : formData.timeAdjustMinutes,
                  });
                  // "시간 모름" 클릭 시 태어난 곳 건너뛰고 성별로
                  if (newValue) {
                    autoNext(true);
                  }
                }}
              >
                시간모름
              </button>
            </div>
          </div>
        );

      case 3: // 태어난 곳
        return (
          <div className="input-group city-input-group">
            <input
              type="text"
              value={citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value);
                setShowCityDropdown(true);
                if (!e.target.value) {
                  setFormData({ ...formData, birthPlace: '' });
                }
              }}
              onFocus={() => setShowCityDropdown(true)}
              placeholder="도시를 검색해주세요"
              className="text-input"
              autoFocus
            />
            {showCityDropdown && (
              <div className="city-dropdown">
                {filteredCities.map((city) => (
                  <div
                    key={city.name}
                    className="city-option"
                    onClick={() => handleCitySelect(city)}
                  >
                    {city.name}
                  </div>
                ))}
              </div>
            )}
            {formData.timeAdjustment && (
              <div className="time-adjustment-info">
                시간 조정: {formData.timeAdjustment.replace('/', '분 ')}초
              </div>
            )}
          </div>
        );

      case 4: // 성별
        return (
          <div className="input-group gender-group">
            <button
              type="button"
              className={`gender-btn ${formData.gender === 'male' ? 'active' : ''}`}
              onClick={() => {
                setFormData({ ...formData, gender: 'male' });
                autoNext();
              }}
            >
              남성
            </button>
            <button
              type="button"
              className={`gender-btn ${formData.gender === 'female' ? 'active' : ''}`}
              onClick={() => {
                setFormData({ ...formData, gender: 'female' });
                autoNext();
              }}
            >
              여성
            </button>
          </div>
        );

      case 5: // 이메일
        return (
          <div className="input-group">
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                  handleSubmit();
                }
              }}
              placeholder="이메일을 입력해주세요"
              className="text-input"
              autoFocus
            />
          </div>
        );

      default:
        return null;
    }
  };

  // 주문 완료 화면
  if (isOrderComplete) {
    return (
      <div className="user-info-page">
        <div className="user-info-wrapper">
          {/* 배경 영상 */}
          <video
            className="background-video"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/img/2026_video_03.mp4" type="video/mp4" />
          </video>

          <div className="overlay" />

          <div className="order-complete-content">
            <div className="order-complete-icon">
              <CheckCircle size={80} />
            </div>
            <h2 className="order-complete-title">주문이 완료되었습니다</h2>
            <p className="order-complete-message">
              레포트 제작 후<br />
              이메일로 레포트가 발송될 예정입니다.
            </p>
            <p className="order-complete-wait">잠시만 기다려주세요</p>
            <div className="order-complete-email">
              <span>발송 이메일</span>
              <strong>{formData.email}</strong>
            </div>
            <button
              className="order-complete-home-btn"
              onClick={() => navigate('/')}
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-info-page">
      <div className="user-info-wrapper">
        {/* 배경 영상 */}
        <video
          className="background-video"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/img/2026_video_03.mp4" type="video/mp4" />
        </video>

        <div className="overlay" />

        {/* 헤더 */}
        <header className="user-info-header">
          <button className="back-btn" onClick={handleBack}>
            <ChevronLeft size={24} />
          </button>
          <div className="step-indicator">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>
          <div style={{ width: 24 }} />
        </header>

        {/* 메인 콘텐츠 */}
        <main className="user-info-content">
          <div className="step-label">{STEPS[currentStep].label}</div>

          {renderStepContent()}

          {/* 완료된 단계 표시 */}
          <div className="completed-steps">
            {currentStep > 0 && formData.name && (
              <div className="completed-item" onClick={() => setCurrentStep(0)}>
                <span className="label">이름</span>
                <span className="value">{formData.name}</span>
              </div>
            )}
            {currentStep > 1 && formData.birthDate && (
              <div className="completed-item" onClick={() => setCurrentStep(1)}>
                <span className="label">생년월일</span>
                <span className="value">
                  {formData.birthDate} ({formData.calendarType === 'solar' ? '양력' : formData.calendarType === 'lunar' ? '음력' : '음력윤달'})
                </span>
              </div>
            )}
            {currentStep > 2 && (
              <div className="completed-item" onClick={() => setCurrentStep(2)}>
                <span className="label">태어난 시간</span>
                <span className="value">
                  {formData.birthTimeUnknown ? '모름' : formData.birthTime}
                </span>
              </div>
            )}
            {currentStep > 3 && formData.birthPlace && (
              <div className="completed-item" onClick={() => setCurrentStep(3)}>
                <span className="label">태어난 곳</span>
                <span className="value">{formData.birthPlace}</span>
              </div>
            )}
            {currentStep > 4 && formData.gender && (
              <div className="completed-item" onClick={() => setCurrentStep(4)}>
                <span className="label">성별</span>
                <span className="value">{formData.gender === 'male' ? '남성' : '여성'}</span>
              </div>
            )}
          </div>
        </main>

        {/* 하단 버튼 - 마지막 단계에서만 표시 */}
        {currentStep === STEPS.length - 1 && (
          <footer className="user-info-footer">
            <button
              className="next-btn"
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader size={20} className="spinning" />
              ) : (
                '사주 분석하기'
              )}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

export default UserInfoPage;
