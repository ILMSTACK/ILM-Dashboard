import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  CsvService, CsvType, CsvUploadOk, CsvStatus,
  DashboardResponse, InsightResponse
} from '../../../../services/insight/insight.service';

import { HttpEventType } from '@angular/common/http';
import { Subscription } from 'rxjs';

// Chart.js
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);
import { MatMenuModule } from '@angular/material/menu';

// ---- Types ----
type UploadView = {
  key: string;
  fileName: string;
  type: CsvType;                 // detected type
  progress: number;              // upload progress
  uploadId?: number;
  status?: CsvStatus;
  dashboard?: DashboardResponse; // once validated/processed
  error?: string;
  chartId?: string;              // canvas id
  chart?: Chart | null;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatCardModule,
    MatSelectModule, MatFormFieldModule, MatProgressSpinnerModule,
    MatInputModule, MatProgressBarModule, MatMenuModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private api = inject(CsvService);

  // ======== Batch & DnD state ========
  uploads = signal<UploadView[]>([]);
  batchId = signal<string>(`batch-${Date.now()}`);
  isDragging = signal(false);

  // Insight (batch)
  insightLoading = signal(false);
  insightError   = signal('');
  insightText    = signal('');





  // legacy hook (not used now but kept)
  private statusSub?: Subscription;

  ngOnInit(): void {
    this.loadPreviousUploads();
  }
  ngOnDestroy(): void {
    if (this.statusSub) this.statusSub.unsubscribe();
    // cleanup charts
    this.uploads().forEach(u => { try { u.chart?.destroy(); } catch {} });
  }

  // ======== DnD handlers ========
  onDragOver(ev: DragEvent) {
    ev.preventDefault(); this.isDragging.set(true);
  }
  onDragLeave(_ev: DragEvent) {
    this.isDragging.set(false);
  }
  async onDrop(ev: DragEvent) {
    ev.preventDefault(); this.isDragging.set(false);
    const files = Array.from(ev.dataTransfer?.files ?? [])
      .filter(f =>
        f.name.toLowerCase().endsWith('.csv') ||
        f.name.toLowerCase().endsWith('.tsv') ||
        f.type.includes('csv') ||
        f.type.includes('tab')
      );
    await this.addFiles(files);
  }
  async onPickFiles(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files ?? []);
    await this.addFiles(files);
    (ev.target as HTMLInputElement).value = ''; // reset input
  }

  // ======== Add files -> detect type -> validate -> upload -> poll -> dashboard -> chart/table ========
  private async addFiles(files: File[]) {
    if (!files.length) return;
    const bid = this.batchId();

    for (const file of files) {
      const header = await this.readHeaderLine(file);
      const { type, missing, delimiter } = this.detectTypeFromHeader(header);

      const key = this.genKey('row');
      const chartId = `chart-${key}`;

      // Insert card immediately
      this.uploads.update(a => [...a, {
        key, fileName: file.name, type: (type === 'unknown' ? 'sales' : type) as CsvType, progress: 0, chartId, chart: null
      }]);

      if (type === 'unknown') {
        const msg = missing.length
          ? `Cannot detect CSV type. Missing required columns (${missing.join(', ')}).`
          : `Cannot detect CSV type. Please use the Sales or Inventory template.`;
        this.updateUpload(key, { error: msg });
        continue;
      }

      // start upload with progress
      this.api.uploadWithBatchProgress(type, file, bid).subscribe({
        next: (evt) => {
          if (evt.type === HttpEventType.UploadProgress) {
            const total = evt.total ?? 0;
            const pct = total ? Math.round((evt.loaded / total) * 100) : 0;
            this.updateUpload(key, { progress: pct });
          } else if (evt.type === HttpEventType.Response) {
            const body = evt.body as CsvUploadOk;
            if (!body.ok) {
              const err = body.error || (body.missing?.length ? `Missing: ${body.missing.join(', ')}` : 'Upload failed');
              this.updateUpload(key, { error: err, progress: 0 });
              return;
            }
            this.updateUpload(key, { uploadId: body.upload_id!, progress: 100 });
            // begin polling this upload
            this.pollAndRender(key, body.upload_id!);
          }
        },
        error: async (e) => {
          const msg = await this.extractServerError(e, 'Network/Upload error');
          // Optional smart retry: if backend hints wrong type, try the other once
          if (/missing.*(invoice_id|invoice_date|unit_price|tax_rate)/i.test(msg) && type === 'inventory') {
            this.api.uploadWithBatchProgress('sales', file, bid).subscribe({
              next: (evt2) => {
                if (evt2.type === HttpEventType.Response) {
                  const body2 = evt2.body as CsvUploadOk;
                  if (body2?.ok) {
                    this.updateUpload(key, { uploadId: body2.upload_id!, progress: 100, type: 'sales', error: undefined });
                    this.pollAndRender(key, body2.upload_id!);
                    return;
                  }
                }
              },
              error: async (e2) => {
                const msg2 = await this.extractServerError(e2, msg);
                this.updateUpload(key, { error: msg2, progress: 0 });
              }
            });
            return;
          }
          if (/missing.*(move_id|unit_cost)/i.test(msg) && type === 'sales') {
            this.api.uploadWithBatchProgress('inventory', file, bid).subscribe({
              next: (evt2) => {
                if (evt2.type === HttpEventType.Response) {
                  const body2 = evt2.body as CsvUploadOk;
                  if (body2?.ok) {
                    this.updateUpload(key, { uploadId: body2.upload_id!, progress: 100, type: 'inventory', error: undefined });
                    this.pollAndRender(key, body2.upload_id!);
                    return;
                  }
                }
              },
              error: async (e2) => {
                const msg2 = await this.extractServerError(e2, msg);
                this.updateUpload(key, { error: msg2, progress: 0 });
              }
            });
            return;
          }
          this.updateUpload(key, { error: msg, progress: 0 });
        }
      });
    }
  }

  private pollAndRender(key: string, uploadId: number) {
    this.api.pollStatus(uploadId).subscribe({
      next: (s) => {
        this.updateUpload(key, { status: s });
        if (['validated','processed'].includes(s.status)) {
          // fetch dashboard & render chart/table
          this.api.dashboard(s.id).subscribe({
            next: d => {
              if (!d.ok) {
                this.updateUpload(key, { error: d.error || 'Dashboard not ready' });
                return;
              }
              this.updateUpload(key, { dashboard: d });
              // render chart after view updates
              setTimeout(() => this.renderChartForUpload(key), 0);
            },
            error: e => this.updateUpload(key, { error: this.errMsg(e, 'Failed to fetch dashboard') })
          });
        }
      },
      error: (e) => this.updateUpload(key, { error: this.errMsg(e, 'Status polling error') })
    });
  }

  // ======== Chart rendering ========
  private renderChartForUpload(key: string) {
    const u = this.uploads().find(x => x.key === key);
    if (!u || !u.dashboard || !u.chartId) return;

    // destroy previous chart if any
    try { u.chart?.destroy(); } catch {}

    const canvas = document.getElementById(u.chartId) as HTMLCanvasElement | null;
    if (!canvas) return;

    if (u.dashboard.csv_type === 'sales') {
      // Line chart: Sales revenue trend
      const trend = (u.dashboard.sales_trend ?? []).map(x => ({ x: x.date, y: x.revenue }));
      const cfg: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels: trend.map(p => p.x),
          datasets: [{
            label: 'Revenue',
            data: trend.map(p => p.y),
            tension: 0.35,
            fill: false
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
          scales: {
            x: { title: { display: true, text: 'Date' } },
            y: { title: { display: true, text: 'Revenue' }, beginAtZero: true }
          }
        }
      };
      u.chart = new Chart(canvas.getContext('2d')!, cfg);
    } else {
      // Bar chart: Inventory on_hand per item (from dashboard)
      const inv = (u.dashboard.inventory_levels ?? []);
      const labels = inv.map(i => i.item_id);
      const onHand = inv.map(i => i.on_hand);
      const cfg: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'On Hand',
            data: onHand
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: true } },
          scales: {
            x: { title: { display: true, text: 'Item' } },
            y: { title: { display: true, text: 'Quantity' }, beginAtZero: true }
          }
        }
      };
      u.chart = new Chart(canvas.getContext('2d')!, cfg);
    }
  }

  // ======== Insight (batch button) ========
  runBatchInsight() {
    this.insightError.set('');
    this.insightText.set('');
    this.insightLoading.set(true);
    this.api.insightBatch(this.batchId()).subscribe({
      next: (res) => {
        this.insightLoading.set(false);
        if (!res.ok) { this.insightError.set(res.error || 'Batch insight error'); return; }
        this.insightText.set(res.insight || '(No insight text)');
      },
      error: (e) => { this.insightLoading.set(false); this.insightError.set(this.errMsg(e, 'Network error')); }
    });
  }

  // ======== Helpers ========
  private genKey(prefix='row'){ return (crypto as any)?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
  private errMsg = (e:any, fb='Error') => e?.error?.error || e?.message || fb;

  private updateUpload(key: string, patch: Partial<UploadView>) {
    this.uploads.update(arr => arr.map(r => r.key === key ? ({ ...r, ...patch }) : r));
  }

  /** Split a header line by common delimiters: tab, comma, semicolon, pipe */
  private splitHeader(line: string): string[] {
    return line
      .split(/[,\t;|]/g)
      .map(x => x.trim().replace(/^"|"$/g, '').toLowerCase())
      .filter(Boolean);
  }

  /** Validate that all required columns exist */
  private missingColumns(cols: Set<string>, required: string[]): string[] {
    return required.filter(r => !cols.has(r));
  }

  /** Detect type from header; returns type + missing columns (for message) */
  private detectTypeFromHeader(headerLine: string): { type: CsvType | 'unknown'; missing: string[]; delimiter: string } {
    const parts = this.splitHeader(headerLine);
    const cols = new Set(parts);

    // Required sets (as provided)
    const SALES_REQ = ['invoice_id','invoice_date','customer_id','item_id','qty','unit_price'];
    const SALES_OPT = ['tax_rate'];

    const INV_REQ   = ['move_id','move_date','item_id','type','qty','unit_cost'];

    const missSales = this.missingColumns(cols, SALES_REQ);
    const missInv   = this.missingColumns(cols, INV_REQ);

    const salesOK = missSales.length === 0;
    const invOK   = missInv.length === 0;

    let type: CsvType | 'unknown' = 'unknown';
    if (invOK && !salesOK) type = 'inventory';
    else if (salesOK && !invOK) type = 'sales';
    else if (invOK && salesOK) type = cols.has('move_id') ? 'inventory' : 'sales';
    else type = 'unknown';

    // try to infer delimiter for future parsing if needed
    const delimiter = (headerLine.includes('\t') ? '\t'
                     : headerLine.includes(',') ? ','
                     : headerLine.includes(';') ? ';'
                     : headerLine.includes('|') ? '|' : ',');

    const missing = type === 'unknown'
      ? (missInv.length <= missSales.length ? missInv.map(c => `inventory:${c}`) : missSales.map(c => `sales:${c}`))
      : [];

    return { type, missing, delimiter };
  }

  /** Read only the first non-empty line (header) efficiently */
  private async readHeaderLine(file: File): Promise<string> {
    const slice = file.slice(0, 64 * 1024);
    const text = await slice.text();
    return (text.split(/\r?\n/).find(l => l.trim().length) ?? '');
  }

  /** Auto-detect CSV type using the real headers before uploading */
  private async detectCsvType(file: File): Promise<CsvType | 'unknown'> {
    const header = await this.readHeaderLine(file);
    const { type } = this.detectTypeFromHeader(header);
    return type;
  }

  /** Extract server error text even if Angular wraps it as Blob */
  private async extractServerError(e: any, fb = 'Upload failed'): Promise<string> {
    try {
      if (e?.error instanceof Blob) {
        const text = await e.error.text();
        try {
          const json = JSON.parse(text);
          return json.error || json.message || text || fb;
        } catch { return text || fb; }
      }
      return e?.error?.error || e?.error?.message || e?.message || fb;
    } catch { return fb; }
  }

// ---- CSV Template download state (keep if you already have it)
tplLoading = signal(false);
tplError   = signal('');

// Business Report download state
businessReportLoading = signal(false);

// Previous uploads state
previousUploads = signal<Array<{
  id: number;
  csv_type: string;
  status: string;
  original_filename: string;
}>>([]);
previousUploadsLoading = signal(false);

// Download chosen template directly
downloadTemplate(type: CsvType) {
  this.tplError.set('');
  this.tplLoading.set(true);

  this.api.downloadTemplate(type).subscribe({
    next: (res: any) => {
      this.tplLoading.set(false);

      // Support HttpResponse<Blob> shape
      let blob: Blob;
      let filename = `${type}_template.csv`;

      if (res?.body && res?.headers) {
        blob = res.body as Blob;
        const cd = res.headers.get('content-disposition') || '';
        const m = /filename\*=(?:UTF-8'')?([^;]+)|filename="?([^"]+)"?/i.exec(cd);
        const raw = (m?.[1] || m?.[2] || filename).trim();
        try { filename = decodeURIComponent(raw); } catch { filename = raw; }
      } else {
        // or mapped { blob, filename }
        blob = res.blob ?? res;
        if (res.filename) filename = res.filename;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    },
    error: (e) => {
      this.tplLoading.set(false);
      this.tplError.set(e?.error?.error || e?.message || 'Failed to download template');
    }
  });
}

private safeDecode(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}

// Download Business Report PDF
downloadBusinessReport() {
  this.businessReportLoading.set(true);

  this.api.downloadBusinessReport().subscribe({
    next: (res: any) => {
      this.businessReportLoading.set(false);

      // Handle the PDF blob response
      let blob: Blob;
      let filename = 'business-report.pdf';

      if (res?.body && res?.headers) {
        blob = res.body as Blob;
        const cd = res.headers.get('content-disposition') || '';
        const m = /filename\*=(?:UTF-8'')?([^;]+)|filename="?([^"]+)"?/i.exec(cd);
        const raw = (m?.[1] || m?.[2] || filename).trim();
        try { filename = decodeURIComponent(raw); } catch { filename = raw; }
      } else {
        blob = res.blob ?? res;
        if (res.filename) filename = res.filename;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = filename; 
      a.click();
      URL.revokeObjectURL(url);
    },
    error: (e) => {
      this.businessReportLoading.set(false);
      console.error('Failed to download business report:', e);
      // You could add error handling here, similar to template downloads
    }
  });
}


// ===== Report download (client-side HTML report) =====
// ===== Report download (client-side HTML report with CHART IMAGES) =====
async downloadReport() {
  const hasInsight = !!this.insightText();
  const dashboards = this.uploads().filter(u => u.dashboard?.ok);
  if (!hasInsight && dashboards.length === 0) return;

  // capture chart images for each upload (existing canvas or offscreen render)
  const charts = new Map<string, string>(); // key: uploadId or key
  for (const u of dashboards) {
    const src = await this.getChartDataUrlForUpload(u);
    if (src) charts.set(String(u.uploadId ?? u.key), src);
  }

  const html = this.buildReportHtml(hasInsight, dashboards, charts);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });

  const stamp = this.filenameStamp();
  const filename = `ILM_Report_${stamp}.html`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Try to use the on-screen chart; fallback to an offscreen render.
private async getChartDataUrlForUpload(u: any): Promise<string | null> {
  const id = u.chartId as string | undefined;
  if (id) {
    const canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (canvas) {
      try { return canvas.toDataURL('image/png'); } catch {}
    }
  }
  // Fallback: render offscreen from dashboard data
  if (u.dashboard) {
    try { return await this.renderOffscreenChartAndGetDataUrl(u.dashboard); }
    catch { /* ignore */ }
  }
  return null;
}

private buildChartConfigForDashboard(d: DashboardResponse): any /* ChartConfiguration */ {
  if (d.csv_type === 'sales') {
    const labels = (d.sales_trend ?? []).map(x => x.date);
    const data = (d.sales_trend ?? []).map(x => x.revenue);
    return {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue',
          data,
          tension: 0.35,
          fill: false
        }]
      },
      options: {
        responsive: false, // important for offscreen/export
        animation: false,
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: 'Date' } },
          y: { title: { display: true, text: 'Revenue' }, beginAtZero: true }
        }
      }
    };
  } else {
    const inv = (d.inventory_levels ?? []);
    return {
      type: 'bar',
      data: {
        labels: inv.map(i => i.item_id),
        datasets: [{ label: 'On Hand', data: inv.map(i => i.on_hand) }]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: true } },
        scales: {
          x: { title: { display: true, text: 'Item' } },
          y: { title: { display: true, text: 'Quantity' }, beginAtZero: true }
        }
      }
    };
  }
}

private async renderOffscreenChartAndGetDataUrl(d: DashboardResponse): Promise<string> {
  // higher resolution for print
  const width = 1000, height = 420;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;

  const cfg = this.buildChartConfigForDashboard(d);
  // ensure we don't mutate the live canvas
  const ctx = canvas.getContext('2d')!;
  // @ts-ignore - Chart type union is fine at runtime
  const chart = new Chart(ctx, cfg);
  // draw immediately (no animation)
  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
}


private filenameStamp() {
  // Asia/Kuala_Lumpur friendly stamp
  const now = new Date();
  const toParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(now);
  const get = (t: string) => toParts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}_${get('hour')}-${get('minute')}`;
}

private esc(s: any) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

private buildReportHtml(
  hasInsight: boolean,
  dashboards: Array<any>,
  charts: Map<string, string>
) {
  const title = 'ILM Analytics Report';
  const subtitle = 'Business Intelligence & Data Insights';
  const generatedAt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'full', timeStyle: 'short'
  }).format(new Date());
  const batch = this.batchId();

  const uploadSections = dashboards.map(u => {
    const d = u.dashboard!;
    const key = String(u.uploadId ?? u.key);
    const chartImg = charts.get(key) || '';

    const k = d.kpis || {};
    const kpiCells = [
      k.revenue !== undefined ? `<div class="kpi kpi-indigo"><div>Revenue</div><b>${this.formatMYR(k.revenue)}</b></div>` : '',
      k.units_sold !== undefined ? `<div class="kpi kpi-sky"><div>Units Sold</div><b>${this.esc(k.units_sold)}</b></div>` : '',
      k.orders !== undefined ? `<div class="kpi kpi-violet"><div>Orders</div><b>${this.esc(k.orders)}</b></div>` : '',
      k.aov !== undefined ? `<div class="kpi kpi-fuchsia"><div>AOV</div><b>${this.formatMYR(k.aov)}</b></div>` : '',
      k.cogs !== undefined ? `<div class="kpi kpi-rose"><div>COGS</div><b>${this.formatMYR(k.cogs)}</b></div>` : '',
    ].join('');

    let tables = '';
    if (d.csv_type === 'sales') {
      const trendRows = (d.sales_trend ?? [])
        .map(r => `<tr><td>${this.esc(r.date)}</td><td>${this.formatMYR(r.revenue)}</td><td>${this.esc(r.units)}</td></tr>`)
        .join('');
      const topRows = (d.top_items ?? [])
        .map(t => `<tr><td>${this.esc(t.item_id)}</td><td>${this.formatMYR(t.revenue)}</td><td>${this.esc(t.units)}</td></tr>`)
        .join('');
      tables = `
        <h4>Sales Trend</h4>
        <div class="table-wrap">
          <table><thead><tr><th>Date</th><th>Revenue</th><th>Units</th></tr></thead>
          <tbody>${trendRows || '<tr><td colspan="3">No data</td></tr>'}</tbody></table>
        </div>
        <h4>Top Items</h4>
        <div class="table-wrap">
          <table><thead><tr><th>Item</th><th>Revenue</th><th>Units</th></tr></thead>
          <tbody>${topRows || '<tr><td colspan="3">No data</td></tr>'}</tbody></table>
        </div>`;
    } else {
      const invRows = (d.inventory_levels ?? [])
        .map(i => `<tr><td>${this.esc(i.item_id)}</td><td>${this.esc(i.on_hand)}</td><td>${this.formatMYR(i.wac)}</td><td>${this.formatMYR(i.value)}</td></tr>`)
        .join('');
      tables = `
        <h4>Inventory Levels</h4>
        <div class="table-wrap">
          <table><thead><tr><th>Item</th><th>On Hand</th><th>WAC</th><th>Value</th></tr></thead>
          <tbody>${invRows || '<tr><td colspan="4">No data</td></tr>'}</tbody></table>
        </div>`;
    }

    const chartBlock = chartImg
      ? `<div class="chart-box"><img alt="Chart" src="${chartImg}"></div>`
      : '';

    return `
      <section class="card">
        <div class="card-head ${d.csv_type==='sales' ? 'head-indigo' : 'head-emerald'}">
          <div class="title">
            <span class="pill ${d.csv_type==='sales' ? 'pill-indigo' : 'pill-emerald'}">${this.esc(d.csv_type)}</span>
            <strong>${this.esc(u.fileName || `Upload ${u.uploadId||''}`)}</strong>
          </div>
          <div class="meta">Upload ID: ${this.esc(u.uploadId)} • Rows: ${this.esc(u.status?.row_count ?? '—')}</div>
        </div>
        <div class="card-body">
          <div class="kpis">${kpiCells || '<div class="muted">No KPIs</div>'}</div>
          ${chartBlock}
          ${tables}
        </div>
      </section>`;
  }).join('\n');

  const insightBlock = hasInsight ? `
    <section class="card">
      <div class="card-head head-amber">
        <div class="title"><span class="pill pill-amber">Insight</span><strong>AI-generated Insight</strong></div>
        <div class="meta">Based on batch: ${this.esc(batch)}</div>
      </div>
      <div class="card-body">
        <pre class="insight">${this.esc(this.insightText())}</pre>
      </div>
    </section>` : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{
    --slate:#0f172a; --muted:#64748b; --bd:#e5e7eb;
    --indigo:#6366f1; --violet:#7c3aed; --emerald:#10b981; --teal:#0d9488; --amber:#f59e0b; --rose:#f43f5e; --fuchsia:#d946ef; --sky:#0ea5e9;
  }
  body{font-family: ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial; background:#fff; color:#0f172a; margin:0; padding:24px;}
  .page-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
  .brand{display:flex;align-items:center;gap:12px}
  .logo{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;
        background:linear-gradient(135deg,var(--indigo),var(--violet));color:#fff;font-weight:700}
  h1{margin:0;font-size:20px}
  .sub{color:var(--muted);font-size:12px}
  .meta-bar{color:var(--muted);font-size:12px;margin-top:4px}
  .card{border:1px solid var(--bd); border-radius:12px; overflow:hidden; background:#fff; margin:16px 0; box-shadow:0 2px 6px rgba(0,0,0,0.04)}
  .card-head{padding:12px 16px; display:flex; justify-content:space-between; align-items:center; color:#0f172a; border-bottom:1px solid var(--bd)}
  .head-indigo{background:linear-gradient(90deg,#eef2ff,#f5f3ff)}
  .head-emerald{background:linear-gradient(90deg,#ecfdf5,#f0fdfa)}
  .head-amber{background:linear-gradient(90deg,#fff7ed,#fffbeb)}
  .title{display:flex;align-items:center;gap:8px}
  .pill{font-size:11px;border-radius:999px;padding:2px 8px;border:1px solid #ddd}
  .pill-indigo{background:#eef2ff;color:#3730a3;border-color:#c7d2fe}
  .pill-emerald{background:#ecfdf5;color:#065f46;border-color:#a7f3d0}
  .pill-amber{background:#fff7ed;color:#92400e;border-color:#fed7aa}
  .meta{font-size:11px;color:var(--muted)}
  .card-body{padding:16px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:6px 0 12px}
  .kpi{border:1px solid var(--bd);border-radius:10px;padding:10px;background:#fafafa}
  .kpi b{display:block;margin-top:4px;font-size:16px}
  .kpi.kpi-indigo{background:#eef2ff;border-color:#c7d2fe}
  .kpi.kpi-sky{background:#f0f9ff;border-color:#bae6fd}
  .kpi.kpi-violet{background:#f5f3ff;border-color:#ddd6fe}
  .kpi.kpi-fuchsia{background:#fdf4ff;border-color:#f5d0fe}
  .kpi.kpi-rose{background:#fff1f2;border-color:#fecdd3}
  .chart-box{margin:10px 0 14px;border:1px solid var(--bd);border-radius:10px;padding:8px;background:#fff}
  .chart-box img{display:block;max-width:100%;height:auto;border-radius:6px}
  h4{margin:14px 0 8px 0}
  .table-wrap{border:1px solid var(--bd);border-radius:10px;overflow:auto;max-height:420px}
  table{width:100%; border-collapse:collapse; font-size:13px}
  thead{position:sticky;top:0;background:#f8fafc}
  th,td{padding:8px 10px;border-bottom:1px solid var(--bd);text-align:left}
  tbody tr:nth-child(even){background:#fafafa}
  .insight{white-space:pre-wrap;margin:0;font-size:13px;line-height:1.5}
  @media print{
    body{padding:0}
    .card{box-shadow:none; page-break-inside:avoid}
    .chart-box img{page-break-inside:avoid}
  }
</style>
</head>
<body>
  <header class="page-head">
    <div class="brand">
      <div class="logo">ILM</div>
      <div>
        <h1>${title}</h1>
        <div class="sub">${subtitle}</div>
        <div class="meta-bar">Generated: ${this.esc(generatedAt)} • Batch: ${this.esc(batch)}</div>
      </div>
    </div>
  </header>

  ${insightBlock}
  ${uploadSections || '<p class="sub">No uploads to summarize.</p>'}

</body>
</html>`;
}




  // ======== Previous Uploads ========
  loadPreviousUploads() {
    this.previousUploadsLoading.set(true);
    this.api.getUploadIds().subscribe({
      next: (uploads) => {
        this.previousUploads.set(uploads);
        this.previousUploadsLoading.set(false);
      },
      error: (e) => {
        console.error('Failed to load previous uploads:', e);
        this.previousUploadsLoading.set(false);
      }
    });
  }

  // Formatting / trackBy
  formatMYR(value:number){ return new Intl.NumberFormat('ms-MY',{style:'currency',currency:'MYR'}).format(value); }
  trackByKey(_i:number, u:UploadView){ return u.key; }
  trackByUploadId(_i:number, u:any){ return u.id; }
}
