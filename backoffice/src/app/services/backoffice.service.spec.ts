import { TestBed } from '@angular/core/testing';

import { BackofficeService } from './backoffice.service';

describe('BackofficeService', () => {
  let service: BackofficeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BackofficeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
