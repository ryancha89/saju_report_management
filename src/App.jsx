import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import OrderManagement from './pages/OrderManagement';
import OrderDetail from './pages/OrderDetail';
import KakaoMessage from './pages/KakaoMessage';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Login from './pages/Login';
import MobilePreview from './pages/MobilePreview';
import LandingPage from './pages/LandingPage';
import UserInfoPage from './pages/UserInfoPage';
import ResultPage from './pages/ResultPage';
import './App.css';

// 동적 파라미터 리다이렉트 컴포넌트
function OrderDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`/admin/orders/${id}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 랜딩 페이지 (일반 사용자용) */}
          <Route path="/" element={<LandingPage />} />

          {/* 관리자 로그인 페이지 */}
          <Route path="/admin/login" element={<Login />} />

          {/* 사용자 정보 입력 페이지 */}
          <Route path="/user-info" element={<UserInfoPage />} />

          {/* 사주 결과 페이지 */}
          <Route path="/result" element={<ResultPage />} />

          {/* 모바일 프리뷰 페이지 (인증 불필요) */}
          <Route path="/preview/:id" element={<MobilePreview />} />

          {/* 기존 경로 리다이렉트 */}
          <Route path="/orders" element={<Navigate to="/admin/orders" replace />} />
          <Route path="/orders/:id" element={<OrderDetailRedirect />} />
          <Route path="/customers" element={<Navigate to="/admin/customers" replace />} />
          <Route path="/kakao" element={<Navigate to="/admin/kakao" replace />} />
          <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />

          {/* 관리자 보호된 라우트 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/orders" replace />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="kakao" element={<KakaoMessage />} />
            <Route path="customers" element={<Customers />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
