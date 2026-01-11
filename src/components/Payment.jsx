import { useState } from 'react';
import { CreditCard, Building2, Loader, Lock, AlertCircle } from 'lucide-react';
import { useToast } from './Toast';
import './Payment.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';
const PORTONE_MERCHANT_ID = 'imp81781713';

function Payment({ productInfo, userInfo, trackingData, onPaymentSuccess, onPaymentError }) {
  const [payMethod, setPayMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const noticeUrl =
    import.meta.env.MODE === 'development'
      ? 'http://localhost:4000/api/v1/payment_histories/portone_webhook'
      : 'https://api.fortunetorch.com/api/v1/payment_histories/portone_webhook';

  const handlePayment = () => {
    if (!window.IMP) {
      setError('결제 모듈을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    if (!productInfo || !userInfo) {
      setError('결제 정보가 부족합니다.');
      return;
    }

    setError('');
    setIsProcessing(true);

    const { IMP } = window;
    IMP.init(PORTONE_MERCHANT_ID);

    const timestamp = new Date().getTime();
    const merchant_uid = `report-${productInfo.id}-${timestamp}`;

    // 전화번호 포맷팅 (숫자만 있는 경우 하이픈 추가)
    const formatPhone = (phone) => {
      if (!phone) return '';
      const numbers = phone.replace(/\D/g, '');
      if (numbers.length === 11) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
      } else if (numbers.length === 10) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
      }
      return phone;
    };

    const baseData = {
      pg: 'welcome',
      name: productInfo.name,
      merchant_uid: merchant_uid,
      amount: productInfo.price,
      buyer_name: userInfo.name,
      buyer_tel: formatPhone(userInfo.phone),
      buyer_email: userInfo.email,
      m_redirect_url: `${window.location.origin}/payment-complete`,
      custom_data: {
        product_type: productInfo.id,
        expected_price: productInfo.price,
        user_info: {
          name: userInfo.name,
          email: userInfo.email,
          phone: userInfo.phone,
          birth_year: userInfo.birthYear,
          birth_month: userInfo.birthMonth,
          birth_day: userInfo.birthDay,
          birth_hour: userInfo.birthHour,
          birth_minute: userInfo.birthMinute,
          gender: userInfo.gender,
          time_unknown: userInfo.timeUnknown,
          calendar_type: userInfo.calendarType,
          birth_place: userInfo.birthPlace,
          birth_lat: userInfo.birthLat,
          birth_lon: userInfo.birthLon,
          time_adjustment: userInfo.timeAdjustment,
          time_adjust_minutes: userInfo.timeAdjustMinutes,
        },
        tracking: trackingData,
      },
    };

    let data = null;

    if (payMethod === 'vbank') {
      data = {
        ...baseData,
        pay_method: 'vbank',
        notice_url: noticeUrl,
      };
    } else {
      data = {
        ...baseData,
        pay_method: 'card',
      };
    }

    try {
      IMP.request_pay(data, handleCallback);
    } catch (err) {
      console.error('결제 창 호출 오류:', err);
      setError('결제 창을 열 수 없습니다.');
      setIsProcessing(false);
    }
  };

  const handleCallback = async (response) => {
    const { success, imp_uid, merchant_uid, error_msg, error_code, pay_method: method } = response;

    // 결제 취소 또는 실패 처리
    if (error_code || error_msg || (!success && method !== 'vbank')) {
      setIsProcessing(false);
      // 취소인 경우 토스트로 표시
      const isCancelled = error_msg?.includes('취소') || error_msg?.includes('cancel');
      if (isCancelled) {
        addToast('결제가 취소되었습니다', 'info');
      } else if (error_msg) {
        setError(error_msg);
        if (onPaymentError) {
          onPaymentError(error_msg);
        }
      }
      return;
    }

    // 가상계좌의 경우
    if (method === 'vbank' || payMethod === 'vbank') {
      // 가상계좌 발급 정보를 저장하고 완료 처리
      await createOrder(merchant_uid, imp_uid, 'vbank', response);
      return;
    }

    // 카드 결제 성공
    await createOrder(merchant_uid, imp_uid, 'card', response);
  };

  const createOrder = async (merchant_uid, imp_uid, method, paymentResponse) => {
    try {
      const [year, month, day] = userInfo.birthDate.split('-').map(Number);
      let hour = null;
      let minute = null;

      if (!userInfo.timeUnknown && userInfo.birthTime) {
        [hour, minute] = userInfo.birthTime.split(':').map(Number);
      }

      const orderData = {
        product_id: productInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        phone_number: userInfo.phone,
        birth_year: year,
        birth_month: month,
        birth_day: day,
        gender: userInfo.gender,
        calendar_type: userInfo.calendarType,
        time_known: !userInfo.timeUnknown,
        birth_hour: hour,
        birth_minute: minute,
        birth_place: userInfo.birthPlace || null,
        birth_lat: userInfo.birthLat,
        birth_lon: userInfo.birthLon,
        time_adjustment: userInfo.timeAdjustment,
        time_adjust_minutes: userInfo.timeAdjustMinutes,
        tracking: trackingData,
        // 결제 정보
        payment: {
          imp_uid: imp_uid,
          merchant_uid: merchant_uid,
          pay_method: method,
          amount: productInfo.price,
          status: method === 'vbank' ? 'pending' : 'paid',
          vbank_info: method === 'vbank' ? {
            vbank_name: paymentResponse.vbank_name,
            vbank_num: paymentResponse.vbank_num,
            vbank_holder: paymentResponse.vbank_holder,
            vbank_date: paymentResponse.vbank_date,
          } : null,
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`,
        },
        body: JSON.stringify(orderData),
      });

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('서버에서 빈 응답을 받았습니다.');
      }

      const result = JSON.parse(responseText);

      if (result.success) {
        setIsProcessing(false);
        if (onPaymentSuccess) {
          onPaymentSuccess({
            orderId: result.order_id,
            method: method,
            vbankInfo: method === 'vbank' ? {
              bankName: paymentResponse.vbank_name,
              accountNumber: paymentResponse.vbank_num,
              accountHolder: paymentResponse.vbank_holder,
              dueDate: paymentResponse.vbank_date,
            } : null,
          });
        }
      } else {
        const errorMsg = result.errors?.join(', ') || result.error || '주문 처리 중 오류가 발생했습니다.';
        setError(errorMsg);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Order creation error:', err);
      setError(err.message || '주문 생성 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h2>결제하기</h2>
        <p>결제 수단을 선택해주세요</p>
      </div>

      {error && (
        <div className="payment-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 상품 정보 */}
      <div className="product-info">
        <div className="product-name">{productInfo.name}</div>
        <div className="product-price">{productInfo.price.toLocaleString()}원</div>
      </div>

      {/* 결제 수단 선택 */}
      <div className="payment-methods">
        <button
          type="button"
          className={`payment-method-btn ${payMethod === 'card' ? 'active' : ''}`}
          onClick={() => setPayMethod('card')}
          disabled={isProcessing}
        >
          <div className="method-icon">
            <CreditCard size={24} />
          </div>
          <div className="method-info">
            <span className="method-name">신용카드</span>
            <span className="method-desc">즉시 결제</span>
          </div>
          {payMethod === 'card' && <div className="method-check">✓</div>}
        </button>

        <button
          type="button"
          className={`payment-method-btn ${payMethod === 'vbank' ? 'active' : ''}`}
          onClick={() => setPayMethod('vbank')}
          disabled={isProcessing}
        >
          <div className="method-icon">
            <Building2 size={24} />
          </div>
          <div className="method-info">
            <span className="method-name">가상계좌</span>
            <span className="method-desc">입금 후 처리</span>
          </div>
          {payMethod === 'vbank' && <div className="method-check">✓</div>}
        </button>
      </div>

      {/* 결제 버튼 */}
      <button
        className={`payment-submit-btn ${payMethod}`}
        onClick={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader size={20} className="spinning" />
        ) : (
          <>
            {payMethod === 'card' ? <CreditCard size={20} /> : <Building2 size={20} />}
            <span>{payMethod === 'card' ? '카드로 결제하기' : '가상계좌 발급받기'}</span>
          </>
        )}
      </button>

      {/* 안내 문구 */}
      <div className="payment-notice">
        <Lock size={14} />
        <span>
          결제 정보는 암호화되어 안전하게 처리됩니다.
          {payMethod === 'card'
            ? ' 결제 완료 후 즉시 레포트 제작이 시작됩니다.'
            : ' 입금 확인 후 레포트 제작이 시작됩니다.'}
        </span>
      </div>
    </div>
  );
}

export default Payment;
