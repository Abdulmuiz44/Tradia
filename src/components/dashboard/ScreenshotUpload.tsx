"use client";

import React, { useState } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScreenshotUploadProps {
  onUpload: (files: File[]) => void;
}

const ScreenshotUpload: React.FC<ScreenshotUploadProps> = ({ onUpload }) => {
  const [screenshots, setScreenshots] = useState<File[]>([]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setScreenshots(fileArray);
      onUpload(fileArray);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="screenshot-upload"
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <ImagePlus size={18} /> Upload Screenshots
      </label>
      <Input
        id="screenshot-upload"
        type="file"
        accept="image/png, image/jpeg"
        multiple
        onChange={handleUpload}
      />
      {screenshots.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {screenshots.length} screenshot{screenshots.length > 1 ? "s" : ""} uploaded
        </div>
      )}
    </div>
  );
};

export default ScreenshotUpload;
