import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';

// Services
import { BusinessService } from '../../../../services/api/business/business.service';
import { ModalService } from '../../../../services/modal-service/modal-service.service';

// Nav Components
import { ExampleNavComponent } from '../nav_items/example-nav/example-nav.component';
import { ExampleNav2Component } from '../nav_items/example-nav2/example-nav2.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Angular Material
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonModule,
    MatRippleModule,
    // Nav Components
    ExampleNavComponent,
    ExampleNav2Component,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({ height: '*', opacity: 1 })),
      state('out', style({ height: '0px', opacity: 0 })),
      transition('in <=> out', animate('300ms ease-in-out'))
    ])
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Sidebar state
  sidebarOpen = signal(true);

  // Loading states for API test buttons
  isLoadingFindAll = signal(false);
  isLoadingFindById = signal(false);
  isLoadingCreate = signal(false);
  isLoadingUpdate = signal(false);
  isLoadingDelete = signal(false);
  isLoadingSearch = signal(false);
  isLoadingModal = signal(false);

  // Navigation items
  navigationItems = [
    {
      name: 'Dashboard',
      route: 'dashboard',
      icon: 'dashboard',
      description: 'Main dashboard with API testing'
    },
    {
      name: 'Example 1',
      route: 'example1',
      icon: 'explore',
      description: 'First example component'
    },
    {
      name: 'Example 2',
      route: 'example2',
      icon: 'science',
      description: 'Second example component'
    }
  ];

  private destroy$ = new Subject<void>();
  private snackBar = inject(MatSnackBar);

  constructor(
    private businessService: BusinessService,
    private modalService: ModalService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Initialize component
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Sidebar toggle
  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  // Check if route is active
  isRouteActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  // API Test Methods
  testFindAll(): void {
    this.isLoadingFindAll.set(true);
    this.businessService.findAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Find All Response:', response);
          this.snackBar.open('Find All API - Success!', 'Close', { duration: 3000 });
          this.isLoadingFindAll.set(false);
        },
        error: (error) => {
          console.error('Find All Error:', error);
          this.snackBar.open('Find All API - Error!', 'Close', { duration: 3000 });
          this.isLoadingFindAll.set(false);
        }
      });
  }

  testFindById(): void {
    this.isLoadingFindById.set(true);
    const testId = 'test-business-id-123';
    this.businessService.findById(testId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Find By ID Response:', response);
          this.snackBar.open('Find By ID API - Success!', 'Close', { duration: 3000 });
          this.isLoadingFindById.set(false);
        },
        error: (error) => {
          console.error('Find By ID Error:', error);
          this.snackBar.open('Find By ID API - Error!', 'Close', { duration: 3000 });
          this.isLoadingFindById.set(false);
        }
      });
  }

  testCreate(): void {
    this.isLoadingCreate.set(true);
    const testData = {
      name: 'Test Business',
      description: 'Test business created from dashboard',
      companyId: 'test-company-123'
    };
    
    this.businessService.create(testData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Create Response:', response);
          this.snackBar.open('Create API - Success!', 'Close', { duration: 3000 });
          this.isLoadingCreate.set(false);
        },
        error: (error) => {
          console.error('Create Error:', error);
          this.snackBar.open('Create API - Error!', 'Close', { duration: 3000 });
          this.isLoadingCreate.set(false);
        }
      });
  }

  testUpdate(): void {
    this.isLoadingUpdate.set(true);
    const testId = 'test-business-id-123';
    const updateData = {
      name: 'Updated Test Business',
      description: 'Updated from dashboard test'
    };
    
    this.businessService.update(testId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Update Response:', response);
          this.snackBar.open('Update API - Success!', 'Close', { duration: 3000 });
          this.isLoadingUpdate.set(false);
        },
        error: (error) => {
          console.error('Update Error:', error);
          this.snackBar.open('Update API - Error!', 'Close', { duration: 3000 });
          this.isLoadingUpdate.set(false);
        }
      });
  }

  testDelete(): void {
    this.isLoadingDelete.set(true);
    const testId = 'test-business-id-123';
    
    this.businessService.delete(testId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Delete Response:', response);
          this.snackBar.open('Delete API - Success!', 'Close', { duration: 3000 });
          this.isLoadingDelete.set(false);
        },
        error: (error) => {
          console.error('Delete Error:', error);
          this.snackBar.open('Delete API - Error!', 'Close', { duration: 3000 });
          this.isLoadingDelete.set(false);
        }
      });
  }

  testSearch(): void {
    this.isLoadingSearch.set(true);
    const searchTerm = 'test business';
    
    this.businessService.search(searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Search Response:', response);
          this.snackBar.open('Search API - Success!', 'Close', { duration: 3000 });
          this.isLoadingSearch.set(false);
        },
        error: (error) => {
          console.error('Search Error:', error);
          this.snackBar.open('Search API - Error!', 'Close', { duration: 3000 });
          this.isLoadingSearch.set(false);
        }
      });
  }

  // Modal Test Methods
  testModal(): void {
    this.isLoadingModal.set(true);
    
    // Test confirm modal first
    this.modalService.confirm('Do you want to test the modal service?', 'Modal Test')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Modal Confirm Result:', result);
          if (result) {
            // User clicked confirm, show success modal
            this.modalService.success('Modal service is working perfectly!', 'Success')
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (successResult) => {
                  console.log('Modal Success Result:', successResult);
                  this.snackBar.open('Modal Service - Test Complete!', 'Close', { duration: 3000 });
                  this.isLoadingModal.set(false);
                },
                error: (error) => {
                  console.error('Modal Success Error:', error);
                  this.isLoadingModal.set(false);
                }
              });
          } else {
            // User clicked cancel, show alert
            this.modalService.alert('Modal test was cancelled.', 'Test Cancelled')
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (alertResult) => {
                  console.log('Modal Alert Result:', alertResult);
                  this.snackBar.open('Modal Service - Test Cancelled!', 'Close', { duration: 3000 });
                  this.isLoadingModal.set(false);
                },
                error: (error) => {
                  console.error('Modal Alert Error:', error);
                  this.isLoadingModal.set(false);
                }
              });
          }
        },
        error: (error) => {
          console.error('Modal Confirm Error:', error);
          this.snackBar.open('Modal Service - Error!', 'Close', { duration: 3000 });
          this.isLoadingModal.set(false);
        }
      });
  }
}