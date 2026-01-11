import { ShoppingCart, MessageSquare, Users, TrendingUp } from 'lucide-react';
import './Dashboard.css';

const stats = [
  { label: '오늘 주문', value: '24', icon: ShoppingCart, color: '#667eea' },
  { label: '발송 대기', value: '12', icon: MessageSquare, color: '#f59e0b' },
  { label: '총 고객수', value: '1,234', icon: Users, color: '#10b981' },
  { label: '이번달 매출', value: '₩2,450,000', icon: TrendingUp, color: '#ec4899' },
];

const recentOrders = [
  { id: 'ORD-001', customer: '김철수', product: '2024 신년 사주', status: '완료', date: '2024-01-15' },
  { id: 'ORD-002', customer: '이영희', product: '궁합 리포트', status: '발송대기', date: '2024-01-15' },
  { id: 'ORD-003', customer: '박민수', product: '2024 신년 사주', status: '처리중', date: '2024-01-14' },
  { id: 'ORD-004', customer: '최지은', product: '토정비결', status: '완료', date: '2024-01-14' },
  { id: 'ORD-005', customer: '정다운', product: '2024 신년 사주', status: '완료', date: '2024-01-13' },
];

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>대시보드</h1>
        <p>사주 리포트 관리 시스템에 오신 것을 환영합니다.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ background: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>최근 주문</h2>
          <button className="btn-link">전체 보기</button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>고객명</th>
                <th>상품</th>
                <th>상태</th>
                <th>주문일</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customer}</td>
                  <td>{order.product}</td>
                  <td>
                    <span className={`status-badge status-${order.status === '완료' ? 'completed' : order.status === '발송대기' ? 'pending' : 'processing'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
