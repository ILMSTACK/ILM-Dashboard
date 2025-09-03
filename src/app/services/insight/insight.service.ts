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
  format?: 'original' | 'enhanced';
  kpis: {
    revenue?: number; units_sold?: number; orders?: number; aov?: number;
    cogs?: number;
    unique_customers?: number; new_customers?: number; repeat_customers?: number;
  };
  sales_trend?: Array<{ date: string; item_name:string; revenue: number; units: number }>;
  top_items?: Array<{ item_id: string; item_name:string; revenue: number; units: number }>;
  top_customers?: Array<{ customer_id: string; customer_name: string; revenue: number; orders: number }>;
  customer_segments?: {
    high_value: number;
    loyal: number;
    single_purchase: number;
  };
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

// -------------------- Customer & Email Marketing Types --------------------
export interface Customer {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  first_purchase_date: string;
  last_purchase_date: string;
  total_orders: number;
  total_spent: number;
  average_order_value?: number;
  days_since_last_purchase?: number;
  created_at: string;
  recent_purchases?: Array<{
    invoice_id: string;
    invoice_date: string;
    item_name: string;
    qty: number;
    revenue: number;
  }>;
}

export interface CustomerSegment {
  segment: string;
  criteria: string;
  count: number;
  customers: Array<{
    customer_id: string;
    name: string;
    email: string;
    total_orders: number;
    total_spent: number;
    last_purchase: string;
  }>;
}

export interface CustomerMetrics {
  total_customers: number;
  new_customers_30d: number;
  active_customers: number;
  churn_rate: number;
  average_spent: number;
  average_orders: number;
}

export interface CustomerPurchase {
  id: number;
  invoice_id: string;
  invoice_date: string;
  item_id: string;
  item_name: string;
  qty: number;
  unit_price: number;
  revenue: number;
  created_at: string;
}

export interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  campaign_type: 'loyalty' | 'promotion' | 'winback' | 'event';
  status: 'draft' | 'sent' | 'scheduled';
  target_segment: string;
  created_at: string;
  sent_at?: string;
  total_recipients?: number;
  sent_count?: number;
}

export interface CampaignStats {
  campaign: EmailCampaign;
  stats: {
    total_recipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
  };
}

export interface PaginatedResponse<T> {
  [key: string]: T[] | any;
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    total: number;
  };
}

// -------------------- Service --------------------
@Injectable({ providedIn: 'root' })
export class CsvService {
  private http = inject(HttpClient);
  private api = environment.API_URL.replace(/\/+$/, ''); // strip trailing slash
  private tempBase = (environment as any).CSV_BASE ?? '/csv';

  private base = `${this.api}${this.tempBase.startsWith('/') ? this.tempBase : '/' + this.tempBase}`;

  // ------- Templates -------
  downloadTemplate(ctype: CsvType) {
    return this.http.get(`${this.base}/templates/${ctype}`, {
      observe: 'response',
      responseType: 'blob'
    });
  }
  
  downloadBusinessReport() {
    // Download business report PDF from the specified endpoint
    return this.http.get(`${this.base}/business-report/download`, { 
      responseType: 'blob',
      headers: { 'accept': 'application/pdf' }
    });
  }
  getDashboard(uploadId: number) {
    // Get dashboard data for a specific upload
    return this.http.get<{
      ok: boolean;
      csv_type: string;
      format: string;
      kpis: {
        revenue: number;
        units_sold: number;
        orders: number;
        aov: number;
        unique_customers?: number;
        new_customers?: number;
        repeat_customers?: number;
        cogs?: number;
      };
      sales_trend?: Array<{
        date: string;
        revenue: number;
        units: number;
      }>;
      top_items?: Array<{
        item_id: string;
        revenue: number;
        units: number;
      }>;
      top_customers?: Array<{
        customer_id: string;
        revenue: number;
        orders: number;
        customer_name: string;
      }>;
      customer_segments?: {
        high_value: number;
        loyal: number;
        single_purchase: number;
      };
      inventory_levels?: Array<{
        item_id: string;
        on_hand: number;
        wac: number;
        value: number;
      }>;
    }>(`${this.base}/dashboard/${uploadId}`, {
      headers: { 'accept': 'application/json' }
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

  // insightBatch<T = any>(batchId: string) {
  //   const params = new HttpParams().set('batch_id', batchId);
  //   return this.http.post<BatchInsightResponse<T>>(`${this.base}/insight/batch`, {}, { params });
  // }
  insightBatch() {
    return this.http.get<any>(`${this.base}/getInsight`);
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
      filename: string;
    }>>(`${this.base}/uploads`, { params: new HttpParams().set('batch_id', batchId) });
  }

  // ------- Get Existing Upload IDs -------
  getUploadIds() {
    return this.http.get<Array<{
      id: number;
      csv_type: CsvType;
      status: 'uploaded'|'validated'|'invalid'|'processed'|'failed';
      row_count: number | null;
      batch_id: string | null;
      created_at: string;
      validated_at: string | null;
      filename: string;
      format?: 'original' | 'enhanced';
    }>>(`${this.base}/upload-ids`);
  }

  // ------- Customer Management API -------
  getCustomers(page = 1, perPage = 50, segment = 'all', search = '') {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString())
      .set('segment', segment);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedResponse<Customer>>(`${this.base}/customers`, { params });
  }

  getCustomer(customerId: string) {
    return this.http.get<Customer>(`${this.base}/customers/${customerId}`);
  }

  getCustomerPurchases(customerId: string, page = 1, perPage = 20) {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());
    return this.http.get<PaginatedResponse<CustomerPurchase>>(`${this.base}/customers/${customerId}/purchases`, { params });
  }

  getCustomerSegment(segmentType: 'loyal' | 'high_value') {
    return this.http.get<CustomerSegment>(`${this.base}/customers/segments/${segmentType}`);
  }

  getCustomerMetrics() {
    return this.http.get<CustomerMetrics>(`${this.base}/customers/metrics`);
  }

  getUploadCustomers(uploadId: number) {
    return this.http.get<{
      unique_customers: number;
      new_customers: number;
      repeat_customers: number;
      customers: Array<{
        customer_id: string;
        name: string;
        email: string;
        is_new_customer: boolean;
        upload_revenue: number;
        upload_orders: number;
        total_orders: number;
        total_spent: number;
      }>;
    }>(`${this.base}/dashboard/${uploadId}/customers`);
  }

  getCustomerInsight(customerId: string) {
    return this.http.post<{
      ok: boolean;
      customer: {
        customer_id: string;
        name: string;
        total_orders: number;
        total_spent: number;
      };
      insight: string;
    }>(`${this.base}/insight/customers/${customerId}`, {});
  }

  // ------- Email Marketing API -------
  getEmailCampaigns(page = 1, perPage = 20) {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());
    return this.http.get<PaginatedResponse<EmailCampaign>>(`${this.api}/email/campaigns`, { params });
  }

  getCampaignStats(campaignId: number) {
    return this.http.get<CampaignStats>(`${this.api}/email/campaigns/${campaignId}/stats`);
  }

  createLoyaltyCampaign(data: {
    name: string;
    subject: string;
    discount_percent: number;
    min_orders: number;
    min_spent: number;
    template_vars?: any;
    auto_send?: boolean;
  }) {
    return this.http.post<{
      ok: boolean;
      campaign_id: number;
      name: string;
      subject: string;
      campaign_type: string;
      status: string;
    }>(`${this.api}/email/loyalty-promotion`, data);
  }

  createProductPromotion(data: {
    name: string;
    subject: string;
    product_filter: string;
    discount_percent: number;
    target_customers: string;
    template_vars?: any;
  }) {
    return this.http.post<{
      ok: boolean;
      campaign_id: number;
      name: string;
      subject: string;
      campaign_type: string;
      status: string;
    }>(`${this.api}/email/product-promotion`, data);
  }

  createWinBackCampaign(data: {
    name: string;
    subject: string;
    inactive_days: number;
    discount_percent: number;
    template_vars?: any;
  }) {
    return this.http.post<{
      ok: boolean;
      campaign_id: number;
      name: string;
      subject: string;
      campaign_type: string;
      status: string;
    }>(`${this.api}/email/win-back`, data);
  }

  sendCustomEmail(data: {
    subject: string;
    body: string;
    segment?: 'all' | 'loyal' | 'high_value' | 'frequent' | 'at_risk' | 'individual';
    product_filter?: string;
    sender_name?: string;
    customer_id?: string;
    customer_email?: string;
  }) {
    return this.http.post<{
      ok: boolean;
      sent_count: number;
      targeted_customers: number;
      failed_count: number;
      segment: string;
      sent_at: string;
    }>(`${this.api}/email/send-custom`, data);
  }

  sendCampaign(campaignId: number) {
    return this.http.post<{
      ok: boolean;
      campaign_id: number;
      sent_count: number;
      failed_count: number;
      total_recipients: number;
    }>(`${this.api}/email/send/${campaignId}`, {});
  }
}
