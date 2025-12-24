"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, AlertTriangle, TrendingUp, TrendingDown, Volume2 } from 'lucide-react';

interface Alert {
  id: string;
  type: 'price' | 'volume' | 'sentiment' | 'volatility';
  asset: string;
  condition: string;
  value: number;
  triggered: boolean;
  timestamp: Date;
  message: string;
}

interface AlertSettings {
  priceAlerts: boolean;
  volumeAlerts: boolean;
  sentimentAlerts: boolean;
  volatilityAlerts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const MarketAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettings] = useState<AlertSettings>({
    priceAlerts: true,
    volumeAlerts: true,
    sentimentAlerts: false,
    volatilityAlerts: true,
    emailNotifications: false,
    pushNotifications: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching alerts
    const fetchAlerts = async () => {
      setIsLoading(true);
      // Mock alerts data
      const mockAlerts: Alert[] = [
        {
          id: '1',
          type: 'price',
          asset: 'EURUSD',
          condition: 'above',
          value: 1.0900,
          triggered: false,
          timestamp: new Date(),
          message: 'EURUSD has crossed above 1.0900'
        },
        {
          id: '2',
          type: 'volume',
          asset: 'BTCUSD',
          condition: 'spike',
          value: 15,
          triggered: true,
          timestamp: new Date(Date.now() - 3600000),
          message: 'BTCUSD volume spike detected (+15%)'
        },
        {
          id: '3',
          type: 'volatility',
          asset: 'SPY',
          condition: 'high',
          value: 25,
          triggered: true,
          timestamp: new Date(Date.now() - 7200000),
          message: 'SPY volatility increased to 25%'
        }
      ];

      setTimeout(() => {
        setAlerts(mockAlerts);
        setIsLoading(false);
      }, 1000);
    };

    fetchAlerts();
  }, []);

  const toggleSetting = (key: keyof AlertSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price': return <TrendingUp className="h-4 w-4" />;
      case 'volume': return <Volume2 className="h-4 w-4" />;
      case 'volatility': return <AlertTriangle className="h-4 w-4" />;
      case 'sentiment': return <TrendingDown className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'price': return 'text-blue-400';
      case 'volume': return 'text-purple-400';
      case 'volatility': return 'text-orange-400';
      case 'sentiment': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-[#0f1319] border-gray-700">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-700 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Alert Settings */}
      <Card className="bg-[#0f1319] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Alert Types</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Price Alerts</span>
                  <Switch
                    checked={settings.priceAlerts}
                    onCheckedChange={() => toggleSetting('priceAlerts')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Volume Alerts</span>
                  <Switch
                    checked={settings.volumeAlerts}
                    onCheckedChange={() => toggleSetting('volumeAlerts')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Sentiment Alerts</span>
                  <Switch
                    checked={settings.sentimentAlerts}
                    onCheckedChange={() => toggleSetting('sentimentAlerts')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Volatility Alerts</span>
                  <Switch
                    checked={settings.volatilityAlerts}
                    onCheckedChange={() => toggleSetting('volatilityAlerts')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Notification Methods</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Email Notifications</span>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={() => toggleSetting('emailNotifications')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Push Notifications</span>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={() => toggleSetting('pushNotifications')}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card className="bg-[#0f1319] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <BellOff className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No alerts triggered recently</p>
                <p className="text-sm text-gray-500 mt-2">
                  Configure your alert settings above to start receiving notifications
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${alert.triggered
                    ? 'bg-red-900/20 border-red-700/50'
                    : 'bg-[#0f1319]/50 border-gray-700'
                    }`}
                >
                  <div className={`p-2 rounded-lg ${getAlertColor(alert.type)} bg-current/10`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{alert.asset}</span>
                      <Badge
                        className={`text-xs ${alert.triggered ? 'bg-red-600' : 'bg-gray-600'
                          }`}
                      >
                        {alert.triggered ? 'TRIGGERED' : 'ACTIVE'}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                        {alert.type}
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{alert.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {alert.timestamp.toLocaleString()}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs border-gray-600">
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs border-gray-600">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create New Alert */}
      <Card className="bg-[#0f1319] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Create Custom Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Price Alert
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-[#0f1319]">
              Volume Alert
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-[#0f1319]">
              Volatility Alert
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-[#0f1319]">
              Custom Alert
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card className="bg-[#0f1319] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Alert History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Alert history will appear here</p>
            <p className="text-sm text-gray-500 mt-2">
              Past alerts and notifications will be stored for your reference
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketAlerts;
