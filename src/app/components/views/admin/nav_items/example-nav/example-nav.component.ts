import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

// Services
import { BusinessService } from '../../../../../services/api/business/business.service';
import { ModalService } from '../../../../../services/modal-service/modal-service.service';

@Component({
  selector: 'app-example-nav',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatButtonModule,
  ],
  templateUrl: './example-nav.component.html',
  styleUrl: './example-nav.component.scss'
})
export class ExampleNavComponent implements OnInit, OnDestroy {

  // Loading states for API test buttons
  isLoadingFindAll = signal(false);
  isLoadingFindById = signal(false);
  isLoadingCreate = signal(false);
  isLoadingUpdate = signal(false);
  isLoadingDelete = signal(false);
  isLoadingSearch = signal(false);
  isLoadingModal = signal(false);

  private destroy$ = new Subject<void>();
  private snackBar = inject(MatSnackBar);

  constructor(
    private businessService: BusinessService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    // Initialize component
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
