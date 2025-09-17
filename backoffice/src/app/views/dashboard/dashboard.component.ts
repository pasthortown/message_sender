import { NgStyle } from '@angular/common';
import { Component, DestroyRef, DOCUMENT, effect, inject, OnInit, Renderer2, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ChartOptions } from 'chart.js';
import {
  AvatarComponent,
  ButtonDirective,
  ButtonGroupComponent,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  FormCheckLabelDirective,
  GutterDirective,
  ProgressComponent,
  RowComponent,
  TableDirective
} from '@coreui/angular';
import { ChartjsComponent } from '@coreui/angular-chartjs';
import { IconDirective } from '@coreui/icons-angular';

import { DashboardChartsData, IChartProps } from './dashboard-charts-data';
import { MessageService } from '../../services/message.service';

import {
  Chart,
  Filler,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js';

// REGISTRO de elementos y plugins (incluye Filler)
Chart.register(Filler, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

type SeriesPayload = {
  labels: string[];
  accedido: number[];
  activo: number[];
  leido: number[];
  inactivo: number[];
};

type ValuesPayload = {
  accedido: number;
  activo: number;
  leido: number;
  inactivo: number;
};

type PercentsPayload = {
  accedido: number;
  activo: number;
  leido: number;
  inactivo: number;
};

@Component({
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss'],
  standalone: true,
  imports: [
    // CoreUI + utilidades usadas en el HTML
    CardComponent, CardBodyComponent, CardFooterComponent, CardHeaderComponent,
    RowComponent, ColComponent, GutterDirective,
    ButtonDirective, ButtonGroupComponent, FormCheckLabelDirective,
    ProgressComponent, TableDirective, AvatarComponent,
    IconDirective,
    ChartjsComponent,
    ReactiveFormsModule,
    NgStyle
  ]
})
export class DashboardComponent implements OnInit {

  // Datos crudos del API
  data: any[] = [];

  // Subtítulo dinámico: "Enero - <Mes> <Año>"
  subtitle = '';

  // Gráfico principal (4 estados)
  public mainChart: IChartProps = { type: 'line' };
  public mainChartRef: WritableSignal<any> = signal(undefined);

  // Señales para reestilizar al cambiar tema
  readonly #destroyRef: DestroyRef = inject(DestroyRef);
  readonly #document: Document = inject(DOCUMENT);
  readonly #renderer: Renderer2 = inject(Renderer2);
  readonly #chartsData: DashboardChartsData = inject(DashboardChartsData);

  // Footer del card principal
  totals = { leido: 0, activo: 0, inactivo: 0, accedido: 0, total: 0 };
  percents = { leido: 0, activo: 0, inactivo: 0, accedido: 0 };

  // ==== Props para los 4 widgets (sparklines) ====
  widgetsSeries: SeriesPayload = {
    labels: [],
    accedido: [],
    activo: [],
    leido: [],
    inactivo: []
  };
  widgetsValues: ValuesPayload = { accedido: 0, activo: 0, leido: 0, inactivo: 0 };
  widgetsPercents: PercentsPayload = { accedido: 0, activo: 0, leido: 0, inactivo: 0 };

  // (se conserva por compatibilidad con tu estructura)
  public trafficRadioGroup = new FormGroup({
    trafficRadio: new FormControl('Month')
  });

  // Máximo dinámico del eje Y (con margen visual)
  private yMax = 10;

  // Efecto para aplicar estilos a la instancia del chart
  #mainChartRefEffect = effect(() => {
    if (this.mainChartRef()) {
      this.setChartStyles();
    }
  });

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.getMessageData();
    this.initCharts();                 // opciones base (escalas) desde DashboardChartsData
    this.updateChartOnColorModeChange();
  }

  // ============================
  //   CARGA Y PREPARACIÓN DE DATOS
  // ============================
  async getMessageData(): Promise<void> {
    try {
      const response = await this.messageService.getAllReports();
      this.data = response?.response ?? [];

      this.buildChartFromData();   // arma config con fill:false
      this.buildFooterStats();     // calcula totals/percents
      this.feedWidgets();          // llena widgets* a partir de lo ya calculado
    } catch (error) {
      console.error('Error fetching message reports:', error);
    }
  }

  /** Construye labels (ene..último mes) y 4 series (Leído/Activo/Inactivo/Accedido) para el gráfico principal */
  private buildChartFromData(): void {
    const mesesES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const ESTADO = { LEIDO: 'Leído', ACTIVO: 'Activo', INACTIVO: 'Inactivo', ACCEDIDO: 'Accedido' } as const;

    const now = new Date();
    const currentYear = now.getFullYear();

    const serieLeido = new Array(12).fill(0);
    const serieActivo = new Array(12).fill(0);
    const serieInactivo = new Array(12).fill(0);
    const serieAccedido = new Array(12).fill(0);

    let lastMonthWithData = -1;

    for (const r of this.data) {
      const iso = r?.timestamp?.$date || r?.timestate?.$date;
      if (!iso) continue;

      const d = new Date(iso);
      if (isNaN(d.getTime()) || d.getFullYear() !== currentYear) continue;

      const m = d.getMonth();
      const estado: string = r?.estado || '';

      if (estado === ESTADO.LEIDO)         serieLeido[m] += 1;
      else if (estado === ESTADO.ACTIVO)   serieActivo[m] += 1;
      else if (estado === ESTADO.INACTIVO) serieInactivo[m] += 1;
      else if (estado === ESTADO.ACCEDIDO) serieAccedido[m] += 1;

      if (m > lastMonthWithData) lastMonthWithData = m;
    }

    if (lastMonthWithData < 0) lastMonthWithData = now.getMonth();

    const labels = mesesES.slice(0, lastMonthWithData + 1);
    const dataLeido     = serieLeido.slice(0, lastMonthWithData + 1);
    const dataActivo    = serieActivo.slice(0, lastMonthWithData + 1);
    const dataInactivo  = serieInactivo.slice(0, lastMonthWithData + 1);
    const dataAccedido  = serieAccedido.slice(0, lastMonthWithData + 1);

    // === Y-max dinámico con margen visual ===
    const maxVal = Math.max(0, ...dataLeido, ...dataActivo, ...dataInactivo, ...dataAccedido);
    this.yMax = Math.max(5, Math.ceil(maxVal * 1.15));

    this.subtitle = `Enero - ${mesesES[lastMonthWithData]} ${currentYear}`;

    const css = getComputedStyle(document.documentElement);
    const colorSuccess = (css.getPropertyValue('--cui-success') || '#4dbd74').trim();
    const colorInfo    = (css.getPropertyValue('--cui-info')    || '#20a8d8').trim();
    const colorWarning = (css.getPropertyValue('--cui-warning') || '#ffc107').trim();
    const colorDanger  = (css.getPropertyValue('--cui-danger')  || '#f86c6b').trim();

    this.mainChart = {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Leído',    data: dataLeido,    borderColor: colorSuccess, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 3, pointHoverRadius: 4, fill: false },
          { label: 'Activo',   data: dataActivo,   borderColor: colorInfo,    backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 3, pointHoverRadius: 4, fill: false },
          { label: 'Inactivo', data: dataInactivo, borderColor: colorWarning, backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 3, pointHoverRadius: 4, fill: false },
          { label: 'Accedido', data: dataAccedido, borderColor: colorDanger,  backgroundColor: 'transparent', borderWidth: 2, tension: 0.4, pointRadius: 3, pointHoverRadius: 4, fill: false }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          filler: { propagate: false }   // ← evita lectura de 'disabled' sobre undefined
        },
        scales: {
          x: { grid: { drawOnChartArea: false } },
          y: {
            beginAtZero: true,
            suggestedMax: this.yMax,        // ⇐ usar sugerido para que el tema no lo "pise"
            ticks: { precision: 0 }
          }
        },
        elements: { line: { tension: 0.4 }, point: { hitRadius: 10, hoverBorderWidth: 3 } }
      }
    };

    // Normaliza fill y plugins por si algo queda heredado
    this.enforceNoFill();
  }

  /** Totales y porcentajes globales por estado (para footer y widgets) */
  private buildFooterStats(): void {
    const ESTADO = { LEIDO: 'Leído', ACTIVO: 'Activo', INACTIVO: 'Inactivo', ACCEDIDO: 'Accedido' } as const;
    let leido = 0, activo = 0, inactivo = 0, accedido = 0;

    for (const r of this.data) {
      switch (r?.estado) {
        case ESTADO.LEIDO:     leido++; break;
        case ESTADO.ACTIVO:    activo++; break;
        case ESTADO.INACTIVO:  inactivo++; break;
        case ESTADO.ACCEDIDO:  accedido++; break;
      }
    }

    const total = leido + activo + inactivo + accedido || 1;
    const pct = (n: number) => Math.round((n * 100) / total);

    this.totals = { leido, activo, inactivo, accedido, total };
    this.percents = {
      leido: pct(leido),
      activo: pct(activo),
      inactivo: pct(inactivo),
      accedido: pct(accedido)
    };
  }

  /** Alimenta valores y porcentajes a los widgets usando lo ya calculado */
  private feedWidgets(): void {
    this.widgetsValues = {
      accedido: this.totals.accedido,
      activo: this.totals.activo,
      leido: this.totals.leido,
      inactivo: this.totals.inactivo
    };
    this.widgetsPercents = {
      accedido: this.percents.accedido,
      activo: this.percents.activo,
      leido: this.percents.leido,
      inactivo: this.percents.inactivo
    };
  }

  // ============================
  //   GRÁFICO: estilos/tema
  // ============================
  initCharts(): void {
    this.mainChartRef()?.stop();

    // Carga de opciones base (pueden traer fill por defecto desde el tema)
    this.mainChart = this.#chartsData.mainChart;

    // Normalizar: sin relleno y con plugin filler configurado
    this.enforceNoFill();
  }

  handleChartRef($chartRef: any) {
    if ($chartRef) {
      this.mainChartRef.set($chartRef);
    }
  }

  updateChartOnColorModeChange() {
    const unListen = this.#renderer.listen(this.#document.documentElement, 'ColorSchemeChange', () => {
      this.setChartStyles();
    });
    this.#destroyRef.onDestroy(() => unListen());
  }

  setChartStyles() {
    if (this.mainChartRef()) {
      setTimeout(() => {
        // Clonar y mezclar opciones del tema manteniendo nuestros guardas
        const options: ChartOptions = { ...this.mainChart.options };
        const themeScales = this.#chartsData.getScales();

        // plugins: asegurar filler definido
        options.plugins = {
          ...(options.plugins || {}),
          filler: { propagate: false, ...(options.plugins as any)?.filler }
        };

        // merge de escalas
        const mergedScales: any = { ...options.scales, ...themeScales };
        mergedScales.y = {
          ...(mergedScales.y || {}),
          max: undefined,                 // evita 0–250 fijo
          suggestedMax: this.yMax,        // reaplica nuestro máximo dinámico
          beginAtZero: true,
          ticks: { precision: 0, ...(mergedScales.y?.ticks || {}) }
        };

        this.mainChartRef().options.plugins = options.plugins as any;
        this.mainChartRef().options.scales = mergedScales;
        this.mainChartRef().update();
      });
    }
  }

  /** Quita cualquier `fill:true` heredado y asegura opciones del plugin Filler */
  private enforceNoFill(): void {
    // Asegurar objeto options
    this.mainChart.options = this.mainChart.options || {};
    // Asegurar plugins.filler
    this.mainChart.options.plugins = {
      ...(this.mainChart.options.plugins || {}),
      filler: { propagate: false, ...(this.mainChart.options.plugins as any)?.filler }
    };

    // Forzar fill:false en todos los datasets presentes
    const ds = (this.mainChart.data as ChartData<'line'>)?.datasets || [];
    this.mainChart.data = {
      ...(this.mainChart.data as any),
      datasets: ds.map((d: any) => ({ ...d, fill: false }))
    } as any;
  }
}
