import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams,HttpHeaders } from '@angular/common/http';
import { Router } from "@angular/router";
import { JwtHelperService } from "@auth0/angular-jwt";
import { ModalService } from '../modal-service/modal-service.service';
import { map, of } from 'rxjs';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GlobalStoreService } from '../store/global-state/global-store.service';

@Injectable({
  providedIn: "root"
})
export class AuthService {
  private jwtHelper = new JwtHelperService();
  private modalService = inject(ModalService);
  
  private apiUrl = environment.API_URL;
  private apiKey = environment.API_KEY;
  constructor(private http: HttpClient, private router: Router,private store : GlobalStoreService) { }
  private headers = new HttpHeaders({
    'X-API-Key': this.apiKey,  
    'Content-Type': 'application/json'
  });

  sendOTP(mobileNo: string): Observable<any> {
      return this.http.post<any>(
        `${this.apiUrl ?? ''}/api/v1/auth/sendOTP`, 
        { mobileNo }, 
        { headers:this.headers }  
      ).pipe(
        catchError(error => this.handleError(error))
      );
    }

    verifyOTP(otp: number, mobileNo: string): Observable<any> {
      return this.http.post<any>(
        `${this.apiUrl}/api/v1/auth/verifyOTP`, 
        { mobileNo:mobileNo,
          otp:otp }, 
        { headers: this.headers }  
      ).pipe(
        catchError(error => this.handleError(error)),
        map(response => {
          if (response && response.responseObject.token) {
            localStorage.setItem('token', response.responseObject.token);
            this.store.setIsLogin(true);
            this.store.setUserId(response.responseObject.user.id);
            this.store.setUserName(response.responseObject.user.name);
            this.store.setToken(response.responseObject.token);
          }
          return response;
        })
      );
    }

  logout(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/api/v1/auth/logout`, 
      { headers: this.headers }  
    ).pipe(
      catchError(error => this.handleError(error)),
      map(response => {
        if (response.success) {
          this.store.logout();
        }
        return response;
      })
    );
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem("token");
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }
  private handleError(error: HttpErrorResponse) {
    if (error.status === 404) {
      // Custom not found error
      this.modalService.openDialog({
        title: 'Not Found',
        description: 'The requested resource was not found.',
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
    } else {
      // Generic error
      this.modalService.openDialog({
        title: 'Error',
        description: error.message,
        dialogType: 'alert',
        imgIcon: 'icons/alert.png',
        showCancelButton: false
      });
    }
  
    return throwError(() => error);
  }
}
