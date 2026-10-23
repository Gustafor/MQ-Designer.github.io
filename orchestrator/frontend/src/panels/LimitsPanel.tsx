/** Limits Panel - shows budget usage and model costs */

import { useStore } from '../store'
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  CreditCard,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react'
import { format } from 'date-fns'

export function LimitsPanel() {
  const { limits, statusSummary } = useStore()
  
  if (!limits) return <div className="panel">Loading limits...</div>
  
  const usagePct = limits.usage_pct
  const isAlert = limits.is_alert
  const remaining = limits.remaining_usd
  const spent = limits.go_spent_usd
  const limit = limits.go_monthly_limit_usd
  
  // Determine color based on usage
  const getUsageColor = (pct: number) => {
    if (pct >= 90) return 'text-red-500 bg-red-500/10'
    if (pct >= 75) return 'text-yellow-500 bg-yellow-500/10'
    return 'text-green-500 bg-green-500/10'
  }
  
  const usageColor = getUsageColor(usagePct)
  
  return (
    <div className="panel space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Budget Limits
        </h3>
        {isAlert && (
          <span className="badge-danger flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Alert
          </span>
        )}
      </div>
      
      {/* Main progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-500 dark:text-dark-400">Monthly Budget</span>
          <span className="font-medium text-dark-900 dark:text-dark-100">
            ${spent.toFixed(2)} / ${limit.toFixed(2)}
          </span>
        </div>
        <div className="h-3 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${usageColor.replace('bg-', 'bg-').replace('text-', '')}`}
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={usageColor}>
            {usagePct.toFixed(1)}% used
          </span>
          <span className="text-dark-500 dark:text-dark-400">
            ${remaining.toFixed(2)} remaining
          </span>
        </div>
      </div>
      
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-dark-50 dark:bg-dark-800/50">
          <p className="text-xs text-dark-500 dark:text-dark-400">Spent</p>
          <p className="font-bold text-lg text-dark-900 dark:text-dark-100">${spent.toFixed(2)}</p>
        </div>
        <div className="p-3 rounded-lg bg-dark-50 dark:bg-dark-800/50">
          <p className="text-xs text-dark-500 dark:text-dark-400">Remaining</p>
          <p className="font-bold text-lg text-green-600 dark:text-green-400">${remaining.toFixed(2)}</p>
        </div>
        <div className="p-3 rounded-lg bg-dark-50 dark:bg-dark-800/50">
          <p className="text-xs text-dark-500 dark:text-dark-400">Alert at</p>
          <p className="font-bold text-lg text-yellow-600 dark:text-yellow-400">${(limit * limits.alert_threshold_pct / 100).toFixed(2)}</p>
        </div>
      </div>
      
      {/* Per-model breakdown */}
      {Object.keys(limits.by_model).length > 0 && (
        <div className="space-y-2 border-t border-dark-200 dark:border-dark-700 pt-4">
          <h4 className="font-medium text-sm text-dark-500 dark:text-dark-400">Per Model</h4>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {Object.entries(limits.by_model)
              .sort(([,a], [,b]) => b.cost - a.cost)
              .slice(0, 10)
              .map(([model, data]) => (
                <div key={model} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-dark-50 dark:hover:bg-dark-800/50">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-dark-500 dark:text-dark-400">{data.requests} req</span>
                    <span className="font-mono text-dark-900 dark:text-dark-100 truncate max-w-[150px]">
                      {model}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-dark-500 dark:text-dark-400">{data.tokens.toLocaleString()} tok</span>
                    <span className="font-medium text-dark-900 dark:text-dark-100">${data.cost.toFixed(4)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Free models note */}
      {limits.free_models_unlimited && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
            <ArrowDownRight className="w-4 h-4" />
            <span className="text-sm font-medium">Free models available</span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-500 mt-1">
            Unlimited usage on free models (Beam, Nemotron, etc.)
          </p>
        </div>
      )}
    </div>
  )
}