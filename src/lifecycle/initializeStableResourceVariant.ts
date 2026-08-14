export interface StableResourceInitializationOptions<Variant> {
  getTargetVariant: () => Variant;
  initialize: (variant: Variant) => Promise<unknown>;
  switchVariant: (variant: Variant) => Promise<unknown>;
}

export interface StableResourceInitializationResult<Variant> {
  variant: Variant;
  loadPasses: number;
}

export async function initializeStableResourceVariant<Variant>(
  options: StableResourceInitializationOptions<Variant>,
): Promise<StableResourceInitializationResult<Variant>> {
  let variant = options.getTargetVariant();
  let loadPasses = 1;
  await options.initialize(variant);
  while (options.getTargetVariant() !== variant) {
    variant = options.getTargetVariant();
    loadPasses += 1;
    await options.switchVariant(variant);
  }
  return { variant, loadPasses };
}
