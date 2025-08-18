import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessAutomationService, UserStory, Task, TestCase, UserStoryHistory, CreateUserStoryRequest } from '../../../../../services/api/business-automation.service';

@Component({
  selector: 'app-example-nav2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './example-nav2.component.html',
  styleUrl: './example-nav2.component.scss'
})
export class ExampleNav2Component implements OnInit {
  // Form data
  userStoryTitle: string = '';
  userStoryContent: string = '';
  
  // State management
  isLoading: boolean = false;
  currentView: 'create' | 'history' | 'details' = 'create';
  
  // Data storage
  userStoryHistory: UserStoryHistory[] = [];
  selectedUserStory: UserStory | null = null;
  tasks: Task[] = [];
  testCases: TestCase[] = [];
  
  // Search functionality
  searchQuery: string = '';
  searchResults: UserStory[] = [];
  isSearching: boolean = false;
  
  // Success/Error messages
  successMessage: string = '';
  errorMessage: string = '';

  // TAB MANAGEMENT AND EXPANSION
  selectedTab: 'testcases' | 'tasks' = 'testcases';
  expandedTestCase: number | null = null;

  // SORTING PROPERTIES
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  sortedTestCases: TestCase[] = [];

  constructor(private businessService: BusinessAutomationService) {}

  ngOnInit() {
    this.loadUserStoryHistory();
  }

  // Create new user story
  createUserStory() {
    if (!this.userStoryTitle.trim() || !this.userStoryContent.trim()) {
      this.showError('Please fill in both title and user story content');
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    const request: CreateUserStoryRequest = {
      title: this.userStoryTitle.trim(),
      user_story: this.userStoryContent.trim()
    };

    this.businessService.createUserStory(request).subscribe({
      next: (response) => {
        this.showSuccess(`User story created successfully! Generated ${response.data.tasks.length} tasks and ${response.data.testcases.length} test cases.`);
        this.resetForm();
        this.loadUserStoryHistory();
        this.isLoading = false;
      },
      error: (error) => {
        this.showError('Failed to create user story. Please try again.');
        this.isLoading = false;
        console.error('Error creating user story:', error);
      }
    });
  }

  // Load user story history
  loadUserStoryHistory() {
    this.businessService.getUserStoryHistory().subscribe({
      next: (response) => {
        if (response.success) {
          this.userStoryHistory = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading history:', error);
      }
    });
  }

  // Search user stories
  searchUserStories() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.isSearching = true;
    this.businessService.searchUserStories(this.searchQuery).subscribe({
      next: (response) => {
        if (response.success) {
          this.searchResults = response.data;
        }
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Error searching:', error);
        this.isSearching = false;
      }
    });
  }

  // UPDATED: View user story details with tab selection and sorting initialization
  viewUserStoryDetails(userStoryId: number, tab: 'testcases' | 'tasks' = 'testcases') {
    this.selectedTab = tab;
    this.isLoading = true;
    this.currentView = 'details';
    this.expandedTestCase = null; // Reset expanded state
    
    // Reset sorting
    this.sortColumn = '';
    this.sortDirection = 'asc';
    
    // Load user story details
    this.businessService.getUserStory(userStoryId).subscribe({
      next: (response) => {
        if (response.success) {
          this.selectedUserStory = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading user story:', error);
      }
    });

    // Load tasks
    this.businessService.getTasks(userStoryId).subscribe({
      next: (response) => {
        if (response.success) {
          this.tasks = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
      }
    });

    // Load test cases
    this.businessService.getTestCases(userStoryId).subscribe({
      next: (response) => {
        if (response.success) {
          this.testCases = response.data;
          this.sortedTestCases = [...this.testCases]; // Initialize sorted array
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading test cases:', error);
        this.isLoading = false;
      }
    });
  }

  // Toggle test case expansion
  toggleTestCaseExpand(index: number) {
    this.expandedTestCase = this.expandedTestCase === index ? null : index;
  }

  // SORTING METHODS
  sortTable(column: string) {
    if (this.sortColumn === column) {
      // If clicking the same column, toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // If clicking a new column, set it as active with ascending order
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    this.applySorting();
  }

  applySorting() {
    if (!this.sortColumn || this.testCases.length === 0) {
      this.sortedTestCases = [...this.testCases];
      return;
    }

    this.sortedTestCases = [...this.testCases].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.sortColumn) {
        case 'index':
          valueA = this.testCases.indexOf(a);
          valueB = this.testCases.indexOf(b);
          break;
        case 'title':
          valueA = a.test_case_title.toLowerCase();
          valueB = b.test_case_title.toLowerCase();
          break;
        case 'priority':
          // Sort by priority code with custom order (CRITICAL > HIGH > MEDIUM > LOW)
          const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          valueA = priorityOrder[a.priority.priority_code as keyof typeof priorityOrder] || 0;
          valueB = priorityOrder[b.priority.priority_code as keyof typeof priorityOrder] || 0;
          break;
        case 'type':
          valueA = a.test_type.ctgry_name.toLowerCase();
          valueB = b.test_type.ctgry_name.toLowerCase();
          break;
        case 'status':
          valueA = a.status.status_name.toLowerCase();
          valueB = b.status.status_name.toLowerCase();
          break;
        default:
          return 0;
      }

      // Handle numeric vs string comparison
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      } else {
        // String comparison
        if (valueA < valueB) {
          return this.sortDirection === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
          return this.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      }
    });

    // Reset expanded state when sorting
    this.expandedTestCase = null;
  }

  // Get original index for display
  getOriginalIndex(testCase: TestCase): number {
    return this.testCases.findIndex(tc => tc.test_case_id === testCase.test_case_id);
  }

  // Navigation methods
  showCreateView() {
    this.currentView = 'create';
    this.clearMessages();
  }

  showHistoryView() {
    this.currentView = 'history';
    this.loadUserStoryHistory();
    this.clearMessages();
  }

  // Utility methods
  resetForm() {
    this.userStoryTitle = '';
    this.userStoryContent = '';
  }

  showSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 5000);
  }

  showError(message: string) {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 5000);
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // Get priority badge class
  getPriorityClass(priorityCode: string): string {
    const classes: {[key: string]: string} = {
      'LOW': 'badge-success',
      'MEDIUM': 'badge-warning',
      'HIGH': 'badge-orange',
      'CRITICAL': 'badge-danger'
    };
    return classes[priorityCode] || 'badge-secondary';
  }

  // Get status badge class
  getStatusClass(statusCode: string): string {
    const classes: {[key: string]: string} = {
      'TODO': 'badge-secondary',
      'IN_PROGRESS': 'badge-primary',
      'DONE': 'badge-success',
      'DRAFT': 'badge-secondary'
    };
    return classes[statusCode] || 'badge-secondary';
  }

  // Format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Get total tasks from history
  getTotalTasks(): number {
    return this.userStoryHistory.reduce((total, story) => total + story.task_count, 0);
  }

  // Get total test cases from history
  getTotalTestCases(): number {
    return this.userStoryHistory.reduce((total, story) => total + story.testcase_count, 0);
  }
}