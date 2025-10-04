import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoneScreenComponent } from './zone-screen.component';

describe('ZoneScreenComponent', () => {
  let component: ZoneScreenComponent;
  let fixture: ComponentFixture<ZoneScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoneScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZoneScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
