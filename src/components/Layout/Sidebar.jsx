import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShoppingCart,
  MessageSquare,
  Settings,
  Users,
  LogOut,
  User,
  Crown
} from 'lucide-react';
import './Sidebar.css';

const menuItems = [
  { path: '/admin/orders', icon: ShoppingCart, label: '주문 관리' },
  { path: '/admin/kakao', icon: MessageSquare, label: '카카오 메시지' },
  { path: '/admin/customers', icon: Users, label: '고객 관리' },
  { path: '/admin/settings', icon: Settings, label: '설정' },
];

function Sidebar() {
  const { manager, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>사주 리포트</h1>
        <span>관리 시스템</span>
      </div>

      {/* 사용자 정보 */}
      <div className="user-info">
        <div className="user-avatar">
          <User size={20} />
        </div>
        <div className="user-details">
          <span className="user-name">{manager?.name || '사용자'}</span>
          <span className={`user-role ${manager?.role}`}>
            {isAdmin() && <Crown size={12} />}
            {manager?.role === 'admin' ? '관리자' : '매니저'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
        <p className="version">v1.0.0</p>
      </div>
    </aside>
  );
}

export default Sidebar;
