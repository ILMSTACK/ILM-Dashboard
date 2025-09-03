import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
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
  
  constructor(
    private http: HttpClient, 
    private router: Router,
    private store: GlobalStoreService
  ) { }
  
  private headers = new HttpHeaders({
    'X-API-Key': this.apiKey,  
    'Content-Type': 'application/json'
  });

  // NEW: Email login method with hardcoded credentials
  loginWithEmail(email: string, password: string): Observable<any> {
    // Hardcoded credentials for demo
    const validCredentials = {
      email: 'admin@gmail.com',
      password: '1234'
    };

    return new Observable(observer => {
      // Simulate API delay
      setTimeout(() => {
        if (email === validCredentials.email && password === validCredentials.password) {
          // Generate dummy JWT token
          const dummyToken = this.generateDummyJWT();
          const response = {
            success: true,
            message: 'Login successful',
            responseObject: {
              token: dummyToken,
              user: {
                id: '1',
                name: 'Admin User',
                email: email,
                role: 'admin'
              }
            }
          };

          // Store in localStorage and global store
          localStorage.setItem('token', dummyToken);
          this.store.setIsLogin(true);
          this.store.setUserId('1');
          this.store.setUserName('Admin User');
          this.store.setToken(dummyToken);

          observer.next(response);
          observer.complete();
        } else {
          observer.next({
            success: false,
            message: 'Invalid email or password'
          });
          observer.complete();
        }
      }, 1500); // Simulate network delay
    });
  }

  // Generate dummy JWT token for demo purposes
  private generateDummyJWT(): string {
    const header = btoa(JSON.stringify({
      alg: 'HS256',
      typ: 'JWT'
    }));

    const payload = btoa(JSON.stringify({
      sub: '1',
      name: 'Admin User',
      email: 'admin@gmail.com',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }));

    const signature = btoa('dummy-signature-for-demo-purposes');

    return `${header}.${payload}.${signature}`;
  }

  // Existing OTP methods (keeping for backward compatibility)
  sendOTP(mobileNo: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl ?? ''}/api/v1/auth/sendOTP`, 
      { mobileNo }, 
      { headers: this.headers }  
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  verifyOTP(otp: number, mobileNo: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/api/v1/auth/verifyOTP`, 
      { 
        mobileNo: mobileNo,
        otp: otp 
      }, 
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
    return new Observable(observer => {
      // Clear local storage and store
      localStorage.removeItem('token');
      this.store.logout();
      
      observer.next({
        success: true,
        message: 'Logged out successfully'
      });
      observer.complete();
    });
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem("token");
    if (!token) return false;
    
    try {
      // For demo purposes, we'll check if token exists and isn't expired
      // In a real app, you'd validate the JWT properly
      return !this.jwtHelper.isTokenExpired(token);
    } catch (error) {
      // If token is malformed or invalid, consider user not authenticated
      return false;
    }
  }

  // Get current user from token
  getCurrentUser(): any {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      return this.jwtHelper.decodeToken(token);
    } catch (error) {
      return null;
    }
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user && user.role === role;
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 404) {
      this.modalService.openDialog({
        title: 'Not Found',
        description: 'The requested resource was not found.',
        dialogType: 'alert',
        imgIcon: 'icons/not-found.png',
        showCancelButton: false
      });
    } else if (error.status === 403) {
      this.modalService.openDialog({
        title: 'Access Denied',
        description: 'You do not have permission to perform this action.',
        dialogType: 'alert',
        imgIcon: 'icons/forbidden.png',
        showCancelButton: false,
        showSubmitButton: true,
        successLabel: 'Okay'
      });
    } else if (error.status === 401) {
      this.modalService.openDialog({
        title: 'Authentication Required',
        description: 'Please login to continue.',
        dialogType: 'alert',
        imgIcon: 'icons/alert.png',
        showCancelButton: false
      });
    } else {
      this.modalService.openDialog({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        dialogType: 'alert',
        imgIcon: 'icons/alert.png',
        showCancelButton: false
      });
    }
  
    return throwError(() => error);
  }
}