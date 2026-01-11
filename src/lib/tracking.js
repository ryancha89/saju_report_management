/**
 * 마케팅 추적 유틸리티
 * UTM 파라미터 및 광고 추적 데이터 관리
 */

// 추적할 UTM 파라미터 목록
const UTM_PARAMS = [
  'utm_source',    // 트래픽 소스 (google, facebook, instagram, naver 등)
  'utm_medium',    // 매체 유형 (cpc, paid, organic, email, social 등)
  'utm_campaign',  // 캠페인 이름/ID
  'utm_content',   // 광고 콘텐츠 ID
  'utm_term',      // 검색 키워드
];

// 추적할 광고 플랫폼 파라미터
const AD_PARAMS = [
  'fbclid',        // Facebook 클릭 ID
  'gclid',         // Google Ads 클릭 ID
  'ttclid',        // TikTok 클릭 ID
  'twclid',        // Twitter 클릭 ID
  'msclkid',       // Microsoft Ads 클릭 ID
];

// 커스텀 추적 파라미터
const CUSTOM_PARAMS = [
  'ch',            // 채널
  'ct',            // 콘텐츠 타입
  'cr',            // 크리에이티브
  'ref',           // 레퍼러
  'source',        // 소스 (간단 버전)
];

const STORAGE_KEY = 'ft_tracking';

/**
 * URL에서 추적 파라미터 추출
 */
export const extractTrackingParams = (url = window.location.href) => {
  const urlParams = new URLSearchParams(new URL(url).search);
  const tracking = {};

  // UTM 파라미터
  UTM_PARAMS.forEach(param => {
    const value = urlParams.get(param);
    if (value) tracking[param] = value;
  });

  // 광고 플랫폼 파라미터
  AD_PARAMS.forEach(param => {
    const value = urlParams.get(param);
    if (value) tracking[param] = value;
  });

  // 커스텀 파라미터
  CUSTOM_PARAMS.forEach(param => {
    const value = urlParams.get(param);
    if (value) tracking[param] = value;
  });

  return tracking;
};

/**
 * 추적 데이터 저장 (localStorage + sessionStorage)
 */
export const saveTrackingData = (data) => {
  if (!data || Object.keys(data).length === 0) return;

  const existingData = getTrackingData();
  const mergedData = {
    ...existingData,
    ...data,
    first_visit: existingData.first_visit || new Date().toISOString(),
    last_visit: new Date().toISOString(),
    visit_count: (existingData.visit_count || 0) + 1,
  };

  // localStorage에 저장 (브라우저 닫아도 유지)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));

  // sessionStorage에도 저장 (현재 세션용)
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));
};

/**
 * 저장된 추적 데이터 가져오기
 */
export const getTrackingData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

/**
 * 추적 데이터 초기화
 */
export const clearTrackingData = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
};

/**
 * 페이지 진입 시 자동으로 추적 파라미터 저장
 */
export const initTracking = () => {
  const params = extractTrackingParams();

  // 추가 정보
  const additionalData = {
    landing_page: window.location.pathname,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    screen_size: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
  };

  saveTrackingData({
    ...params,
    ...additionalData,
  });

  return { ...params, ...additionalData };
};

/**
 * API 요청에 포함할 추적 데이터 반환
 */
export const getTrackingForAPI = () => {
  const data = getTrackingData();

  return {
    // UTM 파라미터
    utm_source: data.utm_source || null,
    utm_medium: data.utm_medium || null,
    utm_campaign: data.utm_campaign || null,
    utm_content: data.utm_content || null,
    utm_term: data.utm_term || null,

    // 광고 클릭 ID
    fbclid: data.fbclid || null,
    gclid: data.gclid || null,

    // 커스텀 파라미터
    channel: data.ch || null,
    content_type: data.ct || null,
    creative: data.cr || null,

    // 방문 정보
    landing_page: data.landing_page || null,
    referrer: data.referrer || null,
    first_visit: data.first_visit || null,
    visit_count: data.visit_count || 1,
  };
};

/**
 * 디버그용: 현재 추적 데이터 콘솔 출력
 */
export const debugTracking = () => {
  console.group('🔍 Tracking Data');
  console.log('Current URL:', window.location.href);
  console.log('Extracted Params:', extractTrackingParams());
  console.log('Stored Data:', getTrackingData());
  console.log('API Format:', getTrackingForAPI());
  console.groupEnd();
};

export default {
  initTracking,
  getTrackingData,
  getTrackingForAPI,
  saveTrackingData,
  clearTrackingData,
  extractTrackingParams,
  debugTracking,
};
