"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Brain } from "lucide-react";

export default function AnalyticsForecastPage() {
    return (
        <Card>
            <CardContent className="p-8 text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h3 className="text-xl font-semibold mb-2">AI Forecast Panel</h3>
                <p className="text-muted-foreground mb-4">
                    Smart Money Concepts forecast panel coming soon. This feature will provide AI-powered market predictions.
                </p>
            </CardContent>
        </Card>
    );
}
