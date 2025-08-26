import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ModalService } from '../modal-service/modal-service.service';
import { TestCase, Task } from './business-automation.service';

export interface NotionTokenValidation {
  success: boolean;
  user_story_id: number;
  com_id: number;
  validation_result: {
    valid: boolean;
    error?: string;
    token_preview?: string;
  };
}

export interface NotionCreateResponse {
  message: string;
  task_id?: number;
  test_case_id?: number;
  notion_page_id: string;
  notion_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotionService {
  private apiUrl = `${environment.API_URL}/business-automation/notion`;
  private readonly NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize';
  
  constructor(
    private http: HttpClient,
    private modalService: ModalService
  ) {}

  /**
   * Check if user is authenticated with Notion
   */
  isNotionAuthenticated(userStoryId: number): Observable<{success: boolean, authenticated: boolean}> {
    return this.validateToken(userStoryId).pipe(
      catchError(() => of({ success: true, authenticated: false })),
      map((response: NotionTokenValidation) => ({
        success: response.success,
        authenticated: response.validation_result.valid
      }))
    );
  }

  /**
   * Initiate Notion OAuth flow - Opens Notion website for authentication
   */
  initiateNotionAuth(userStoryId: number): void {
    const state = this.generateRandomState(userStoryId);
    
    // Store state for validation
    sessionStorage.setItem('notion_oauth_state', state);
    sessionStorage.setItem('notion_user_story_id', userStoryId.toString());
    
    // Build Notion OAuth URL
    const authUrl = new URL(this.NOTION_AUTH_URL);
    authUrl.searchParams.append('client_id', environment.NOTION_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('owner', 'user');
    authUrl.searchParams.append('redirect_uri', this.getRedirectUri());
    authUrl.searchParams.append('state', state);

    // Open Notion OAuth in a popup window
    const popup = window.open(
      authUrl.toString(),
      'notion-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes,left=' + 
      (window.screen.width / 2 - 300) + ',top=' + (window.screen.height / 2 - 350)
    );

    // Listen for popup to close (user completed auth)
    this.pollForPopupClose(popup, userStoryId);
  }

  /**
   * Create a single test case in Notion
   */
  createTestCaseInNotion(testCase: TestCase, userStoryId: number): Observable<NotionCreateResponse> {
    return this.http.post<NotionCreateResponse>(
      `${this.apiUrl}/createNotionTestCase/${userStoryId}/${testCase.test_case_id}`, 
      {}
    ).pipe(
      catchError(error => this.handleError(error, 'creating test case'))
    );
  }

  /**
   * Create a single task in Notion
   */
  createTaskInNotion(task: Task, userStoryId: number): Observable<NotionCreateResponse> {
    return this.http.post<NotionCreateResponse>(
      `${this.apiUrl}/createNotionTask/${userStoryId}/${task.task_id}`, 
      {}
    ).pipe(
      catchError(error => this.handleError(error, 'creating task'))
    );
  }

  /**
   * Validate Notion token
   */
  validateToken(userStoryId: number): Observable<NotionTokenValidation> {
    return this.http.get<NotionTokenValidation>(`${this.apiUrl}/validateToken/${userStoryId}`).pipe(
      catchError(error => {
        // If validation fails, user is not authenticated
        return of({
          success: true,
          user_story_id: userStoryId,
          com_id: 0,
          validation_result: {
            valid: false,
            error: 'Token not found or invalid'
          }
        });
      })
    );
  }

  /**
   * Handle OAuth callback (called from popup)
   */
  handleOAuthCallback(code: string, state: string): Observable<any> {
    const storedState = sessionStorage.getItem('notion_oauth_state');
    const userStoryId = sessionStorage.getItem('notion_user_story_id');
    
    if (state !== storedState) {
      return throwError(() => new Error('Invalid state parameter'));
    }

    // Send to backend to exchange code for token
    return this.http.post(`${this.apiUrl}/oauth-callback`, {
      code,
      state,
      user_story_id: parseInt(userStoryId || '0')
    });
  }

  private generateRandomState(userStoryId: number): string {
    const randomStr = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    return `${userStoryId}_${randomStr}`;
  }

  private getRedirectUri(): string {
    // For development
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:4200/notion-callback';
    }
    // For production
    return `${window.location.origin}/notion-callback`;
  }

  private pollForPopupClose(popup: Window | null, userStoryId: number): void {
    if (!popup) {
      this.showError('Failed to open Notion authentication window');
      return;
    }

    const checkClosed = setInterval(() => {
      try {
        // Check if popup is closed
        if (popup.closed) {
          clearInterval(checkClosed);
          
          // Clean up session storage
          sessionStorage.removeItem('notion_oauth_state');
          sessionStorage.removeItem('notion_user_story_id');
          
          // Check if authentication was successful
          setTimeout(() => {
            this.checkAuthenticationStatus(userStoryId);
          }, 1000);
        }
      } catch (error) {
        // Cross-origin error is expected
        console.log('Popup still open...');
      }
    }, 1000);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkClosed);
      if (!popup.closed) {
        popup.close();
        this.showError('Authentication timed out');
      }
    }, 300000);
  }

  private checkAuthenticationStatus(userStoryId: number): void {
    this.isNotionAuthenticated(userStoryId).subscribe({
      next: (response) => {
        if (response.authenticated) {
          this.modalService.openDialog({
            title: 'Connected to Notion!',
            description: 'Successfully connected to your Notion workspace. You can now sync your test cases and tasks.',
            dialogType: 'success',
            showCancelButton: false,
            successLabel: 'Great!'
          });
          
          // Emit event or trigger refresh
          this.notifyAuthenticationSuccess();
        } else {
          // User might have cancelled or there was an error
          console.log('Authentication not completed');
        }
      },
      error: (error) => {
        console.error('Error checking authentication status:', error);
      }
    });
  }

  private notifyAuthenticationSuccess(): void {
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('notionAuthSuccess', {
      detail: { authenticated: true }
    }));
  }

  private showError(message: string): void {
    this.modalService.openDialog({
      title: 'Authentication Error',
      description: message,
      dialogType: 'alert',
      showCancelButton: false
    });
  }

  private handleError(error: HttpErrorResponse, action: string): Observable<any> {
    let title = 'Notion Integration Error';
    let description = `An error occurred while ${action}.`;

    if (error.status === 401) {
      title = 'Authentication Required';
      description = 'Please connect to Notion first to use this feature.';
    } else if (error.status === 403) {
      title = 'Permission Denied';
      description = 'You don\'t have permission to perform this action in Notion.';
    } else if (error.status === 404) {
      title = 'Not Found';
      description = 'The requested resource was not found. Please check your configuration.';
    } else if (error.status === 429) {
      title = 'Rate Limited';
      description = 'Too many requests to Notion. Please try again later.';
    } else if (error.status === 500) {
      title = 'Server Error';
      description = 'An internal server error occurred. Please try again later.';
    }

    this.modalService.openDialog({
      title,
      description,
      dialogType: 'alert',
      showCancelButton: false
    });

    return throwError(() => error);
  }
}