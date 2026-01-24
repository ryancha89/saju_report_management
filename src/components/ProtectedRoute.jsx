import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requireAdmin = false, allowWithoutProfile = false }) {
  const { isAuthenticated, loading, isAdmin, isProfileCompleted } = useAuth();
  const location = useLocation();

  // 로딩 중일 때는 로딩 표시
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>인증 확인 중...</p>
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 프로필이 완료되지 않은 경우 프로필 페이지로 리다이렉트
  // (관리자, 프로필 페이지 자체, allowWithoutProfile이 true인 경우 제외)
  if (!allowWithoutProfile && !isAdmin() && !isProfileCompleted() && location.pathname !== '/admin/profile') {
    return <Navigate to="/admin/profile" replace />;
  }

  // Admin 권한이 필요한 페이지인데 admin이 아닌 경우
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
