import { TestBed } from '@angular/core/testing';

import { TrackingHelperService } from './tracking-helper.service';

describe('TrackingHelperService', () => {
  let service: TrackingHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrackingHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
