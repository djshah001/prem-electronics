export type PricingLineInput = {
  id: string;
  quantity: number;
  unitPriceMinor: number;
  gstRateBps: number;
};

export type PricedLine = PricingLineInput & {
  grossMinor: number;
  discountMinor: number;
  taxableMinor: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  taxMinor: number;
  finalMinor: number;
};

const roundRatio = (numerator: number, denominator: number) => Math.floor((numerator + denominator / 2) / denominator);

export const calculateGstPricing = (input: {
  lines: PricingLineInput[];
  discountMinor: number;
  shippingMinor: number;
  taxMode: 'exclusive' | 'inclusive';
  supplierStateCode?: string;
  placeOfSupplyStateCode?: string;
}) => {
  const subtotalMinor = input.lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
  const boundedDiscount = Math.min(Math.max(input.discountMinor, 0), subtotalMinor);
  let allocatedDiscount = 0;
  const sameState = Boolean(input.supplierStateCode && input.placeOfSupplyStateCode && input.supplierStateCode === input.placeOfSupplyStateCode);

  const lines: PricedLine[] = input.lines.map((line, index) => {
    const grossMinor = line.unitPriceMinor * line.quantity;
    const discountMinor = index === input.lines.length - 1
      ? boundedDiscount - allocatedDiscount
      : Math.floor((boundedDiscount * grossMinor) / Math.max(subtotalMinor, 1));
    allocatedDiscount += discountMinor;
    const discountedMinor = grossMinor - discountMinor;
    const taxableMinor = input.taxMode === 'inclusive'
      ? roundRatio(discountedMinor * 10_000, 10_000 + line.gstRateBps)
      : discountedMinor;
    const taxMinor = input.taxMode === 'inclusive'
      ? discountedMinor - taxableMinor
      : roundRatio(taxableMinor * line.gstRateBps, 10_000);
    const cgstMinor = sameState ? Math.floor(taxMinor / 2) : 0;
    const sgstMinor = sameState ? taxMinor - cgstMinor : 0;
    const igstMinor = sameState ? 0 : taxMinor;
    return {
      ...line, grossMinor, discountMinor, taxableMinor, cgstMinor, sgstMinor, igstMinor, taxMinor,
      finalMinor: discountedMinor + (input.taxMode === 'exclusive' ? taxMinor : 0),
    };
  });

  const taxableMinor = lines.reduce((sum, line) => sum + line.taxableMinor, 0);
  const cgstMinor = lines.reduce((sum, line) => sum + line.cgstMinor, 0);
  const sgstMinor = lines.reduce((sum, line) => sum + line.sgstMinor, 0);
  const igstMinor = lines.reduce((sum, line) => sum + line.igstMinor, 0);
  const taxMinor = cgstMinor + sgstMinor + igstMinor;
  const itemsTotalMinor = lines.reduce((sum, line) => sum + line.finalMinor, 0);
  return {
    lines,
    subtotalMinor,
    discountMinor: boundedDiscount,
    taxableMinor,
    cgstMinor,
    sgstMinor,
    igstMinor,
    taxMinor,
    shippingMinor: input.shippingMinor,
    totalMinor: itemsTotalMinor + input.shippingMinor,
    jurisdiction: sameState ? 'intra_state' as const : 'inter_state' as const,
  };
};
