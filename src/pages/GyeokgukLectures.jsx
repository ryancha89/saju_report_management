import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import './GyeokgukLectures.css';

const gyeokgukList = [
  {
    id: 'siksin',
    name: '식신격',
    hanja: '食神格',
    description: '식신이 월지에서 투출하여 격을 이룬 경우',
    available: false
  },
  {
    id: 'sanggwan',
    name: '상관격',
    hanja: '傷官格',
    description: '상관이 월지에서 투출하여 격을 이룬 경우',
    available: false
  },
  {
    id: 'jae',
    name: '재격',
    hanja: '財格',
    description: '정재 또는 편재가 월지에서 투출하여 격을 이룬 경우',
    available: false
  },
  {
    id: 'zhengguan',
    name: '정관격',
    hanja: '正官格',
    description: '정관이 월지에서 투출하여 격을 이룬 경우',
    available: true
  },
  {
    id: 'pyeongwan',
    name: '편관격',
    hanja: '偏官格',
    description: '편관(칠살)이 월지에서 투출하여 격을 이룬 경우',
    available: false
  },
  {
    id: 'insung',
    name: '인성격',
    hanja: '印星格',
    description: '정인 또는 편인이 월지에서 투출하여 격을 이룬 경우',
    available: false
  },
  {
    id: 'geonrok',
    name: '건록격',
    hanja: '建祿格',
    description: '일간이 월지에서 건록을 얻은 경우',
    available: false
  },
  {
    id: 'wolgeop',
    name: '월겁격',
    hanja: '月劫格',
    description: '월지에 겁재가 있어 격을 이룬 경우',
    available: false
  },
  {
    id: 'yangin',
    name: '양인격',
    hanja: '羊刃格',
    description: '월지에 양인이 있어 격을 이룬 경우',
    available: false
  }
];

function GyeokgukLectures() {
  const navigate = useNavigate();

  const handleGyeokgukClick = (gyeokguk) => {
    if (gyeokguk.available) {
      navigate(`/admin/lectures/gyeokguk/${gyeokguk.id}`);
    }
  };

  return (
    <div className="gyeokguk-list-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/admin/lectures')}>
          <ArrowLeft size={18} />
          <span>강의 목록</span>
        </button>
        <h1>격국강의</h1>
        <p className="page-description">격국별 분석 방법과 운세 해석 가이드</p>
      </div>

      <div className="gyeokguk-grid">
        {gyeokgukList.map((gyeokguk) => (
          <div
            key={gyeokguk.id}
            className={`gyeokguk-card ${gyeokguk.available ? 'available' : 'coming-soon'}`}
            onClick={() => handleGyeokgukClick(gyeokguk)}
          >
            <div className="gyeokguk-info">
              <div className="gyeokguk-name">
                <span className="name-ko">{gyeokguk.name}</span>
                <span className="name-hanja">{gyeokguk.hanja}</span>
              </div>
              <p className="gyeokguk-desc">{gyeokguk.description}</p>
            </div>
            <div className="gyeokguk-action">
              {gyeokguk.available ? (
                <ChevronRight size={20} />
              ) : (
                <span className="coming-soon-badge">준비중</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GyeokgukLectures;
