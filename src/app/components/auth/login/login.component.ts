import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  isFormSubmitted: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      this.redirectAfterLogin();
    }
  }

  onLogin(): void {
    this.isFormSubmitted = true;
    this.errorMessage = '';

    // Validate form
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;

    this.authService.loginWithEmail(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.redirectAfterLogin();
        } else {
          this.errorMessage = response.message || 'Login failed. Please check your credentials.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'An error occurred during login. Please try again.';
        console.error('Login error:', error);
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  forgotPassword(event: Event): void {
    event.preventDefault();
    // Implement forgot password functionality
    alert('Forgot password functionality would be implemented here');
  }

  socialLogin(provider: string): void {
    // Implement social login functionality
    alert(`${provider} login would be implemented here`);
  }

  private redirectAfterLogin(): void {
    // Check if there's a redirect URL in localStorage
    const redirectUrl = localStorage.getItem('redirectUrl');
    if (redirectUrl) {
      localStorage.removeItem('redirectUrl');
      this.router.navigate([redirectUrl]);
    } else {
      // Default redirect to admin dashboard
      this.router.navigate(['/admin']);
    }
  }
}