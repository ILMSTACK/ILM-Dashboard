import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface DashboardMetric {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  unit: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: any;
  options: any;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  category?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  // Make Math available in template
  Math = Math;

  // Date range filter
  selectedTimeRange = signal('7days');
  timeRangeOptions = [
    { value: '24hours', label: 'Last 24 Hours' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: '1year', label: 'Last Year' }
  ];

  // Dashboard metrics with BI focus
  dashboardMetrics = signal<DashboardMetric[]>([
    {
      id: 'total-records',
      title: 'Total Records Managed',
      value: 2847621,
      previousValue: 2634521,
      unit: '',
      icon: 'storage',
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-200'
    },
    {
      id: 'data-growth',
      title: 'Data Growth Rate',
      value: 12.4,
      previousValue: 8.7,
      unit: '%',
      icon: 'trending_up',
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-200'
    },
    {
      id: 'compliance-score',
      title: 'Compliance Score',
      value: 94.2,
      previousValue: 91.8,
      unit: '%',
      icon: 'verified',
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-200'
    },
    {
      id: 'cost-optimization',
      title: 'Storage Cost Saved',
      value: 45230,
      previousValue: 38910,
      unit: '$',
      icon: 'savings',
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-200'
    }
  ]);

  // Time series data for charts
  dataGrowthTrend = signal<TimeSeriesData[]>([
    { date: '2024-01-01', value: 2.1 },
    { date: '2024-01-02', value: 2.3 },
    { date: '2024-01-03', value: 2.8 },
    { date: '2024-01-04', value: 3.1 },
    { date: '2024-01-05', value: 2.9 },
    { date: '2024-01-06', value: 3.4 },
    { date: '2024-01-07', value: 3.7 }
  ]);

  complianceByCategory = signal([
    { category: 'GDPR', value: 97, color: '#3B82F6' },
    { category: 'HIPAA', value: 94, color: '#10B981' },
    { category: 'SOX', value: 91, color: '#F59E0B' },
    { category: 'PCI DSS', value: 89, color: '#EF4444' }
  ]);

  storageDistribution = signal([
    { type: 'Active Data', value: 45, size: '1.2TB', color: '#6366F1' },
    { type: 'Archive', value: 30, size: '850GB', color: '#8B5CF6' },
    { type: 'Backup', value: 20, size: '560GB', color: '#06B6D4' },
    { type: 'Cold Storage', value: 5, size: '140GB', color: '#84CC16' }
  ]);

  recentAlerts = signal([
    {
      id: 1,
      type: 'warning',
      message: 'Retention policy expiring for 1,247 records',
      timestamp: '2 hours ago',
      severity: 'medium',
      icon: 'schedule'
    },
    {
      id: 2,
      type: 'info',
      message: 'Data classification completed for Finance department',
      timestamp: '4 hours ago',
      severity: 'low',
      icon: 'check_circle'
    },
    {
      id: 3,
      type: 'error',
      message: 'Compliance audit required for Legal documents',
      timestamp: '6 hours ago',
      severity: 'high',
      icon: 'error'
    },
    {
      id: 4,
      type: 'success',
      message: 'Automated archival completed - 500GB moved',
      timestamp: '1 day ago',
      severity: 'low',
      icon: 'archive'
    }
  ]);

  // Computed properties for BI calculations
  totalPercentageChange = computed(() => {
    const metrics = this.dashboardMetrics();
    return metrics.map(metric => {
      const change = ((metric.value - metric.previousValue) / metric.previousValue) * 100;
      return {
        ...metric,
        percentageChange: change,
        isPositive: change > 0
      };
    });
  });

  chartConfigurations = computed(() => {
    const timeRange = this.selectedTimeRange();
    return {
      dataGrowth: {
        id: 'data-growth-chart',
        title: 'Data Growth Trend',
        type: 'line' as const,
        data: this.getFilteredDataByTimeRange(timeRange),
        height: '300px'
      },
      compliance: {
        id: 'compliance-chart',
        title: 'Compliance by Regulation',
        type: 'doughnut' as const,
        data: this.complianceByCategory(),
        height: '300px'
      },
      storage: {
        id: 'storage-chart',
        title: 'Storage Distribution',
        type: 'pie' as const,
        data: this.storageDistribution(),
        height: '300px'
      }
    };
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  // TrackBy function for ngFor optimization
  trackByMetricId(index: number, item: any): string {
    return item.id;
  }

  onTimeRangeChange(newRange: string): void {
    this.selectedTimeRange.set(newRange);
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // Simulate API call to load dashboard data based on selected time range
    console.log('Loading dashboard data for time range:', this.selectedTimeRange());
    // In real implementation, this would call your analytics service
  }

  private getFilteredDataByTimeRange(timeRange: string): TimeSeriesData[] {
    // Filter data based on selected time range
    const data = this.dataGrowthTrend();
    // In real implementation, this would filter based on actual date ranges
    return data;
  }

  formatNumber(value: number, unit: string = ''): string {
    if (value >= 1000000) {
      return `${unit}${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${unit}${(value / 1000).toFixed(1)}K`;
    }
    return `${unit}${value.toFixed(1)}`;
  }

  getAlertIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'warning': 'warning',
      'error': 'error',
      'info': 'info',
      'success': 'check_circle'
    };
    return iconMap[type] || 'info';
  }

  getAlertColor(severity: string): string {
    const colorMap: Record<string, string> = {
      'high': 'text-red-600 bg-red-50 border-red-200',
      'medium': 'text-orange-600 bg-orange-50 border-orange-200',
      'low': 'text-blue-600 bg-blue-50 border-blue-200'
    };
    return colorMap[severity] || 'text-gray-600 bg-gray-50 border-gray-200';
  }

  refreshDashboard(): void {
    console.log('Refreshing dashboard data...');
    this.loadDashboardData();
  }

  exportReport(): void {
    console.log('Exporting dashboard report...');
    // Implement report export functionality
  }
}