import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ModalService } from '../../modal-service/modal-service.service';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {

  private apiUrl = `${environment.API_URL}/api/v1/business`;
  
  constructor(
    private http: HttpClient,
    private modalService: ModalService,
  ) { }

  /**
   * Get a business by ID
   * @param id Business ID
   * @returns Observable of API response
   */
  findById(id: string): Observable<any> {
    console.log('Making API request to:', `${this.apiUrl}/${id}`);
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Create a new business
   * @param businessData Business data to create
   * @returns Observable of API response
   */
  create(businessData: any): Observable<any> {
    console.log('Creating business:', businessData);
    return this.http.post<any>(`${this.apiUrl}/create`, businessData).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update an existing business
   * @param id Business ID
   * @param updates Update data
   * @returns Observable of API response
   */
  update(id: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, updates).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get all businesses with optional filtering
   * @param params Optional filter parameters
   * @returns Observable of API response
   */
  findAll(params?: { 
    companyId?: string; 
    categoryId?: string; 
    limit?: number;
    startAfter?: string;
  }): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params?.companyId) {
      httpParams = httpParams.set('companyId', params.companyId);
    }
    if (params?.categoryId) {
      httpParams = httpParams.set('categoryId', params.categoryId);
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.startAfter) {
      httpParams = httpParams.set('startAfter', params.startAfter);
    }

    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Delete a business
   * @param id Business ID
   * @returns Observable of API response
   */
  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get businesses by company ID
   * @param companyId Company ID
   * @param limit Optional limit
   * @returns Observable of API response
   */
  findByCompanyId(companyId: string, limit?: number): Observable<any> {
    return this.findAll({ companyId, limit });
  }

  /**
   * Get businesses by category ID
   * @param categoryId Category ID
   * @param limit Optional limit
   * @returns Observable of API response
   */
  findByCategoryId(categoryId: string, limit?: number): Observable<any> {
    return this.findAll({ categoryId, limit });
  }

  /**
   * Search businesses by name
   * @param searchTerm Search term
   * @param limit Optional limit
   * @returns Observable of API response
   */
  search(searchTerm: string, limit?: number): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('search', searchTerm);
    
    if (limit) {
      httpParams = httpParams.set('limit', limit.toString());
    }

    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Handles HTTP errors and displays appropriate modal messages
   * @param error The HttpErrorResponse to handle
   * @returns An Observable that errors with the provided error
   */
  private handleError(error: HttpErrorResponse): Observable<any> {
    if (error.status === 404) {
      // Custom not found error
      this.modalService.openDialog({
        title: 'Not Found',
        description: 'The requested business was not found.',
        dialogType: 'alert',
        imgIcon: 'icons/not-found.png',
        showCancelButton: false
      });
    } else if (error.status === 403) {
      // Custom forbidden error
      this.modalService.openDialog({
        title: 'Access Denied',
        description: 'You do not have permission to perform this action.',
        dialogType: 'alert',
        imgIcon: 'icons/forbidden.png',
        showCancelButton: false,
        showSubmitButton: true,
        successLabel: 'Okay'
      });
    } else if (error.status === 400) {
      // Bad request error
      this.modalService.openDialog({
        title: 'Invalid Data',
        description: 'Please check your input data and try again.',
        dialogType: 'alert',
        imgIcon: 'icons/alert.png',
        showCancelButton: false
      });
    } else if (error.status === 500) {
      // Server error
      this.modalService.openDialog({
        title: 'Server Error',
        description: 'An internal server error occurred. Please try again later.',
        dialogType: 'alert',
        imgIcon: 'icons/alert.png',
        showCancelButton: false
      });
    } else {
      // Generic error
      this.modalService.openDialog({
        title: 'Error',
        description: 'An unexpected error occurred while managing businesses',
        dialogType: 'alert',
        imgIcon: 'icons/alert.png',
        showCancelButton: false
      });
    }
  
    return throwError(() => error);
  }
}