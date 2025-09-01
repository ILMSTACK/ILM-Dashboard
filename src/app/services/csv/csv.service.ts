import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CsvService {
  private http = inject(HttpClient);
  private base = environment.CSV_BASE; // '/csv'

  downloadTemplate(ctype: 'sales' | 'inventory') {
    // Backend responseType: text/csv (blob)
    return this.http.get(`${this.base}/templates/${ctype}`, { responseType: 'blob' });
  }

  downloadBusinessReport() {
    // Download business report PDF from the specified endpoint
    return this.http.get(`${this.base}/business-report/download`, { 
      responseType: 'blob',
      headers: { 'accept': 'application/pdf' }
    });
  }

  getUploadIds() {
    // Get list of previous uploads
    return this.http.get<Array<{
      id: number;
      csv_type: string;
      status: string;
      original_filename: string;
    }>>(`${this.base}/upload-ids`, {
      headers: { 'accept': 'application/json' }
    });
  }

}
