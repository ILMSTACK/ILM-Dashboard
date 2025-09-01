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

}
