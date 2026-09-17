import { asPgTextArray, asPgUuidArray } from '@/lib/hris/pg-uuid-array';

describe('asPgUuidArray', () => {
  it('wraps a single UUID so Postgres ANY() is not a malformed literal', () => {
    expect(asPgUuidArray(['036d1298-a782-48e4-b3da-51e1e45abcde'])).toBe(
      '{036d1298-a782-48e4-b3da-51e1e45abcde}',
    );
  });

  it('drops non-uuid junk', () => {
    expect(asPgUuidArray(['nope', '036d1298-a782-48e4-b3da-51e1e45abcde'])).toBe(
      '{036d1298-a782-48e4-b3da-51e1e45abcde}',
    );
  });

  it('returns empty braces for empty input', () => {
    expect(asPgUuidArray([])).toBe('{}');
    expect(asPgUuidArray(null)).toBe('{}');
  });
});

describe('asPgTextArray', () => {
  it('joins string ids', () => {
    expect(asPgTextArray(['a', 'b'])).toBe('{a,b}');
  });

  it('serializes a single UUID the way Postgres ANY(text[]) expects', () => {
    expect(asPgTextArray(['036d1298-a782-48e4-b3da-51e1e45abcde'])).toBe(
      '{036d1298-a782-48e4-b3da-51e1e45abcde}',
    );
  });
});
