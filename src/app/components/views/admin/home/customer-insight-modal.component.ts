import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface CustomerInsightData {
  ok: boolean;
  customer: {
    customer_id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    first_purchase_date?: string;
    last_purchase_date?: string;
    total_orders: number;
    total_spent: number;
    average_order_value?: number;
    days_since_last_purchase?: number;
    created_at?: string;
    recent_purchases?: Array<{
      invoice_id: string;
      invoice_date: string;
      item_name: string;
      qty: number;
      revenue: number;
    }>;
  };
  insight: string;
}

@Component({
  selector: 'app-customer-insight-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="customer-insight-modal">
      <div mat-dialog-title class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <mat-icon class="text-white">person_search</mat-icon>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Customer Insights</h2>
            <p class="text-sm text-gray-600" *ngIf="data?.customer">{{ data.customer.name }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="!text-gray-400 hover:!text-gray-600">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div mat-dialog-content class="max-h-[70vh] overflow-y-auto">
        <div *ngIf="!data" class="flex items-center justify-center py-8">
          <mat-progress-spinner diameter="32" mode="indeterminate"></mat-progress-spinner>
          <span class="ml-3 text-gray-600">Loading customer insights...</span>
        </div>

        <div *ngIf="data && !data.ok" class="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          Failed to load customer insights. Please try again.
        </div>

        <div *ngIf="data?.ok" class="space-y-6">
          <!-- Customer Overview -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Customer Overview</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-gray-600">Customer ID</div>
                <div class="font-medium text-gray-900">{{ data.customer.customer_id }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-600">Name</div>
                <div class="font-medium text-gray-900">{{ data.customer.name }}</div>
              </div>
              <div *ngIf="data.customer.email">
                <div class="text-sm text-gray-600">Email</div>
                <div class="font-medium text-gray-900">{{ data.customer.email }}</div>
              </div>
              <div *ngIf="data.customer.phone">
                <div class="text-sm text-gray-600">Phone</div>
                <div class="font-medium text-gray-900">{{ data.customer.phone }}</div>
              </div>
              <div *ngIf="data.customer.address">
                <div class="text-sm text-gray-600">Address</div>
                <div class="font-medium text-gray-900">{{ data.customer.address }}</div>
              </div>
              <div *ngIf="!data.customer.email && !data.customer.phone && !data.customer.address" class="col-span-full">
                <div class="text-sm text-gray-500 italic">Additional customer details not available</div>
              </div>
            </div>
          </div>

          <!-- Purchase Statistics -->
          <div class="bg-blue-50 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Purchase Statistics</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{{ data.customer.total_orders }}</div>
                <div class="text-sm text-gray-600">Total Orders</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">{{ formatMYR(data.customer.total_spent) }}</div>
                <div class="text-sm text-gray-600">Total Spent</div>
              </div>
              <div class="text-center" *ngIf="data.customer.average_order_value !== undefined">
                <div class="text-2xl font-bold text-purple-600">{{ formatMYR(data.customer.average_order_value) }}</div>
                <div class="text-sm text-gray-600">Avg Order Value</div>
              </div>
              <div class="text-center" *ngIf="data.customer.days_since_last_purchase !== undefined">
                <div class="text-2xl font-bold text-orange-600">{{ data.customer.days_since_last_purchase }}</div>
                <div class="text-sm text-gray-600">Days Since Last Purchase</div>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" *ngIf="data.customer.first_purchase_date || data.customer.last_purchase_date">
              <div *ngIf="data.customer.first_purchase_date">
                <div class="text-sm text-gray-600">First Purchase</div>
                <div class="font-medium text-gray-900">{{ formatDate(data.customer.first_purchase_date) }}</div>
              </div>
              <div *ngIf="data.customer.last_purchase_date">
                <div class="text-sm text-gray-600">Last Purchase</div>
                <div class="font-medium text-gray-900">{{ formatDate(data.customer.last_purchase_date) }}</div>
              </div>
            </div>
          </div>

          <!-- Recent Purchases -->
          <div *ngIf="data.customer.recent_purchases?.length">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Recent Purchases</h3>
            <div class="overflow-auto border border-gray-200 rounded-lg">
              <table class="min-w-full border-collapse">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="text-left text-xs font-medium text-gray-600 px-3 py-2 border-b">Invoice</th>
                    <th class="text-left text-xs font-medium text-gray-600 px-3 py-2 border-b">Date</th>
                    <th class="text-left text-xs font-medium text-gray-600 px-3 py-2 border-b">Item</th>
                    <th class="text-left text-xs font-medium text-gray-600 px-3 py-2 border-b">Qty</th>
                    <th class="text-left text-xs font-medium text-gray-600 px-3 py-2 border-b">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let purchase of data.customer.recent_purchases" class="odd:bg-white even:bg-gray-50">
                    <td class="px-3 py-2 border-b text-sm text-gray-800">{{ purchase.invoice_id }}</td>
                    <td class="px-3 py-2 border-b text-sm text-gray-800">{{ formatDate(purchase.invoice_date) }}</td>
                    <td class="px-3 py-2 border-b text-sm text-gray-800">{{ purchase.item_name }}</td>
                    <td class="px-3 py-2 border-b text-sm text-gray-800">{{ purchase.qty }}</td>
                    <td class="px-3 py-2 border-b text-sm text-gray-800">{{ formatMYR(purchase.revenue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- AI Insight -->
          <div *ngIf="data.insight" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <mat-icon class="text-amber-600 mr-2">lightbulb</mat-icon>
              AI Insights
            </h3>
            <div class="text-amber-800 whitespace-pre-wrap">{{ data.insight }}</div>
          </div>
        </div>
      </div>

      <div mat-dialog-actions class="flex justify-end gap-2">
        <button mat-button (click)="close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .customer-insight-modal {
      min-width: 600px;
      max-width: 800px;
    }
    
    @media (max-width: 768px) {
      .customer-insight-modal {
        min-width: 90vw;
        max-width: 95vw;
      }
    }
  `]
})
export class CustomerInsightModalComponent {
  constructor(
    public dialogRef: MatDialogRef<CustomerInsightModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CustomerInsightData | null
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  formatMYR(amount: number): string {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }
}