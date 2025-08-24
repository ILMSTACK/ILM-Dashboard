// src/app/services/insight/insight.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';

// -------------------- Exported Types --------------------
export type CsvType = 'sales' | 'inventory';

export interface CsvUploadOk {
  ok: boolean;
  upload_id?: number;
  row_count?: number;
  missing?: string[];
  error?: string;
}

export interface CsvStatus {
  id: number;
  csv_type: CsvType;
  status: 'uploaded' | 'validated' | 'invalid' | 'processed' | 'failed';
  row_count: number | null;
  created_at: string;
  validated_at: string | null;
}

export interface DashboardResponse {
  ok: boolean;
  csv_type: CsvType;
  kpis: {
    revenue?: number; units_sold?: number; orders?: number; aov?: number;
    cogs?: number;
  };
  sales_trend?: Array<{ date: string; revenue: number; units: number }>;
  top_items?: Array<{ item_id: string; revenue: number; units: number }>;
  inventory_levels?: Array<{ item_id: string; on_hand: number; wac: number; value: number }>;
  cogs_trend?: Array<{ date: string; cogs: number }>;
  error?: string;
}

export interface InsightResponse {
  ok: boolean;
  metrics?: DashboardResponse;
  insight?: string;
  error?: string;
}

export interface PairInsightResponse {
  ok: boolean;
  metrics?: { sales?: DashboardResponse; inventory?: DashboardResponse };
  insight?: string;
  error?: string;
}

export interface BatchInsightResponse<TMetrics = any> {
  ok: boolean;
  metrics?: TMetrics;
  insight?: string;
  error?: string;
}

// -------------------- Service --------------------
@Injectable({ providedIn: 'root' })
export class CsvService {
  private http = inject(HttpClient);
  private base = ((environment as any).CSV_BASE ?? '/csv').replace(/\/+$/, '');

  // ------- Templates -------
  downloadTemplate(ctype: CsvType) {
    return this.http.get(`${this.base}/templates/${ctype}`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  // ------- Uploads -------
  upload(ctype: CsvType, file: File) {
    const form = new FormData();
    form.append('file', file);
    const params = new HttpParams().set('type', ctype);
    return this.http.post<CsvUploadOk>(`${this.base}/upload`, form, { params });
  }

  uploadWithProgress(ctype: CsvType, file: File) {
    const form = new FormData();
    form.append('file', file);
    const params = new HttpParams().set('type', ctype);
    return this.http.post<CsvUploadOk>(`${this.base}/upload`, form, {
      params, reportProgress: true, observe: 'events'
    }) as Observable<HttpEvent<CsvUploadOk>>;
  }

  /** Upload with batch id + progress events (for DnD per-row progress) */
  uploadWithBatchProgress(ctype: CsvType, file: File, batchId: string) {
    const form = new FormData();
    form.append('file', file);
    const params = new HttpParams()
      .set('type', ctype)
      .set('batch_id', batchId);

    return this.http.post<CsvUploadOk>(`${this.base}/upload`, form, {
      params,
      reportProgress: true,
      observe: 'events'
    }) as Observable<HttpEvent<CsvUploadOk>>;
  }

  /** Non-progress batch upload (keep if used elsewhere) */
  uploadWithBatch(ctype: CsvType, file: File, batchId: string) {
    const form = new FormData();
    form.append('file', file);
    const params = new HttpParams()
      .set('type', ctype)
      .set('batch_id', batchId);
    return this.http.post<CsvUploadOk>(`${this.base}/upload`, form, { params });
  }

  // ------- Status -------
  status(uploadId: number) {
    return this.http.get<CsvStatus>(`${this.base}/${uploadId}/status`);
  }

  pollStatus(uploadId: number, intervalMs = 1200) {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.status(uploadId)),
      // include the terminal emission:
      takeWhile(s => !['validated', 'processed', 'invalid', 'failed'].includes(s.status), true)
    );
  }

  // ------- Dashboard -------
  dashboard(uploadId: number) {
    return this.http.get<DashboardResponse>(`${this.base}/dashboard/${uploadId}`);
  }

  // ------- Insights -------
  insight(uploadId: number) {
    return this.http.post<InsightResponse>(`${this.base}/insight/${uploadId}`, {});
  }

  insightPair(opts: { salesId?: number; inventoryId?: number; batchId?: string }) {
    let params = new HttpParams();
    if (opts.salesId)     params = params.set('sales_id', String(opts.salesId));
    if (opts.inventoryId) params = params.set('inventory_id', String(opts.inventoryId));
    if (opts.batchId)     params = params.set('batch_id', opts.batchId);
    return this.http.post<PairInsightResponse>(`${this.base}/insight/pair`, {}, { params });
  }

  insightBatch<T = any>(batchId: string) {
    const params = new HttpParams().set('batch_id', batchId);
    return this.http.post<BatchInsightResponse<T>>(`${this.base}/insight/batch`, {}, { params });
  }

  listUploads(batchId: string) {
    return this.http.get<Array<{
      id: number;
      csv_type: CsvType;
      status: 'uploaded'|'validated'|'invalid'|'processed'|'failed';
      row_count: number | null;
      batch_id: string | null;
      created_at: string;
      validated_at: string | null;
      original_filename: string;
    }>>(`${this.base}/uploads`, { params: new HttpParams().set('batch_id', batchId) });
  }
}
