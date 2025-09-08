import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to intelligently merge CSS class names with Tailwind CSS conflict resolution
 * 
 * This function combines the power of clsx for conditional class composition with tailwind-merge
 * to handle Tailwind CSS class conflicts intelligently. It ensures that conflicting utility 
 * classes are properly resolved, preventing style inconsistencies and maintaining optimal specificity.
 * 
 * @param inputs - Variable number of class values (strings, objects, arrays, conditionals, etc.)
 * @returns A clean, deduplicated string of CSS classes with conflicts resolved
 * 
 * @example
 * ```typescript
 * // Class conflict resolution
 * cn('px-2 py-1', 'px-3') // → 'py-1 px-3'
 * 
 * // Conditional class application
 * cn('text-red-500', { 'text-blue-500': isActive })
 * 
 * // Mixed input handling
 * cn(['bg-white', 'shadow-lg'], undefined, 'rounded-md')
 * 
 * // Complex conditional logic
 * cn({
 *   'bg-blue-500 text-white': isPrimary,
 *   'bg-red-500 text-white': isDanger,
 *   'opacity-50 pointer-events-none': isDisabled
 * })
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}

/**
 * Type guard utility to determine if a value is a non-empty string
 * 
 * Provides runtime type safety by narrowing unknown types to non-empty strings.
 * Particularly useful for validating user input, API responses, and optional parameters.
 * 
 * @param value - The value to be type-checked
 * @returns Type predicate indicating if value is a non-empty string
 * 
 * @example
 * ```typescript
 * const userInput: unknown = getUserInput();
 * 
 * if (isNonEmptyString(userInput)) {
 *   // TypeScript knows userInput is string here
 *   console.log(userInput.toUpperCase());
 * }
 * ```
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Sanitizes and normalizes class name strings by removing extraneous whitespace
 * and filtering out empty or invalid values
 * 
 * This utility ensures consistent class name formatting across your application,
 * preventing issues caused by irregular spacing or empty class segments.
 * 
 * @param className - The class name string to normalize
 * @returns A clean, properly formatted class name string
 * 
 * @example
 * ```typescript
 * formatClassName('  px-4   py-2  ') // → 'px-4 py-2'
 * formatClassName('') // → ''
 * formatClassName(null) // → ''
 * formatClassName('btn   primary    ') // → 'btn primary'
 * ```
 */
export function formatClassName(className: string | undefined | null): string {
  if (!className) return '';
  
  return className
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/**
 * Generates conditional class names based on boolean evaluation
 * 
 * A clean, functional approach to applying styles conditionally without
 * cluttering your JSX with ternary operators. Supports both positive and
 * negative conditions with optional fallback classes.
 * 
 * @param condition - Boolean condition to evaluate
 * @param trueClass - Class name(s) to apply when condition is truthy
 * @param falseClass - Optional class name(s) to apply when condition is falsy
 * @returns The appropriate class name string based on the condition
 * 
 * @example
 * ```typescript
 * // Simple conditional styling
 * conditionalClass(isActive, 'bg-blue-500 text-white')
 * 
 * // With fallback styling
 * conditionalClass(isActive, 'bg-blue-500', 'bg-gray-200')
 * 
 * // Complex state-based styling
 * conditionalClass(
 *   isDisabled, 
 *   'opacity-50 cursor-not-allowed', 
 *   'hover:scale-105 transition-transform'
 * )
 * ```
 */
export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass: string = ''
): string {
  return condition ? trueClass : falseClass;
}

/**
 * Type definition for component variant configuration
 * Provides type safety for variant-based component systems
 */
export type VariantConfig<T extends string = string> = Record<string, Record<T, string>>;

/**
 * Type for active variant selections
 */
export type ActiveVariants<T extends VariantConfig> = Partial<{
  [K in keyof T]: keyof T[K];
}>;

/**
 * Advanced variant merger for component-based styling systems
 * 
 * Intelligently combines base styles with variant-specific classes to create
 * flexible, maintainable component styling. Perfect for design systems and
 * component libraries that require consistent variant management.
 * 
 * @param baseClasses - Base class names applied to all variants
 * @param variantConfig - Configuration object defining available variants
 * @param activeVariants - Object specifying which variants are currently active
 * @returns Merged class name string with base and active variant styles
 * 
 * @example
 * ```typescript
 * const buttonStyles = mergeVariants(
 *   'inline-flex items-center justify-center rounded-md font-medium transition-colors',
 *   {
 *     size: { 
 *       sm: 'h-8 px-3 text-xs', 
 *       md: 'h-10 px-4 text-sm', 
 *       lg: 'h-12 px-6 text-base' 
 *     },
 *     variant: { 
 *       primary: 'bg-blue-600 text-white hover:bg-blue-700', 
 *       secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
 *       ghost: 'hover:bg-slate-100 hover:text-slate-900'
 *     },
 *     intent: {
 *       default: '',
 *       destructive: 'text-red-600 hover:text-red-700'
 *     }
 *   },
 *   { size: 'md', variant: 'primary', intent: 'default' }
 * );
 * ```
 */
export function mergeVariants<T extends VariantConfig>(
  baseClasses: string,
  variantConfig: T,
  activeVariants: ActiveVariants<T>
): string {
  const appliedVariants = Object.entries(activeVariants)
    .map(([variantKey, variantValue]) => {
      const variantGroup = variantConfig[variantKey];
      if (!variantGroup || !variantValue) return '';
      
      const selectedVariant = variantGroup[variantValue as string];
      return selectedVariant || '';
    })
    .filter(isNonEmptyString);

  return cn(baseClasses, ...appliedVariants);
}

/**
 * Configuration type for responsive breakpoint styling
 * Supports all standard Tailwind CSS breakpoints with optional base styles
 */
export type ResponsiveClassConfig = {
  /** Base styles applied at all screen sizes */
  base?: string;
  /** Small screens (640px+) */
  sm?: string;
  /** Medium screens (768px+) */
  md?: string;
  /** Large screens (1024px+) */
  lg?: string;
  /** Extra large screens (1280px+) */
  xl?: string;
  /** 2X large screens (1536px+) */
  '2xl'?: string;
};

/**
 * Generates responsive class names from a structured configuration
 * 
 * Streamlines the creation of responsive designs by automatically prefixing
 * breakpoint-specific classes. Ensures consistent responsive behavior across
 * your application while maintaining clean, readable code.
 * 
 * @param config - Configuration object containing responsive class definitions
 * @returns A properly formatted string of responsive class names
 * 
 * @example
 * ```typescript
 * // Progressive enhancement approach
 * const responsiveText = createResponsiveClasses({
 *   base: 'text-sm leading-relaxed',
 *   md: 'text-base leading-normal',
 *   lg: 'text-lg leading-tight',
 *   xl: 'text-xl'
 * }); 
 * // → 'text-sm leading-relaxed md:text-base md:leading-normal lg:text-lg lg:leading-tight xl:text-xl'
 * 
 * // Layout responsive classes
 * const responsiveGrid = createResponsiveClasses({
 *   base: 'grid grid-cols-1 gap-4',
 *   sm: 'grid-cols-2 gap-6',
 *   lg: 'grid-cols-3 gap-8',
 *   '2xl': 'grid-cols-4'
 * });
 * ```
 */
export function createResponsiveClasses(config: ResponsiveClassConfig): string {
  const { base, ...responsiveBreakpoints } = config;
  
  const responsiveClassNames = Object.entries(responsiveBreakpoints)
    .map(([breakpoint, classNames]) => {
      if (!isNonEmptyString(classNames)) return '';
      
      // Handle multiple classes for a breakpoint
      return classNames
        .split(/\s+/)
        .filter(Boolean)
        .map(className => `${breakpoint}:${className}`)
        .join(' ');
    })
    .filter(isNonEmptyString);

  return cn(base, ...responsiveClassNames);
}

/**
 * Utility for creating focus-visible classes with consistent styling
 * 
 * @param customFocusClasses - Optional custom focus classes
 * @returns Standard or custom focus-visible classes
 * 
 * @example
 * ```typescript
 * const focusClasses = createFocusClasses(); 
 * // → 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
 * 
 * const customFocus = createFocusClasses('focus-visible:ring-red-500');
 * ```
 */
export function createFocusClasses(customFocusClasses?: string): string {
  const defaultFocusClasses = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
  return customFocusClasses || defaultFocusClasses;
}

/**
 * Creates animation classes with consistent timing and easing
 * 
 * @param animationType - Type of animation to apply
 * @param duration - Duration of the animation (default: 'duration-200')
 * @param easing - Timing function (default: 'ease-in-out')
 * @returns Animation class string
 * 
 * @example
 * ```typescript
 * createAnimationClasses('fade') // → 'transition-opacity duration-200 ease-in-out'
 * createAnimationClasses('transform', 'duration-300', 'ease-out')
 * ```
 */
export function createAnimationClasses(
  animationType: 'fade' | 'transform' | 'colors' | 'all' = 'all',
  duration: string = 'duration-200',
  easing: string = 'ease-in-out'
): string {
  const transitionMap = {
    fade: 'transition-opacity',
    transform: 'transition-transform',
    colors: 'transition-colors',
    all: 'transition-all'
  };

  return cn(transitionMap[animationType], duration, easing);
}
