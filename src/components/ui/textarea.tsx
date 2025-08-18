// src/components/ui/textarea.tsx
import React from "react";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea: React.FC<TextareaProps> = (props) => {
  return <textarea {...props} />;
};

export default Textarea;
