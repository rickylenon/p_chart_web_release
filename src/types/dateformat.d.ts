declare module 'dateformat' {
  function dateFormat(date: Date | string | number, format?: string, utc?: boolean, gmt?: boolean): string;
  export = dateFormat;
} 