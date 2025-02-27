"use client"

import { useTheme } from "next-themes"
import { useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Sample data - replace with your API data
const data = [
  { time: "09:30", price: 135.76, volume: 1000 },
  { time: "10:00", price: 136.0, volume: 1500 },
  { time: "10:30", price: 135.8, volume: 800 },
  { time: "11:00", price: 136.2, volume: 2000 },
  { time: "11:30", price: 135.9, volume: 1200 },
  // Add more data points
]

export function StockChart() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState("price")

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">TATASTEEL</h2>
              <p className="text-sm text-muted-foreground">NSE: TATASTEEL</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">₹135.76</div>
              <div className="text-sm text-green-500">+0.05 (+0.04%)</div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="price" className="h-[400px]">
          <TabsList>
            <TabsTrigger value="price" onClick={() => setActiveTab("price")}>
              Price
            </TabsTrigger>
            <TabsTrigger value="technical" onClick={() => setActiveTab("technical")}>
              Technical
            </TabsTrigger>
          </TabsList>
          <TabsContent value="price" className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="price" orientation="right" />
                <YAxis yAxisId="volume" orientation="left" />
                <Tooltip />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
                <Bar yAxisId="volume" dataKey="volume" fill="#82ca9d" opacity={0.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="technical" className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="price" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

