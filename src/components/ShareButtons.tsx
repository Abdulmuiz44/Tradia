"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

type Props = {
  title: string;
  text: string;
  url?: string;
  className?: string;
};

export default function ShareButtons({ title, text, url, className = "" }: Props) {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : "");

  const handleNativeShare = async () => {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, text, url: shareUrl });
      } else {
        window.open(getTwitterUrl(), "_blank");
      }
    } catch {}
  };

  const getTwitterUrl = () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title}\n${text}`)}&url=${encodeURIComponent(shareUrl)}`;
  const getLinkedInUrl = () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const getWhatsAppUrl = () => `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title}\n${shareUrl}`)}`;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button variant="outline" size="sm" onClick={handleNativeShare}>
        <Share2 className="w-4 h-4 mr-2" /> Share
      </Button>
      <a href={getTwitterUrl()} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm">Twitter</Button>
      </a>
      <a href={getLinkedInUrl()} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm">LinkedIn</Button>
      </a>
      <a href={getWhatsAppUrl()} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm">WhatsApp</Button>
      </a>
    </div>
  );
}

