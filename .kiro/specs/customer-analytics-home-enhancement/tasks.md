# Implementation Plan

- [x] 1. Extend service layer with customer analytics support





  - Create CustomerService with all MVP2 API endpoints
  - Extend existing CsvService to handle enhanced CSV format detection
  - Add new TypeScript interfaces for customer data types
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 Create CustomerService with MVP2 API integration


  - Write CustomerService class with all customer and email campaign endpoints
  - Implement HTTP client calls for customer data, segmentation, and metrics
  - Add email campaign management methods (create, send, track)
  - Create unit tests for CustomerService methods
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [x] 1.2 Extend CsvService for enhanced format detection


  - Modify detectTypeFromHeader method to identify customer data columns
  - Add enhanced format detection logic for customer fields
  - Update CsvUploadOk interface to include customer processing info
  - Write tests for enhanced CSV detection logic
  - _Requirements: 1.1, 1.3, 5.1, 5.2_

- [x] 1.3 Define TypeScript interfaces for customer data


  - Create CustomerMetrics, CustomerSegment, Customer interfaces
  - Define EmailCampaign and campaign statistics interfaces
  - Extend DashboardResponse to include customer analytics
  - Add enhanced upload response types
  - _Requirements: 1.1, 1.2, 2.1, 3.1_

- [x] 2. Enhance home component with customer analytics UI





  - Add customer metrics display section to existing dashboard
  - Implement customer segmentation visualization
  - Create email campaign management interface
  - Update existing KPI displays to include customer data
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 4.1_

- [x] 2.1 Add customer metrics display to dashboard


  - Create customer KPI cards (total customers, new vs repeat, churn rate)
  - Add customer metrics to existing KPI grid layout
  - Implement conditional display based on data availability
  - Style customer metrics to match existing design system
  - _Requirements: 1.1, 1.2, 1.4, 5.3_

- [x] 2.2 Implement customer segmentation visualization


  - Create customer segment cards showing loyal, high-value, frequent, at-risk customers
  - Add segment counts and value metrics display
  - Implement click-through to detailed segment views
  - Add loading states and error handling for segment data
  - _Requirements: 2.1, 2.2, 3.2_

- [x] 2.3 Create email campaign management interface


  - Build campaign creation forms for loyalty, product promotion, and win-back campaigns
  - Add campaign list display with status and analytics
  - Implement campaign sending and tracking functionality
  - Create campaign statistics visualization (open rates, click rates)
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 2.4 Update upload result display for enhanced format


  - Modify upload cards to show customer data processing results
  - Add format indicator (original vs enhanced) to upload status
  - Display customer count and purchase count for enhanced uploads
  - Maintain backward compatibility with legacy upload display
  - _Requirements: 1.3, 5.1, 5.2, 5.4_

- [x] 3. Integrate customer data with existing dashboard workflow





  - Modify upload processing to fetch customer analytics when available
  - Update chart rendering to include customer-related visualizations
  - Enhance insight generation to include customer analysis
  - Update report generation to include customer data
  - _Requirements: 1.1, 1.2, 3.3, 4.1, 4.2_

- [x] 3.1 Modify upload processing for customer data integration


  - Update pollAndRender method to fetch customer analytics after upload
  - Add customer data fetching to dashboard data loading
  - Implement conditional customer data loading based on format detection
  - Add error handling for customer data API failures
  - _Requirements: 1.1, 1.2, 1.4, 5.3_

- [x] 3.2 Add customer visualizations to chart rendering


  - Create customer segment distribution chart
  - Add customer value trend visualization
  - Implement top customers display with purchase history
  - Update existing chart rendering to accommodate customer charts
  - _Requirements: 1.2, 3.2, 3.3_

- [x] 3.3 Enhance insight generation with customer analysis


  - Modify runBatchInsight to include customer-specific insights
  - Add customer behavior analysis to AI prompts
  - Implement individual customer insight generation
  - Update insight display to show customer recommendations
  - _Requirements: 3.3, 4.3_

- [x] 4. Update reporting system with customer analytics





  - Extend report generation to include customer data sections
  - Add customer segmentation data to HTML reports
  - Include customer charts and metrics in exported reports
  - Update report styling to accommodate customer analytics
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.1 Extend HTML report generation with customer data


  - Modify buildReportHtml method to include customer analytics sections
  - Add customer metrics and segmentation to report template
  - Include customer charts in report image generation
  - Update report styling for customer data presentation
  - _Requirements: 4.1, 4.2_

- [x] 4.2 Add customer data to report export functionality


  - Include customer segmentation tables in report
  - Add top customers section to report generation
  - Implement customer chart image capture for reports
  - Update report filename to indicate customer analytics inclusion
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 5. Implement error handling and backward compatibility





  - Add graceful degradation when customer data is unavailable
  - Implement loading states for customer data fetching
  - Ensure existing functionality works unchanged with legacy uploads
  - Add comprehensive error handling for customer API endpoints
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5.1 Implement graceful degradation for customer features


  - Add conditional rendering for customer-specific UI elements
  - Hide customer sections when data is not available
  - Show appropriate messaging for legacy format uploads
  - Ensure smooth user experience regardless of data format
  - _Requirements: 5.3, 5.4_

- [x] 5.2 Add comprehensive error handling for customer APIs


  - Implement try-catch blocks for all customer service calls
  - Add user-friendly error messages for customer data failures
  - Implement retry logic for failed customer API requests
  - Add fallback displays when customer endpoints are unavailable
  - _Requirements: 5.1, 5.2, 5.3_
