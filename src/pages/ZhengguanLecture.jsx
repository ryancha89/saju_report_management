import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './ZhengguanLecture.css';

// 정관격 운세별 분석 데이터
const ZHENGGUAN_ANALYSIS = {
  overview: {
    title: '정관격(正官格) 개요',
    description: `정관격은 사회적 규범, 명예, 책임감을 중시하는 격국입니다.
체계적이고 안정적인 것을 추구하며, 반듯하고 명예로운 삶을 지향합니다.
정관격을 가진 분은 본래 보수적이고 신중한 성향이 강합니다.`,
    characteristics: [
      '사회적 기준과 도덕적 규범 중시',
      '책임감 있고 안정적인 삶 추구',
      '체계적이고 계획적인 성향',
      '명예와 체면을 중요하게 생각'
    ]
  },
  luckPeriods: [
    {
      name: '식신(食神)',
      type: 'normal',
      score: 65,
      evaluation: 'average',
      keyPoint: '정관이 식신을 극하는 형상',
      summary: '따뜻함과 감성적 활기가 더해지지만, 정관격의 규범성과 식신의 자유로움이 충돌할 수 있음',
      details: [
        '감정 표현이 풍부해지고 배려심이 커짐',
        '취미, 요리, 예술 등 함께하는 활동에 좋음',
        '기존의 안정적인 틀에서 벗어난 혼란이 생길 수 있음',
        '평소와 다른 감정적 표현이나 일탈적 행동 가능성'
      ],
      advice: '감정에 솔직하되 신중함과 책임감을 잃지 않도록 균형 유지'
    },
    {
      name: '상관(傷官)',
      type: 'conflict',
      score: 55,
      evaluation: 'bad',
      keyPoint: '가장 긴장감 높은 시기 - 상관이 정관을 극함',
      summary: '자유로운 표현과 독립성이 강조되지만, 정관격의 보수성과 크게 충돌할 수 있음',
      details: [
        '자신을 적극적으로 표현하고 주도권을 잡으려는 욕구',
        '감정 기복이 심해지고 충동적 언행 가능성',
        '다른 이성과의 인연이나 구설 가능성',
        '명예에 상처가 될 수 있는 위험한 시기'
      ],
      advice: '감정과 이성의 균형을 잡는 것이 매우 중요. 상대의 입장과 사회적 맥락 고려 필요'
    },
    {
      name: '정재(正財)',
      type: 'support',
      score: 90,
      evaluation: 'good',
      keyPoint: '財生官 - 재성이 관을 도움',
      summary: '안정적이고 현실적인 운세, 믿음과 실용적 기반 위에 성과를 쌓는 시기',
      details: [
        '진지한 자세와 일관된 노력',
        '재물운과 직업운이 모두 안정적',
        '사회적으로 인정받는 성과 가능',
        '현실적인 계획과 안정적인 발전'
      ],
      advice: '안정적인 흐름을 유지하며 꾸준히 노력할 것'
    },
    {
      name: '편재(偏財)',
      type: 'support',
      score: 90,
      evaluation: 'good',
      keyPoint: '財生官 + 활력',
      summary: '기회가 넓어지고 활기찬 발전 가능, 사회적 인정도 함께 얻을 수 있음',
      details: [
        '새로운 기회를 만들려는 욕구 강화',
        '적극적인 자기 표현과 다양한 활동',
        '재물 획득과 사업 확장에 유리',
        '유흥성과 쾌락 지향성도 함께 있어 주의 필요'
      ],
      advice: '충동이나 욕심으로 흐르지 않도록 주의하며 본업에 집중'
    },
    {
      name: '정관(正官)',
      type: 'enhance',
      score: 75,
      evaluation: 'average',
      keyPoint: '관성이 더 강해짐',
      summary: '책임감과 규범성이 극대화되어 안정적이나, 지나친 무게감으로 부담이 될 수 있음',
      details: [
        '사회적 위신과 명예가 강화',
        '직장에서 책임감과 의무감이 커짐',
        '규범과 체면에 과도하게 신경 쓰게 됨',
        '마음의 여유가 줄어들고 스트레스 증가'
      ],
      advice: '휴식과 유연성을 확보하며, 주변과 함께 부담을 나눌 수 있는 구조 마련'
    },
    {
      name: '편관(七殺)',
      type: 'mixed',
      score: 65,
      evaluation: 'average',
      keyPoint: '관살혼잡 우려',
      summary: '강한 열정과 경쟁심이 더해지지만, 정관과의 혼재로 내적 갈등 발생 가능',
      details: [
        '예측 불가한 열정과 외부 자극',
        '일에서 방향성이 분산될 수 있음',
        '안정적인 상태 유지에 어려움',
        '내면의 갈등과 불안정성'
      ],
      advice: '균형을 잡고 일관성 있는 태도 유지에 집중'
    },
    {
      name: '정인(正印)',
      type: 'support',
      score: 90,
      evaluation: 'good',
      keyPoint: '관인상생(官印相生)',
      summary: '안정적인 지원과 보호를 받으며, 심리적 안정감이 커지는 시기',
      details: [
        '내면의 안정과 자기 확신 강화',
        '주변으로부터 정서적 지원을 받기 좋음',
        '지적 교류와 정신적 성장',
        '내면의 깊이와 성숙도 증가'
      ],
      advice: '타인에게 의존하지 않으면서도 정서적 교류를 충분히 나눌 것'
    },
    {
      name: '편인(偏印)',
      type: 'support',
      score: 90,
      evaluation: 'good',
      keyPoint: '관인상생이나 편향적',
      summary: '독특한 시각과 창의성이 강화되며, 학문이나 기술 분야에서 성과를 낼 수 있음',
      details: [
        '독창적인 사고방식과 접근법',
        '분석적이고 통찰력 있는 시각',
        '내면 세계로의 집중으로 깊은 사색',
        '특수한 분야에서의 성취 가능'
      ],
      advice: '주변과의 소통을 의식적으로 늘리고, 마음을 열어둘 것'
    },
    {
      name: '비견(比肩)',
      type: 'support',
      score: 80,
      evaluation: 'good',
      keyPoint: '동등한 경쟁 관계',
      summary: '자기 주장과 독립성이 강해지며, 동료나 파트너와 대등한 관계를 형성',
      details: [
        '자아 정체성과 자기 주장 강화',
        '동료들과 대등한 위치에서 협력',
        '경쟁 심리로 인한 갈등 가능성',
        '자기만의 시간과 공간 필요'
      ],
      advice: '주변을 경쟁 대상이 아닌 동반자로 인식하고 협력적 관계 유지'
    },
    {
      name: '겁재(劫財)',
      type: 'support',
      score: 80,
      evaluation: 'good',
      keyPoint: '재성을 극하여 관을 약화',
      summary: '적극적인 행동력과 추진력이 생기나, 재물 관리에 주의가 필요',
      details: [
        '자기 주장이 강해지고 행동력 증가',
        '재물과 관련된 경쟁 상황 가능',
        '투자나 지출에서 충동적인 결정 주의',
        '협력보다 독자적인 행동 선호'
      ],
      advice: '충동적인 결정을 자제하고, 안정적인 재물 관리에 신경 쓸 것'
    }
  ],
  specialConditions: {
    title: '관살혼잡(官殺混雜) 특수 상황',
    description: `정관격 사주에 편관(칠살)이 함께 있으면 "관살혼잡" 상태입니다.
이 경우 각 운에서의 영향이 다르게 나타납니다.`,
    cases: [
      {
        luck: '상관운',
        normalEffect: '정관격에게는 위험한 시기 (score: 55)',
        mixedEffect: '오히려 관살의 혼잡함을 제어하고 정리하는 긍정적 역할 (score: 90)',
        reason: '상관이 관살을 대적하며 지나친 부담을 덜어주는 해방구 역할'
      },
      {
        luck: '식신운',
        normalEffect: '정관격의 규범성과 충돌 가능 (score: 65)',
        mixedEffect: '관살로 인한 불안정을 완화하고 안정감 부여 (score: 95)',
        reason: '식신이 관살을 대적하여 긴장감을 줄여줌'
      },
      {
        luck: '정재운',
        normalEffect: '안정적이고 현실적인 운세 (score: 90)',
        mixedEffect: '재생관으로 관살이 더 강해져 부담 증가 (score: 55)',
        reason: '정재가 관성을 생하고, 그 관성이 나를 극하는 흐름 반복'
      },
      {
        luck: '편재운',
        normalEffect: '활기차고 사회적 인정 (score: 90)',
        mixedEffect: '살의 기세가 더 강해져 급박하고 강압적인 기운 (score: 55)',
        reason: '편재가 관성을 도와주지만 관살 혼재 시 살성이 더 강해짐'
      },
      {
        luck: '정관운',
        normalEffect: '책임감과 안정 강화 (score: 75)',
        mixedEffect: '책임감 과부하로 중압감 심화 (score: 50)',
        reason: '관성이 더 강해지면서 규범과 체면 압박 증가'
      }
    ]
  },
  genderDifference: {
    title: '남녀별 해석 포인트',
    description: '기본 해석은 동일하나, 사회적 맥락에서 미세한 차이가 있을 수 있음',
    points: [
      {
        aspect: '책임감 표현',
        male: '가장 역할과 사회적 지위에 대한 책임감이 더 부각될 수 있음',
        female: '관계 유지와 정서적 돌봄에 대한 책임감이 더 부각될 수 있음'
      },
      {
        aspect: '명예 관련',
        male: '직업적 성공과 사회적 평판에 대한 관심이 더 클 수 있음',
        female: '관계의 품격과 사회적 시선에 대한 관심이 더 클 수 있음'
      }
    ]
  },
  analysisChecklist: {
    title: '분석 체크리스트',
    items: [
      {
        step: 1,
        title: '격국 확인',
        description: '정관격이 맞는지, 관살혼잡 여부 확인'
      },
      {
        step: 2,
        title: '현재 운 확인',
        description: '대운/세운에서 어떤 십성이 들어오는지 파악'
      },
      {
        step: 3,
        title: '관살혼잡 여부에 따른 해석 분기',
        description: '혼잡 상태면 상관/식신운이 오히려 좋고, 재성운은 주의'
      },
      {
        step: 4,
        title: '점수와 평가 참고',
        description: 'score와 evaluation(good/average/bad)로 대략적 운세 판단'
      },
      {
        step: 5,
        title: '성별에 따른 미세 조정',
        description: 'male/female 별도 해석이 있는 경우 참고'
      }
    ]
  }
};

// 운 타입별 색상
const TYPE_COLORS = {
  support: { bg: '#d1fae5', color: '#065f46', label: '도움' },
  conflict: { bg: '#fee2e2', color: '#991b1b', label: '충돌' },
  enhance: { bg: '#e0e7ff', color: '#3730a3', label: '강화' },
  mixed: { bg: '#fef3c7', color: '#92400e', label: '혼합' },
  neutral: { bg: '#f3f4f6', color: '#374151', label: '중립' },
  normal: { bg: '#f3f4f6', color: '#374151', label: '일반' }
};

// 평가별 색상
const EVAL_COLORS = {
  good: { bg: '#d1fae5', color: '#065f46' },
  average: { bg: '#fef3c7', color: '#92400e' },
  bad: { bg: '#fee2e2', color: '#991b1b' }
};

function ZhengguanLecture() {
  const navigate = useNavigate();
  const [selectedLuck, setSelectedLuck] = useState(null);
  const [showMixed, setShowMixed] = useState(false);

  const data = ZHENGGUAN_ANALYSIS;

  return (
    <div className="gyeokguk-lectures-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/admin/lectures/gyeokguk')}>
          <ArrowLeft size={18} />
          <span>격국강의</span>
        </button>
        <h1>정관격(正官格)</h1>
        <p className="page-description">정관격 분석 가이드 - 매니저용 참고 자료</p>
      </div>

      {/* 개요 섹션 */}
      <section className="lecture-section">
        <h2>{data.overview.title}</h2>
        <p className="section-description">{data.overview.description}</p>
        <div className="characteristics-list">
          {data.overview.characteristics.map((char, idx) => (
            <div key={idx} className="characteristic-item">
              <span className="bullet">•</span>
              <span>{char}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 운별 분석 섹션 */}
      <section className="lecture-section">
        <h2>십성별 운세 영향</h2>
        <p className="section-description">
          정관격이 각 운을 만났을 때의 전체적인 운세 영향을 분석합니다.
        </p>

        <div className="luck-grid">
          {data.luckPeriods.map((luck) => (
            <div
              key={luck.name}
              className={`luck-card ${selectedLuck === luck.name ? 'selected' : ''}`}
              onClick={() => setSelectedLuck(selectedLuck === luck.name ? null : luck.name)}
            >
              <div className="luck-card-header">
                <span className="luck-name">{luck.name}운</span>
                <span
                  className="luck-type"
                  style={{
                    background: TYPE_COLORS[luck.type].bg,
                    color: TYPE_COLORS[luck.type].color
                  }}
                >
                  {TYPE_COLORS[luck.type].label}
                </span>
              </div>

              <div className="luck-score-row">
                <span
                  className="score-badge"
                  style={{
                    background: EVAL_COLORS[luck.evaluation].bg,
                    color: EVAL_COLORS[luck.evaluation].color
                  }}
                >
                  {luck.score}점
                </span>
                <span className="eval-text">
                  {luck.evaluation === 'good' ? '좋음' :
                   luck.evaluation === 'average' ? '보통' : '주의'}
                </span>
              </div>

              <p className="luck-key-point">{luck.keyPoint}</p>

              {selectedLuck === luck.name && (
                <div className="luck-details">
                  <p className="luck-summary">{luck.summary}</p>
                  <ul className="detail-list">
                    {luck.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                  <div className="advice-box">
                    <strong>조언:</strong> {luck.advice}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 관살혼잡 특수 상황 */}
      <section className="lecture-section special-section">
        <h2>{data.specialConditions.title}</h2>
        <p className="section-description">{data.specialConditions.description}</p>

        <div className="toggle-container">
          <button
            className={`toggle-btn ${!showMixed ? 'active' : ''}`}
            onClick={() => setShowMixed(false)}
          >
            일반 정관격
          </button>
          <button
            className={`toggle-btn ${showMixed ? 'active' : ''}`}
            onClick={() => setShowMixed(true)}
          >
            관살혼잡 정관격
          </button>
        </div>

        <div className="comparison-table">
          <div className="table-header">
            <span>운</span>
            <span>{showMixed ? '관살혼잡 시' : '일반 정관격'}</span>
          </div>
          {data.specialConditions.cases.map((item) => (
            <div key={item.luck} className="table-row">
              <span className="luck-cell">{item.luck}</span>
              <div className="effect-cell">
                <p>{showMixed ? item.mixedEffect : item.normalEffect}</p>
                {showMixed && (
                  <p className="reason-text">이유: {item.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="key-insight">
          <h4>핵심 포인트</h4>
          <p>
            <strong>관살혼잡 시:</strong> 상관/식신운이 오히려 좋고, 재성운(정재/편재)은 주의!
          </p>
          <p>
            <strong>일반 정관격:</strong> 재성운이 좋고, 상관운은 주의!
          </p>
        </div>
      </section>

      {/* 남녀별 해석 */}
      <section className="lecture-section">
        <h2>{data.genderDifference.title}</h2>
        <p className="section-description">{data.genderDifference.description}</p>

        <div className="gender-table">
          <div className="table-header">
            <span>측면</span>
            <span>남성</span>
            <span>여성</span>
          </div>
          {data.genderDifference.points.map((point) => (
            <div key={point.aspect} className="table-row">
              <span className="aspect-cell">{point.aspect}</span>
              <span className="gender-cell">{point.male}</span>
              <span className="gender-cell">{point.female}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 분석 체크리스트 */}
      <section className="lecture-section checklist-section">
        <h2>{data.analysisChecklist.title}</h2>
        <div className="checklist">
          {data.analysisChecklist.items.map((item) => (
            <div key={item.step} className="checklist-item">
              <div className="step-number">{item.step}</div>
              <div className="step-content">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* JSON 구조 참고 */}
      <section className="lecture-section">
        <h2>데이터 구조 참고</h2>
        <p className="section-description">
          실제 JSON 파일에서 각 운세는 다음 필드를 포함합니다:
        </p>
        <div className="json-structure">
          <pre>{`{
  "keyword": "정관격 식신운",
  "title": "식신운이 정관격에게 미치는 운세 영향",
  "body": "본문 내용...",
  "score": 75,
  "evaluation": "average" | "good" | "bad",
  "summary": "요약 내용...",
  "advice": "조언 내용...",
  "male": { ... },   // 남성용 별도 해석
  "female": { ... }  // 여성용 별도 해석
}`}</pre>
        </div>

        <div className="available-keys">
          <h4>사용 가능한 키 (15개)</h4>
          <div className="key-badges">
            <span className="key-badge normal">식신</span>
            <span className="key-badge normal">상관</span>
            <span className="key-badge normal">정재</span>
            <span className="key-badge normal">편재</span>
            <span className="key-badge normal">정관</span>
            <span className="key-badge normal">편관</span>
            <span className="key-badge normal">정인</span>
            <span className="key-badge normal">편인</span>
            <span className="key-badge normal">비견</span>
            <span className="key-badge normal">겁재</span>
            <span className="key-badge mixed">상관관살혼잡</span>
            <span className="key-badge mixed">식신관살혼잡</span>
            <span className="key-badge mixed">정재관살혼잡</span>
            <span className="key-badge mixed">편재관살혼잡</span>
            <span className="key-badge mixed">정관관살혼잡</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ZhengguanLecture;
