import { AX_LOCALES } from './../locales';
import { Component, OnInit, ViewEncapsulation, Input, TemplateRef,Injector, Output, EventEmitter, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import * as moment from 'moment';
import { AxiomSchedulerService } from './../services/axiom-scheduler.service';
import { Subscription } from 'rxjs';
import { AxiomSchedulerSidebarService } from './../services/axiom-scheduler-sidebar.service';

export enum AxiomSchedulerView {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year'
}
export enum AxiomSchedulerAnimation {
  Animation1 = 'animation1',
  Animation2 = 'animation2',
  Animation3 = 'animation3',
  Animation4 = 'animation4',
  Default = 'default',
  None = 'none'
}

export type AxiomSchedulerTheme = 'light' | 'dark';

export class AxiomSchedulerComponentCommon implements OnDestroy {

  @Input() axEvents: AxiomSchedulerEvent[];
  @Input() axStartDate: Date;
  @Input() axEventTemplate: TemplateRef<any>;
  @Input() axEventFormatter: (data: any, date?: Date) => string;
  @Input() axDragStep: number;
  @Input() axLocale: string;

  public today: moment.Moment;
  public date: moment.Moment;
  public service: AxiomSchedulerService;
  public sidebarService: AxiomSchedulerSidebarService;
  public subscriptionGarbageCollection: Subscription[] = [];

  constructor(protected injector: Injector) {
    this.today = moment();
    this.service = this.injector.get(AxiomSchedulerService);
    this.sidebarService = this.injector.get(AxiomSchedulerSidebarService);
    this.subscriptionGarbageCollection.push(this.service.refershRequest.subscribe((s) => {
      if (s) {
        this.date = s.clone();
        this.date.locale(this.service.schedulerLocale);
        this.refreshView();
      }
    }));
    this.subscriptionGarbageCollection.push(this.service.locale.subscribe((locale) => {
      moment.locale(locale);
      if (this.date) {
        this.date.locale(this.service.schedulerLocale);
        this.refreshView();
      }
    }));
  }

  public refresh(): void {
    this.date = this.axStartDate ? moment(this.axStartDate) : moment(Date.now());
  }

  public refreshView(): void { }

  public ngOnDestroy(): void {
    if (Array.isArray(this.subscriptionGarbageCollection)) {
      this.subscriptionGarbageCollection.forEach(g => g && g.unsubscribe());
    }
    this.baseDestroy();
  }

  public baseDestroy(): void { }

}

export class AxiomSchedulerEvent {
  public from: Date;
  public to: Date;
  public data: any;
  public color: string;
  constructor(from: Date = null, to: Date = null, data: any = null, color: string = null) {
    this.data = data;
    this.from = from;
    this.to = to;
    this.color = color;
  }
}

@Component({
  selector: 'ax-scheduler',
  templateUrl: './axiom-scheduler.component.html',
  styleUrls: ['./axiom-scheduler.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [AxiomSchedulerService,AxiomSchedulerSidebarService],
  host: {
    'class': 'ax-scheduler'
  }
})
export class AxiomSchedulerComponent extends AxiomSchedulerComponentCommon implements OnInit {

  @Input() axSchedulerView: AxiomSchedulerView;
  @Input() axTheme: AxiomSchedulerTheme;
  @Input() axAnimation: AxiomSchedulerAnimation;
  @Input() axShowLocale: boolean = true;
  @Input() axViews: AxiomSchedulerView[];

  @Output() axEventChange = new EventEmitter<AxiomSchedulerEvent>();
  @Output() axEventClick = new EventEmitter<AxiomSchedulerEvent>();
  @Output() axDateChange = new EventEmitter<Date>();
  @Output() axViewChange = new EventEmitter<AxiomSchedulerView>();

  public items = [];
  public locales = AX_LOCALES.map((v) => {
    return { id: v, title: v };
  });

  constructor(injector: Injector, private _element: ElementRef, private _renderer: Renderer2) {
    super(injector);
  }

  public ngOnInit(): void {
    this.axLocale = this.axLocale || 'en';
    this.setListeners();
    this.refreshScheduler();
  }

  public refreshScheduler() {
    this.updateTheme(this.axTheme);
    this.refresh();
    this.setViews();
  }

  public prev(): void {
    this.step(-1);
    this.service.refreshDate(this.date);
  }

  public next(): void {
    this.step(1);
    this.service.refreshDate(this.date);
  }

  public todayF(): void {
    this.applyDefaultAnimations(this.date.clone().isBefore(moment()) ? 1 : -1);
    this.date = moment();
    this.service.refreshDate(this.date);
    this.axDateChange && this.axDateChange.emit(this.date.clone().toDate());
  }

  public modelFormatter(value: any): any {
    return value ? value.id : null;
  }

  public setLocale(locale: string): void {
    this.service.changeLocale(locale);
  }

  public updateTheme(theme: 'light' | 'dark'): void {
    if (theme) {
      this._renderer.removeClass(this._element.nativeElement, 'dark');
      this._renderer.removeClass(this._element.nativeElement, 'light');
      this._renderer.addClass(this._element.nativeElement, theme);
      //
      if (this.axAnimation === 'none') {
        Object.values(AxiomSchedulerAnimation).forEach((animation) => {
          this._renderer.removeClass(this._element.nativeElement, animation);
        });
      }
      else {
        Object.values(AxiomSchedulerAnimation).forEach((animation) => {
          this._renderer.removeClass(this._element.nativeElement, animation);
        });
        this._renderer.addClass(this._element.nativeElement, this.axAnimation);
      }
    }
  }

  public changeView(view: any): void {
    this.axSchedulerView = view.id;
    this.axViewChange && this.axViewChange.emit(view.id);
  }

  private step(step: number): void {
    switch (this.axSchedulerView) {
      case AxiomSchedulerView.Day:
        this.date = this.date.clone().add(step, 'days');
        break;
      case AxiomSchedulerView.Week:
        this.date = this.date.clone().add(step, 'weeks');
        break;
      case AxiomSchedulerView.Month:
        this.date = this.date.clone().add(step, 'months');
        break;
      case AxiomSchedulerView.Year:
        this.date = this.date.clone().add(step, 'years');
        break;
    }
    this.applyDefaultAnimations(step);
    this.axDateChange && this.axDateChange.emit(this.date.clone().toDate());
  }

  private applyDefaultAnimations(step: number): void {
    if (this.axAnimation === AxiomSchedulerAnimation.Default) {
      this._renderer.removeClass(this._element.nativeElement, 'forward');
      this._renderer.removeClass(this._element.nativeElement, 'backward');
      if (step > 0) {
        this._renderer.addClass(this._element.nativeElement, 'forward');
      }
      else {
        this._renderer.addClass(this._element.nativeElement, 'backward');
      }
    }
  }

  private setViews(): void {
    var def = [
      { id: AxiomSchedulerView.Day, title: 'Day' },
      { id: AxiomSchedulerView.Week, title: 'Week' },
      { id: AxiomSchedulerView.Month, title: 'Month' },
      { id: AxiomSchedulerView.Year, title: 'Year' }
    ];
    if (Array.isArray(this.axViews)) {
      this.items = [...def.filter(i => this.axViews.indexOf(i.id) >= 0)];
    }
    else {
      this.items = [...def];
    }
    if (!this.axSchedulerView) {
      this.axSchedulerView = this.items[0].id;
    }
  }

  private setListeners(): void {
    this.subscriptionGarbageCollection.push(this.service.eventChange.subscribe(event => {
      this.axEventChange && this.axEventChange.emit(event);
    }));
    this.subscriptionGarbageCollection.push(this.service.eventClick.subscribe(event => {
      this.axEventClick && this.axEventClick.emit(event);
    }));
  }

}
