import { TestBed } from '@angular/core/testing';

import { MessagesGroupService } from './messages-group.service';

describe('MessagesGroupService', () => {
  let service: MessagesGroupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessagesGroupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
