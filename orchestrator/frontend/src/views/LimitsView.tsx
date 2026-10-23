/** Limits View - detailed budget and usage analytics */

import { useStore } from '../store'
import { LimitsPanel } from '../panels/LimitsPanel'
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  BarChart,
  AlertTriangle,
  Download,
  RefreshCw,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { format } from 'date-fns'

export function LimitsView() {
  const { limits, statusSummary } = useStore()
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month')
  const [refreshing, setRefreshing] = useState(false)
  
  if (!limits) return <div className="flex-1 flex items-center justify-center">Loading limits...</div>
  
  const usagePct = limits.usage_pct
  const isAlert = limits.is_alert
  const remaining = limits.remaining_usd
  const spent = limits.go_spent_usd
  const limit = limits.go_monthly_limit_usd
  const alertThreshold = limit * (limits.alert_threshold_pct / 100)
  
  const modelData = useMemo(() => 
    Object.entries(limits.by_model)
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost),
  [limits.by_model])
  
  const getUsageColor = (pct: number) => {
    if (pct >= 90) return 'text-red-500 bg-red-500'
    if (pct >= 75) return 'text-yellow-500 bg-yellow-500'
    return 'text-green-500 bg-green-500'
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Budget & Usage
          </h1>
          <p className="text-dark-500 dark:text-dark-400">Monitor your Go subscription usage and model costs</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input w-auto"
          >
            <option value="day">Last 24h</option>
            <option value="week">Last 7 days</option>
            <option value="month">This Month</option>
          </select>
          <button 
            className="btn-secondary" 
            onClick={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000) }}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-secondary">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Main Budget Card */}
      <div className="card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Budget Overview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Monthly Budget</h3>
              {isAlert && (
                <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="w-3 h-3" />
                  Approaching limit
                </span>
              )}
            </div>
            
            {/* Large progress ring */}
            <div className="flex items-center justify-center gap-8">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={getUsageColor(usagePct).replace('text-', '')}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - usagePct / 100)}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-dark-900 dark:text-dark-100">{usagePct.toFixed(1)}%</span>
                  <span className="text-xs text-dark-500 dark:text-dark-400">Used</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-dark-50 dark:bg-dark-800/50">
                  <div>
                    <p className="text-xs text-dark-500 dark:text-dark-400">Spent</p>
                    <p className="text-2xl font-bold text-dark-900 dark:text-dark-100">${spent.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-dark-400" />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-dark-50 dark:bg-dark-800/50">
                  <div>
                    <p className="text-xs text-dark-500 dark:text-dark-400">Remaining</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">${remaining.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
            
            {/* Linear progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-500 dark:text-dark-400">Budget: ${limit.toFixed(2)}</span>
                <span className="font-medium">Alert at ${alertThreshold.toFixed(2)} ({limits.alert_threshold_pct}%)</span>
              </div>
              <div className="h-4 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getUsageColor(usagePct).replace('text-', 'bg-')}`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary-600 dark:text-primary-400">Free Models</p>
                  <p className="font-bold text-lg text-primary-800 dark:text-primary-300">Unlimited</p>
                </div>
                <BarChart className="w-8 h-8 text-primary-500" />
              </div>
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                Beam, Nemotron, Flint, MiMo, DeepSeek Free, GLM Free
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                label="Total Requests" 
                value={Object.values(limits.by_model).reduce((a, b) => a + b.requests, 0)}
                icon={RefreshCw}
                color="blue"
              />
              <StatCard 
                label="Total Tokens" 
                value={Object.values(limits.by_model).reduce((a, b) => a + b.tokens, 0).toLocaleString()}
                icon={Zap}
                color="purple"
              />
              <StatCard 
                label="Avg Cost/Req" 
                value={
                  Object.values(limits.by_model).reduce((a, b) => a + b.cost, 0) / 
                  Math.max(1, Object.values(limits.by_model).reduce((a, b) => a + b.requests, 0))
                }
                icon={DollarSign}
                color="green"
                format="currency"
              />
              <StatCard 
                label="Models Used" 
                value={Object.keys(limits.by_model).length}
                icon={CreditCard}
                color="orange"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Model Breakdown Table */}
      <div className="card">
        <div className="p-4 border-b border-dark-200 dark:border-dark-700">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Per-Model Usage
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-dark-500 dark:text-dark-400 border-b border-dark-200 dark:border-dark-700">
                <th className="p-3">Model</th>
                <th className="p-3">Requests</th>
                <th className="p-3">Tokens</th>
                <th className="p-3">Cost (USD)</th>
                <th className="p-3">% of Budget</th>
                <th className="p-3">Avg Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
              {modelData.slice(0, 20).map((item) => (
                <tr key={item.model} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                  <td className="p-3 font-mono text-sm truncate max-w-[200px]">{item.model}</td>
                  <td className="p-3 text-sm text-dark-900 dark:text-dark-100">{item.requests}</td>
                  <td className="p-3 text-sm text-dark-600 dark:text-dark-400">{item.tokens.toLocaleString()}</td>
                  <td className="p-3 font-mono text-sm text-dark-900 dark:text-dark-100">${item.cost.toFixed(4)}</td>
                  <td className="p-3">
                    <div className="w-24 h-2 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${limit > 0 ? (item.cost / limit) * 100 : 0}%` }}
                      />
                    </div>
                  </td>
                  <td className="p-3 text-sm text-dark-500 dark:text-dark-400">—</td>
                </tr>
              ))}
              {modelData.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-dark-500 dark:text-dark-400">
                    No usage data yet. Submit a goal to start tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Alert Section */}
      {isAlert && (
        <div className="card p-4 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Budget Alert</h4>
              <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                You've used <strong>{usagePct.toFixed(1)}%</strong> of your ${limit.toFixed(2)} monthly budget.
                ${remaining.toFixed(2)} remaining. Consider using free models for non-critical tasks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, format = 'number' }: { 
  label: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'purple' | 'green' | 'orange';
  format?: 'number' | 'currency';
}) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    green: 'text-green-500 bg-green-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  }
  
  const formatValue = (v: number) => {
    if (format === 'currency') return `$${v.toFixed(4)}`
    return v.toLocaleString()
  }
  
  return (
    <div className="p-4 rounded-lg bg-dark-50 dark:bg-dark-800/50">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="font-bold text-xl text-dark-900 dark:text-dark-100">{formatValue(value)}</p>
      <p className="text-xs text-dark-500 dark:text-dark-400">{label}</p>
    </div>
  )
}