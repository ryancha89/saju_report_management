import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Sparkles, Loader } from 'lucide-react';
import { KOREAN_CITIES, findCityByName, calculateTimeAdjustment } from '../lib/koreanCities';
import { initTracking, getTrackingData } from '../lib/tracking';
import './FreeSajuInputPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// 12운성 중국어 -> 한글 변환
const UNSEONG_KO = {
  '长生': '장생', '沐浴': '목욕', '冠带': '관대', '临官': '건록', '建禄': '건록',
  '帝旺': '제왕', '衰': '쇠', '病': '병', '死': '사', '墓': '묘',
  '绝': '절', '胎': '태', '养': '양',
  // 번체자
  '長生': '장생', '冠帶': '관대', '臨官': '건록', '養': '양'
};
const toKoreanUnseong = (cn) => UNSEONG_KO[cn] || cn;

const STEPS = [
  { id: 'birthDate', label: '생년월일을 알려주세요' },
  { id: 'birthTime', label: '태어난 시간을 알려주세요' },
  { id: 'birthPlace', label: '태어난 곳을 알려주세요' },
  { id: 'gender', label: '성별을 알려주세요' },
];

function FreeSajuInputPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const [formData, setFormData] = useState({
    birthDate: '',
    birthDateDisplay: '',
    birthTime: '',
    birthTimeUnknown: false,
    birthPlace: '',
    birthLat: null,
    birthLon: null,
    timeAdjustment: null,
    timeAdjustMinutes: null,
    gender: '',
    calendarType: 'solar',
  });

  // Tracking initialization
  useEffect(() => {
    const trackingData = initTracking();
    if (Object.keys(trackingData).length > 0) {
      console.log('📊 Free Saju Tracking:', trackingData);
    }
  }, []);

  // Background color
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#0a0a0a';
    document.documentElement.style.backgroundColor = '#0a0a0a';

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  // City search filter
  const filteredCities = useMemo(() => {
    if (!citySearch) return KOREAN_CITIES.slice(0, 10);
    return KOREAN_CITIES.filter(city =>
      city.name.toLowerCase().includes(citySearch.toLowerCase())
    ).slice(0, 10);
  }, [citySearch]);

  // Time adjustment calculation
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

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.birthDate.length === 10;
      case 1: return formData.birthTimeUnknown || formData.birthTime.length === 5;
      case 2: return formData.birthPlace.length > 0;
      case 3: return formData.gender.length > 0;
      default: return false;
    }
  };

  const autoNextRef = useRef(false);

  const autoNext = (skipBirthPlace = false) => {
    if (currentStep < STEPS.length - 1 && !autoNextRef.current) {
      autoNextRef.current = true;
      setTimeout(() => {
        setCurrentStep(prev => {
          let nextStep;
          if (skipBirthPlace && prev === 1) {
            nextStep = 3;
          } else {
            nextStep = prev + 1;
          }
          setHighestStep(h => Math.max(h, nextStep));
          setIsEditing(false);
          return nextStep;
        });
        autoNextRef.current = false;
      }, 300);
    }
  };

  const handleCitySelect = (city) => {
    setFormData(prev => ({ ...prev, birthPlace: city.name }));
    setCitySearch(city.name);
    setShowCityDropdown(false);
    setTimeout(() => {
      if (isEditing) {
        setCurrentStep(highestStep);
        setIsEditing(false);
      } else {
        autoNext();
      }
    }, 50);
  };

  const goToStep = (step) => {
    setCurrentStep(step);
    setIsEditing(step < highestStep);
  };

  const finishEditing = () => {
    if (canProceed()) {
      setCurrentStep(highestStep);
      setIsEditing(false);
    }
  };

  const handleBack = () => {
    if (isEditing) {
      setCurrentStep(highestStep);
      setIsEditing(false);
      return;
    }

    if (currentStep > 0) {
      let prevStep;
      if (currentStep === 3 && formData.birthTimeUnknown) {
        prevStep = 1;
      } else {
        prevStep = currentStep - 1;
      }
      setCurrentStep(prevStep);
      setHighestStep(prevStep);
    } else {
      navigate('/');
    }
  };

  const handleGenderSelect = (gender) => {
    setFormData({ ...formData, gender });
    setIsSubmitting(true);
    handleSubmit(gender);
  };

  const handleSubmit = async (selectedGender) => {
    const genderToUse = selectedGender || formData.gender;
    if (!genderToUse) return;

    const startTime = Date.now();
    const MIN_LOADING_TIME = 2000; // 최소 2초 로딩

    try {
      const [year, month, day] = formData.birthDate.split('-').map(Number);
      let hour = null;
      let minute = null;

      if (!formData.birthTimeUnknown && formData.birthTime) {
        [hour, minute] = formData.birthTime.split(':').map(Number);

        if (formData.timeAdjustMinutes) {
          let totalMinutes = hour * 60 + minute + formData.timeAdjustMinutes;
          if (totalMinutes < 0) totalMinutes += 24 * 60;
          if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
          hour = Math.floor(totalMinutes / 60);
          minute = totalMinutes % 60;
        }
      }

      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        day: day.toString(),
        gender: genderToUse,
        calendar_type: formData.calendarType === 'lunarLeap' ? 'leap' : formData.calendarType,
      });

      if (hour !== null) {
        params.append('hour', hour.toString());
        params.append('minute', (minute || 0).toString());
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/super_calendars?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('=== API Response 전체 ===');
        data.forEach((item, idx) => {
          console.log(`data[${idx}]:`, item);
        });
        const result = data[0];
        const saju = result?.super_calendar;
        const twelveStars = data[3]; // 십이운성
        const twelveGods = data[6]; // 십이신살
        console.log('twelveGods 상세:', JSON.stringify(twelveGods, null, 2));

        if (saju) {
          // 최소 로딩 시간 보장
          const elapsed = Date.now() - startTime;
          if (elapsed < MIN_LOADING_TIME) {
            await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
          }

          // Navigate to result page with saju data
          navigate('/free-saju/result', {
            state: {
              sajuData: {
                ganji_year: saju.zodiac_year,
                ganji_month: saju.zodiac_month,
                ganji_day: saju.zodiac_day,
                ganji_time: result.ganji_time,
                // 천간 십성 (Ten Gods for Heavenly Stems)
                sipsung_cheongan: {
                  year: result.year_sky_prop,
                  month: result.month_sky_prop,
                  time: result.time_sky_prop,
                },
                // 지지 십성 (Ten Gods for Earthly Branches)
                sipsung_jiji: {
                  year: result.year_earth_prop,
                  month: result.month_earth_prop,
                  day: result.day_earth_prop,
                  time: result.time_earth_prop,
                },
                // 십이운성 (Twelve Stars) - 한글로 변환
                sipyi_unseong: {
                  year: toKoreanUnseong(twelveStars?.twelve_star_year),
                  month: toKoreanUnseong(twelveStars?.twelve_star_month),
                  day: toKoreanUnseong(twelveStars?.twelve_star_day),
                  time: toKoreanUnseong(twelveStars?.twelve_star_time),
                },
                // 십이신살 (Twelve Gods)
                sipyi_sinsal: {
                  year: twelveGods?.twelve_gods?.year_gods?.join(' ') || '-',
                  month: twelveGods?.twelve_gods?.month_gods?.join(' ') || '-',
                  day: twelveGods?.twelve_gods?.day_gods?.join(' ') || '-',
                  time: twelveGods?.twelve_gods?.time_gods?.join(' ') || '-',
                },
              },
              birthInfo: {
                birthDate: formData.birthDate,
                birthTime: formData.birthTimeUnknown ? null : formData.birthTime,
                birthTimeUnknown: formData.birthTimeUnknown,
                gender: formData.gender,
                calendarType: formData.calendarType,
              },
              trackingData: getTrackingData(),
            }
          });
        }
      }
    } catch (error) {
      console.error('사주 계산 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Birth date
        return (
          <div className="input-group">
            <div className="birthdate-input-row">
              <input
                type="text"
                inputMode="numeric"
                value={formData.birthDateDisplay || ''}
                onChange={(e) => {
                  const numbers = e.target.value.replace(/\D/g, '');
                  let formatted = '';
                  if (numbers.length <= 4) {
                    formatted = numbers;
                  } else if (numbers.length <= 6) {
                    formatted = `${numbers.slice(0, 4)}.${numbers.slice(4)}`;
                  } else {
                    formatted = `${numbers.slice(0, 4)}.${numbers.slice(4, 6)}.${numbers.slice(6, 8)}`;
                  }

                  let apiFormat = '';
                  if (numbers.length === 8) {
                    apiFormat = `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
                    if (!isEditing) {
                      autoNext();
                    }
                  }

                  setFormData({
                    ...formData,
                    birthDateDisplay: formatted,
                    birthDate: apiFormat
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const numbers = e.target.value.replace(/\D/g, '');
                    if (numbers.length === 8) {
                      if (isEditing) {
                        finishEditing();
                      } else {
                        autoNext();
                      }
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

      case 1: // Birth time
        return (
          <div className="input-group">
            <div className="time-input-row">
              <input
                type="text"
                inputMode="numeric"
                value={formData.birthTime}
                onChange={(e) => {
                  const numbers = e.target.value.replace(/\D/g, '');
                  let formatted = '';
                  if (numbers.length <= 2) {
                    formatted = numbers;
                  } else {
                    formatted = `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
                  }

                  setFormData({ ...formData, birthTime: formatted });

                  if (!isEditing && numbers.length === 4) {
                    setTimeout(() => autoNext(), 300);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const numbers = e.target.value.replace(/\D/g, '');
                    if (numbers.length === 4) {
                      if (isEditing) {
                        finishEditing();
                      } else {
                        autoNext();
                      }
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
                    birthPlace: newValue ? '' : formData.birthPlace,
                    birthLat: newValue ? null : formData.birthLat,
                    birthLon: newValue ? null : formData.birthLon,
                    timeAdjustment: newValue ? null : formData.timeAdjustment,
                    timeAdjustMinutes: newValue ? null : formData.timeAdjustMinutes,
                  });
                  if (newValue) {
                    setTimeout(() => {
                      if (isEditing) {
                        setCurrentStep(highestStep);
                        setIsEditing(false);
                      } else {
                        autoNext(true);
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

      case 2: // Birth place
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

      case 3: // Gender
        return (
          <div className="input-group gender-group">
            <button
              type="button"
              className={`gender-btn ${formData.gender === 'male' ? 'active' : ''}`}
              onClick={() => handleGenderSelect('male')}
              disabled={isSubmitting}
            >
              남성
            </button>
            <button
              type="button"
              className={`gender-btn ${formData.gender === 'female' ? 'active' : ''}`}
              onClick={() => handleGenderSelect('female')}
              disabled={isSubmitting}
            >
              여성
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="free-saju-input-page">
      <div className="free-saju-wrapper">
        {/* Animated background */}
        <div className="animated-bg">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <div className="overlay" />

        {/* Header */}
        <header className="free-saju-header">
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

        {/* Title */}
        <div className="free-saju-title">
          <Sparkles size={24} className="sparkle-icon" />
          <h1>나의 사주진단</h1>
          <p>나의 성향과 잠재력을 확인해보세요</p>
        </div>

        {/* Main content */}
        <main className="free-saju-content">
          <div className="step-label">{STEPS[currentStep].label}</div>
          {renderStepContent()}

          {/* Next button for name and email steps */}
          {currentStep !== 3 && (
            (currentStep === 0 && formData.birthDate.length === 10) ||
            (currentStep === 1 && (formData.birthTimeUnknown || formData.birthTime.length === 5)) ||
            (currentStep === 2 && formData.birthPlace) ||
            (isEditing && canProceed())
          ) && (
            <button
              className="next-step-btn"
              onClick={() => {
                if (isEditing) {
                  finishEditing();
                } else {
                  autoNext();
                }
              }}
            >
              {isEditing ? '완료' : '다음'}
            </button>
          )}

          {/* Completed steps summary */}
          <div className="completed-steps">
            {highestStep > 0 && currentStep !== 0 && formData.birthDate && (
              <div
                className={`completed-item ${currentStep === 0 ? 'editing' : ''}`}
                onClick={() => goToStep(0)}
              >
                <span className="label">생년월일</span>
                <span className="value">
                  {formData.birthDate} ({formData.calendarType === 'solar' ? '양력' : '음력'})
                </span>
              </div>
            )}
            {highestStep > 1 && currentStep !== 1 && (
              <div
                className={`completed-item ${currentStep === 1 ? 'editing' : ''}`}
                onClick={() => goToStep(1)}
              >
                <span className="label">태어난 시간</span>
                <span className="value">
                  {formData.birthTimeUnknown ? '모름' : formData.birthTime}
                </span>
              </div>
            )}
            {highestStep > 2 && currentStep !== 2 && formData.birthPlace && (
              <div
                className={`completed-item ${currentStep === 2 ? 'editing' : ''}`}
                onClick={() => goToStep(2)}
              >
                <span className="label">태어난 곳</span>
                <span className="value">{formData.birthPlace}</span>
              </div>
            )}
          </div>
        </main>
      </div>
      {/* Loading Modal */}
      {isSubmitting && (
        <div className="loading-modal">
          <div className="loading-content">
            <div className="loading-spinner">
              <Sparkles size={48} className="sparkle-animate" />
            </div>
            <h2>사주 분석중</h2>
            <p>잠시만 기다려주세요...</p>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FreeSajuInputPage;
