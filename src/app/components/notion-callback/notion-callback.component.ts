import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NotionService } from '../../services/api/notion.service';

@Component({
  selector: 'app-notion-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="callback-content">
        <div class="notion-logo">
          <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#000"/>
            <path d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l63.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917z" fill="#fff"/>
            <path d="M25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 4.083 -0.68 0.27z" fill="#000"/>
          </svg>
        </div>
        
        <div class="loading-spinner" *ngIf="isProcessing"></div>
        <h2 *ngIf="isProcessing">Connecting to Notion...</h2>
        <h2 *ngIf="success" class="success">✅ Successfully connected!</h2>
        <h2 *ngIf="error" class="error">❌ Connection failed</h2>
        
        <p *ngIf="message" class="message">{{ message }}</p>
        
        <div class="actions" *ngIf="!isProcessing">
          <button *ngIf="success" (click)="closeWindow()" class="btn btn-success">
            Continue
          </button>
          <button *ngIf="error" (click)="closeWindow()" class="btn btn-error">
            Close
          </button>
        </div>
        
        <p class="auto-close" *ngIf="success">This window will close automatically in {{ countdown }} seconds...</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
    }
    
    .callback-content {
      text-align: center;
      background: white;
      padding: 3rem 2rem;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
    }
    
    .notion-logo {
      margin-bottom: 2rem;
      display: flex;
      justify-content: center;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f4f6;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    h2 {
      color: #1a202c;
      margin-bottom: 1rem;
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .success { color: #10b981; }
    .error { color: #ef4444; }
    
    .message {
      color: #6b7280;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    
    .actions {
      margin-bottom: 1rem;
    }
    
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.2s ease;
    }
    
    .btn:hover {
      background: #5a67d8;
      transform: translateY(-1px);
    }
    
    .btn-error {
      background: #ef4444;
    }
    
    .btn-error:hover {
      background: #dc2626;
    }
    
    .auto-close {
      color: #9ca3af;
      font-size: 0.875rem;
      margin: 0;
    }
  `]
})
export class NotionCallbackComponent implements OnInit {
  isProcessing = true;
  success = false;
  error = false;
  message = '';
  countdown = 3;

  constructor(
    private route: ActivatedRoute,
    private notionService: NotionService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];

      if (error) {
        this.handleError(`Notion authorization failed: ${error}`);
        return;
      }

      if (code && state) {
        this.handleCallback(code, state);
      } else {
        this.handleError('Missing authorization parameters');
      }
    });
  }

  private handleCallback(code: string, state: string) {
    this.notionService.handleOAuthCallback(code, state).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        this.success = true;
        this.message = 'Your Notion workspace is now connected! You can sync test cases and tasks.';
        
        // Notify parent window
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'NOTION_AUTH_SUCCESS',
            data: response 
          }, window.location.origin);
        }
        
        // Start countdown and close
        this.startCountdown();
      },
      error: (error) => {
        this.handleError('Failed to complete Notion connection. Please try again.');
        console.error('OAuth callback error:', error);
      }
    });
  }

  private handleError(errorMessage: string) {
    this.isProcessing = false;
    this.error = true;
    this.message = errorMessage;
  }

  private startCountdown() {
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.closeWindow();
      }
    }, 1000);
  }

  closeWindow() {
    if (window.opener) {
      window.opener.focus();
    }
    window.close();
  }
}