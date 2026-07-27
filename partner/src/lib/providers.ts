// Provider delivery predefiniti (nomi propri, non serve tradurli).
// 'other' è gestito a parte con etichetta libera del partner.
export interface DeliveryProvider {
  code: string;
  name: string;
}

export const DELIVERY_PROVIDERS: DeliveryProvider[] = [
  { code: 'glovo', name: 'Glovo' },
  { code: 'deliveroo', name: 'Deliveroo' },
  { code: 'justeat', name: 'Just Eat' },
  { code: 'ubereats', name: 'Uber Eats' },
];

export function deliveryProviderName(code: string): string | null {
  return DELIVERY_PROVIDERS.find((p) => p.code === code)?.name ?? null;
}
