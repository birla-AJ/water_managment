import { Response } from 'express';

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export function ok<T>(res: Response, data: T, message = 'Success', meta?: Meta) {
  return res.status(200).json({ success: true, message, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T, message = 'Created') {
  return res.status(201).json({ success: true, message, data });
}

export function noContent(res: Response) {
  return res.status(204).send();
}
