"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface CustomProbabilitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function CustomProbabilitySlider({
  value,
  onChange,
  disabled = false,
  className,
}: CustomProbabilitySliderProps) {
  // Bereken de kleur op basis van de waarde (groen voor hoge waarde, rood voor lage waarde)
  const getTrackStyle = () => {
    return {
      background: `linear-gradient(to right, 
        rgb(239 68 68 / 0.9) 0%, 
        rgb(239 68 68 / 0.5) ${value * 0.5}%, 
        rgb(34 197 94 / 0.5) ${value * 0.5 + 50}%, 
        rgb(34 197 94 / 0.9) 100%)`,
    };
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative h-8">
        <div
          className="absolute inset-0 rounded-full h-4 top-2 -z-10"
          style={getTrackStyle()}
        />
        <Slider
          value={[value]}
          min={0}
          max={100}
          step={1}
          onValueChange={([newValue]) => onChange(newValue)}
          disabled={disabled}
          className="z-10 h-8"
        />
      </div>
      <div className="flex justify-between text-xs">
        <div className="text-red-500">Onwaar {(100 - value).toFixed(0)}%</div>
        <div className="text-green-500">Waar {value.toFixed(0)}%</div>
      </div>
    </div>
  );
}
