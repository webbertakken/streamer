import { Widget } from "../Widget";
import type { WidgetInstanceProps } from "../registry";
import { create } from "zustand";

export interface CustomTextConfig {
  text: string;
  fontSize: number;
  colour: string;
  fontFamily: string;
  textAlign: CanvasTextAlign;
}

interface CustomTextState {
  config: CustomTextConfig;
  setConfig: (config: Partial<CustomTextConfig>) => void;
}

export const useCustomText = create<CustomTextState>((set) => ({
  config: {
    text: "Welcome to the stream!",
    fontSize: 24,
    colour: "#ffffff",
    fontFamily: "sans-serif",
    textAlign: "center",
  },
  setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),
}));

function CustomTextContent() {
  const config = useCustomText((s) => s.config);

  return (
    <div
      className="h-full flex items-center justify-center p-2"
      style={{
        fontSize: config.fontSize,
        color: config.colour,
        fontFamily: config.fontFamily,
        textAlign: config.textAlign,
      }}
    >
      {config.text}
    </div>
  );
}

export function CustomTextWidget({ instanceId }: WidgetInstanceProps) {
  return (
    <Widget instanceId={instanceId} name="Custom text">
      <div className="h-full bg-black/30 rounded-lg backdrop-blur-sm">
        <CustomTextContent />
      </div>
    </Widget>
  );
}
