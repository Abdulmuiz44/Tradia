"use client";

import React from "react";
import { BookOpen, GraduationCap, Video } from "lucide-react";
import Link from "next/link";

const educationItems = [
  {
    title: "Trading Psychology 101",
    description: "Master the mindset of consistently profitable traders.",
    icon: <GraduationCap className="w-6 h-6 text-indigo-600" />,
    link: "https://www.investopedia.com/articles/trading/06/psychology.asp",
  },
  {
    title: "Risk Management Basics",
    description: "Understand how to manage capital and avoid major losses.",
    icon: <BookOpen className="w-6 h-6 text-emerald-600" />,
    link: "https://www.babypips.com/learn/forex/risk-management",
  },
  {
    title: "Video: Smart Money Concepts (SMC)",
    description: "Introduction to SMC and institutional trading techniques.",
    icon: <Video className="w-6 h-6 text-rose-600" />,
    link: "https://www.youtube.com/results?search_query=smart+money+concepts+trading",
  },
];

export default function TraderEducation() {
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">📘 Trader Education</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {educationItems.map((item, index) => (
          <Link
            key={index}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border p-4 rounded-xl shadow-sm hover:shadow-lg transition"
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
