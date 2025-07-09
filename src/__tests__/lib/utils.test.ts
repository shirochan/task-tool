/**
 * @jest-environment node
 */

import { getISOWeekStart, getISOWeekDates } from '@/lib/utils';

describe('ISO週ユーティリティ関数', () => {
  describe('getISOWeekStart', () => {
    it('月曜日の場合、同じ日付を返す', () => {
      // 2024-01-08は月曜日
      const monday = new Date('2024-01-08T12:00:00');
      const result = getISOWeekStart(monday);
      
      expect(result.toISOString().split('T')[0]).toBe('2024-01-08');
    });

    it('火曜日の場合、前の月曜日を返す', () => {
      // 2024-01-09は火曜日
      const tuesday = new Date('2024-01-09T12:00:00');
      const result = getISOWeekStart(tuesday);
      
      expect(result.toISOString().split('T')[0]).toBe('2024-01-08');
    });

    it('日曜日の場合、前の月曜日を返す', () => {
      // 2024-01-14は日曜日
      const sunday = new Date('2024-01-14T12:00:00');
      const result = getISOWeekStart(sunday);
      
      expect(result.toISOString().split('T')[0]).toBe('2024-01-08');
    });

    it('土曜日の場合、前の月曜日を返す', () => {
      // 2024-01-13は土曜日
      const saturday = new Date('2024-01-13T12:00:00');
      const result = getISOWeekStart(saturday);
      
      expect(result.toISOString().split('T')[0]).toBe('2024-01-08');
    });

    it('引数なしの場合、現在日時を基準にする', () => {
      // 現在日時を基準にしたテスト
      const result = getISOWeekStart();
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getDay()).toBe(1); // 月曜日
    });

    it('異なる年の日付でも正しく動作する', () => {
      // 2023-12-31は日曜日
      const sunday = new Date('2023-12-31T12:00:00');
      const result = getISOWeekStart(sunday);
      
      expect(result.toISOString().split('T')[0]).toBe('2023-12-25');
    });
  });

  describe('getISOWeekDates', () => {
    it('月曜日から金曜日までの5日間の配列を返す', () => {
      // 2024-01-10は水曜日
      const wednesday = new Date('2024-01-10T12:00:00');
      const result = getISOWeekDates(wednesday);
      
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        '2024-01-08', // 月曜日
        '2024-01-09', // 火曜日
        '2024-01-10', // 水曜日
        '2024-01-11', // 木曜日
        '2024-01-12', // 金曜日
      ]);
    });

    it('日曜日を基準にしても正しい週の日付を返す', () => {
      // 2024-01-14は日曜日
      const sunday = new Date('2024-01-14T12:00:00');
      const result = getISOWeekDates(sunday);
      
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        '2024-01-08', // 月曜日
        '2024-01-09', // 火曜日
        '2024-01-10', // 水曜日
        '2024-01-11', // 木曜日
        '2024-01-12', // 金曜日
      ]);
    });

    it('月をまたぐ週でも正しく動作する', () => {
      // 2024-02-01は木曜日
      const thursday = new Date('2024-02-01T12:00:00');
      const result = getISOWeekDates(thursday);
      
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        '2024-01-29', // 月曜日
        '2024-01-30', // 火曜日
        '2024-01-31', // 水曜日
        '2024-02-01', // 木曜日
        '2024-02-02', // 金曜日
      ]);
    });

    it('引数なしの場合、現在日時を基準にする', () => {
      const result = getISOWeekDates();
      
      expect(result).toHaveLength(5);
      expect(Array.isArray(result)).toBe(true);
      
      // 各日付がYYYY-MM-DD形式であることを確認
      result.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('年をまたぐ週でも正しく動作する', () => {
      // 2024-01-01は月曜日
      const monday = new Date('2024-01-01T12:00:00');
      const result = getISOWeekDates(monday);
      
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        '2024-01-01', // 月曜日
        '2024-01-02', // 火曜日
        '2024-01-03', // 水曜日
        '2024-01-04', // 木曜日
        '2024-01-05', // 金曜日
      ]);
    });

    it('うるう年の2月末でも正しく動作する', () => {
      // 2024-02-29は木曜日（うるう年）
      const thursday = new Date('2024-02-29T12:00:00');
      const result = getISOWeekDates(thursday);
      
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        '2024-02-26', // 月曜日
        '2024-02-27', // 火曜日
        '2024-02-28', // 水曜日
        '2024-02-29', // 木曜日
        '2024-03-01', // 金曜日
      ]);
    });
  });

  describe('エッジケース', () => {
    it('有効な日付範囲を返す', () => {
      const testDate = new Date('2024-01-10T12:00:00Z');
      const result = getISOWeekDates(testDate);
      
      expect(result).toHaveLength(5);
      // 各日付が有効な形式であることを確認
      result.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(date)).toBeInstanceOf(Date);
      });
    });

    it('getISOWeekStart は常に月曜日を返す', () => {
      const testDate = new Date('2024-01-10T12:00:00Z');
      const result = getISOWeekStart(testDate);
      
      expect(result.getUTCDay()).toBe(1); // 月曜日
    });
  });
});