import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import './Lectures.css';

const lectureList = [
  {
    id: 'gyeokguk',
    title: '격국강의',
    description: '정관격, 편관격 등 격국별 분석 방법과 운세 해석 가이드',
    icon: '📚',
    available: true
  },
  {
    id: 'sipsung',
    title: '십성강의',
    description: '비견, 겁재, 식신, 상관 등 십성의 의미와 해석법',
    icon: '⭐',
    available: false
  },
  {
    id: 'ohang',
    title: '오행강의',
    description: '목화토금수 오행의 상생상극 관계와 적용법',
    icon: '🔥',
    available: false
  },
  {
    id: 'hapchung',
    title: '합충강의',
    description: '천간합, 지지합, 충, 형, 파, 해 등 관계 해석',
    icon: '🔄',
    available: false
  }
];

function Lectures() {
  const navigate = useNavigate();

  const handleLectureClick = (lecture) => {
    if (lecture.available) {
      navigate(`/admin/lectures/${lecture.id}`);
    }
  };

  return (
    <div className="lectures-page">
      <div className="page-header">
        <h1>강의</h1>
        <p className="page-description">사주 분석을 위한 학습 자료입니다</p>
      </div>

      <div className="lectures-grid">
        {lectureList.map((lecture) => (
          <div
            key={lecture.id}
            className={`lecture-card ${lecture.available ? 'available' : 'coming-soon'}`}
            onClick={() => handleLectureClick(lecture)}
          >
            <div className="lecture-icon">{lecture.icon}</div>
            <div className="lecture-content">
              <h3>{lecture.title}</h3>
              <p>{lecture.description}</p>
            </div>
            <div className="lecture-action">
              {lecture.available ? (
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

export default Lectures;
