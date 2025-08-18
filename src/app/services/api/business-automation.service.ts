import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ModalService } from '../modal-service/modal-service.service';
import { Observable, catchError, throwError } from 'rxjs';
export interface UserStory {
  user_story_id: number;
  user_story_title: string;
  user_story_content: string;
  user_story_created_at: string;
  user_story_updated_at: string;
}

export interface Task {
  task_id: number;
  user_story_id: number;
  task_title: string;
  task_description: string;
  task_assignee_user_id: number | null;
  task_priority_id: number;
  task_status_id: number;
  task_estimated_hours: number;
  task_labels: string[];
  task_due_date: string | null;
  assignee: {
    id: number;
    email: string;
    role: {
      role_name: string;
      role_code: string;
    };
  } | null;
  priority: {
    priority_name: string;
    priority_code: string;
    priority_color: string;
  };
  status: {
    status_name: string;
    status_code: string;
  };
}

export interface TestCase {
  test_case_id: number;
  user_story_id: number;
  test_case_title: string;
  test_case_description: string;
  test_case_steps: string[];
  test_case_expected_result: string;
  test_case_priority_id: number;
  test_case_type_id: number;
  test_case_status_id: number;
  priority: {
    priority_name: string;
    priority_code: string;
    priority_color: string;
  };
  test_type: {
    ctgry_name: string;
    ctgry_code: string;
  };
  status: {
    status_name: string;
    status_code: string;
  };
}

export interface CreateUserStoryRequest {
  user_story: string;
  title: string;
}

export interface CreateUserStoryResponse {
  success: boolean;
  user_story_id: number;
  data: {
    testcases: TestCase[];
    tasks: Task[];
  };
}

export interface UserStoryHistory {
  user_story_id: number;
  user_story_title: string;
  user_story_created_at: string;
  testcase_count: number;
  task_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessAutomationService {
  private apiUrl = `${environment.API_URL}/business-automation`;

  constructor(private http: HttpClient,private modalService: ModalService,) {}

  createUserStory(request: CreateUserStoryRequest): Observable<CreateUserStoryResponse> {
    return this.http.post<CreateUserStoryResponse>(`${this.apiUrl}/create`, request).pipe(
          catchError(error => this.handleError(error))
    );
  }

  getUserStoryHistory(): Observable<{success: boolean, data: UserStoryHistory[]}> {
    return this.http.get<{success: boolean, data: UserStoryHistory[]}>(`${this.apiUrl}/history`);
  }

  searchUserStories(query: string): Observable<{success: boolean, data: UserStory[], search_term: string}> {
    return this.http.get<{success: boolean, data: UserStory[], search_term: string}>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`);
  }

  getUserStory(userStoryId: number): Observable<{success: boolean, data: UserStory}> {
    return this.http.get<{success: boolean, data: UserStory}>(`${this.apiUrl}/user-story/${userStoryId}`);
  }

  getTasks(userStoryId: number): Observable<{success: boolean, data: Task[], user_story_id: number}> {
    return this.http.get<{success: boolean, data: Task[], user_story_id: number}>(`${this.apiUrl}/tasks/${userStoryId}`);
  }

  getTestCases(userStoryId: number): Observable<{success: boolean, data: TestCase[], user_story_id: number}> {
    return this.http.get<{success: boolean, data: TestCase[], user_story_id: number}>(`${this.apiUrl}/testcases/${userStoryId}`);
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