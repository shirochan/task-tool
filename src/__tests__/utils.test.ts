import { cn, getISOWeekStart, getISOWeekDates } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should combine class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'not-applied')).toBe('base conditional');
    });

    it('should merge Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
      expect(cn(null, undefined)).toBe('');
    });

    it('should handle arrays', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    it('should handle objects', () => {
      expect(cn({ 'class1': true, 'class2': false, 'class3': true })).toBe('class1 class3');
    });
  });

  describe('getISOWeekStart', () => {
    it('should return Monday for a Tuesday', () => {
      const tuesday = new Date('2024-01-02T12:00:00Z'); // 2024年1月2日火曜日
      const monday = getISOWeekStart(tuesday);
      
      expect(monday.getDay()).toBe(1); // 月曜日
      expect(monday.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should return the same day for a Monday', () => {
      const monday = new Date('2024-01-01T12:00:00Z'); // 2024年1月1日月曜日
      const result = getISOWeekStart(monday);
      
      expect(result.getDay()).toBe(1); // 月曜日
      expect(result.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should return previous Monday for a Sunday', () => {
      const sunday = new Date('2024-01-07T12:00:00Z'); // 2024年1月7日日曜日
      const monday = getISOWeekStart(sunday);
      
      expect(monday.getDay()).toBe(1); // 月曜日
      expect(monday.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should return previous Monday for a Friday', () => {
      const friday = new Date('2024-01-05T12:00:00Z'); // 2024年1月5日金曜日
      const monday = getISOWeekStart(friday);
      
      expect(monday.getDay()).toBe(1); // 月曜日
      expect(monday.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should use current date when no parameter provided', () => {
      const result = getISOWeekStart();
      expect(result).toBeInstanceOf(Date);
      expect(result.getDay()).toBe(1); // 月曜日
    });
  });

  describe('getISOWeekDates', () => {
    it('should return 5 dates for weekdays', () => {
      const monday = new Date('2024-01-01T12:00:00Z'); // 2024年1月1日月曜日
      const weekDates = getISOWeekDates(monday);
      
      expect(weekDates).toHaveLength(5);
      expect(weekDates).toEqual([
        '2024-01-01', // 月曜日
        '2024-01-02', // 火曜日
        '2024-01-03', // 水曜日
        '2024-01-04', // 木曜日
        '2024-01-05', // 金曜日
      ]);
    });

    it('should return correct dates when starting from Tuesday', () => {
      const tuesday = new Date('2024-01-02T12:00:00Z'); // 2024年1月2日火曜日
      const weekDates = getISOWeekDates(tuesday);
      
      expect(weekDates).toHaveLength(5);
      expect(weekDates).toEqual([
        '2024-01-01', // 月曜日（前日）
        '2024-01-02', // 火曜日（今日）
        '2024-01-03', // 水曜日
        '2024-01-04', // 木曜日
        '2024-01-05', // 金曜日
      ]);
    });

    it('should return correct dates when starting from Sunday', () => {
      const sunday = new Date('2024-01-07T12:00:00Z'); // 2024年1月7日日曜日
      const weekDates = getISOWeekDates(sunday);
      
      expect(weekDates).toHaveLength(5);
      expect(weekDates).toEqual([
        '2024-01-01', // 前週の月曜日
        '2024-01-02', // 前週の火曜日
        '2024-01-03', // 前週の水曜日
        '2024-01-04', // 前週の木曜日
        '2024-01-05', // 前週の金曜日
      ]);
    });

    it('should use current date when no parameter provided', () => {
      const result = getISOWeekDates();
      expect(result).toHaveLength(5);
      expect(Array.isArray(result)).toBe(true);
      result.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD形式
      });
    });

    it('should handle month boundaries correctly', () => {
      const endOfMonth = new Date('2024-01-30T12:00:00Z'); // 2024年1月30日火曜日
      const weekDates = getISOWeekDates(endOfMonth);
      
      expect(weekDates).toHaveLength(5);
      expect(weekDates).toEqual([
        '2024-01-29', // 月曜日
        '2024-01-30', // 火曜日
        '2024-01-31', // 水曜日
        '2024-02-01', // 木曜日（翌月）
        '2024-02-02', // 金曜日（翌月）
      ]);
    });

    it('should handle year boundaries correctly', () => {
      const endOfYear = new Date('2023-12-31T12:00:00Z'); // 2023年12月31日日曜日
      const weekDates = getISOWeekDates(endOfYear);
      
      expect(weekDates).toHaveLength(5);
      expect(weekDates).toEqual([
        '2023-12-25', // 前週の月曜日
        '2023-12-26', // 前週の火曜日
        '2023-12-27', // 前週の水曜日
        '2023-12-28', // 前週の木曜日
        '2023-12-29', // 前週の金曜日
      ]);
    });
  });
});