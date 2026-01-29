import { useState, useEffect } from 'react';
import { PRICING } from '../lib/pricing';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

export function usePricing() {
  const [pricing, setPricing] = useState({
    pro: { originalPrice: 0, currentPrice: 0, discountPercent: 0 },
    lite: { originalPrice: 0, currentPrice: 0, discountPercent: 0 },
    saleActive: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchPricing = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/blueprint/sale_status?platform=web&_t=${Date.now()}`, {
          headers: {
            'Saju-Authorization': `Bearer-${API_TOKEN}`,
          },
          cache: 'no-store',
        });
        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;

          const parsePrice = (val) => {
            if (!val && val !== 0) return null;
            return parseInt(String(val).replace(/,/g, ''));
          };

          const proOriginal = parsePrice(data.pro_original_price) ?? PRICING.BLUEPRINT_PRO.originalPrice;
          const proSale = parsePrice(data.pro_sale_price) ?? PRICING.BLUEPRINT_PRO.currentPrice;
          const liteOriginal = parsePrice(data.lite_original_price) ?? PRICING.BLUEPRINT_LITE.originalPrice;
          const liteSale = parsePrice(data.lite_sale_price) ?? PRICING.BLUEPRINT_LITE.currentPrice;

          setPricing({
            pro: {
              originalPrice: proOriginal,
              currentPrice: proSale,
              discountPercent: data.pro_discount_rate || Math.round((1 - proSale / proOriginal) * 100),
            },
            lite: {
              originalPrice: liteOriginal,
              currentPrice: liteSale,
              discountPercent: data.lite_discount_rate || Math.round((1 - liteSale / liteOriginal) * 100),
            },
            saleActive: data.sale_active || false,
            loading: false,
          });
        } else {
          if (!cancelled) {
            setPricing({
              pro: { ...PRICING.BLUEPRINT_PRO },
              lite: { ...PRICING.BLUEPRINT_LITE },
              saleActive: false,
              loading: false,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err);
        if (!cancelled) {
          setPricing({
            pro: { ...PRICING.BLUEPRINT_PRO },
            lite: { ...PRICING.BLUEPRINT_LITE },
            saleActive: false,
            loading: false,
          });
        }
      }
    };

    fetchPricing();

    return () => {
      cancelled = true;
    };
  }, []);

  return pricing;
}
