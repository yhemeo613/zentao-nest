import dayjs from 'dayjs';

/** 统一时间展示（等宽数据文本，docs/10 §1 原则 3） */
export function fmtDateTime(value?: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-';
}

export function fmtDate(value?: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD') : '-';
}
