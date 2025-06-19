import { Component, OnInit } from '@angular/core';
import { SocketService } from '../core/socket.service';
import { CommonModule } from '@angular/common';
import { scan, map, distinctUntilChanged, tap, shareReplay } from 'rxjs/operators';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, registerables, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components for time scale
Chart.register(...registerables, TimeScale);

type Metric = {
  machineId: string;
  scrapIndex: number;
  sumLast60s: number;
  avgLast60s: number;
  countLast60s: number;
  timestamp: string;
};

const METRIC_KEYS = ['sum', 'avg'] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  mqttMessages$!: Observable<Metric[]>;

  selectedMachines$ = new BehaviorSubject<string[]>([]);

  selectedMetric$ = new BehaviorSubject<MetricKey>('sum');

  selectedScraps$ = new BehaviorSubject<number[]>([]);

  machineOptions$!: Observable<string[]>;

  scrapOptions$!: Observable<number[]>;

  chartData$!: Observable<ChartData<'line', { x: Date; y: number }[], unknown>>;

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Value',
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const raw = ctx.raw as any;
            const scrapIdx = raw?.scrapIndex;
            const base = `${ctx.dataset.label}: ${ctx.formattedValue}`;
            return scrapIdx !== undefined ? `${base} (scrapIndex: ${scrapIdx})` : base;
          },
        },
      },
      legend: {
        onClick: () => {},
        labels: {
          usePointStyle: true,
          boxWidth: 20,
          boxHeight: 10,
        },
      },
    },
  };

  chartType: 'line' = 'line';

  private allMachines: string[] = [];

  hiddenState: Record<string, boolean> = {};

  constructor(private socketService: SocketService) {}

  ngOnInit() {
    //  ---- Stream with unified metric shape ----
    this.mqttMessages$ = this.socketService.stream$.pipe(
      map((msg: any): Metric => {
        // unwrap legacy `{ topic, payload }` envelope if present
        if (msg && typeof msg === 'object' && 'topic' in msg && 'payload' in msg) {
          const p = msg.payload;
          return {
            machineId: p.machineId,
            scrapIndex: p.scrapIndex,
            sumLast60s: msg.sumLast60s ?? p.sumLast60s ?? 0,
            avgLast60s:
              msg.avgLast60s ?? p.avgLast60s ?? (typeof p.value === 'number' ? p.value : 0),
            countLast60s: msg.countLast60s ?? p.countLast60s ?? 1,
            timestamp: p.timestamp ?? new Date().toISOString(),
          };
        }
        // assume message already has Metric shape
        return msg as Metric;
      }),
      scan((acc: Metric[], curr: Metric) => [...acc, curr], []),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    // unique machine list (emits only when list actually changes)
    this.machineOptions$ = this.mqttMessages$.pipe(
      map((messages) => Array.from(new Set(messages.map((m) => m.machineId))).sort()),
      distinctUntilChanged(
        (prev, curr) => prev.length === curr.length && prev.every((v, i) => v === curr[i]),
      ),
    );

    // unique scrapIndex list
    this.scrapOptions$ = this.mqttMessages$.pipe(
      map((messages) =>
        Array.from(new Set(messages.map((m) => m.scrapIndex))).sort((a, b) => a - b),
      ),
      //tap(scraps => this.selectedScraps$.next(scraps)),
      distinctUntilChanged(
        (prev, curr) => prev.length === curr.length && prev.every((v, i) => v === curr[i]),
      ),
    );

    // Keep local copy of every discovered machine ID
    this.machineOptions$.subscribe((list) => (this.allMachines = list));

    this.chartData$ = combineLatest([
      this.mqttMessages$,
      this.selectedMachines$,
      this.selectedMetric$,
      this.selectedScraps$,
    ]).pipe(
      map(([messages, selectedMachines, metric, selectedScraps]) => {
        // Every machine we’ve ever seen
        const machines = Array.from(new Set(messages.map((m) => m.machineId)));
        machines.forEach((m) => {
          if (!(m in this.hiddenState)) {
            this.hiddenState[m] = false;
          }
        });
        const showAll = selectedMachines.length === 0;

        const datasets = machines.map((machineId) => {
          const dataPoints = messages
            .filter((m) => m.machineId === machineId)
            .filter((m) => selectedScraps.length === 0 || selectedScraps.includes(m.scrapIndex))
            .map((m) => ({
              x: new Date(m.timestamp),
              y: metric === 'sum' ? m.sumLast60s : m.avgLast60s,
              scrapIndex: m.scrapIndex,
            }));

          return {
            label: `${machineId} (${metric})`,
            data: dataPoints,
            fill: false,
            borderColor: this.getColorForMachine(machineId),
            tension: 0.1,
            hidden:
              this.hiddenState[machineId] ??
              (showAll ? false : !selectedMachines.includes(machineId)),
          };
        });

        return { datasets };
      }),
    );
  }

  onMachineToggle(machine: string, checked: boolean) {
    const current = this.selectedMachines$.getValue();

    if (checked) {
      this.hiddenState[machine] = false; // show this machine
      if (!current.includes(machine)) {
        this.selectedMachines$.next([...current, machine]);
      }
    } else {
      this.hiddenState[machine] = true; // hide this machine
      if (current.length === 0) {
        const newSelection = this.allMachines.filter((m) => m !== machine);
        this.selectedMachines$.next(newSelection);
      } else {
        this.selectedMachines$.next(current.filter((m) => m !== machine));
      }
    }
  }

  onScrapToggle(scrap: number, checked: boolean) {
    const current = this.selectedScraps$.getValue();
    if (checked && !current.includes(scrap)) {
      this.selectedScraps$.next([...current, scrap]);
    } else if (!checked) {
      this.selectedScraps$.next(current.filter((s) => s !== scrap));
    }
  }

  onMetricChange(metric: MetricKey) {
    this.selectedMetric$.next(metric);
  }

  trackByMachine(index: number, machine: string): string {
    return machine;
  }

  trackByScrap(index: number, scrap: number): number {
    return scrap;
  }

  private getColorForMachine(machineId: string): string {
    // Simple hash to color mapping
    const colors = [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
    ];
    let hash = 0;
    for (let i = 0; i < machineId.length; i++) {
      hash = machineId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}
