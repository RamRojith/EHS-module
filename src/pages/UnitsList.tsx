import { useNavigate } from 'react-router-dom';
import { Building2, Users } from 'lucide-react';

import { useData } from '@/context/DataContext';
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalFilterBar } from '@/components/common/GlobalFilterBar';
import { MiniMetric } from '@/components/common/UnitScorecard';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge, Button, Card, CardAction, CardContent, CardHeader, StatusBadge } from '@/components/ui';
import { StatusDot } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export function UnitsList() {
  const { unitMetrics, state, settings, previousCorporate, corporate, filter, setUnitFilter } = useData();
  const navigate = useNavigate();

  const delta = (c: number, p: number) => (p === 0 ? 0 : ((c - p) / p) * 100);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Business Units"
        description={`${state.units.length} spinning units on the integrated campus. Select a unit to open its own safety dashboard, records and controls.`}
        breadcrumbs={[{ label: 'EHS', to: '/dashboard' }, { label: 'Units' }]}
        icon={<Building2 className="h-4 w-4" />}
        badges={
          <Badge tone={corporate.status === 'Good' ? 'success' : corporate.status === 'Critical' ? 'danger' : 'warning'} showDot>
            {corporate.statusCount.Good} good · {corporate.statusCount['Attention Required']} attention ·{' '}
            {corporate.statusCount.Critical} critical
          </Badge>
        }
        toolbar={<GlobalFilterBar showUnit={false} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard label="Units" value={state.units.length} icon={Building2} tone="navy" />
        <KpiCard label="Total headcount" value={formatNumber(corporate.employees)} icon={Users} tone="slate" footer="campus workforce" />
        <KpiCard
          label="Campus LTIFR"
          value={corporate.ltifr.toFixed(2)}
          tone={corporate.ltifr <= settings.target.ltifr ? 'green' : 'red'}
          trend={{ value: delta(corporate.ltifr, previousCorporate.ltifr), goodWhen: 'down', label: 'vs prev' }}
        />
        <KpiCard
          label="Critical units"
          value={corporate.statusCount.Critical}
          tone={corporate.statusCount.Critical > 0 ? 'red' : 'green'}
          footer="need immediate action"
        />
        <KpiCard
          label="Overdue CAPA"
          value={corporate.overdueCapa}
          tone={corporate.overdueCapa > 0 ? 'red' : 'green'}
          footer="across all units"
        />
        <KpiCard
          label="Training"
          value={formatPercent(corporate.trainingCompliance)}
          tone={corporate.trainingCompliance >= settings.target.trainingCompliance ? 'green' : 'amber'}
          target={{ label: `≥ ${settings.target.trainingCompliance}%`, met: corporate.trainingCompliance >= settings.target.trainingCompliance }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {unitMetrics
          .slice()
          .sort((a, b) => (a.ltifr > b.ltifr ? -1 : 1))
          .map((m) => {
            const unit = state.units.find((u) => u.id === m.unitId)!;
            const tone = m.status === 'Good' ? 'success' : m.status === 'Critical' ? 'danger' : 'warning';
            return (
              <Card
                key={m.unitId}
                className={cn('flex flex-col transition-all hover:shadow-raised', filter.unitId === m.unitId && 'border-safety-400 ring-1 ring-safety-200')}
              >
                <div className={cn('h-1 w-full rounded-t-xl', tone === 'success' ? 'bg-emerald-500' : tone === 'danger' ? 'bg-red-500' : 'bg-amber-500')} />
                <CardHeader className="pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-base leading-none font-semibold text-ink-900">{m.unitCode}</p>
                      <StatusDot value={m.status} />
                    </div>
                    <p className="mt-1 truncate text-[11px] text-ink-500">{unit.name}</p>
                  </div>
                  <CardAction>
                    <StatusBadge value={m.status} size="xs" />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="grid grid-cols-3 gap-2 border-y border-ink-100 py-2.5">
                    <MiniMetric
                      label="LTIFR"
                      value={m.ltifr.toFixed(2)}
                      tone={m.ltifr <= settings.target.ltifr ? 'success' : 'danger'}
                    />
                    <MiniMetric label="Incidents" value={m.incidents} />
                    <MiniMetric
                      label="Overdue"
                      value={m.overdueCapa}
                      tone={m.overdueCapa > 0 ? 'danger' : 'success'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Progress
                      label="Training"
                      value={m.trainingCompliance}
                      target={settings.target.trainingCompliance}
                      size="sm"
                    />
                    <Progress label="PPE" value={m.ppeCompliance} target={settings.target.ppeCompliance} size="sm" />
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-ink-100 pt-2.5 text-[10px] text-ink-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {formatNumber(m.employees)}
                    </span>
                    <span>{unit.location}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      onClick={() => navigate(`/units/${m.unitId}`)}
                    >
                      Open dashboard
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUnitFilter(m.unitId);
                        navigate('/incidents');
                      }}
                    >
                      Records
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}

