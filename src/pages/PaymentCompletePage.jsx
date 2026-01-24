import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Home } from 'lucide-react';
import './PaymentCompletePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

function PaymentCompletePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, failed
  const [orderInfo, setOrderInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processPaymentResult = async () => {
      const imp_uid = searchParams.get('imp_uid');
      const merchant_uid = searchParams.get('merchant_uid');
      const error_msg = searchParams.get('error_msg');
      const imp_success = searchParams.get('imp_success');

      console.log('Payment complete params:', { imp_uid, merchant_uid, error_msg, imp_success });

      // 에러 메시지가 있거나 imp_success가 false인 경우
      if (error_msg || imp_success === 'false') {
        setStatus('failed');
        setErrorMessage(error_msg || '결제가 취소되었거나 실패했습니다.');
        return;
      }

      // imp_uid가 없으면 실패
      if (!imp_uid) {
        setStatus('failed');
        setErrorMessage('결제 정보를 찾을 수 없습니다.');
        return;
      }

      try {
        // localStorage에서 저장된 주문 정보 확인
        const storedOrderData = localStorage.getItem('pendingOrderData');

        if (storedOrderData) {
          const orderData = JSON.parse(storedOrderData);

          // 주문 생성 API 호출
          const response = await fetch(`${API_BASE_URL}/api/v1/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Saju-Authorization': `Bearer-${API_TOKEN}`,
            },
            body: JSON.stringify({
              ...orderData,
              imp_uid: imp_uid,
              merchant_uid: merchant_uid || orderData.merchant_uid,
              payment_status: 'paid',
            }),
          });

          const result = await response.json();

          if (result.success) {
            setOrderInfo({
              orderId: result.order_id,
              ...orderData,
            });
            setStatus('success');
            // 사용한 주문 데이터 삭제
            localStorage.removeItem('pendingOrderData');
          } else {
            // 이미 주문이 생성되었을 수 있음 - 성공으로 처리
            if (result.errors?.includes('이미 처리된 주문입니다') || result.error?.includes('already')) {
              setStatus('success');
              setOrderInfo({ orderId: result.order_id || '확인 중' });
            } else {
              setStatus('failed');
              setErrorMessage(result.errors?.join(', ') || result.error || '주문 처리 중 오류가 발생했습니다.');
            }
          }
        } else {
          // localStorage에 데이터가 없으면 이미 처리된 것으로 간주
          setStatus('success');
          setOrderInfo({ orderId: '확인 중' });
        }
      } catch (err) {
        console.error('Order creation error:', err);
        // 네트워크 오류 등의 경우에도 결제는 성공한 것으로 처리
        setStatus('success');
        setOrderInfo({ orderId: '확인 중' });
      }
    };

    processPaymentResult();
  }, [searchParams]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRetry = () => {
    navigate('/user-info');
  };

  if (status === 'loading') {
    return (
      <div className="payment-complete-page">
        <div className="payment-complete-container">
          <div className="loading-state">
            <Loader size={48} className="spinning" />
            <p>결제 결과를 확인하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="payment-complete-page">
        <div className="payment-complete-container">
          <div className="result-icon failed">
            <XCircle size={64} />
          </div>
          <h1>결제 실패</h1>
          <p className="error-message">{errorMessage}</p>
          <div className="action-buttons">
            <button className="retry-btn" onClick={handleRetry}>
              다시 시도하기
            </button>
            <button className="home-btn" onClick={handleGoHome}>
              <Home size={18} />
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-complete-page">
      <div className="payment-complete-container">
        <div className="result-icon success">
          <CheckCircle size={64} />
        </div>
        <h1>결제가 완료되었습니다</h1>
        <p className="success-message">
          주문이 정상적으로 접수되었습니다.<br />
          리포트 제작이 시작되며, 완료되면 알림을 보내드립니다.
        </p>


        <div className="notice-box">
          <p>
            <strong>안내사항</strong><br />
            • 전문 상담사가 직접 검증하여 맞춤 리포트를 제작합니다<br />
            • 리포트 제작에는 보통 몇 시간에서 1일, 최대 3일이 소요됩니다<br />
            • 완료 시 카카오톡과 이메일로 안내드립니다
          </p>
        </div>

        <div className="action-buttons">
          <button className="home-btn primary" onClick={handleGoHome}>
            <Home size={18} />
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentCompletePage;
