// 가격 설정 파일 - 모든 가격은 여기서 관리
export const PRICING = {
  // Blueprint Pro (Full)
  BLUEPRINT_PRO: {
    originalPrice: 150000,
    currentPrice: 66000,
    discountPercent: 41,
  },
  // Blueprint Lite
  BLUEPRINT_LITE: {
    originalPrice: 77000,
    currentPrice: 44000,
    discountPercent: 29,
  },
};

// 가격 포맷 함수
export const formatPrice = (price) => {
  return price.toLocaleString();
};
