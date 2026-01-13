import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Loader, CheckCircle, Building2 } from 'lucide-react';
import { KOREAN_CITIES, findCityByName, calculateTimeAdjustment } from '../lib/koreanCities';
import { getTrackingForAPI, initTracking } from '../lib/tracking';
import Payment from '../components/Payment';
import './UserInfoPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// 상품 정보
const PRODUCT_INFO = {
  life_journey: { id: 'life_journey', name: '2026 인생여정 리포트', price: 39000 },
  new_year: { id: 'new_year', name: '2026 신년운세 리포트', price: 29000 },
  love: { id: 'love', name: '연애운 리포트', price: 29000 },
  wealth: { id: 'wealth', name: '재물운 리포트', price: 29000 },
  career: { id: 'career', name: '직업운 리포트', price: 29000 },
};

const STEPS = [
  { id: 'name', label: '이름을 알려주세요', placeholder: '이름을 입력해주세요' },
  { id: 'birthDate', label: '생일을 알려주세요', placeholder: '' },
  { id: 'birthTime', label: '태어난 시간을 알려주세요', placeholder: '' },
  { id: 'birthPlace', label: '태어난 곳을 알려주세요', placeholder: '도시를 검색해주세요' },
  { id: 'gender', label: '성별을 알려주세요', placeholder: '' },
  { id: 'email', label: '리포트를 받을 이메일을 알려주세요', placeholder: '이메일을 입력해주세요' },
  { id: 'phone', label: '연락처를 알려주세요', placeholder: '010-0000-0000' },
  { id: 'payment', label: '결제를 진행해주세요', placeholder: '' },
];

function UserInfoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0); // 가장 높이 진행한 단계
  const [isEditing, setIsEditing] = useState(false); // 이전 단계 수정 중인지
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [paymentResult, setPaymentResult] = useState(null); // 결제 결과 (vbank 정보 등)
  const nameTimeoutRef = useRef(null);
  const isTransitioning = useRef(false);

  // URL에서 product 파라미터 가져오기
  const productId = new URLSearchParams(location.search).get('product') || 'life_journey';
  const productInfo = PRODUCT_INFO[productId] || PRODUCT_INFO.life_journey;

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
    phone: '',
    phoneDisplay: '', // 화면 표시용 (010-0000-0000)
    calendarType: 'solar', // solar, lunar, lunarLeap
  });

  // 페이지 진입 시 추적 데이터 초기화 (직접 접근 시)
  useEffect(() => {
    initTracking();
  }, []);

  // 배경색 설정
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;

    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
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
    // 상태 업데이트 후 처리를 위해 setTimeout 사용
    setTimeout(() => {
      if (isEditing) {
        setCurrentStep(highestStep);
        setIsEditing(false);
      } else {
        autoNext();
      }
    }, 50);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.name.trim().length >= 3;
      case 1: return formData.birthDate.length === 10;
      case 2: return formData.birthTimeUnknown || formData.birthTime.length === 5;
      case 3: return formData.birthPlace.length > 0;
      case 4: return formData.gender.length > 0;
      case 5: return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      case 6: return formData.phone.replace(/\D/g, '').length >= 10; // 전화번호 10자리 이상
      case 7: return true; // 결제 단계 - Payment 컴포넌트에서 처리
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
          let nextStep;
          // 시간 모름 선택 시 태어난 곳(step 3) 건너뛰기
          if (skipBirthPlace && prev === 2) {
            nextStep = 4; // step 3을 건너뛰고 step 4(성별)로
          } else {
            nextStep = prev + 1;
          }
          // 최고 단계 업데이트
          setHighestStep(h => Math.max(h, nextStep));
          setIsEditing(false);
          return nextStep;
        });
        // 전환 완료 후 플래그 해제
        setTimeout(() => {
          isTransitioning.current = false;
        }, 100);
      }, 300);
    }
  };

  // 이전 단계로 돌아가서 수정 시작
  const goToStep = (step) => {
    if (nameTimeoutRef.current) {
      clearTimeout(nameTimeoutRef.current);
    }
    setCurrentStep(step);
    setIsEditing(step < highestStep);
  };

  // 수정 완료하고 가장 높은 단계로 돌아가기
  const finishEditing = () => {
    if (canProceed()) {
      setCurrentStep(highestStep);
      setIsEditing(false);
    }
  };

  // 다음 단계로 명시적 이동 (버튼 클릭 시)
  const goToNextStep = () => {
    if (canProceed()) {
      if (isEditing) {
        // 수정 중이면 최고 단계로 복귀
        finishEditing();
      } else {
        autoNext();
      }
    }
  };

  const handleBack = () => {
    if (nameTimeoutRef.current) {
      clearTimeout(nameTimeoutRef.current);
    }

    // 수정 중이면 최고 단계로 복귀
    if (isEditing) {
      setCurrentStep(highestStep);
      setIsEditing(false);
      return;
    }

    if (currentStep > 0) {
      let prevStep;
      // 시간 모름 상태에서 뒤로가기 시 step 3 건너뛰기
      if (currentStep === 4 && formData.birthTimeUnknown) {
        prevStep = 2;
      } else {
        prevStep = currentStep - 1;
      }
      setCurrentStep(prevStep);
      // 뒤로가면 highestStep도 현재 위치로 조정
      setHighestStep(prevStep);
    } else {
      navigate('/');
    }
  };

  // 결제 성공 핸들러
  const handlePaymentSuccess = (result) => {
    setPaymentResult(result);
    setIsOrderComplete(true);
  };

  // 결제 실패 핸들러
  const handlePaymentError = (errorMsg) => {
    console.error('Payment error:', errorMsg);
  };

  // Payment 컴포넌트에 전달할 사용자 정보
  const getUserInfoForPayment = () => {
    return {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      birthDate: formData.birthDate,
      birthTime: formData.birthTime,
      timeUnknown: formData.birthTimeUnknown,
      gender: formData.gender,
      calendarType: formData.calendarType,
      birthPlace: formData.birthPlace,
      birthLat: formData.birthLat,
      birthLon: formData.birthLon,
      timeAdjustment: formData.timeAdjustment,
      timeAdjustMinutes: formData.timeAdjustMinutes,
    };
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

                // 수정 중이 아닐 때만 자동 다음 이동
                // 3자 이상 입력 후 1.5초 동안 추가 입력 없으면 다음으로
                if (!isEditing && newName.trim().length >= 3) {
                  nameTimeoutRef.current = setTimeout(() => {
                    autoNext();
                  }, 1500);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && formData.name.trim().length >= 3) {
                  if (nameTimeoutRef.current) {
                    clearTimeout(nameTimeoutRef.current);
                  }
                  // 수정 중이면 완료, 아니면 다음으로
                  if (isEditing) {
                    finishEditing();
                  } else {
                    autoNext();
                  }
                }
              }}
              placeholder="이름을 입력해주세요"
              className="text-input"
              maxLength={5}
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
                    // 수정 중이 아닐 때만 8자리 입력 완료 시 자동으로 다음
                    if (!isEditing) {
                      setTimeout(() => autoNext(), 300);
                    }
                  }

                  setFormData({
                    ...formData,
                    birthDateDisplay: formatted,
                    birthDate: apiFormat
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.birthDate.length === 10) {
                    if (isEditing) {
                      finishEditing();
                    } else {
                      autoNext();
                    }
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

                  // 수정 중이 아닐 때만 4자리 입력 완료 시 자동으로 다음
                  if (!isEditing && numbers.length === 4) {
                    setTimeout(() => autoNext(), 300);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formData.birthTime.length === 5) {
                    if (isEditing) {
                      finishEditing();
                    } else {
                      autoNext();
                    }
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
                  // "시간 모름" 클릭 시 처리
                  if (newValue) {
                    setTimeout(() => {
                      if (isEditing) {
                        setCurrentStep(highestStep);
                        setIsEditing(false);
                      } else {
                        autoNext(true); // 태어난 곳 건너뛰고 성별로
                      }
                    }, 50);
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
                // 상태 업데이트 후 처리를 위해 setTimeout 사용
                setTimeout(() => {
                  if (isEditing) {
                    setCurrentStep(highestStep);
                    setIsEditing(false);
                  } else {
                    autoNext();
                  }
                }, 50);
              }}
            >
              남성
            </button>
            <button
              type="button"
              className={`gender-btn ${formData.gender === 'female' ? 'active' : ''}`}
              onClick={() => {
                setFormData({ ...formData, gender: 'female' });
                // 상태 업데이트 후 처리를 위해 setTimeout 사용
                setTimeout(() => {
                  if (isEditing) {
                    setCurrentStep(highestStep);
                    setIsEditing(false);
                  } else {
                    autoNext();
                  }
                }, 50);
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
              onChange={(e) => {
                const newEmail = e.target.value;
                setFormData({ ...formData, email: newEmail });

                // 기존 타이머 클리어
                if (nameTimeoutRef.current) {
                  clearTimeout(nameTimeoutRef.current);
                }

                // 수정 중이 아닐 때만 유효한 이메일 입력 후 0.8초 후 자동 이동
                if (!isEditing && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                  nameTimeoutRef.current = setTimeout(() => {
                    autoNext();
                  }, 800);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                  if (nameTimeoutRef.current) {
                    clearTimeout(nameTimeoutRef.current);
                  }
                  if (isEditing) {
                    finishEditing();
                  } else {
                    autoNext();
                  }
                }
              }}
              placeholder="이메일을 입력해주세요"
              className="text-input"
              autoFocus
            />
          </div>
        );

      case 6: // 전화번호
        return (
          <div className="input-group">
            <input
              type="tel"
              inputMode="numeric"
              value={formData.phoneDisplay}
              onChange={(e) => {
                // 숫자만 추출
                const numbers = e.target.value.replace(/\D/g, '');

                // 자동 포맷팅 (010-0000-0000)
                let formatted = '';
                if (numbers.length <= 3) {
                  formatted = numbers;
                } else if (numbers.length <= 7) {
                  formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
                } else {
                  formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
                }

                setFormData({
                  ...formData,
                  phoneDisplay: formatted,
                  phone: numbers
                });

                // 수정 중이 아닐 때만 11자리 입력 완료 시 자동으로 다음
                if (!isEditing && numbers.length === 11) {
                  setTimeout(() => autoNext(), 300);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && formData.phone.length >= 10) {
                  if (isEditing) {
                    finishEditing();
                  } else {
                    autoNext();
                  }
                }
              }}
              placeholder="010-0000-0000"
              className="text-input"
              maxLength={13}
              autoFocus
            />
          </div>
        );

      case 7: // 결제
        return (
          <Payment
            productInfo={productInfo}
            userInfo={getUserInfoForPayment()}
            trackingData={getTrackingForAPI()}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        );

      default:
        return null;
    }
  };

  // 주문 완료 화면
  if (isOrderComplete) {
    const isVbank = paymentResult?.method === 'vbank';

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
              {isVbank ? <Building2 size={80} /> : <CheckCircle size={80} />}
            </div>
            <h2 className="order-complete-title">
              {isVbank ? '가상계좌가 발급되었습니다' : '결제가 완료되었습니다'}
            </h2>
            <p className="order-complete-message">
              {isVbank ? (
                <>입금 확인 후<br />이메일로 레포트가 발송될 예정입니다.</>
              ) : (
                <>레포트 제작 후<br />이메일로 레포트가 발송될 예정입니다.</>
              )}
            </p>

            {isVbank && paymentResult?.vbankInfo && (
              <div className="vbank-info">
                <div className="vbank-row">
                  <span className="vbank-label">입금 은행</span>
                  <span className="vbank-value">{paymentResult.vbankInfo.bankName}</span>
                </div>
                <div className="vbank-row">
                  <span className="vbank-label">계좌 번호</span>
                  <span className="vbank-value account-number">{paymentResult.vbankInfo.accountNumber}</span>
                </div>
                <div className="vbank-row">
                  <span className="vbank-label">예금주</span>
                  <span className="vbank-value">{paymentResult.vbankInfo.accountHolder}</span>
                </div>
                <div className="vbank-row">
                  <span className="vbank-label">입금 금액</span>
                  <span className="vbank-value price">{productInfo.price.toLocaleString()}원</span>
                </div>
                <div className="vbank-warning">
                  입금 기한 내에 입금해주세요. 미입금 시 주문이 자동 취소됩니다.
                </div>
              </div>
            )}

            {!isVbank && <p className="order-complete-wait">잠시만 기다려주세요</p>}

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
          {currentStep !== 7 && (
            <div className="step-label">{STEPS[currentStep].label}</div>
          )}

          {renderStepContent()}

          {/* 수정 중일 때 다음/완료 버튼 */}
          {isEditing && currentStep !== 7 && (
            <button
              className="next-step-btn"
              onClick={goToNextStep}
              disabled={!canProceed()}
            >
              완료
            </button>
          )}

          {/* 완료된 단계 표시 (현재 단계 제외, highestStep 기준) */}
          <div className="completed-steps">
            {highestStep > 0 && currentStep !== 0 && formData.name && (
              <div
                className={`completed-item ${currentStep === 0 ? 'editing' : ''}`}
                onClick={() => goToStep(0)}
              >
                <span className="label">이름</span>
                <span className="value">{formData.name}</span>
              </div>
            )}
            {highestStep > 1 && currentStep !== 1 && formData.birthDate && (
              <div
                className={`completed-item ${currentStep === 1 ? 'editing' : ''}`}
                onClick={() => goToStep(1)}
              >
                <span className="label">생년월일</span>
                <span className="value">
                  {formData.birthDate} ({formData.calendarType === 'solar' ? '양력' : formData.calendarType === 'lunar' ? '음력' : '음력윤달'})
                </span>
              </div>
            )}
            {highestStep > 2 && currentStep !== 2 && (
              <div
                className={`completed-item ${currentStep === 2 ? 'editing' : ''}`}
                onClick={() => goToStep(2)}
              >
                <span className="label">태어난 시간</span>
                <span className="value">
                  {formData.birthTimeUnknown ? '모름' : formData.birthTime}
                </span>
              </div>
            )}
            {highestStep > 3 && currentStep !== 3 && formData.birthPlace && (
              <div
                className={`completed-item ${currentStep === 3 ? 'editing' : ''}`}
                onClick={() => goToStep(3)}
              >
                <span className="label">태어난 곳</span>
                <span className="value">{formData.birthPlace}</span>
              </div>
            )}
            {highestStep > 4 && currentStep !== 4 && formData.gender && (
              <div
                className={`completed-item ${currentStep === 4 ? 'editing' : ''}`}
                onClick={() => goToStep(4)}
              >
                <span className="label">성별</span>
                <span className="value">{formData.gender === 'male' ? '남성' : '여성'}</span>
              </div>
            )}
            {highestStep > 5 && currentStep !== 5 && formData.email && (
              <div
                className={`completed-item ${currentStep === 5 ? 'editing' : ''}`}
                onClick={() => goToStep(5)}
              >
                <span className="label">이메일</span>
                <span className="value">{formData.email}</span>
              </div>
            )}
            {highestStep > 6 && currentStep !== 6 && formData.phone && (
              <div
                className={`completed-item ${currentStep === 6 ? 'editing' : ''}`}
                onClick={() => goToStep(6)}
              >
                <span className="label">연락처</span>
                <span className="value">{formData.phoneDisplay}</span>
              </div>
            )}
          </div>
        </main>

{/* 결제 단계는 Payment 컴포넌트에서 자체 버튼 처리 */}
      </div>
    </div>
  );
}

export default UserInfoPage;
