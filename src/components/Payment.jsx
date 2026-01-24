import { useState } from 'react';
import { CreditCard, Building2, Loader, Lock, AlertCircle } from 'lucide-react';
import { useToast } from './Toast';
import './Payment.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';
const PORTONE_MERCHANT_ID = 'imp81781713';

function Payment({ productInfo, userInfo, trackingData, referralCode, couponCode, couponInfo, onPaymentSuccess, onPaymentError }) {
  const [payMethod, setPayMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  // 쿠폰 적용 시 할인된 가격 계산
  // TODO: 테스트 후 원래대로 복구
  const discountedPrice = 1000; // 테스트용 1000원
  // const discountedPrice = couponInfo?.discount_percent
  //   ? Math.round(productInfo.price * (1 - couponInfo.discount_percent / 100))
  //   : productInfo.price;
  const discountAmount = productInfo.price - discountedPrice;

  // 가상계좌 webhook은 항상 프로덕션 URL 사용 (PortOne 서버에서 호출하므로 localhost 불가)
  const noticeUrl = 'https://api.fortunetorch.com/api/v1/payment_histories/portone_webhook';

  const handlePayment = async () => {
    console.log('handlePayment called', { productInfo, userInfo, payMethod });

    if (!productInfo || !userInfo) {
      setError('결제 정보가 부족합니다.');
      return;
    }

    setError('');
    setIsProcessing(true);

    const timestamp = new Date().getTime();
    const merchant_uid = `report-${productInfo.id}-${timestamp}`;

    // // 결제 없이 바로 주문 생성 (테스트용)
    // const mockImpUid = `test_imp_${timestamp}`;
    // await createOrder(merchant_uid, mockImpUid, 'card', { success: true });
    // return;

    console.log('window.IMP:', window.IMP);
    if (!window.IMP) {
      setError('결제 모듈을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
      setIsProcessing(false);
      return;
    }

    const { IMP } = window;
    IMP.init(PORTONE_MERCHANT_ID);

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

    const customData = {
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
    };

    const baseData = {
      pg: 'welcome',
      name: productInfo.name,
      merchant_uid: merchant_uid,
      amount: discountedPrice,
      buyer_name: userInfo.name,
      buyer_tel: formatPhone(userInfo.phone),
      buyer_email: userInfo.email,
      m_redirect_url: `${window.location.origin}/payment-complete`,
      custom_data: JSON.stringify(customData),
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

    console.log('IMP.request_pay data:', data);
    try {
      IMP.request_pay(data, handleCallback);
    } catch (err) {
      console.error('결제 창 호출 오류:', err);
      setError('결제 창을 열 수 없습니다.');
      setIsProcessing(false);
    }
  };

  const handleCallback = async (response) => {
    console.log('handleCallback response:', response);
    const { success, imp_uid, merchant_uid, error_msg, error_code, pay_method: method } = response;

    // 결제 취소 또는 실패 처리
    if (error_code || error_msg) {
      setIsProcessing(false);
      // 취소인 경우 토스트로 표시
      const isCancelled = error_msg?.includes('취소') || error_msg?.includes('cancel');
      if (isCancelled) {
        addToast('결제가 취소되었습니다', 'info');
      } else {
        setError(error_msg);
        if (onPaymentError) {
          onPaymentError(error_msg);
        }
      }
      return;
    }

    // 가상계좌의 경우: imp_uid와 merchant_uid가 있으면 발급 성공으로 처리
    // (vbank는 success가 undefined일 수 있음 - webhook으로 가상계좌 정보가 생성됨)
    if (method === 'vbank' || payMethod === 'vbank') {
      if (imp_uid && merchant_uid) {
        // 가상계좌 발급 후 백엔드에서 정보 조회
        await fetchVbankInfoAndCreateOrder(merchant_uid, imp_uid, response);
      } else {
        setIsProcessing(false);
        setError('가상계좌 발급에 실패했습니다. 다시 시도해주세요.');
      }
      return;
    }

    // 카드 결제: success가 필요
    if (success) {
      await createOrder(merchant_uid, imp_uid, 'card', response);
    } else {
      setIsProcessing(false);
      setError('결제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 가상계좌 정보를 PortOne API에서 직접 조회 후 주문 생성
  const fetchVbankInfoAndCreateOrder = async (merchant_uid, imp_uid, paymentResponse) => {
    try {
      // 백엔드를 통해 PortOne에서 결제 정보 조회
      console.log('Fetching payment info from backend for imp_uid:', imp_uid);

      const paymentInfoResponse = await fetch(`${API_BASE_URL}/api/v1/payment_histories/portone_payment_info?imp_uid=${imp_uid}`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`,
        },
      });

      const paymentInfoData = await paymentInfoResponse.json();
      console.log('Payment info from PortOne:', paymentInfoData);

      if (paymentInfoData.success && paymentInfoData.payment) {
        const payment = paymentInfoData.payment;
        const enrichedResponse = {
          ...paymentResponse,
          vbank_name: payment.vbank_name,
          vbank_num: payment.vbank_num,
          vbank_holder: payment.vbank_holder,
          vbank_date: payment.vbank_date,
        };
        console.log('Enriched response with vbank info:', enrichedResponse);
        await createOrder(merchant_uid, imp_uid, 'vbank', enrichedResponse);
      } else {
        // PortOne 조회 실패 시 기존 방식으로 fallback
        console.log('PortOne fetch failed, trying backend vbank endpoint');
        await fetchVbankFromBackend(merchant_uid, imp_uid, paymentResponse);
      }
    } catch (err) {
      console.error('Failed to fetch payment info:', err);
      // 실패해도 주문 생성 시도
      await createOrder(merchant_uid, imp_uid, 'vbank', paymentResponse);
    }
  };

  // 백엔드 VirtualAccount에서 조회 (fallback)
  const fetchVbankFromBackend = async (merchant_uid, imp_uid, paymentResponse) => {
    const prodApiUrl = 'https://api.fortunetorch.com';
    const apiUrl = import.meta.env.MODE === 'development' ? prodApiUrl : API_BASE_URL;

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const vbankResponse = await fetch(`${apiUrl}/api/v1/payment_histories/vbank?merchant_uid=${merchant_uid}`, {
        headers: {
          'Content-Type': 'application/json',
          'Saju-Authorization': `Bearer-${API_TOKEN}`,
        },
      });

      const vbankData = await vbankResponse.json();
      console.log('vbank info from backend:', vbankData);

      if (vbankData.result === 'success' && vbankData.account) {
        const enrichedResponse = {
          ...paymentResponse,
          vbank_name: vbankData.account.vbank_name,
          vbank_num: vbankData.account.vbank_num,
          vbank_holder: vbankData.account.vbank_holder,
          vbank_date: vbankData.account.vbank_date,
        };
        await createOrder(merchant_uid, imp_uid, 'vbank', enrichedResponse);
      } else {
        await createOrder(merchant_uid, imp_uid, 'vbank', paymentResponse);
      }
    } catch (err) {
      console.error('Backend vbank fetch failed:', err);
      await createOrder(merchant_uid, imp_uid, 'vbank', paymentResponse);
    }
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
        questions: userInfo.questions,
        tracking: trackingData,
        ref: referralCode || null,
        coupon_code: couponCode || null,
        // 결제 정보
        payment: {
          imp_uid: imp_uid,
          merchant_uid: merchant_uid,
          pay_method: method,
          amount: discountedPrice,
          original_amount: productInfo.price,
          discount_amount: discountAmount,
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
            amount: discountedPrice,
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
        {/* TODO: 테스트 후 원래 로직으로 복구 - couponInfo 조건부 표시 */}
        <div className="price-with-discount">
          <div className="original-price">{productInfo.price.toLocaleString()}원</div>
          <div className="discount-badge">테스트</div>
          <div className="discounted-price">{discountedPrice.toLocaleString()}원</div>
        </div>
        {/* 원래 코드:
        {couponInfo?.discount_percent ? (
          <div className="price-with-discount">
            <div className="original-price">{productInfo.price.toLocaleString()}원</div>
            <div className="discount-badge">-{couponInfo.discount_percent}%</div>
            <div className="discounted-price">{discountedPrice.toLocaleString()}원</div>
          </div>
        ) : (
          <div className="product-price">{productInfo.price.toLocaleString()}원</div>
        )}
        */}
        {couponInfo && (
          <div className="coupon-applied">
            <span className="coupon-label">적용된 쿠폰:</span>
            <span className="coupon-name">{couponInfo.name || couponCode}</span>
          </div>
        )}
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
