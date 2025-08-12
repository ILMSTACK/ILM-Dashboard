import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../services/auth/auth.service';
import { GlobalStoreService } from '../../../services/store/global-state/global-store.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage: string = '';
  timeLeft: number = 30;
  otpSent: boolean = false;
  isSubmitting: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<AuthComponent>,
    private authService: AuthService,
    private fb: FormBuilder,
    private globalStore: GlobalStoreService
  ) {
    this.loginForm = this.fb.group({
      mobileNo: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{10,12}$/) // Updated pattern to be more flexible
      ]],
      otp: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{6}$/)
      ]]
    });

    // Close dialog on backdrop click
    this.dialogRef.backdropClick().subscribe(() => this.close());
  }

  ngOnInit() {
    // Uncomment if you want to enable the session timeout
    // this.startTimer();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startTimer() {
    // Reset timer
    this.timeLeft = 30;
    
    // Start countdown
    timer(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
        }
      });
  }

  get f() {
    return this.loginForm.controls;
  }

  sendOtpNo() {
    if (this.loginForm.controls['mobileNo'].invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    const mobileNo = this.loginForm.value.mobileNo;
    
    this.authService.sendOTP(mobileNo).subscribe({
      next: (response) => {
        if (response.success) {
          this.otpSent = true;
          this.startTimer(); // Start timer for OTP expiration
        } else {
          this.errorMessage = response.message || 'Failed to send OTP. Please try again.';
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to send OTP. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  verifyOtp() {
    if (this.loginForm.controls['otp'].invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    const { mobileNo, otp } = this.loginForm.value;
    
    this.authService.verifyOTP(otp, mobileNo).subscribe({
      next: (response) => {
        if (response.success) {
          // Update global state with user information
          if (response.data?.user) {
            this.globalStore.setValue('isLogin', true);
            this.globalStore.setValue('userName', response.data.user.name || 'User');
          }
          this.close();
        } else {
          this.errorMessage = response.message || 'Invalid OTP. Please try again.';
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Invalid OTP. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  close() {
    this.loginForm.reset();
    this.dialogRef.close();
  }
}