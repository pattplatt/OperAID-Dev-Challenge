import { Component, OnInit } from '@angular/core';
import { SocketService } from '../core/socket.service';
import { CommonModule } from '@angular/common';
import { scan, map } from 'rxjs/operators';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, registerables, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components for time scale
Chart.register(...registerables, TimeScale);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})

export class Dashboard implements OnInit {
  mqttMessages$!: Observable<{ topic: string; payload: { machineId: string; scrapIndex: number; value: number; timestamp: string }; }[]>;

  selectedMachines$ = new BehaviorSubject<string[]>([]);

  machineOptions$!: Observable<string[]>;

  chartData$!: Observable<ChartData<'line', { x: Date; y: number }[], unknown>>;

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute'
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Value'
        }
      }
    }
  };

  chartType: 'line' = 'line';  // Changed to literal type 'line'

  constructor(private socketService: SocketService) { }

  ngOnInit() {
    this.mqttMessages$ = this.socketService.mqtt$.pipe(
      scan((acc, curr) => [...acc, curr], [] as { topic: string; payload: { machineId: string; scrapIndex: number; value: number; timestamp: string }; }[])
    );

    this.machineOptions$ = this.mqttMessages$.pipe(
      // derive unique machine IDs
      scan((acc, curr) => {
        const machines = new Set(acc);
        curr.forEach(msg => machines.add(msg.payload.machineId));
        return Array.from(machines);
      }, [] as string[])
    );

    this.chartData$ = combineLatest([this.mqttMessages$, this.selectedMachines$]).pipe(
      // map to chart data
      // For each selected machine, we create a dataset
      // Each dataset has data points {x: timestamp, y: value}
      // Only include messages for selected machines
      // If no machines selected, show all machines
      map(([messages, selected]) => {
        const machinesToShow = selected.length > 0 ? selected : Array.from(new Set(messages.map(m => m.payload.machineId)));

        const datasets = machinesToShow.map(machineId => {
          const dataPoints = messages
            .filter(m => m.payload.machineId === machineId)
            .map(m => ({
              x: new Date(m.payload.timestamp),
              y: m.payload.value
            }));

          return {
            label: machineId,
            data: dataPoints,
            fill: false,
            borderColor: this.getColorForMachine(machineId),
            tension: 0.1
          };
        });

        return { datasets };
      })
    );
  }

  onMachineToggle(machine: string, checked: boolean) {
    const current = this.selectedMachines$.getValue();
    if (checked) {
      if (!current.includes(machine)) {
        this.selectedMachines$.next([...current, machine]);
      }
    } else {
      this.selectedMachines$.next(current.filter(m => m !== machine));
    }
  }

  private getColorForMachine(machineId: string): string {
    // Simple hash to color mapping
    const colors = [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)'
    ];
    let hash = 0;
    for (let i = 0; i < machineId.length; i++) {
      hash = machineId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}