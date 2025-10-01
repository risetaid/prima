"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface LLMUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  requestsByModel: Record<string, number>;
  costByModel: Record<string, number>;
  requestsByIntent: Record<string, number>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

interface LLMCostAlert {
  type: "budget" | "rate_limit" | "performance";
  message: string;
  threshold: number;
  current: number;
  severity: "low" | "medium" | "high" | "critical";
}

interface LLMAnalyticsDashboardProps {
  className?: string;
}

export function LLMAnalyticsDashboard({
  className,
}: LLMAnalyticsDashboardProps) {
  const [stats, setStats] = useState<LLMUsageStats | null>(null);
  const [alerts, setAlerts] = useState<LLMCostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/llm-analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics data");
      }

      const data = await response.json();
      setStats(data.stats);
      setAlerts(data.alerts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(4)}`;
  const formatNumber = (num: number) => (num || 0).toLocaleString();

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">LLM Analytics Dashboard</h2>
          <Button disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">LLM Analytics Dashboard</h2>
          <Button onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">LLM Analytics Dashboard</h2>
        <Button onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={
                alert.severity === "critical" ? "destructive" : "default"
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalRequests)}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(stats.totalTokens)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(((stats.totalTokens || 0) / 1000000) * 100).toFixed(1)}% of monthly
              limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${((stats.totalCost || 0) / 30).toFixed(4)} per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.averageResponseTime || 0).toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">Target: under 3s</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">By Model</TabsTrigger>
          <TabsTrigger value="intents">By Intent</TabsTrigger>
          <TabsTrigger value="daily">Daily Usage</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Model</CardTitle>
              <CardDescription>
                Requests and costs broken down by LLM model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.requestsByModel || {}).map(
                  ([model, requests]) => (
                    <div
                      key={model}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{model}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(requests)} requests
                        </span>
                      </div>
                       <div className="text-right">
                         <div className="font-medium">
                           {formatCurrency((stats.costByModel || {})[model] || 0)}
                         </div>
                         <div className="text-xs text-muted-foreground">
                           {(stats.totalRequests || 0) > 0 ? ((requests / (stats.totalRequests || 1)) * 100).toFixed(1) : '0.0'}%
                           of total
                         </div>
                       </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Intent</CardTitle>
              <CardDescription>
                Requests broken down by detected intent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.requestsByIntent || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([intent, requests]) => (
                    <div
                      key={intent}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{intent}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(requests)} requests
                        </span>
                      </div>
                       <div className="text-right">
                         <div className="text-xs text-muted-foreground">
                           {(stats.totalRequests || 0) > 0 ? ((requests / (stats.totalRequests || 1)) * 100).toFixed(1) : '0.0'}%
                           of total
                         </div>
                       </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Usage</CardTitle>
              <CardDescription>
                Requests, tokens, and costs over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(stats.dailyUsage || []).map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div className="font-medium">{day.date}</div>
                    <div className="flex space-x-4 text-sm">
                      <span>{formatNumber(day.requests)} req</span>
                      <span>{formatNumber(day.tokens)} tokens</span>
                      <span>{formatCurrency(day.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown by Model</CardTitle>
                <CardDescription>
                  Total costs and usage by LLM model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.costByModel || {}).map(
                    ([model, cost]) => (
                      <div
                        key={model}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{model}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(cost)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {stats.totalCost && stats.totalCost > 0
                              ? ((cost / stats.totalCost) * 100).toFixed(1)
                              : '0.0'}% of total
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Efficiency</CardTitle>
                <CardDescription>
                  Cost per token and efficiency metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Cost per 1K tokens</span>
                    <span className="font-medium">
                      {stats.totalTokens && stats.totalTokens > 0
                        ? formatCurrency((stats.totalCost || 0) / (stats.totalTokens / 1000))
                        : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cost per request</span>
                    <span className="font-medium">
                      {stats.totalRequests && stats.totalRequests > 0
                        ? formatCurrency((stats.totalCost || 0) / stats.totalRequests)
                        : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg tokens per request</span>
                    <span className="font-medium">
                      {stats.totalRequests && stats.totalRequests > 0
                        ? Math.round((stats.totalTokens || 0) / stats.totalRequests)
                        : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Trends</CardTitle>
              <CardDescription>
                Daily cost breakdown over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(stats.dailyUsage || []).map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div className="font-medium">{day.date}</div>
                    <div className="flex space-x-6 text-sm">
                      <span className="text-right min-w-[80px]">
                        {formatNumber(day.requests)} req
                      </span>
                      <span className="text-right min-w-[80px]">
                        {formatNumber(day.tokens)} tokens
                      </span>
                      <span className="text-right min-w-[80px] font-medium">
                        {formatCurrency(day.cost)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
