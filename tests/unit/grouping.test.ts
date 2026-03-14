import {
  safeParseDate,
  formatMonthYear,
  formatQuarterYear,
  getValueRangeGroup,
  groupBy,
  groupByString,
  groupByBoolean,
  groupByValueRange,
  groupByMonthYear,
  groupByQuarterYear,
  groupByYear,
  groupByFirstLetter,
  createNoValueGroupTitle,
  getFieldAccessor,
  groupItemsByField,
  customerGroupingFields,
  dealGroupingFields,
  getCustomFieldGroupingOptions,
} from '@/lib/grouping';
import { customFieldService } from '@/services/data/customFieldService';

describe('grouping helpers', () => {
  test('parses and formats dates safely', () => {
    expect(safeParseDate('2026-03-10')).not.toBeNull();
    expect(safeParseDate('invalid-date')).toBeNull();
    expect(formatMonthYear(new Date(2026, 2, 10))).toContain('2026');
    expect(formatQuarterYear(new Date(2026, 2, 10))).toBe('Q1 2026');
  });

  test('groups numeric values into expected buckets', () => {
    expect(getValueRangeGroup(999)).toBe('< 1.000 €');
    expect(getValueRangeGroup(5000)).toBe('5.000 € - 9.999 €');
    expect(getValueRangeGroup('not-a-number')).toBe('Kein Wert');
  });

  test('groups string and boolean fields', () => {
    const stringGroups = groupByString(
      [{ city: 'Berlin' }, { city: 'Berlin' }, { city: 'Hamburg' }, { city: '' }],
      (item) => item.city
    );
    expect(stringGroups.map((g) => g.title)).toEqual(expect.arrayContaining(['Berlin', 'Hamburg', 'Kein Wert']));

    const boolGroups = groupByBoolean(
      [{ done: true }, { done: false }, { done: '1' }, { done: null }],
      (item) => item.done
    );
    expect(boolGroups.map((g) => g.title)).toEqual(expect.arrayContaining(['Ja', 'Nein', 'Kein Wert']));
  });

  test('groups value ranges including empty inputs', () => {
    const groups = groupByValueRange(
      [{ value: 200 }, { value: 9000 }, { value: '' }],
      (item) => item.value
    );
    expect(groups.map((g) => g.key)).toEqual(expect.arrayContaining(['< 1.000 €', '5.000 € - 9.999 €', 'no_value']));
  });

  test('resolves accessors for nested and custom fields', () => {
    const nestedAccessor = getFieldAccessor<{ a: { b: string } }>('a.b');
    expect(nestedAccessor({ a: { b: 'x' } })).toBe('x');

    const customAccessor = getFieldAccessor<{ customFields: Record<string, unknown> }>('custom_customType');
    expect(customAccessor({ customFields: { customType: 'VIP' } })).toBe('VIP');
  });

  test('groups items by selected grouping field', () => {
    const data = [
      { id: 1, status: 'Active' },
      { id: 2, status: 'Lead' },
      { id: 3, status: 'Active' },
    ];
    const groups = groupItemsByField(data, 'status', customerGroupingFields);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === 'Active')?.items).toHaveLength(2);
  });

  test('createNoValueGroupTitle includes field name', () => {
    const title = createNoValueGroupTitle('city');
    expect(title).toContain('city');
  });

  test('groupByMonthYear groups dates correctly', () => {
    const items = [
      { date: '2026-01-15' },
      { date: '2026-01-20' },
      { date: '2026-03-10' },
      { date: null },
      { date: 'not-a-date' },
    ];
    const groups = groupByMonthYear(items, (i) => i.date);
    const titles = groups.map((g) => g.title);
    expect(titles.some((t) => t.includes('2026'))).toBe(true);
    // null and invalid dates go to "Kein Datum"
    expect(titles).toContain('Kein Datum');
  });

  test('groupByQuarterYear groups dates by quarter', () => {
    const items = [
      { date: '2026-01-01' }, // Q1
      { date: '2026-04-01' }, // Q2
      { date: '2026-10-01' }, // Q4
      { date: null },
    ];
    const groups = groupByQuarterYear(items, (i) => i.date);
    const titles = groups.map((g) => g.title);
    expect(titles).toContain('Q1 2026');
    expect(titles).toContain('Q2 2026');
    expect(titles).toContain('Q4 2026');
    // null dates go to "Kein Datum"
    expect(titles).toContain('Kein Datum');
  });

  test('groupByYear groups dates by year', () => {
    const items = [
      { date: '2024-06-01' },
      { date: '2025-06-01' },
      { date: '2026-06-01' },
      { date: null },
    ];
    const groups = groupByYear(items, (i) => i.date);
    const titles = groups.map((g) => g.title);
    expect(titles).toContain('2024');
    expect(titles).toContain('2025');
    expect(titles).toContain('2026');
    // null dates go to "Kein Datum"
    expect(titles).toContain('Kein Datum');
  });

  test('groupByFirstLetter groups by first letter', () => {
    const items = [
      { name: 'Alice' },
      { name: 'Anna' },
      { name: 'Bob' },
      { name: '' },
      { name: null },
    ];
    const groups = groupByFirstLetter(items, (i) => i.name);
    const titles = groups.map((g) => g.title);
    expect(titles).toContain('A');
    expect(titles).toContain('B');
    // empty/null values go to "#"
    expect(titles).toContain('#');
    expect(groups.find((g) => g.title === 'A')?.items).toHaveLength(2);
  });

  test('dealGroupingFields is a non-empty array with value and label', () => {
    expect(dealGroupingFields.length).toBeGreaterThan(0);
    for (const field of dealGroupingFields) {
      expect(field).toHaveProperty('value');
      expect(field).toHaveProperty('label');
    }
  });

  test('groupBy uses default getGroupTitle when none provided', () => {
    const items = [{ x: 'A' }, { x: 'B' }, { x: 'A' }];
    // Calling groupBy without a getGroupTitle argument triggers the default key => key
    const groups = groupBy(items, (i) => i.x);
    const titles = groups.map((g) => g.title);
    expect(titles).toContain('A');
    expect(titles).toContain('B');
  });

  test('exercising all dealGroupingFields groupingFn closures', () => {
    const dealItems = [
      {
        stage: 'Negotiation',
        customer: 'Acme',
        value: 5000,
        createdDate: '2026-01-10',
        expectedCloseDate: '2026-06-30',
        value_calculation_method: 'fixed',
      },
    ];
    for (const field of dealGroupingFields) {
      const accessor = getFieldAccessor<typeof dealItems[0]>(field.value);
      expect(() => field.groupingFn(dealItems, accessor)).not.toThrow();
    }
  });

  test('exercising all customerGroupingFields groupingFn closures', () => {
    const customerItems = [
      { status: 'Active', name: 'Alice', company: 'ACME', city: 'Berlin', country: 'Germany' },
      { status: 'Lead', name: 'Bob', company: 'Beta', city: 'Munich', country: 'Germany' },
    ];
    for (const field of customerGroupingFields) {
      const accessor = getFieldAccessor<typeof customerItems[0]>(field.value);
      expect(() => field.groupingFn(customerItems, accessor)).not.toThrow();
    }
  });

  test('getValueRangeGroup covers all buckets including large values', () => {
    expect(getValueRangeGroup(1500)).toBe('1.000 € - 4.999 €');
    expect(getValueRangeGroup(25000)).toBe('10.000 € - 49.999 €');
    expect(getValueRangeGroup(75000)).toBe('≥ 50.000 €');
  });

  test('groupByBoolean handles string false/no and numeric values', () => {
    const items = [
      { val: 'false' },  // string 'false'
      { val: 'no' },     // string 'no'
      { val: 'nein' },   // string 'nein'
      { val: '0' },      // string '0'
      { val: 0 },        // number 0 → false
      { val: 1 },        // number 1 → true
      { val: 'other' },  // unrecognized string → no_value
    ];
    const groups = groupByBoolean(items, (i) => i.val);
    const titles = groups.map((g) => g.title);
    expect(titles).toContain('Nein');
    expect(titles).toContain('Ja');
    expect(titles).toContain('Kein Wert');
  });

  test('getFieldAccessor handles createdDate_quarter and missing customFields', () => {
    // Special case: createdDate_quarter → reads from createdDate
    const quarterAccessor = getFieldAccessor<{ createdDate: string }>('createdDate_quarter');
    expect(quarterAccessor({ createdDate: '2026-01-15' })).toBe('2026-01-15');

    // Custom field accessor when item has no customFields property
    const customAccessor = getFieldAccessor<{}>('custom_missing');
    expect(customAccessor({})).toBeUndefined();
  });

  test('getCustomFieldGroupingOptions returns [] on error', async () => {
    const spy = jest.spyOn(customFieldService, 'getActiveCustomFields').mockRejectedValue(new Error('fetch failed'));
    const options = await getCustomFieldGroupingOptions();
    expect(options).toEqual([]);
    spy.mockRestore();
  });

  test('builds grouping options from active custom fields for all field types', async () => {
    const fields = [
      { id: 1, name: 'text_field', label: 'Text', type: 'text', required: false, display_order: 0, active: true, created_at: '', updated_at: '' },
      { id: 2, name: 'num_field', label: 'Number', type: 'number', required: false, display_order: 1, active: true, created_at: '', updated_at: '' },
      { id: 3, name: 'date_field', label: 'Date', type: 'date', required: false, display_order: 2, active: true, created_at: '', updated_at: '' },
      { id: 4, name: 'bool_field', label: 'Bool', type: 'boolean', required: false, display_order: 3, active: true, created_at: '', updated_at: '' },
      { id: 5, name: 'sel_field', label: 'Select', type: 'select', required: false, display_order: 4, active: true, created_at: '', updated_at: '' },
      { id: 6, name: 'unknown_field', label: 'Other', type: 'textarea' as any, required: false, display_order: 5, active: true, created_at: '', updated_at: '' },
    ];
    const spy = jest.spyOn(customFieldService, 'getActiveCustomFields').mockResolvedValue(fields);

    const options = await getCustomFieldGroupingOptions();
    expect(options).toHaveLength(6);
    // Verify groupingFn works for each type
    const items = [{ val: 'a' }, { val: 'b' }];
    for (const option of options) {
      expect(() => option.groupingFn(items, (i: any) => i.val)).not.toThrow();
    }
    spy.mockRestore();
  });

  test('builds grouping options from active custom fields', async () => {
    const spy = jest.spyOn(customFieldService, 'getActiveCustomFields').mockResolvedValue([
      {
        id: 1,
        name: 'vip_status',
        label: 'VIP Status',
        type: 'select',
        required: false,
        display_order: 0,
        active: true,
        created_at: '',
        updated_at: '',
      },
    ]);

    const options = await getCustomFieldGroupingOptions();
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('custom_vip_status');
    spy.mockRestore();
  });
});
