import { cn } from '@/lib/utils';

describe('cn', () => {
  test('joins class names with a space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  test('deduplicates conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge: p-6 wins over p-4
    expect(cn('p-4', 'p-6')).toBe('p-6');
  });

  test('filters out falsy values (undefined, false, null)', () => {
    expect(cn(undefined, false as any, null as any, 'active')).toBe('active');
  });

  test('handles conditional classes from an object', () => {
    expect(cn({ 'bg-red-500': true, 'text-white': false })).toBe('bg-red-500');
  });

  test('returns empty string when no truthy classes provided', () => {
    expect(cn(undefined, false as any)).toBe('');
  });

  test('handles multiple conflicting utilities', () => {
    // tailwind-merge resolves text-sm vs text-lg
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });
});
