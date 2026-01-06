import { parseTradingViewCSV } from '@/lib/importers/tradingview';
import { describe, expect, it } from 'vitest';

describe('tradingview importer', () => {
  describe('parseTradingViewCSV', () => {
    describe('basic parsing', () => {
      it('should parse standard CSV with header', () => {
        const csv = `time,open,high,low,close,volume
1609459200,100,110,95,105,1000
1609545600,105,115,100,110,1200`;

        const result = parseTradingViewCSV(csv);

        expect(result.bars).toHaveLength(2);
        expect(result.bars[0]).toEqual({
          time: 1609459200,
          open: 100,
          high: 110,
          low: 95,
          close: 105,
          volume: 1000,
        });
      });

      it('should return empty bars array for empty CSV', () => {
        const result = parseTradingViewCSV('');
        expect(result.bars).toEqual([]);
      });

      it('should handle whitespace-only CSV', () => {
        const result = parseTradingViewCSV('   \n   \n');
        expect(result.bars).toEqual([]);
      });
    });

    describe('delimiter detection', () => {
      it('should handle comma delimiter', () => {
        const csv = `time,open,high,low,close,volume
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });

      it('should handle semicolon delimiter', () => {
        const csv = `time;open;high;low;close;volume
1609459200;100;110;95;105;1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
        expect(result.bars[0].open).toBe(100);
      });

      it('should handle tab delimiter', () => {
        const csv = `time\topen\thigh\tlow\tclose\tvolume
1609459200\t100\t110\t95\t105\t1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
        expect(result.bars[0].open).toBe(100);
      });
    });

    describe('header variations', () => {
      it('should handle "timestamp" header', () => {
        const csv = `timestamp,open,high,low,close,volume
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });

      it('should handle "date" header', () => {
        const csv = `date,open,high,low,close,volume
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });

      it('should handle "vol" header instead of "volume"', () => {
        const csv = `time,open,high,low,close,vol
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].volume).toBe(1000);
      });

      it('should handle case-insensitive headers', () => {
        const csv = `TIME,OPEN,HIGH,LOW,CLOSE,VOLUME
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });
    });

    describe('timestamp parsing', () => {
      it('should handle Unix seconds', () => {
        const csv = `time,open,high,low,close,volume
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].time).toBe(1609459200);
      });

      it('should convert milliseconds to seconds', () => {
        const csv = `time,open,high,low,close,volume
1609459200000,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].time).toBe(1609459200);
      });

      it('should parse ISO date format', () => {
        const csv = `time,open,high,low,close,volume
2021-01-01 00:00:00,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].time).toBeGreaterThan(0);
      });

      it('should handle date with T separator', () => {
        const csv = `time,open,high,low,close,volume
2021-01-01T00:00:00,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].time).toBeGreaterThan(0);
      });
    });

    describe('number parsing', () => {
      it('should parse decimal numbers', () => {
        const csv = `time,open,high,low,close,volume
1609459200,100.50,110.75,95.25,105.00,1000.5`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].open).toBe(100.5);
        expect(result.bars[0].high).toBe(110.75);
      });

      it('should handle underscores in numbers', () => {
        const csv = `time,open,high,low,close,volume
1609459200,1_000,1_100,950,1_050,1_000_000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].open).toBe(1000);
        expect(result.bars[0].volume).toBe(1000000);
      });

      it('should default volume to 0 if invalid', () => {
        const csv = `time,open,high,low,close,volume
1609459200,100,110,95,105,invalid`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].volume).toBe(0);
      });
    });

    describe('metadata extraction', () => {
      it('should extract symbol from metadata line', () => {
        const csv = `BTCUSD,1h
time,open,high,low,close,volume
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.symbol).toBe('BTCUSD');
      });

      it('should extract timeframe from metadata line', () => {
        const csv = `BTCUSD,1h
time,open,high,low,close,volume
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.timeframe).toBe('1h');
      });
    });

    describe('sorting', () => {
      it('should sort bars by time ascending', () => {
        const csv = `time,open,high,low,close,volume
1609545600,105,115,100,110,1200
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);

        expect(result.bars[0].time).toBe(1609459200);
        expect(result.bars[1].time).toBe(1609545600);
      });

      it('should maintain sort order for already sorted data', () => {
        const csv = `time,open,high,low,close,volume
1609459200,100,110,95,105,1000
1609545600,105,115,100,110,1200
1609632000,110,120,105,115,1400`;

        const result = parseTradingViewCSV(csv);

        expect(result.bars[0].time).toBe(1609459200);
        expect(result.bars[1].time).toBe(1609545600);
        expect(result.bars[2].time).toBe(1609632000);
      });
    });

    describe('line filtering', () => {
      it('should ignore comment lines starting with #', () => {
        const csv = `# This is a comment
time,open,high,low,close,volume
# Another comment
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });

      it('should ignore comment lines starting with //', () => {
        const csv = `// Comment
time,open,high,low,close,volume
1609459200,100,110,95,105,1000`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });

      it('should skip lines with insufficient columns', () => {
        const csv = `time,open,high,low,close,volume
1609459200,100,110,95,105,1000
1609545600,105,115
1609632000,110,120,105,115,1400`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(2);
      });
    });

    describe('data validation', () => {
      it('should skip rows with invalid time', () => {
        const csv = `time,open,high,low,close,volume
invalid,100,110,95,105,1000
1609545600,105,115,100,110,1200`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });

      it('should skip rows with invalid OHLC values', () => {
        const csv = `time,open,high,low,close,volume
1609459200,invalid,110,95,105,1000
1609545600,105,115,100,110,1200`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });
    });

    describe('fallback header', () => {
      it('should use fallback column order when header is not recognized', () => {
        // First line doesn't match header pattern, so it's treated as data row
        // Only one data row after the "header" detection
        const csv = `unknown,col,names,here,data,now
1609545600,105,115,100,110,1200`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
        expect(result.bars[0].time).toBe(1609545600);
        expect(result.bars[0].open).toBe(105);
      });
    });

    describe('line endings', () => {
      it('should handle Windows line endings (CRLF)', () => {
        const csv = 'time,open,high,low,close,volume\r\n1609459200,100,110,95,105,1000\r\n';

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });

      it('should handle Unix line endings (LF)', () => {
        const csv = 'time,open,high,low,close,volume\n1609459200,100,110,95,105,1000\n';

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
      });
    });

    describe('edge cases', () => {
      it('should handle large numbers', () => {
        const csv = `time,open,high,low,close,volume
1609459200,50000.12345,51000.99999,49000.00001,50500.55555,999999999`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].open).toBeCloseTo(50000.12345, 5);
        expect(result.bars[0].volume).toBe(999999999);
      });

      it('should handle zero values', () => {
        const csv = `time,open,high,low,close,volume
1609459200,0,0,0,0,0`;

        const result = parseTradingViewCSV(csv);
        expect(result.bars[0].open).toBe(0);
        expect(result.bars[0].volume).toBe(0);
      });

      it('should handle whitespace around values', () => {
        const csv = `time,open,high,low,close,volume
 1609459200 , 100 , 110 , 95 , 105 , 1000 `;

        const result = parseTradingViewCSV(csv);
        expect(result.bars).toHaveLength(1);
        expect(result.bars[0].open).toBe(100);
      });
    });
  });
});
